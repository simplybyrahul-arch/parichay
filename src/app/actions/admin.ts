"use server";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/utils/audit-logger";

function getRequiredEnv(name: string) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is not configured`);
    return value;
}

function createAdminClient() {
    return createSupabaseAdminClient(
        getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
        getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}

function createCreatorSlug(name: string | null | undefined, id: string) {
    const base = (name || "creator").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "creator";
    return `${base}-${id.slice(0, 8)}`;
}

// Higher Order Function to securely wrap Admin server actions
export async function withAdminAuth<T extends unknown[], R>(
    action: (...args: T) => Promise<R>
): Promise<(...args: T) => Promise<R>> {
    return async (...args: T) => {
        const supabase = await createClient();
        
        // 1. Verify Authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Unauthorized");

        // 2. Verify Database Role Safely 
        const { data: profile } = await supabase.from('users').select('account_type').eq('id', user.id).single();
        if (profile?.account_type !== 'admin') throw new Error("Forbidden: Requires Admin Privilege");

        return action(...args);
    };
}

export const verifyCreator = await withAdminAuth(async (creatorId: string, verify: boolean) => {
    const admin = createAdminClient();

    const { data: profile, error: profileError } = await admin
        .from("users")
        .select("id, full_name, account_type")
        .eq("id", creatorId)
        .single();

    if (profileError || !profile || profile.account_type !== "creator") {
        throw new Error("Creator user profile was not found.");
    }

    const { data: updatedCreator, error } = await admin
        .from('creators')
        .update({ verified: verify })
        .eq('id', creatorId)
        .select("id, verified")
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!updatedCreator) {
        const { error: insertError } = await admin
            .from("creators")
            .insert({
                id: creatorId,
                slug: createCreatorSlug(profile.full_name, creatorId),
                role: "creator",
                location: "Remote",
                city: null,
                day_rate: 0,
                verified: verify,
                available_for_booking: true,
                whatsapp_opt_in: true,
            });

        if (insertError) {
            throw new Error(insertError.message);
        }
    }

    // Capture the secure Audit Log
    await logAdminAction(
        verify ? "VERIFY_CREATOR_GRANT" : "VERIFY_CREATOR_REVOKE",
        creatorId, 
        { previous_state: !verify }
    );

    revalidatePath("/admin/users");
    return { success: true };
});

export const verifyEquipmentVendor = await withAdminAuth(async (userId: string, verify: boolean) => {
    const admin = createAdminClient();

    const { data: profile, error: profileError } = await admin
        .from("users")
        .select("id, full_name, account_type")
        .eq("id", userId)
        .single();

    if (profileError || !profile || profile.account_type !== "equipment_vendor") {
        throw new Error("Equipment vendor user profile was not found.");
    }

    const { error } = await admin
        .from("provider_profiles")
        .update({ verified: verify, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("provider_type", "equipment_vendor");

    if (error) {
        throw new Error(error.message);
    }

    await logAdminAction(
        verify ? "VERIFY_EQUIPMENT_VENDOR_GRANT" : "VERIFY_EQUIPMENT_VENDOR_REVOKE",
        userId,
        { previous_state: !verify }
    );

    revalidatePath("/admin/users");
    return { success: true };
});

"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/utils/audit-logger";

// Higher Order Function to securely wrap Admin server actions
export async function withAdminAuth<T extends any[], R>(
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
    const supabase = await createClient();

    const { error } = await supabase
        .from('creators')
        .update({ verified: verify })
        .eq('id', creatorId);

    if (error) {
        throw new Error(error.message);
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

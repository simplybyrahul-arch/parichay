import type { SupabaseClient } from "@supabase/supabase-js";

export type UserEmail = {
    email: string | null;
    name: string | null;
};

export async function getUserEmail(admin: SupabaseClient, userId: string | null | undefined): Promise<UserEmail> {
    if (!userId) return { email: null, name: null };

    const [{ data: profile }, authResult] = await Promise.all([
        admin.from("users").select("full_name").eq("id", userId).maybeSingle(),
        admin.auth.admin.getUserById(userId),
    ]);

    return {
        email: authResult.data.user?.email || null,
        name: profile?.full_name || authResult.data.user?.user_metadata?.full_name || null,
    };
}

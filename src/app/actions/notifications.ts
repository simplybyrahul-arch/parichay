"use server";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export type UserNotification = {
    id: string;
    project_id: string | null;
    type: string;
    title: string;
    message: string;
    read: boolean;
    created_at: string;
    cta_url: string | null;
};

type ActionResult = {
    success: boolean;
    message: string;
};

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

export async function listMyNotifications(): Promise<UserNotification[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const admin = createAdminClient();
    const { data, error } = await admin
        .from("notifications")
        .select("id, project_id, type, title, message, data, read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);

    if (error || !data) {
        if (error) console.error("Notification fetch error:", error);
        return [];
    }

    return data.map((notification) => {
        const payload = notification.data as Record<string, unknown> | null;
        return {
            id: String(notification.id),
            project_id: (notification.project_id as string | null) || null,
            type: String(notification.type || ""),
            title: String(notification.title || "Notification"),
            message: String(notification.message || ""),
            read: Boolean(notification.read),
            created_at: String(notification.created_at),
            cta_url: typeof payload?.cta_url === "string" ? payload.cta_url : null,
        };
    });
}

export async function markNotificationRead(notificationId: string): Promise<ActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Unauthorized." };

    const admin = createAdminClient();
    const { error } = await admin
        .from("notifications")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("user_id", user.id);

    if (error) {
        console.error("Notification read update error:", error);
        return { success: false, message: "Could not update notification." };
    }

    revalidatePath("/dashboard");
    revalidatePath("/creator-dashboard");
    return { success: true, message: "Notification marked as read." };
}

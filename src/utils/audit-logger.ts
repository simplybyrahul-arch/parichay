import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";

type AuditAction = 
    | "VERIFY_CREATOR_REVOKE"
    | "VERIFY_CREATOR_GRANT"
    | "VERIFY_EQUIPMENT_VENDOR_REVOKE"
    | "VERIFY_EQUIPMENT_VENDOR_GRANT"
    | "UPDATE_PLATFORM_SETTINGS"
    | "RESOLVE_DISPUTE";

export async function logAdminAction(
    action: AuditAction,
    targetId?: string,
    metadata?: Record<string, unknown>
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    // Await headers() to satisfy Next.js 15+ async headers requirement
    const headersList = await headers();
    const ip = headersList.get('x-real-ip') || headersList.get('x-forwarded-for') || '127.0.0.1';

    await supabase.from("audit_logs").insert({
        admin_id: user.id,
        action,
        target_id: targetId,
        metadata,
        ip_address: ip,
    });
}

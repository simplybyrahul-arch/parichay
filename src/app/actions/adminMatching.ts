"use server";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { activeOpportunityStatuses } from "@/lib/projects/status";
import { sendBookingEmailToUser } from "@/lib/email/bookingEmails";

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

async function requireAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { userId: null, error: "Unauthorized." };

    const admin = createAdminClient();
    const { data: profile, error } = await admin
        .from("users")
        .select("account_type")
        .eq("id", user.id)
        .single();

    if (error || profile?.account_type !== "admin") {
        return { userId: null, error: "Forbidden: Requires admin privilege." };
    }

    return { userId: user.id, error: null };
}

export async function adminInviteCreator(projectId: string, creatorId: string): Promise<ActionResult> {
    const auth = await requireAdmin();
    if (!auth.userId) return { success: false, message: auth.error || "Unauthorized." };

    const admin = createAdminClient();
    const { data: project, error: projectError } = await admin
        .from("projects")
        .select("id, title, status, booking_location, budget")
        .eq("id", projectId)
        .single();

    if (projectError || !project) return { success: false, message: "Project not found." };
    if (!activeOpportunityStatuses.includes(project.status as (typeof activeOpportunityStatuses)[number])) {
        return { success: false, message: "Project is not active for manual invites." };
    }

    const { data: creator, error: creatorError } = await admin
        .from("creators")
        .select("id, verified, available_for_booking")
        .eq("id", creatorId)
        .single();

    if (creatorError || !creator) return { success: false, message: "Creator not found." };
    if (!creator.verified) return { success: false, message: "Only verified creators can be invited." };
    if (creator.available_for_booking === false) return { success: false, message: "Creator is not available for booking." };

    const { data: existingInvite } = await admin
        .from("project_invites")
        .select("id")
        .eq("project_id", projectId)
        .eq("creator_id", creatorId)
        .maybeSingle();

    if (existingInvite) return { success: false, message: "Creator already has an invite for this project." };

    const { data: invite, error: inviteError } = await admin
        .from("project_invites")
        .insert({
            project_id: projectId,
            creator_id: creatorId,
            status: "sent",
            match_reason: "Manually invited by admin",
            match_score: null,
            notification_status: "pending",
            whatsapp_status: "queued",
        })
        .select("id")
        .single();

    if (inviteError || !invite) {
        console.error("Admin manual invite error:", inviteError);
        return { success: false, message: "Could not create manual invite." };
    }

    const { error: notificationError } = await admin
        .from("notifications")
        .insert({
            user_id: creatorId,
            project_id: projectId,
            creator_id: creatorId,
            type: "booking_opportunity",
            title: "New booking opportunity",
            message: `${project.title} is available${project.booking_location ? ` in ${project.booking_location}` : ""}. Budget Rs ${Number(project.budget || 0).toLocaleString("en-IN")}.`,
            data: {
                project_id: projectId,
                invite_id: invite.id,
                cta_url: `/opportunities/${projectId}`,
            },
        });

    await admin
        .from("project_invites")
        .update({ notification_status: notificationError ? "failed" : "created" })
        .eq("id", invite.id);

    if (notificationError) console.error("Admin manual invite notification error:", notificationError);
    else {
        await sendBookingEmailToUser(admin, creatorId, {
            type: "creator_invited",
            bookingTitle: project.title,
            ctaUrl: `/opportunities/${projectId}`,
            amount: Number(project.budget || 0),
        });
    }

    if (["open", "matching"].includes(project.status)) {
        await admin.from("projects").update({ status: "receiving_interest" }).eq("id", projectId);
    }

    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath("/admin/projects");
    return { success: true, message: "Creator invited manually." };
}

export async function adminDeactivateInvite(inviteId: string): Promise<ActionResult> {
    const auth = await requireAdmin();
    if (!auth.userId) return { success: false, message: auth.error || "Unauthorized." };

    const admin = createAdminClient();
    const { data: invite } = await admin.from("project_invites").select("project_id").eq("id", inviteId).single();
    const { error } = await admin.from("project_invites").update({ status: "inactive" }).eq("id", inviteId);

    if (error) return { success: false, message: "Could not deactivate invite." };

    if (invite?.project_id) revalidatePath(`/admin/projects/${invite.project_id}`);
    return { success: true, message: "Invite marked inactive." };
}

export async function adminRequeueWhatsApp(inviteId: string): Promise<ActionResult> {
    const auth = await requireAdmin();
    if (!auth.userId) return { success: false, message: auth.error || "Unauthorized." };

    const admin = createAdminClient();
    const { data: invite, error: inviteError } = await admin
        .from("project_invites")
        .select("id, project_id, whatsapp_status, projects(status)")
        .eq("id", inviteId)
        .single();

    if (inviteError || !invite) return { success: false, message: "Invite not found." };
    const project = Array.isArray(invite.projects) ? invite.projects[0] : invite.projects;
    if (!project || !activeOpportunityStatuses.includes(project.status as (typeof activeOpportunityStatuses)[number])) {
        return { success: false, message: "Project is not active for WhatsApp requeue." };
    }

    if (!["failed", "skipped_disabled", "not_sent"].includes(invite.whatsapp_status)) {
        return { success: false, message: "Only failed, skipped, or unsent WhatsApp invites can be requeued." };
    }

    const { error } = await admin
        .from("project_invites")
        .update({ whatsapp_status: "queued" })
        .eq("id", inviteId);

    if (error) return { success: false, message: "Could not requeue WhatsApp invite." };

    revalidatePath(`/admin/projects/${invite.project_id}`);
    return { success: true, message: "WhatsApp invite queued for cron retry." };
}

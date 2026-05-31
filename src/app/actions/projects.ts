"use server";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { isClientProjectCancellable } from "@/lib/projects/status";
import { sendBookingEmailToUser } from "@/lib/email/bookingEmails";

type ActionResult = {
    success: boolean;
    message: string;
};

type ProjectRow = {
    id: string;
    title: string;
    client_id: string;
    status: string | null;
    payment_status: string | null;
    selected_creator_id: string | null;
};

type InviteRow = {
    id: string;
    creator_id: string;
    status: string;
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

async function getClientUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { userId: null, error: "You must be logged in." };

    const admin = createAdminClient();
    const { data: profile } = await admin
        .from("users")
        .select("account_type")
        .eq("id", user.id)
        .single();

    if (profile?.account_type !== "client") {
        return { userId: null, error: "Only the client who created this booking can cancel it." };
    }

    return { userId: user.id, error: null };
}

async function notifyCancellation(
    admin: ReturnType<typeof createAdminClient>,
    project: ProjectRow,
    invites: InviteRow[]
) {
    const creatorIds = Array.from(new Set(invites.map((invite) => invite.creator_id).filter(Boolean)));

    const creatorNotifications = creatorIds.map((creatorId) => ({
        user_id: creatorId,
        project_id: project.id,
        creator_id: creatorId,
        type: "booking_cancelled",
        title: "Booking cancelled",
        message: `The client cancelled ${project.title}. This booking is no longer accepting responses.`,
        data: {
            project_id: project.id,
            cta_url: "/creator-dashboard",
        },
    }));

    const { data: admins } = await admin
        .from("users")
        .select("id")
        .eq("account_type", "admin");

    const adminNotifications = (admins || []).map((adminUser) => ({
        user_id: adminUser.id,
        project_id: project.id,
        type: "client_project_cancelled",
        title: "Client cancelled booking",
        message: `A client cancelled ${project.title}.`,
        data: {
            project_id: project.id,
            cta_url: `/admin/projects/${project.id}`,
        },
    }));

    const notifications = [...creatorNotifications, ...adminNotifications];
    if (!notifications.length) return;

    const { error } = await admin.from("notifications").insert(notifications);
    if (error) console.error("Project cancellation notification error:", error);

    await Promise.all(creatorIds.map((creatorId) => sendBookingEmailToUser(admin, creatorId, {
        type: "booking_cancelled",
        bookingTitle: project.title,
        ctaUrl: "/creator-dashboard",
    })));
}

async function auditCancellation(
    admin: ReturnType<typeof createAdminClient>,
    userId: string,
    projectId: string,
    reason: string | null
) {
    const { error } = await admin.from("audit_logs").insert({
        admin_id: userId,
        action: "client_project_cancelled",
        target_id: projectId,
        metadata: {
            project_id: projectId,
            reason,
        },
        ip_address: "server-action",
    });

    if (error) console.error("Project cancellation audit log error:", error);
}

export async function cancelClientProject(projectId: string, reason?: string): Promise<ActionResult> {
    const auth = await getClientUser();
    if (!auth.userId) return { success: false, message: auth.error || "Unauthorized." };

    const admin = createAdminClient();
    const { data: project, error: projectError } = await admin
        .from("projects")
        .select("id, title, client_id, status, payment_status, selected_creator_id")
        .eq("id", projectId)
        .single();

    if (projectError || !project) {
        return { success: false, message: "Project not found." };
    }

    const typedProject = project as ProjectRow;
    if (typedProject.client_id !== auth.userId) {
        return { success: false, message: "You can only cancel your own booking." };
    }

    if (!isClientProjectCancellable(typedProject.status, typedProject.payment_status, typedProject.selected_creator_id)) {
        return { success: false, message: "This booking can no longer be cancelled." };
    }

    const { data: paymentRows } = await admin
        .from("payments")
        .select("id, status")
        .eq("project_id", projectId)
        .in("status", ["captured", "paid", "received", "released", "payment_received"]);

    if (paymentRows?.length) {
        return { success: false, message: "This booking has a received payment and cannot be cancelled here." };
    }

    const { data: activeInvites } = await admin
        .from("project_invites")
        .select("id, creator_id, status")
        .eq("project_id", projectId)
        .in("status", ["sent", "viewed", "interested", "shortlisted", "selected"]);

    const { error: projectUpdateError } = await admin
        .from("projects")
        .update({ status: "cancelled" })
        .eq("id", projectId)
        .eq("client_id", auth.userId);

    if (projectUpdateError) {
        console.error("Client project cancellation error:", projectUpdateError);
        return { success: false, message: "Could not cancel this booking." };
    }

    const { error: inviteUpdateError } = await admin
        .from("project_invites")
        .update({ status: "inactive" })
        .eq("project_id", projectId)
        .in("status", ["sent", "viewed", "interested", "shortlisted", "selected"]);

    if (inviteUpdateError) {
        console.error("Project invite cancellation update error:", inviteUpdateError);
    }

    await notifyCancellation(admin, typedProject, (activeInvites || []) as InviteRow[]);
    await auditCancellation(admin, auth.userId, projectId, reason?.trim() || null);

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/${projectId}`);
    revalidatePath("/creator-dashboard");

    return { success: true, message: "Booking cancelled. Invited creators can no longer respond." };
}

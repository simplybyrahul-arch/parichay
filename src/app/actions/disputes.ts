"use server";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export type ProjectDispute = {
    id: string;
    project_id: string;
    raised_by: string;
    reason: string;
    details: string | null;
    status: string;
    resolution: string | null;
    resolution_type: string | null;
    created_at: string;
    resolved_at: string | null;
};

type ActionResult = {
    success: boolean;
    message: string;
};

const resolutionTypes = new Set(["full_release", "partial_release", "refund"]);

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

async function getCurrentUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

async function requireAdmin() {
    const user = await getCurrentUser();
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

function isWithinDisputeWindow(deliveredAt: string | null) {
    if (!deliveredAt) return false;
    const deliveredTime = new Date(deliveredAt).getTime();
    return Number.isFinite(deliveredTime) && Date.now() - deliveredTime <= 48 * 60 * 60 * 1000;
}

export async function listProjectDisputes(projectId: string): Promise<ProjectDispute[]> {
    const user = await getCurrentUser();
    if (!user) return [];

    const admin = createAdminClient();
    const { data: project } = await admin
        .from("projects")
        .select("id, client_id, selected_creator_id")
        .eq("id", projectId)
        .single();

    if (!project || (project.client_id !== user.id && project.selected_creator_id !== user.id)) {
        return [];
    }

    const { data, error } = await admin
        .from("project_disputes")
        .select("id, project_id, raised_by, reason, details, status, resolution, resolution_type, created_at, resolved_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Project disputes fetch error:", error);
        return [];
    }

    return (data || []) as ProjectDispute[];
}

export async function raiseProjectDispute(projectId: string, reason: string, details?: string): Promise<ActionResult> {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Unauthorized." };

    const cleanReason = reason.trim();
    if (!cleanReason) return { success: false, message: "Dispute reason is required." };

    const admin = createAdminClient();
    const { data: project, error: projectError } = await admin
        .from("projects")
        .select("id, title, client_id, selected_creator_id, status, payment_status, delivered_at")
        .eq("id", projectId)
        .eq("client_id", user.id)
        .single();

    if (projectError || !project) return { success: false, message: "Project not found." };
    if (project.status !== "delivered") return { success: false, message: "Disputes can be raised only after delivery." };
    if (!isWithinDisputeWindow(project.delivered_at)) return { success: false, message: "Dispute window has closed." };

    const { data: existingDispute } = await admin
        .from("project_disputes")
        .select("id")
        .eq("project_id", projectId)
        .in("status", ["open", "under_review"])
        .maybeSingle();

    if (existingDispute) return { success: false, message: "An active dispute already exists for this project." };

    const { data: dispute, error: disputeError } = await admin
        .from("project_disputes")
        .insert({
            project_id: projectId,
            raised_by: user.id,
            reason: cleanReason,
            details: details?.trim() || null,
            status: "open",
        })
        .select("id")
        .single();

    if (disputeError || !dispute) {
        console.error("Raise dispute insert error:", disputeError);
        return { success: false, message: "Could not raise dispute." };
    }

    const { error: projectUpdateError } = await admin
        .from("projects")
        .update({ status: "disputed", payment_status: "disputed" })
        .eq("id", projectId)
        .eq("client_id", user.id)
        .eq("status", "delivered");

    if (projectUpdateError) {
        console.error("Raise dispute project update error:", projectUpdateError);
        return { success: false, message: "Dispute was created, but project status could not be updated." };
    }

    await admin
        .from("payments")
        .update({ status: "disputed" })
        .eq("project_id", projectId)
        .in("status", ["paid", "captured"]);

    const { data: admins } = await admin.from("users").select("id").eq("account_type", "admin");
    const notifications = [
        ...(project.selected_creator_id ? [{
            user_id: project.selected_creator_id,
            project_id: projectId,
            creator_id: project.selected_creator_id,
            type: "dispute_raised",
            title: "Dispute raised",
            message: "The client raised a dispute for this booking.",
            data: { project_id: projectId, dispute_id: dispute.id, cta_url: "/creator-dashboard" },
        }] : []),
        ...((admins || []).map((adminUser) => ({
            user_id: adminUser.id,
            project_id: projectId,
            creator_id: project.selected_creator_id,
            type: "dispute_raised",
            title: "New dispute raised",
            message: "A client raised a dispute that needs review.",
            data: { project_id: projectId, dispute_id: dispute.id, cta_url: "/admin/disputes" },
        }))),
    ];

    if (notifications.length) {
        const { error: notificationError } = await admin.from("notifications").insert(notifications);
        if (notificationError) console.error("Dispute raised notification error:", notificationError);
    }

    revalidatePath(`/dashboard/${projectId}`);
    revalidatePath("/admin/disputes");
    return { success: true, message: "Dispute raised. Admin will review the case." };
}

export async function markDisputeUnderReview(disputeId: string): Promise<ActionResult> {
    const auth = await requireAdmin();
    if (!auth.userId) return { success: false, message: auth.error || "Unauthorized." };

    const admin = createAdminClient();
    const { data: dispute, error } = await admin
        .from("project_disputes")
        .select("id, project_id, status")
        .eq("id", disputeId)
        .single();

    if (error || !dispute) return { success: false, message: "Dispute not found." };
    if (!["open", "under_review"].includes(dispute.status)) return { success: false, message: "Dispute is not open for review." };

    const { error: updateError } = await admin
        .from("project_disputes")
        .update({ status: "under_review" })
        .eq("id", disputeId);

    if (updateError) return { success: false, message: "Could not mark dispute under review." };

    revalidatePath("/admin/disputes");
    revalidatePath(`/dashboard/${dispute.project_id}`);
    return { success: true, message: "Dispute marked under review." };
}

export async function resolveProjectDispute(disputeId: string, resolutionType: string, resolution: string): Promise<ActionResult> {
    const auth = await requireAdmin();
    if (!auth.userId) return { success: false, message: auth.error || "Unauthorized." };

    if (!resolutionTypes.has(resolutionType)) return { success: false, message: "Invalid resolution type." };
    const cleanResolution = resolution.trim();
    if (!cleanResolution) return { success: false, message: "Resolution note is required." };

    const admin = createAdminClient();
    const { data: dispute, error } = await admin
        .from("project_disputes")
        .select("id, project_id, status, projects(id, title, client_id, selected_creator_id)")
        .eq("id", disputeId)
        .single();

    if (error || !dispute) return { success: false, message: "Dispute not found." };
    if (!["open", "under_review"].includes(dispute.status)) return { success: false, message: "Dispute has already been resolved." };

    const project = Array.isArray(dispute.projects) ? dispute.projects[0] : dispute.projects;
    if (!project) return { success: false, message: "Project not found." };

    const now = new Date().toISOString();
    const { error: disputeUpdateError } = await admin
        .from("project_disputes")
        .update({
            status: "resolved",
            resolution_type: resolutionType,
            resolution: cleanResolution,
            resolved_at: now,
        })
        .eq("id", disputeId);

    if (disputeUpdateError) {
        console.error("Resolve dispute update error:", disputeUpdateError);
        return { success: false, message: "Could not resolve dispute." };
    }

    const projectStatus = resolutionType === "refund" ? "cancelled" : "completed";
    const paymentStatus = resolutionType === "refund" ? "refunded" : "released";

    // TODO future payment automation:
    // - automate refund through Razorpay
    // - automate payout/release through Razorpay Route
    // - record commission impact
    // - update creator reputation score
    const { error: projectUpdateError } = await admin
        .from("projects")
        .update({ status: projectStatus, payment_status: paymentStatus })
        .eq("id", project.id);

    if (projectUpdateError) {
        console.error("Resolve dispute project update error:", projectUpdateError);
        return { success: false, message: "Dispute was resolved, but project status could not be updated." };
    }

    await admin
        .from("payments")
        .update({ status: paymentStatus })
        .eq("project_id", project.id)
        .in("status", ["paid", "captured", "disputed"]);

    const notifications = [
        {
            user_id: project.client_id,
            project_id: project.id,
            creator_id: project.selected_creator_id,
            type: "dispute_resolved",
            title: "Dispute resolved",
            message: `Dispute resolved: ${resolutionType.replace(/_/g, " ")}.`,
            data: { project_id: project.id, dispute_id: disputeId, resolution_type: resolutionType, cta_url: `/dashboard/${project.id}` },
        },
    ];

    if (project.selected_creator_id) {
        notifications.push({
            user_id: project.selected_creator_id,
            project_id: project.id,
            creator_id: project.selected_creator_id,
            type: "dispute_resolved",
            title: "Dispute resolved",
            message: `Dispute resolved: ${resolutionType.replace(/_/g, " ")}.`,
            data: { project_id: project.id, dispute_id: disputeId, resolution_type: resolutionType, cta_url: "/creator-dashboard" },
        });
    }

    const { error: notificationError } = await admin.from("notifications").insert(notifications);
    if (notificationError) console.error("Dispute resolved notification error:", notificationError);

    revalidatePath("/admin/disputes");
    revalidatePath(`/dashboard/${project.id}`);
    return { success: true, message: "Dispute resolved." };
}

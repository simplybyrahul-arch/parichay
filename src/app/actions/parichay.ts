"use server";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

type ActionResult = {
    success: boolean;
    message: string;
};

const coordinatorProjectStatuses = new Set(["confirmed", "in_progress"]);

function getRequiredEnv(name: string) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not configured`);
    }
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

    if (!user) {
        return { userId: null, error: "Unauthorized." };
    }

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

async function getAssignableProject(admin: ReturnType<typeof createAdminClient>, projectId: string) {
    const { data: project, error } = await admin
        .from("projects")
        .select("id, title, client_id, selected_creator_id, status, payment_status")
        .eq("id", projectId)
        .single();

    if (error || !project) {
        return { project: null, error: "Project not found." };
    }

    if (!coordinatorProjectStatuses.has(String(project.status))) {
        return { project: null, error: "Only confirmed or in-progress bookings can receive a Parichay coordinator." };
    }

    return { project, error: null };
}

async function getCoordinator(admin: ReturnType<typeof createAdminClient>, coordinatorUserId: string) {
    const { data: coordinator, error } = await admin
        .from("users")
        .select("id, account_type")
        .eq("id", coordinatorUserId)
        .single();

    if (error || !coordinator) {
        return { coordinator: null, error: "Coordinator user not found." };
    }

    // TODO: Add a dedicated coordinator/team_member account role later.
    if (!["admin", "coordinator"].includes(String(coordinator.account_type))) {
        return { coordinator: null, error: "Coordinator must be an admin user for now." };
    }

    return { coordinator, error: null };
}

async function notifyAssignment(
    admin: ReturnType<typeof createAdminClient>,
    project: { id: string; client_id: string; selected_creator_id: string | null; title: string },
    coordinatorUserId: string
) {
    const notifications = [
        {
            user_id: project.client_id,
            project_id: project.id,
            creator_id: project.selected_creator_id,
            type: "parichay_coordinator_assigned",
            title: "Parichay coordinator assigned",
            message: "A Parichay coordinator has been assigned for your booking.",
            data: {
                project_id: project.id,
                coordinator_user_id: coordinatorUserId,
                cta_url: `/dashboard/${project.id}`,
            },
        },
        {
            user_id: coordinatorUserId,
            project_id: project.id,
            creator_id: project.selected_creator_id,
            type: "parichay_assignment",
            title: "New Parichay assignment",
            message: `You have been assigned to coordinate ${project.title}.`,
            data: {
                project_id: project.id,
                coordinator_user_id: coordinatorUserId,
                cta_url: "/admin/parichay",
            },
        },
    ];

    if (project.selected_creator_id) {
        notifications.push({
            user_id: project.selected_creator_id,
            project_id: project.id,
            creator_id: project.selected_creator_id,
            type: "parichay_coordinator_assigned",
            title: "Parichay coordinator assigned",
            message: "A Parichay coordinator has been assigned for this booking.",
            data: {
                project_id: project.id,
                coordinator_user_id: coordinatorUserId,
                cta_url: "/creator-dashboard",
            },
        });
    }

    const { error } = await admin.from("notifications").insert(notifications);
    if (error) {
        console.error("Parichay assignment notification error:", error);
    }
}

async function saveCoordinator(projectId: string, coordinatorUserId: string, message: string): Promise<ActionResult> {
    const auth = await requireAdmin();
    if (!auth.userId) {
        return { success: false, message: auth.error || "Unauthorized." };
    }

    const admin = createAdminClient();
    const { project, error: projectError } = await getAssignableProject(admin, projectId);
    if (projectError || !project) {
        return { success: false, message: projectError || "Project not found." };
    }

    const { error: coordinatorError } = await getCoordinator(admin, coordinatorUserId);
    if (coordinatorError) {
        return { success: false, message: coordinatorError };
    }

    const { error: updateError } = await admin
        .from("projects")
        .update({
            parichay_coordinator_id: coordinatorUserId,
            parichay_assigned: true,
        })
        .eq("id", projectId);

    if (updateError) {
        console.error("Parichay coordinator update error:", updateError);
        return { success: false, message: "Could not assign Parichay coordinator." };
    }

    await notifyAssignment(admin, project, coordinatorUserId);
    revalidatePath("/admin/parichay");
    revalidatePath("/admin/projects");
    revalidatePath(`/dashboard/${projectId}`);

    return { success: true, message };
}

export async function assignParichayCoordinator(projectId: string, coordinatorUserId: string) {
    return saveCoordinator(projectId, coordinatorUserId, "Parichay coordinator assigned.");
}

export async function changeParichayCoordinator(projectId: string, coordinatorUserId: string) {
    return saveCoordinator(projectId, coordinatorUserId, "Parichay coordinator changed.");
}

export async function unassignParichayCoordinator(projectId: string): Promise<ActionResult> {
    const auth = await requireAdmin();
    if (!auth.userId) {
        return { success: false, message: auth.error || "Unauthorized." };
    }

    const admin = createAdminClient();
    const { project, error: projectError } = await getAssignableProject(admin, projectId);
    if (projectError || !project) {
        return { success: false, message: projectError || "Project not found." };
    }

    const { error: updateError } = await admin
        .from("projects")
        .update({
            parichay_coordinator_id: null,
            parichay_assigned: false,
        })
        .eq("id", projectId);

    if (updateError) {
        console.error("Parichay coordinator unassign error:", updateError);
        return { success: false, message: "Could not unassign Parichay coordinator." };
    }

    revalidatePath("/admin/parichay");
    revalidatePath("/admin/projects");
    revalidatePath(`/dashboard/${projectId}`);

    return { success: true, message: "Parichay coordinator unassigned." };
}

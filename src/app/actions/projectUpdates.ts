"use server";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export type ProjectUpdate = {
    id: string;
    project_id: string;
    user_id: string;
    title: string;
    message: string | null;
    status: string;
    created_at: string;
    author_name: string | null;
};

type ActionResult = {
    success: boolean;
    message: string;
};

type ProjectRow = {
    id: string;
    client_id: string;
    creator_id: string | null;
    selected_creator_id: string | null;
    parichay_coordinator_id: string | null;
    status: string | null;
};

const allowedUpdateStatuses = new Set(["update", "milestone", "in_progress", "delivered", "completed"]);

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

async function getActor() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { userId: null, accountType: null, error: "Unauthorized." };

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("account_type").eq("id", user.id).single();
    return { userId: user.id, accountType: String(profile?.account_type || ""), error: null };
}

function isParticipant(project: ProjectRow, userId: string, accountType: string | null) {
    return accountType === "admin"
        || project.client_id === userId
        || project.creator_id === userId
        || project.selected_creator_id === userId
        || project.parichay_coordinator_id === userId;
}

function canWriteTimeline(project: ProjectRow, userId: string, accountType: string | null) {
    return accountType === "admin"
        || project.creator_id === userId
        || project.selected_creator_id === userId
        || project.parichay_coordinator_id === userId;
}

async function getProjectForActor(admin: ReturnType<typeof createAdminClient>, projectId: string, userId: string, accountType: string | null) {
    const { data: project, error } = await admin
        .from("projects")
        .select("id, client_id, creator_id, selected_creator_id, parichay_coordinator_id, status")
        .eq("id", projectId)
        .single();

    if (error || !project) return { project: null, error: "Project not found." };
    const typedProject = project as ProjectRow;
    if (!isParticipant(typedProject, userId, accountType)) {
        return { project: null, error: "You do not have access to this project timeline." };
    }

    return { project: typedProject, error: null };
}

export async function listProjectUpdates(projectId: string): Promise<ProjectUpdate[]> {
    const actor = await getActor();
    if (!actor.userId) return [];

    const admin = createAdminClient();
    const { project } = await getProjectForActor(admin, projectId, actor.userId, actor.accountType);
    if (!project) return [];

    const { data: updates, error } = await admin
        .from("project_updates")
        .select("id, project_id, user_id, title, message, status, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

    if (error || !updates?.length) {
        if (error) console.error("Project updates fetch error:", error);
        return [];
    }

    const userIds = Array.from(new Set(updates.map((update) => update.user_id).filter(Boolean)));
    const { data: users } = userIds.length
        ? await admin.from("users").select("id, full_name").in("id", userIds)
        : { data: [] };

    const usersById = new Map((users || []).map((user) => [user.id, user.full_name as string | null]));

    return updates.map((update) => ({
        id: String(update.id),
        project_id: String(update.project_id),
        user_id: String(update.user_id),
        title: String(update.title),
        message: (update.message as string | null) || null,
        status: String(update.status),
        created_at: String(update.created_at),
        author_name: usersById.get(update.user_id) || null,
    }));
}

export async function addProjectUpdate(
    projectId: string,
    title: string,
    message: string,
    status: string = "update"
): Promise<ActionResult> {
    const actor = await getActor();
    if (!actor.userId) return { success: false, message: actor.error || "Unauthorized." };

    const cleanTitle = title.trim();
    const cleanMessage = message.trim();
    const cleanStatus = allowedUpdateStatuses.has(status) ? status : "update";
    if (!cleanTitle) return { success: false, message: "Timeline title is required." };

    const admin = createAdminClient();
    const { project, error } = await getProjectForActor(admin, projectId, actor.userId, actor.accountType);
    if (!project) return { success: false, message: error || "Project not found." };
    if (!canWriteTimeline(project, actor.userId, actor.accountType)) {
        return { success: false, message: "Only the selected creator or ShotcutCrew team can add timeline updates." };
    }
    if (["cancelled", "expired", "disputed"].includes(String(project.status))) {
        return { success: false, message: "Timeline updates are closed for this project." };
    }

    const { error: insertError } = await admin.from("project_updates").insert({
        project_id: projectId,
        user_id: actor.userId,
        title: cleanTitle,
        message: cleanMessage || null,
        status: cleanStatus,
    });

    if (insertError) return { success: false, message: "Could not add timeline update." };

    if (cleanStatus === "in_progress" && project.status === "confirmed") {
        await admin.from("projects").update({ status: "in_progress" }).eq("id", projectId);
    }

    if (cleanStatus === "delivered" && ["confirmed", "in_progress"].includes(String(project.status))) {
        await admin.from("projects").update({ status: "delivered", delivered_at: new Date().toISOString() }).eq("id", projectId);
    }

    if (cleanStatus === "completed" && actor.accountType === "admin") {
        const { data: financial } = await admin
            .from("booking_financials")
            .select("id")
            .eq("booking_id", projectId)
            .neq("payout_status", "completed")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (financial?.id) {
            const { error: payoutReadyError } = await admin.rpc("mark_booking_financial_payout_ready", {
                p_booking_financial_id: financial.id,
            });
            if (payoutReadyError) console.error("Timeline payout ready error:", payoutReadyError);
        }
    }

    revalidatePath(`/dashboard/${projectId}`);
    revalidatePath(`/opportunities/${projectId}`);
    revalidatePath("/creator-dashboard");

    return { success: true, message: "Timeline update added." };
}

"use server";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

type ActionResult = {
    success: boolean;
    message: string;
};

export type InterestedCreator = {
    invite_id: string;
    creator_id: string;
    name: string;
    role: string | null;
    city: string | null;
    location: string | null;
    day_rate: number | null;
    verified: boolean | null;
    portfolio_url: string | null;
    profile_image_url: string | null;
    response_note: string | null;
    availability_note: string | null;
    responded_at: string | null;
    invite_status: string;
    match_reason: string | null;
    match_score: number | null;
};

export type ClientProjectSelectionDetail = {
    project: {
        id: string;
        title: string;
        description: string | null;
        budget: number;
        status: string;
        payment_status: string | null;
        created_at: string;
        start_date: string | null;
        end_date: string | null;
        creator_id: string | null;
        selected_creator_id: string | null;
        selected_at: string | null;
        booking_type: string | null;
        booking_location: string | null;
        event_date: string | null;
        estimated_days: number | null;
        requirement_summary: string | null;
        parichay_assigned: boolean | null;
        parichay_coordinator_id: string | null;
        parichay_coordinator_name: string | null;
        delivered_at: string | null;
    };
    interested_creators: InterestedCreator[];
    selected_creator: InterestedCreator | null;
};

const selectableProjectStatuses = new Set(["open", "matching", "receiving_interest", "client_selecting"]);
const lockedProjectStatuses = new Set(["pending_payment", "confirmed", "in_progress", "completed", "cancelled", "expired", "disputed"]);

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

async function getAuthenticatedClientOrAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "You must be logged in.", userId: null, isAdmin: false };
    }

    const admin = createAdminClient();
    const { data: profile, error } = await admin
        .from("users")
        .select("account_type")
        .eq("id", user.id)
        .single();

    if (error || !profile) {
        return { error: "User profile was not found.", userId: null, isAdmin: false };
    }

    const accountType = String(profile.account_type || "");
    if (accountType !== "client" && accountType !== "admin") {
        return { error: "Only the project client can manage creator selection.", userId: null, isAdmin: false };
    }

    return { error: null, userId: user.id, isAdmin: accountType === "admin" };
}

async function getOwnedProject(admin: ReturnType<typeof createAdminClient>, projectId: string, userId: string, isAdmin: boolean) {
    const { data: project, error } = await admin
        .from("projects")
        .select("id, client_id, title, description, budget, status, payment_status, created_at, start_date, end_date, creator_id, selected_creator_id, selected_at, booking_type, booking_location, event_date, estimated_days, requirement_summary, parichay_assigned, parichay_coordinator_id, delivered_at")
        .eq("id", projectId)
        .single();

    if (error || !project) {
        return { project: null, error: "Project not found." };
    }

    if (!isAdmin && project.client_id !== userId) {
        return { project: null, error: "You do not have permission to manage this project." };
    }

    return { project, error: null };
}

function mapProject(project: Record<string, unknown>): ClientProjectSelectionDetail["project"] {
    return {
        id: String(project.id),
        title: String(project.title || "Untitled project"),
        description: (project.description as string | null) || null,
        budget: Number(project.budget || 0),
        status: String(project.status || ""),
        payment_status: (project.payment_status as string | null) || null,
        created_at: String(project.created_at),
        start_date: (project.start_date as string | null) || null,
        end_date: (project.end_date as string | null) || null,
        creator_id: (project.creator_id as string | null) || null,
        selected_creator_id: (project.selected_creator_id as string | null) || null,
        selected_at: (project.selected_at as string | null) || null,
        booking_type: (project.booking_type as string | null) || null,
        booking_location: (project.booking_location as string | null) || null,
        event_date: (project.event_date as string | null) || null,
        estimated_days: (project.estimated_days as number | null) || null,
        requirement_summary: (project.requirement_summary as string | null) || null,
        parichay_assigned: (project.parichay_assigned as boolean | null) || false,
        parichay_coordinator_id: (project.parichay_coordinator_id as string | null) || null,
        parichay_coordinator_name: (project.parichay_coordinator_name as string | null) || null,
        delivered_at: (project.delivered_at as string | null) || null,
    };
}

async function loadInterestedCreators(admin: ReturnType<typeof createAdminClient>, projectId: string) {
    const { data: invites, error: inviteError } = await admin
        .from("project_invites")
        .select("id, creator_id, status, response_note, availability_note, responded_at, match_reason, match_score")
        .eq("project_id", projectId)
        .in("status", ["interested", "shortlisted", "selected"])
        .order("responded_at", { ascending: true, nullsFirst: false });

    if (inviteError || !invites?.length) {
        if (inviteError) console.error("Interested creator invite fetch error:", inviteError);
        return [];
    }

    const creatorIds = invites.map((invite) => invite.creator_id).filter(Boolean);

    const { data: creators, error: creatorError } = await admin
        .from("creators")
        .select("id, role, city, location, day_rate, verified, portfolio_url, profile_image_url")
        .in("id", creatorIds);

    if (creatorError) {
        console.error("Interested creator profile fetch error:", creatorError);
    }

    const { data: users, error: userError } = await admin
        .from("users")
        .select("id, full_name")
        .in("id", creatorIds);

    if (userError) {
        console.error("Interested creator user fetch error:", userError);
    }

    const creatorsById = new Map((creators || []).map((creator) => [creator.id, creator]));
    const usersById = new Map((users || []).map((user) => [user.id, user]));

    return invites.map((invite): InterestedCreator => {
        const creator = creatorsById.get(invite.creator_id);
        const creatorUser = usersById.get(invite.creator_id);

        return {
            invite_id: String(invite.id),
            creator_id: String(invite.creator_id),
            name: String(creatorUser?.full_name || "Verified Creator"),
            role: (creator?.role as string | null) || null,
            city: (creator?.city as string | null) || null,
            location: (creator?.location as string | null) || null,
            day_rate: (creator?.day_rate as number | null) || null,
            verified: (creator?.verified as boolean | null) || null,
            portfolio_url: (creator?.portfolio_url as string | null) || null,
            profile_image_url: (creator?.profile_image_url as string | null) || null,
            response_note: (invite.response_note as string | null) || null,
            availability_note: (invite.availability_note as string | null) || null,
            responded_at: (invite.responded_at as string | null) || null,
            invite_status: String(invite.status || ""),
            match_reason: (invite.match_reason as string | null) || null,
            match_score: (invite.match_score as number | null) || null,
        };
    });
}

export async function getClientProjectSelectionDetail(projectId: string): Promise<{ success: boolean; message: string; detail?: ClientProjectSelectionDetail }> {
    const auth = await getAuthenticatedClientOrAdmin();
    if (!auth.userId) {
        return { success: false, message: auth.error || "Unauthorized." };
    }

    const admin = createAdminClient();
    const { project, error } = await getOwnedProject(admin, projectId, auth.userId, auth.isAdmin);
    if (error || !project) {
        return { success: false, message: error || "Project not found." };
    }

    const interestedCreators = await loadInterestedCreators(admin, projectId);
    const selectedCreatorId = project.selected_creator_id || project.creator_id || null;
    const selectedCreator = selectedCreatorId
        ? interestedCreators.find((creator) => creator.creator_id === selectedCreatorId) || null
        : null;
    let coordinatorName: string | null = null;

    if (project.parichay_coordinator_id) {
        const { data: coordinator } = await admin
            .from("users")
            .select("full_name")
            .eq("id", project.parichay_coordinator_id)
            .single();
        coordinatorName = coordinator?.full_name || null;
    }

    const mappedProject = mapProject(project);
    mappedProject.parichay_coordinator_name = coordinatorName;

    return {
        success: true,
        message: "Project loaded.",
        detail: {
            project: mappedProject,
            interested_creators: interestedCreators,
            selected_creator: selectedCreator,
        },
    };
}

export async function shortlistCreator(projectId: string, inviteId: string): Promise<ActionResult> {
    const auth = await getAuthenticatedClientOrAdmin();
    if (!auth.userId) {
        return { success: false, message: auth.error || "Unauthorized." };
    }

    const admin = createAdminClient();
    const { project, error } = await getOwnedProject(admin, projectId, auth.userId, auth.isAdmin);
    if (error || !project) {
        return { success: false, message: error || "Project not found." };
    }

    if (lockedProjectStatuses.has(String(project.status)) || project.selected_creator_id) {
        return { success: false, message: "This project is no longer accepting shortlist changes." };
    }

    const { data: invite, error: inviteError } = await admin
        .from("project_invites")
        .select("id, project_id, status")
        .eq("id", inviteId)
        .eq("project_id", projectId)
        .single();

    if (inviteError || !invite) {
        return { success: false, message: "Creator invite was not found." };
    }

    if (invite.status !== "interested") {
        return { success: false, message: "Only interested creators can be shortlisted." };
    }

    const { error: updateError } = await admin
        .from("project_invites")
        .update({ status: "shortlisted" })
        .eq("id", inviteId);

    if (updateError) {
        console.error("Shortlist creator error:", updateError);
        return { success: false, message: "Could not shortlist creator." };
    }

    revalidatePath(`/dashboard/${projectId}`);
    return { success: true, message: "Creator shortlisted." };
}

export async function selectCreator(projectId: string, inviteId: string): Promise<ActionResult> {
    const auth = await getAuthenticatedClientOrAdmin();
    if (!auth.userId) {
        return { success: false, message: auth.error || "Unauthorized." };
    }

    const admin = createAdminClient();
    const { project, error } = await getOwnedProject(admin, projectId, auth.userId, auth.isAdmin);
    if (error || !project) {
        return { success: false, message: error || "Project not found." };
    }

    if (project.selected_creator_id) {
        return { success: false, message: "A creator has already been selected for this project." };
    }

    if (!selectableProjectStatuses.has(String(project.status))) {
        return { success: false, message: "This project is not open for creator selection." };
    }

    const { data: invite, error: inviteError } = await admin
        .from("project_invites")
        .select("id, project_id, creator_id, status")
        .eq("id", inviteId)
        .eq("project_id", projectId)
        .single();

    if (inviteError || !invite) {
        return { success: false, message: "Creator invite was not found." };
    }

    if (!["interested", "shortlisted"].includes(String(invite.status))) {
        return { success: false, message: "Only interested or shortlisted creators can be selected." };
    }

    const now = new Date().toISOString();

    const { error: projectUpdateError } = await admin
        .from("projects")
        .update({
            selected_creator_id: invite.creator_id,
            selected_at: now,
            status: "confirmed",
            payment_status: "qr_pending",
        })
        .eq("id", projectId)
        .is("selected_creator_id", null);

    if (projectUpdateError) {
        console.error("Select creator project update error:", projectUpdateError);
        return { success: false, message: "Could not select creator." };
    }

    const { error: selectedInviteError } = await admin
        .from("project_invites")
        .update({ status: "selected" })
        .eq("id", inviteId);

    if (selectedInviteError) {
        console.error("Select creator invite update error:", selectedInviteError);
        return { success: false, message: "Creator was selected, but invite status could not be updated." };
    }

    const { data: otherInvites } = await admin
        .from("project_invites")
        .select("id, creator_id")
        .eq("project_id", projectId)
        .neq("id", inviteId)
        .in("status", ["interested", "shortlisted", "viewed", "sent"]);

    const { error: otherInviteError } = await admin
        .from("project_invites")
        .update({ status: "not_selected" })
        .eq("project_id", projectId)
        .neq("id", inviteId)
        .in("status", ["interested", "shortlisted", "viewed", "sent"]);

    if (otherInviteError) {
        console.error("Non-selected invite update error:", otherInviteError);
    }

    const { error: selectedNotificationError } = await admin
        .from("notifications")
        .insert({
            user_id: invite.creator_id,
            project_id: projectId,
            creator_id: invite.creator_id,
            type: "creator_selected",
            title: "You were selected for a booking",
            message: `The client selected you for ${project.title}. Booking is confirmed. QR payment will be verified after delivery.`,
            data: {
                project_id: projectId,
                invite_id: inviteId,
                cta_url: `/opportunities/${projectId}`,
            },
        });

    if (selectedNotificationError) {
        console.error("Selected creator notification error:", selectedNotificationError);
    }

    if (otherInvites?.length) {
        const notifications = otherInvites.map((otherInvite) => ({
            user_id: otherInvite.creator_id,
            project_id: projectId,
            creator_id: otherInvite.creator_id,
            type: "creator_not_selected",
            title: "Booking update",
            message: `The client selected another creator for ${project.title}.`,
            data: {
                project_id: projectId,
                invite_id: otherInvite.id,
                cta_url: "/creator-dashboard",
            },
        }));

        const { error: notSelectedNotificationError } = await admin
            .from("notifications")
            .insert(notifications);

        if (notSelectedNotificationError) {
            console.error("Non-selected creator notifications error:", notSelectedNotificationError);
        }
    }

    revalidatePath(`/dashboard/${projectId}`);
    revalidatePath("/dashboard");

    return {
        success: true,
        message: "Creator selected. Booking confirmed. QR payment will be collected after delivery.",
    };
}

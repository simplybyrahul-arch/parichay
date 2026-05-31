"use server";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { sendBookingEmailToUser } from "@/lib/email/bookingEmails";

export type OpportunityStatus = "sent" | "viewed" | "interested" | "declined" | "shortlisted" | "selected" | "not_selected" | "inactive";

export type CreatorOpportunity = {
    invite_id: string;
    project_id: string;
    title: string;
    description: string | null;
    booking_type: string | null;
    booking_location: string | null;
    event_date: string | null;
    estimated_days: number | null;
    budget: number | null;
    requirement_summary: string | null;
    project_status: string;
    match_reason: string | null;
    invite_status: OpportunityStatus;
    response_note: string | null;
    availability_note: string | null;
    created_at: string;
    viewed_at: string | null;
    responded_at: string | null;
};

type ActionResult = {
    success: boolean;
    message: string;
};

const activeProjectStatuses = new Set(["open", "matching", "receiving_interest", "client_selecting"]);

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

async function getAuthenticatedCreator() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "You must be logged in as a creator.", creatorId: null };
    }

    const admin = createAdminClient();
    const { data: creator, error } = await admin
        .from("creators")
        .select("id")
        .eq("id", user.id)
        .single();

    if (error || !creator) {
        return { error: "Creator profile was not found.", creatorId: null };
    }

    return { error: null, creatorId: creator.id as string };
}

async function getInviteForCreator(projectId: string, creatorId: string) {
    const admin = createAdminClient();

    const { data: invite, error: inviteError } = await admin
        .from("project_invites")
        .select("id, project_id, creator_id, status, match_reason, response_note, availability_note, created_at, viewed_at, responded_at")
        .eq("project_id", projectId)
        .eq("creator_id", creatorId)
        .single();

    if (inviteError || !invite) {
        return { admin, invite: null, project: null, error: "Opportunity not found or you do not have access." };
    }

    const { data: project, error: projectError } = await admin
        .from("projects")
        .select("id, title, description, client_id, booking_type, booking_location, event_date, estimated_days, budget, requirement_summary, status")
        .eq("id", projectId)
        .single();

    if (projectError || !project) {
        return { admin, invite: null, project: null, error: "Project details could not be loaded." };
    }

    return { admin, invite, project, error: null };
}

async function getAssignedProjectForCreator(projectId: string, creatorId: string) {
    const admin = createAdminClient();

    const { data: project, error } = await admin
        .from("projects")
        .select("id, title, description, booking_type, booking_location, event_date, estimated_days, budget, requirement_summary, status, creator_id, selected_creator_id, created_at")
        .eq("id", projectId)
        .single();

    if (error || !project) {
        return { admin, invite: null, project: null, error: "Project details could not be loaded." };
    }

    if (project.creator_id !== creatorId && project.selected_creator_id !== creatorId) {
        return { admin, invite: null, project: null, error: "Opportunity not found or you do not have access." };
    }

    return {
        admin,
        invite: {
            id: `assigned-${project.id}`,
            status: "selected",
            match_reason: "You are assigned to this booking.",
            response_note: null,
            availability_note: null,
            created_at: project.created_at,
            viewed_at: null,
            responded_at: null,
        },
        project,
        error: null,
    };
}

function mapOpportunity(invite: Record<string, unknown>, project: Record<string, unknown>): CreatorOpportunity {
    return {
        invite_id: String(invite.id),
        project_id: String(project.id),
        title: String(project.title || "Untitled booking"),
        description: (project.description as string | null) || null,
        booking_type: (project.booking_type as string | null) || null,
        booking_location: (project.booking_location as string | null) || null,
        event_date: (project.event_date as string | null) || null,
        estimated_days: (project.estimated_days as number | null) || null,
        budget: (project.budget as number | null) || null,
        requirement_summary: (project.requirement_summary as string | null) || null,
        project_status: String(project.status || ""),
        match_reason: (invite.match_reason as string | null) || null,
        invite_status: invite.status as OpportunityStatus,
        response_note: (invite.response_note as string | null) || null,
        availability_note: (invite.availability_note as string | null) || null,
        created_at: String(invite.created_at),
        viewed_at: (invite.viewed_at as string | null) || null,
        responded_at: (invite.responded_at as string | null) || null,
    };
}

export async function listCreatorOpportunities(): Promise<CreatorOpportunity[]> {
    const auth = await getAuthenticatedCreator();
    if (!auth.creatorId) return [];

    const admin = createAdminClient();
    const { data: invites, error: inviteError } = await admin
        .from("project_invites")
        .select("id, project_id, status, match_reason, response_note, availability_note, created_at, viewed_at, responded_at")
        .eq("creator_id", auth.creatorId)
        .order("created_at", { ascending: false });

    if (inviteError || !invites?.length) {
        if (inviteError) console.error("Creator opportunities fetch error:", inviteError);
        return [];
    }

    const projectIds = invites.map((invite) => invite.project_id).filter(Boolean);
    const { data: projects, error: projectError } = await admin
        .from("projects")
        .select("id, title, description, booking_type, booking_location, event_date, estimated_days, budget, requirement_summary, status")
        .in("id", projectIds);

    if (projectError || !projects) {
        console.error("Creator opportunity project fetch error:", projectError);
        return [];
    }

    const projectsById = new Map(projects.map((project) => [project.id, project]));

    return invites
        .map((invite) => {
            const project = projectsById.get(invite.project_id);
            return project ? mapOpportunity(invite, project) : null;
        })
        .filter((item): item is CreatorOpportunity => Boolean(item));
}

export async function getOpportunityDetail(projectId: string): Promise<{ success: boolean; message: string; opportunity?: CreatorOpportunity }> {
    const auth = await getAuthenticatedCreator();
    if (!auth.creatorId) {
        return { success: false, message: auth.error || "Unauthorized." };
    }

    const { invite, project, error } = await getInviteForCreator(projectId, auth.creatorId);
    if (error || !invite || !project) {
        const fallback = await getAssignedProjectForCreator(projectId, auth.creatorId);
        if (!fallback.invite || !fallback.project) {
            return { success: false, message: error || fallback.error || "Opportunity not found." };
        }

        return {
            success: true,
            message: "Project loaded.",
            opportunity: mapOpportunity(fallback.invite, fallback.project),
        };
    }

    return {
        success: true,
        message: "Opportunity loaded.",
        opportunity: mapOpportunity(invite, project),
    };
}

export async function markOpportunityViewed(projectId: string): Promise<ActionResult> {
    const auth = await getAuthenticatedCreator();
    if (!auth.creatorId) {
        return { success: false, message: auth.error || "Unauthorized." };
    }

    const { admin, invite, error } = await getInviteForCreator(projectId, auth.creatorId);
    if (error || !invite) {
        const fallback = await getAssignedProjectForCreator(projectId, auth.creatorId);
        if (fallback.project) {
            return { success: true, message: "Assigned project loaded." };
        }

        return { success: false, message: error || "Opportunity not found." };
    }

    const update: Record<string, string> = {};
    if (!invite.viewed_at) update.viewed_at = new Date().toISOString();
    if (invite.status === "sent") update.status = "viewed";

    if (Object.keys(update).length > 0) {
        const { error: updateError } = await admin
            .from("project_invites")
            .update(update)
            .eq("id", invite.id);

        if (updateError) {
            console.error("Mark opportunity viewed error:", updateError);
            return { success: false, message: "Could not mark opportunity as viewed." };
        }
    }

    const now = new Date().toISOString();
    const { error: notificationError } = await admin
        .from("notifications")
        .update({ read: true, read_at: now })
        .eq("user_id", auth.creatorId)
        .eq("project_id", projectId)
        .eq("type", "booking_opportunity")
        .eq("read", false);

    if (notificationError) {
        console.error("Opportunity notification read update error:", notificationError);
    }

    revalidatePath(`/opportunities/${projectId}`);
    revalidatePath("/creator-dashboard");

    return { success: true, message: "Opportunity marked as viewed." };
}

export async function validateWhatsAppInviteLink(
    projectId: string,
    creatorId: string | null,
    token: string | null
): Promise<ActionResult> {
    if (!creatorId || !token) {
        return { success: false, message: "Missing WhatsApp invite token." };
    }

    const admin = createAdminClient();

    const { data: invite, error: inviteError } = await admin
        .from("project_invites")
        .select("id, project_id, creator_id, status, secure_token, secure_token_expires_at, viewed_at")
        .eq("project_id", projectId)
        .eq("creator_id", creatorId)
        .single();

    if (inviteError || !invite) {
        return { success: false, message: "Invite link is invalid." };
    }

    if (invite.secure_token !== token) {
        return { success: false, message: "Invite link token does not match." };
    }

    if (!invite.secure_token_expires_at || new Date(invite.secure_token_expires_at).getTime() <= Date.now()) {
        return { success: false, message: "Invite link has expired. Please log in to view the opportunity." };
    }

    const update: Record<string, string> = {};
    if (!invite.viewed_at) update.viewed_at = new Date().toISOString();
    if (invite.status === "sent") update.status = "viewed";

    if (Object.keys(update).length > 0) {
        const { error: updateError } = await admin
            .from("project_invites")
            .update(update)
            .eq("id", invite.id);

        if (updateError) {
            console.error("WhatsApp invite tracking update error:", updateError);
            return { success: false, message: "Invite link was valid, but tracking could not be updated." };
        }
    }

    const { error: notificationError } = await admin
        .from("notifications")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("user_id", creatorId)
        .eq("project_id", projectId)
        .eq("type", "booking_opportunity")
        .eq("read", false);

    if (notificationError) {
        console.error("WhatsApp invite notification read update error:", notificationError);
    }

    revalidatePath(`/opportunities/${projectId}`);
    revalidatePath("/creator-dashboard");

    return { success: true, message: "WhatsApp invite link verified. Please log in to respond." };
}

export async function respondToOpportunity(
    projectId: string,
    status: "interested" | "declined",
    responseNote?: string,
    availabilityNote?: string
): Promise<ActionResult> {
    if (status !== "interested" && status !== "declined") {
        return { success: false, message: "Invalid response status." };
    }

    const auth = await getAuthenticatedCreator();
    if (!auth.creatorId) {
        return { success: false, message: auth.error || "Unauthorized." };
    }

    const { admin, invite, project, error } = await getInviteForCreator(projectId, auth.creatorId);
    if (error || !invite || !project) {
        return { success: false, message: error || "Opportunity not found." };
    }

    if (!activeProjectStatuses.has(String(project.status))) {
        return { success: false, message: "This booking is no longer accepting creator responses." };
    }

    const { error: updateError } = await admin
        .from("project_invites")
        .update({
            status,
            response_note: responseNote?.trim() || null,
            availability_note: availabilityNote?.trim() || null,
            responded_at: new Date().toISOString(),
        })
        .eq("id", invite.id)
        .eq("creator_id", auth.creatorId);

    if (updateError) {
        console.error("Opportunity response update error:", updateError);
        return { success: false, message: "Could not save your response." };
    }

    if (status === "interested" && ["open", "matching", "receiving_interest"].includes(String(project.status))) {
        const { error: projectError } = await admin
            .from("projects")
            .update({ status: "client_selecting" })
            .eq("id", projectId);

        if (projectError) {
            console.error("Opportunity project status update error:", projectError);
        }
    }

    if (status === "interested") {
        await sendBookingEmailToUser(admin, project.client_id, {
            type: "quote_received",
            bookingTitle: String(project.title || "Booking request"),
            message: "A creator is interested in your booking. Open ShotcutCrew to review their response and select a provider.",
            ctaUrl: `/dashboard/${projectId}`,
            amount: Number(project.budget || 0),
        });
    }

    revalidatePath(`/opportunities/${projectId}`);
    revalidatePath("/creator-dashboard");

    return {
        success: true,
        message: status === "interested" ? "Interest submitted successfully." : "Opportunity declined.",
    };
}

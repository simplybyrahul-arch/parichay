import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { activeOpportunityStatuses } from "@/lib/projects/status";

type ExpirableProject = {
    id: string;
    title: string;
    client_id: string;
    selected_creator_id: string | null;
    status: string;
};

type InviteToExpire = {
    id: string;
    project_id: string;
    creator_id: string;
    status: string;
};

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

function isAuthorized(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;

    const headerSecret = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const querySecret = req.nextUrl.searchParams.get("secret");

    return headerSecret === secret || querySecret === secret;
}

export async function GET(req: NextRequest) {
    return handleCron(req);
}

export async function POST(req: NextRequest) {
    return handleCron(req);
}

async function handleCron(req: NextRequest) {
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();

    const { data: projects, error: projectFetchError } = await admin
        .from("projects")
        .select("id, title, client_id, selected_creator_id, status")
        .not("expires_at", "is", null)
        .lt("expires_at", now)
        .is("selected_creator_id", null)
        .in("status", activeOpportunityStatuses);

    if (projectFetchError) {
        console.error("Expire bookings project fetch error:", projectFetchError);
        return NextResponse.json({ error: "Could not fetch expirable projects" }, { status: 500 });
    }

    const expirableProjects = (projects || []) as ExpirableProject[];
    let expiredProjectCount = 0;
    let updatedInviteCount = 0;
    let notificationCount = 0;

    for (const project of expirableProjects) {
        if (project.selected_creator_id || !activeOpportunityStatuses.includes(project.status as (typeof activeOpportunityStatuses)[number])) {
            continue;
        }

        const { data: invitesBeforeUpdate, error: inviteFetchError } = await admin
            .from("project_invites")
            .select("id, project_id, creator_id, status")
            .eq("project_id", project.id)
            .in("status", ["sent", "viewed", "interested", "shortlisted"]);

        if (inviteFetchError) {
            console.error("Expire bookings invite fetch error:", { projectId: project.id, inviteFetchError });
            continue;
        }

        const { error: projectUpdateError } = await admin
            .from("projects")
            .update({ status: "expired" })
            .eq("id", project.id)
            .is("selected_creator_id", null)
            .in("status", activeOpportunityStatuses);

        if (projectUpdateError) {
            console.error("Expire bookings project update error:", { projectId: project.id, projectUpdateError });
            continue;
        }

        expiredProjectCount += 1;

        const expirableInvites = (invitesBeforeUpdate || []) as InviteToExpire[];
        if (expirableInvites.length > 0) {
            const { error: inviteUpdateError } = await admin
                .from("project_invites")
                .update({ status: "inactive" })
                .eq("project_id", project.id)
                .in("status", ["sent", "viewed", "interested", "shortlisted"]);

            if (inviteUpdateError) {
                console.error("Expire bookings invite update error:", { projectId: project.id, inviteUpdateError });
            } else {
                updatedInviteCount += expirableInvites.length;
            }
        }

        const notifications = [
            {
                user_id: project.client_id,
                project_id: project.id,
                creator_id: null,
                type: "booking_expired",
                title: "Booking expired",
                message: "Your booking expired because no creator was selected within 72 hours.",
                data: {
                    project_id: project.id,
                    cta_url: `/dashboard/${project.id}`,
                },
            },
            ...expirableInvites
                .filter((invite) => ["interested", "shortlisted"].includes(invite.status))
                .map((invite) => ({
                    user_id: invite.creator_id,
                    project_id: project.id,
                    creator_id: invite.creator_id,
                    type: "booking_expired",
                    title: "Booking expired",
                    message: "This booking is no longer active.",
                    data: {
                        project_id: project.id,
                        cta_url: "/creator-dashboard",
                    },
                })),
        ];

        const { error: notificationError } = await admin
            .from("notifications")
            .insert(notifications);

        if (notificationError) {
            console.error("Expire bookings notification error:", { projectId: project.id, notificationError });
        } else {
            notificationCount += notifications.length;
        }
    }

    return NextResponse.json({
        success: true,
        expired_project_count: expiredProjectCount,
        updated_invite_count: updatedInviteCount,
        notification_count: notificationCount,
    });
}

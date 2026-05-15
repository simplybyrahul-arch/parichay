import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import {
    buildOpportunityUrl,
    buildWhatsAppOpportunityMessage,
    generateSecureInviteToken,
    getSecureTokenExpiry,
    isQuietHoursIST,
    sendWhatsAppMessage,
} from "@/lib/notifications/whatsapp";

type InviteRow = {
    id: string;
    project_id: string;
    creator_id: string;
    status: string;
    whatsapp_status: string;
    whatsapp_sent_at: string | null;
    whatsapp_reminder_sent_at: string | null;
    secure_token: string | null;
    secure_token_expires_at: string | null;
    viewed_at: string | null;
    created_at: string;
};

type ProjectRow = {
    id: string;
    title: string;
    status: string;
    booking_type: string | null;
    booking_location: string | null;
    event_date: string | null;
    budget: number | null;
    requirement_summary: string | null;
};

type CreatorRow = {
    id: string;
    verified: boolean | null;
    whatsapp_opt_in: boolean | null;
    available_for_booking: boolean | null;
    whatsapp_phone?: string | null;
};

const activeProjectStatuses = ["open", "matching", "receiving_interest", "client_selecting"];

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

    if (isQuietHoursIST()) {
        return NextResponse.json({ success: true, sent: 0, failed: 0, skipped: 0, message: "Skipped during quiet hours IST." });
    }

    const admin = createAdminClient();
    const firstInviteCutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const reminderCutoff = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

    const { data: firstInvites, error: firstError } = await admin
        .from("project_invites")
        .select("id, project_id, creator_id, status, whatsapp_status, whatsapp_sent_at, whatsapp_reminder_sent_at, secure_token, secure_token_expires_at, viewed_at, created_at")
        .in("whatsapp_status", ["not_sent", "queued"])
        .in("status", ["sent", "viewed"])
        .lte("created_at", firstInviteCutoff)
        .limit(50);

    if (firstError) {
        console.error("WhatsApp cron invite fetch error:", firstError);
        return NextResponse.json({ error: "Could not fetch WhatsApp invites" }, { status: 500 });
    }

    const { data: reminderInvites, error: reminderError } = await admin
        .from("project_invites")
        .select("id, project_id, creator_id, status, whatsapp_status, whatsapp_sent_at, whatsapp_reminder_sent_at, secure_token, secure_token_expires_at, viewed_at, created_at")
        .eq("status", "sent")
        .is("viewed_at", null)
        .is("whatsapp_reminder_sent_at", null)
        .lte("whatsapp_sent_at", reminderCutoff)
        .limit(50);

    if (reminderError) {
        console.error("WhatsApp cron reminder fetch error:", reminderError);
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const invite of (firstInvites || []) as InviteRow[]) {
        const result = await processInvite(admin, invite, "booking_invite");
        if (result === "sent") sent += 1;
        if (result === "failed") failed += 1;
        if (result === "skipped") skipped += 1;
    }

    for (const invite of (reminderInvites || []) as InviteRow[]) {
        const result = await processInvite(admin, invite, "booking_reminder");
        if (result === "sent") sent += 1;
        if (result === "failed") failed += 1;
        if (result === "skipped") skipped += 1;
    }

    return NextResponse.json({ success: true, sent, failed, skipped });
}

async function processInvite(
    admin: ReturnType<typeof createAdminClient>,
    invite: InviteRow,
    messageType: "booking_invite" | "booking_reminder"
) {
    try {
        const { data: project } = await admin
            .from("projects")
            .select("id, title, status, booking_type, booking_location, event_date, budget, requirement_summary")
            .eq("id", invite.project_id)
            .single();

        if (!project || !activeProjectStatuses.includes(project.status)) {
            await markInviteSkipped(admin, invite, "Project is not active for WhatsApp notifications");
            return "skipped";
        }

        const { data: creator } = await admin
            .from("creators")
            .select("id, verified, whatsapp_opt_in, available_for_booking, whatsapp_phone")
            .eq("id", invite.creator_id)
            .single();

        if (!creator?.verified || creator.whatsapp_opt_in === false || creator.available_for_booking === false) {
            await markInviteSkipped(admin, invite, "Creator is not eligible for WhatsApp notifications");
            return "skipped";
        }

        const { data: userProfile } = await admin
            .from("users")
            .select("id, whatsapp_phone")
            .eq("id", invite.creator_id)
            .single();

        const phone = normalizePhone((creator as CreatorRow).whatsapp_phone || userProfile?.whatsapp_phone || null);
        if (!phone) {
            await markInviteSkipped(admin, invite, "No WhatsApp phone number available");
            return "skipped";
        }

        const tokenData = await ensureInviteToken(admin, invite);
        const opportunityUrl = buildOpportunityUrl(invite.project_id, invite.creator_id, tokenData.token);
        const message = buildWhatsAppOpportunityMessage({
            bookingType: (project as ProjectRow).booking_type,
            bookingLocation: (project as ProjectRow).booking_location,
            eventDate: (project as ProjectRow).event_date,
            budget: (project as ProjectRow).budget,
            requirementSummary: (project as ProjectRow).requirement_summary,
            opportunityUrl,
            isReminder: messageType === "booking_reminder",
        });

        const { data: messageRow, error: messageInsertError } = await admin
            .from("whatsapp_messages")
            .insert({
                project_id: invite.project_id,
                invite_id: invite.id,
                creator_id: invite.creator_id,
                user_id: invite.creator_id,
                recipient_phone: phone,
                message_type: messageType,
                provider: process.env.WHATSAPP_PROVIDER || "meta",
                status: "queued",
                payload: {
                    message,
                    opportunity_url: opportunityUrl,
                },
            })
            .select("id")
            .single();

        if (messageInsertError || !messageRow) {
            console.error("WhatsApp message row insert error:", messageInsertError);
            return "failed";
        }

        const sendResult = await sendWhatsAppMessage({ to: phone, message, messageType });
        const now = new Date().toISOString();

        await admin
            .from("whatsapp_messages")
            .update({
                status: sendResult.status,
                provider: sendResult.provider,
                provider_message_id: sendResult.providerMessageId || null,
                error_message: sendResult.errorMessage || null,
                payload: {
                    message,
                    opportunity_url: opportunityUrl,
                    provider_payload: sendResult.payload || null,
                },
                sent_at: sendResult.status === "sent" ? now : null,
            })
            .eq("id", messageRow.id);

        if (sendResult.status === "sent") {
            await admin
                .from("project_invites")
                .update(messageType === "booking_reminder"
                    ? { whatsapp_status: "reminder_sent", whatsapp_reminder_sent_at: now }
                    : { whatsapp_status: "sent", whatsapp_sent_at: now }
                )
                .eq("id", invite.id);
            return "sent";
        }

        await admin
            .from("project_invites")
            .update({ whatsapp_status: sendResult.status === "skipped_disabled" ? "skipped_disabled" : "failed" })
            .eq("id", invite.id);

        return sendResult.status === "skipped_disabled" ? "skipped" : "failed";
    } catch (error) {
        console.error("WhatsApp invite processing error:", { inviteId: invite.id, error });
        await admin
            .from("project_invites")
            .update({ whatsapp_status: "failed" })
            .eq("id", invite.id);
        return "failed";
    }
}

async function ensureInviteToken(admin: ReturnType<typeof createAdminClient>, invite: InviteRow): Promise<{ token: string }> {
    const stillValid = invite.secure_token
        && invite.secure_token_expires_at
        && new Date(invite.secure_token_expires_at).getTime() > Date.now();

    if (stillValid) {
        return { token: invite.secure_token as string };
    }

    const token = generateSecureInviteToken();
    const expiresAt = getSecureTokenExpiry(24);

    await admin
        .from("project_invites")
        .update({
            secure_token: token,
            secure_token_expires_at: expiresAt,
        })
        .eq("id", invite.id);

    return { token };
}

async function markInviteSkipped(admin: ReturnType<typeof createAdminClient>, invite: InviteRow, errorMessage: string) {
    await admin
        .from("project_invites")
        .update({ whatsapp_status: "skipped_disabled" })
        .eq("id", invite.id);

    await admin
        .from("whatsapp_messages")
        .insert({
            project_id: invite.project_id,
            invite_id: invite.id,
            creator_id: invite.creator_id,
            user_id: invite.creator_id,
            message_type: "booking_invite",
            provider: process.env.WHATSAPP_PROVIDER || "meta",
            status: "skipped_disabled",
            error_message: errorMessage,
            payload: {},
        });
}

function normalizePhone(value: string | null) {
    if (!value) return null;
    const cleaned = value.replace(/[^\d+]/g, "");
    return cleaned.length >= 10 ? cleaned : null;
}

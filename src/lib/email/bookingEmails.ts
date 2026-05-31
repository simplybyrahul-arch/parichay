import "server-only";
import nodemailer from "nodemailer";
import type { SupabaseClient } from "@supabase/supabase-js";

type BookingEmailType =
    | "booking_created"
    | "creator_invited"
    | "vendor_invited"
    | "quote_received"
    | "booking_accepted"
    | "booking_cancelled"
    | "payment_received"
    | "payout_released";

type BookingEmailInput = {
    to: string | null | undefined;
    type: BookingEmailType;
    recipientName?: string | null;
    bookingTitle?: string | null;
    message?: string | null;
    ctaUrl?: string | null;
    amount?: number | null;
};

type UserEmail = {
    email: string | null;
    name: string | null;
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.shotcutcrew.com";

function smtpConfig() {
    const host = process.env.SMTP_HOST || process.env.EMAIL_SERVER_HOST;
    const port = Number(process.env.SMTP_PORT || process.env.EMAIL_SERVER_PORT || 587);
    const user = process.env.SMTP_USER || process.env.EMAIL_SERVER_USER;
    const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.EMAIL_SERVER_PASSWORD;
    const from =
        process.env.SMTP_FROM ||
        process.env.SMTP_FROM_EMAIL ||
        process.env.EMAIL_FROM ||
        "ShotcutCrew <support@shotcutcrew.com>";

    if (!host || !user || !pass) return null;
    return { host, port, user, pass, from };
}

function getTransporter() {
    const config = smtpConfig();
    if (!config) return null;

    return nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: {
            user: config.user,
            pass: config.pass,
        },
    });
}

function formatMoney(value: number | null | undefined) {
    if (!value) return null;
    return `Rs ${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function subjectFor(type: BookingEmailType, bookingTitle?: string | null) {
    const title = bookingTitle || "your ShotcutCrew booking";
    switch (type) {
        case "booking_created":
            return `Booking request created: ${title}`;
        case "creator_invited":
            return `New creator opportunity: ${title}`;
        case "vendor_invited":
            return `New equipment rental request: ${title}`;
        case "quote_received":
            return `New quote received: ${title}`;
        case "booking_accepted":
            return `Booking accepted: ${title}`;
        case "booking_cancelled":
            return `Booking cancelled: ${title}`;
        case "payment_received":
            return `Payment received: ${title}`;
        case "payout_released":
            return `Payout released: ${title}`;
    }
}

function defaultMessage(input: BookingEmailInput) {
    const title = input.bookingTitle || "your ShotcutCrew booking";
    const amount = formatMoney(input.amount);
    switch (input.type) {
        case "booking_created":
            return `Your booking request "${title}" has been created. We will notify matched providers where applicable.`;
        case "creator_invited":
            return `You have a new creator opportunity for "${title}". Open ShotcutCrew to review the request.`;
        case "vendor_invited":
            return `You have a new equipment rental request for "${title}". Confirm availability or submit a quote from your vendor dashboard.`;
        case "quote_received":
            return `A provider submitted a quote for "${title}"${amount ? ` (${amount})` : ""}.`;
        case "booking_accepted":
            return `A provider accepted "${title}". Open ShotcutCrew to continue the booking workflow.`;
        case "booking_cancelled":
            return `"${title}" has been cancelled. No further action is required for this request.`;
        case "payment_received":
            return `Payment has been received for "${title}"${amount ? ` (${amount})` : ""}.`;
        case "payout_released":
            return `Your payout has been released for "${title}"${amount ? ` (${amount})` : ""}.`;
    }
}

function emailHtml(input: BookingEmailInput) {
    const greeting = input.recipientName ? `Hi ${input.recipientName},` : "Hi,";
    const copy = input.message || defaultMessage(input);
    const cta = input.ctaUrl ? new URL(input.ctaUrl, siteUrl).toString() : siteUrl;

    return `
        <div style="font-family:Arial,sans-serif;background:#fff7ed;padding:24px;color:#1c1917">
            <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #fed7aa;border-radius:18px;padding:28px">
                <p style="font-size:14px;color:#ea580c;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin:0 0 12px">ShotcutCrew</p>
                <h1 style="font-size:24px;line-height:1.2;margin:0 0 16px;color:#111827">${subjectFor(input.type, input.bookingTitle)}</h1>
                <p style="font-size:16px;line-height:1.6;margin:0 0 12px">${greeting}</p>
                <p style="font-size:16px;line-height:1.6;margin:0 0 22px">${copy}</p>
                <a href="${cta}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;border-radius:12px;padding:12px 18px;font-weight:700">Open ShotcutCrew</a>
                <p style="font-size:12px;line-height:1.5;color:#78716c;margin:24px 0 0">This is an automated booking notification. Never share passwords, OTPs, payment secrets, or private financial details over email.</p>
            </div>
        </div>
    `;
}

function emailText(input: BookingEmailInput) {
    return [
        subjectFor(input.type, input.bookingTitle),
        "",
        input.message || defaultMessage(input),
        "",
        input.ctaUrl ? new URL(input.ctaUrl, siteUrl).toString() : siteUrl,
    ].join("\n");
}

export async function sendBookingEmail(input: BookingEmailInput) {
    if (!input.to) return { sent: false, reason: "missing_recipient" };

    const config = smtpConfig();
    const transporter = getTransporter();
    if (!config || !transporter) {
        console.warn("SMTP is not configured; booking email skipped:", input.type);
        return { sent: false, reason: "smtp_not_configured" };
    }

    try {
        await transporter.sendMail({
            from: config.from,
            to: input.to,
            subject: subjectFor(input.type, input.bookingTitle),
            text: emailText(input),
            html: emailHtml(input),
        });
        return { sent: true };
    } catch (error) {
        console.error("Booking email send failed:", input.type, error);
        return { sent: false, reason: "send_failed" };
    }
}

export async function getUserEmail(admin: SupabaseClient, userId: string | null | undefined): Promise<UserEmail> {
    if (!userId) return { email: null, name: null };

    const [{ data: profile }, authResult] = await Promise.all([
        admin.from("users").select("full_name").eq("id", userId).maybeSingle(),
        admin.auth.admin.getUserById(userId),
    ]);

    return {
        email: authResult.data.user?.email || null,
        name: profile?.full_name || authResult.data.user?.user_metadata?.full_name || null,
    };
}

export async function sendBookingEmailToUser(
    admin: SupabaseClient,
    userId: string | null | undefined,
    input: Omit<BookingEmailInput, "to" | "recipientName">
) {
    const recipient = await getUserEmail(admin, userId);
    return sendBookingEmail({
        ...input,
        to: recipient.email,
        recipientName: recipient.name,
    });
}

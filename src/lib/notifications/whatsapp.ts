import crypto from "crypto";

export type WhatsAppMessageInput = {
    to: string;
    message: string;
    messageType: "booking_invite" | "booking_reminder";
};

export type WhatsAppSendResult = {
    status: "sent" | "failed" | "skipped_disabled";
    provider: string;
    providerMessageId?: string | null;
    errorMessage?: string | null;
    payload?: Record<string, unknown>;
};

export type WhatsAppOpportunityMessageInput = {
    bookingType: string | null;
    bookingLocation: string | null;
    eventDate: string | null;
    budget: number | null;
    requirementSummary: string | null;
    opportunityUrl: string;
    isReminder?: boolean;
};

export function generateSecureInviteToken() {
    return crypto.randomBytes(32).toString("hex");
}

export function getSecureTokenExpiry(hours = 24) {
    return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export function isQuietHoursIST(date = new Date()) {
    const hour = Number(new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone: "Asia/Kolkata",
    }).format(date));

    return hour >= 22 || hour < 8;
}

export function isLocalRuntime() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    return process.env.NODE_ENV !== "production" || appUrl.includes("localhost") || appUrl.includes("127.0.0.1");
}

export function buildOpportunityUrl(projectId: string, creatorId: string, token: string) {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
    const params = new URLSearchParams({
        ref: "whatsapp",
        creator_id: creatorId,
        token,
    });

    return `${appUrl}/opportunities/${projectId}?${params.toString()}`;
}

export function buildWhatsAppOpportunityMessage(input: WhatsAppOpportunityMessageInput) {
    const title = input.isReminder
        ? "Reminder: ShotcutCrew booking opportunity"
        : "New ShotcutCrew booking opportunity";

    const lines = [
        title,
        "",
        `Type: ${formatText(input.bookingType, "Booking").replace(/_/g, " ")}`,
        `Location: ${formatText(input.bookingLocation, "Not specified")}`,
        `Date: ${formatDate(input.eventDate)}`,
        `Budget: ${formatBudget(input.budget)}`,
        "",
        "Requirement:",
        truncate(formatText(input.requirementSummary, "Open creative booking"), 160),
        "",
        "View and respond:",
        input.opportunityUrl,
    ];

    return lines.join("\n");
}

export async function sendWhatsAppMessage(input: WhatsAppMessageInput): Promise<WhatsAppSendResult> {
    const provider = process.env.WHATSAPP_PROVIDER || "meta";
    const enabled = process.env.WHATSAPP_ENABLED === "true";
    const sendInLocal = process.env.WHATSAPP_SEND_IN_LOCAL === "true";

    if (!enabled || (isLocalRuntime() && !sendInLocal)) {
        return {
            status: "skipped_disabled",
            provider,
            errorMessage: !enabled ? "WhatsApp sending disabled by WHATSAPP_ENABLED" : "WhatsApp sending skipped in local runtime",
            payload: { enabled, localRuntime: isLocalRuntime(), messageType: input.messageType },
        };
    }

    if (provider !== "meta") {
        return {
            status: "failed",
            provider,
            errorMessage: `Unsupported WhatsApp provider: ${provider}`,
        };
    }

    const apiUrl = process.env.WHATSAPP_API_URL;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || (!apiUrl && !phoneNumberId)) {
        return {
            status: "failed",
            provider,
            errorMessage: "WhatsApp provider credentials are not configured",
        };
    }

    const endpoint = apiUrl || `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: input.to,
                type: "text",
                text: {
                    preview_url: true,
                    body: input.message,
                },
            }),
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            return {
                status: "failed",
                provider,
                errorMessage: payload?.error?.message || "WhatsApp provider request failed",
                payload,
            };
        }

        return {
            status: "sent",
            provider,
            providerMessageId: payload?.messages?.[0]?.id || null,
            payload,
        };
    } catch (error) {
        return {
            status: "failed",
            provider,
            errorMessage: error instanceof Error ? error.message : "WhatsApp send failed",
        };
    }
}

function formatText(value: string | null | undefined, fallback: string) {
    const cleaned = value?.trim();
    return cleaned || fallback;
}

function formatBudget(value: number | null | undefined) {
    if (!value) return "Not specified";
    return `Rs ${value.toLocaleString("en-IN")}`;
}

function formatDate(value: string | null | undefined) {
    if (!value) return "Not specified";
    return new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function truncate(value: string, maxLength: number) {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength - 3)}...`;
}

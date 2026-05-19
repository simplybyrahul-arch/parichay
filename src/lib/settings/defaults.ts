export type NotificationPreferences = {
    email_notifications: boolean;
    whatsapp_notifications: boolean;
    booking_status_updates: boolean;
    creator_interest_alerts: boolean;
    payment_reminders: boolean;
    parichay_coordinator_updates: boolean;
    dispute_updates: boolean;
    new_opportunity_alerts: boolean;
    selection_updates: boolean;
    project_updates: boolean;
    new_booking_alerts: boolean;
    new_creator_signup_alerts: boolean;
    creator_verification_pending_alerts: boolean;
    payment_proof_uploaded_alerts: boolean;
    whatsapp_failure_alerts: boolean;
};

export const defaultNotificationPreferences: NotificationPreferences = {
    email_notifications: true,
    whatsapp_notifications: true,
    booking_status_updates: true,
    creator_interest_alerts: true,
    payment_reminders: true,
    parichay_coordinator_updates: true,
    dispute_updates: true,
    new_opportunity_alerts: true,
    selection_updates: true,
    project_updates: true,
    new_booking_alerts: true,
    new_creator_signup_alerts: true,
    creator_verification_pending_alerts: true,
    payment_proof_uploaded_alerts: true,
    whatsapp_failure_alerts: true,
};

export const creatorRoleOptions = [
    { value: "photographer", label: "Photographer" },
    { value: "videographer", label: "Videographer" },
    { value: "video_editor", label: "Video Editor" },
    { value: "photo_editor", label: "Photo Editor" },
    { value: "studio", label: "Studio" },
    { value: "equipment_provider", label: "Equipment Provider" },
    { value: "drone_operator", label: "Drone Operator" },
    { value: "makeup_artist", label: "Makeup Artist" },
    { value: "production_crew", label: "Production Crew" },
    { value: "event_crew", label: "Event Crew" },
    { value: "other", label: "Other" },
];

export function mergeNotificationPreferences(value: unknown): NotificationPreferences {
    const incoming = typeof value === "object" && value !== null ? value as Partial<NotificationPreferences> : {};
    return { ...defaultNotificationPreferences, ...incoming };
}

export function parseCommaSeparated(value: string) {
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

export function formatCommaSeparated(value: unknown) {
    if (!Array.isArray(value)) return "";
    return value.map(String).join(", ");
}

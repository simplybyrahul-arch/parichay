"use server";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { validatePasswordStrength } from "@/utils/auth-security";
import { defaultNotificationPreferences, mergeNotificationPreferences, parseCommaSeparated, type NotificationPreferences } from "@/lib/settings/defaults";
import { logAdminAction } from "@/utils/audit-logger";

type ActionResult = {
    success: boolean;
    message: string;
};

type ProfileInput = {
    full_name?: string;
    phone?: string;
    whatsapp_phone?: string;
    city?: string;
    state?: string;
};

type CreatorSettingsInput = ProfileInput & {
    bio?: string;
    location?: string;
    role?: string;
    day_rate?: number | string;
    portfolio_url?: string;
    equipment?: string | string[];
    tags?: string | string[];
    service_cities?: string | string[];
    capacity_per_day?: number | string | null;
    service_radius_km?: number | string | null;
    whatsapp_opt_in?: boolean;
    available_for_booking?: boolean;
    budget_flexibility?: boolean;
    travel_enabled?: boolean;
};

const allowedPlatformSettings = new Set([
    "platform_name",
    "support_email",
    "default_city",
    "booking_expiry_hours",
    "whatsapp_enabled_display",
    "payment_mode_display",
    "qr_payment_label",
]);

const forbiddenSettingKeyPatterns = [/secret/i, /token/i, /password/i, /service_role/i, /private/i, /key/i];

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
    if (!user) return { supabase, user: null, profile: null, error: "Unauthorized." };

    const admin = createAdminClient();
    const { data: profile } = await admin
        .from("users")
        .select("id, full_name, account_type, phone, whatsapp_phone, city, state, notification_preferences")
        .eq("id", user.id)
        .single();

    return { supabase, user, profile, error: profile ? null : "User profile was not found." };
}

function cleanText(value: unknown) {
    return String(value || "").trim();
}

function cleanOptionalText(value: unknown) {
    const text = cleanText(value);
    return text || null;
}

function cleanArray(value: string | string[] | undefined) {
    if (Array.isArray(value)) return value.map((item) => cleanText(item)).filter(Boolean);
    return parseCommaSeparated(String(value || ""));
}

function cleanPositiveInteger(value: number | string | null | undefined, fallback: number | null = null) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : fallback;
}

function userProfilePayload(data: ProfileInput) {
    return {
        full_name: cleanText(data.full_name),
        phone: cleanOptionalText(data.phone),
        whatsapp_phone: cleanOptionalText(data.whatsapp_phone),
        city: cleanOptionalText(data.city),
        state: cleanOptionalText(data.state),
    };
}

export async function updateUserProfile(data: ProfileInput): Promise<ActionResult> {
    const actor = await getActor();
    if (!actor.user || !actor.profile) return { success: false, message: actor.error || "Unauthorized." };

    const payload = userProfilePayload(data);
    if (!payload.full_name) return { success: false, message: "Name is required." };

    const admin = createAdminClient();
    const { error } = await admin.from("users").update(payload).eq("id", actor.user.id);
    if (error) return { success: false, message: "Could not update profile." };

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    return { success: true, message: "Profile updated." };
}

export async function updateAdminProfile(data: ProfileInput): Promise<ActionResult> {
    const actor = await getActor();
    if (!actor.user || actor.profile?.account_type !== "admin") return { success: false, message: "Forbidden." };

    return updateUserProfile(data);
}

export async function updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<ActionResult> {
    const actor = await getActor();
    if (!actor.user || !actor.profile) return { success: false, message: actor.error || "Unauthorized." };

    const currentPreferences = mergeNotificationPreferences(actor.profile.notification_preferences);
    const nextPreferences = { ...currentPreferences, ...defaultNotificationPreferences, ...preferences };

    const admin = createAdminClient();
    const { error } = await admin
        .from("users")
        .update({ notification_preferences: nextPreferences })
        .eq("id", actor.user.id);

    if (error) return { success: false, message: "Could not update notification preferences." };

    revalidatePath("/dashboard");
    revalidatePath("/creator-dashboard");
    revalidatePath("/admin/settings");
    return { success: true, message: "Notification preferences updated." };
}

export async function updatePassword(newPassword: string, confirmPassword: string): Promise<ActionResult> {
    const actor = await getActor();
    if (!actor.user) return { success: false, message: "Unauthorized." };
    if (newPassword !== confirmPassword) return { success: false, message: "Passwords do not match." };

    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) return { success: false, message: passwordError };

    const { error } = await actor.supabase.auth.updateUser({ password: newPassword });
    if (error) return { success: false, message: "Could not update password." };

    return { success: true, message: "Password updated." };
}

export async function updateCreatorProfileSettings(data: CreatorSettingsInput): Promise<ActionResult> {
    const actor = await getActor();
    if (!actor.user || actor.profile?.account_type !== "creator") return { success: false, message: "Forbidden." };

    const role = cleanText(data.role);
    const city = cleanText(data.city);
    if (!role || !city) return { success: false, message: "City and primary service are required." };

    const dayRate = cleanPositiveInteger(data.day_rate, 0);
    if (!dayRate || dayRate <= 0) return { success: false, message: "Base day rate is required." };

    const admin = createAdminClient();
    const { error: userError } = await admin.from("users").update(userProfilePayload(data)).eq("id", actor.user.id);
    if (userError) return { success: false, message: "Could not update user profile." };

    const { error } = await admin.from("creators").update({
        bio: cleanOptionalText(data.bio),
        location: cleanOptionalText(data.location) || city,
        city,
        state: cleanOptionalText(data.state),
        phone: cleanOptionalText(data.phone),
        whatsapp_phone: cleanOptionalText(data.whatsapp_phone),
        role,
        day_rate: dayRate,
        portfolio_url: cleanOptionalText(data.portfolio_url),
        equipment: cleanArray(data.equipment),
        tags: cleanArray(data.tags),
        service_cities: cleanArray(data.service_cities),
        capacity_per_day: cleanPositiveInteger(data.capacity_per_day, null),
        service_radius_km: cleanPositiveInteger(data.service_radius_km, 0),
        whatsapp_opt_in: data.whatsapp_opt_in !== false,
        available_for_booking: data.available_for_booking !== false,
        budget_flexibility: Boolean(data.budget_flexibility),
        travel_enabled: Boolean(data.travel_enabled),
    }).eq("id", actor.user.id);

    if (error) return { success: false, message: "Could not update creator settings." };

    revalidatePath("/creator-dashboard");
    return { success: true, message: "Creator settings updated." };
}

export async function updatePlatformSettings(settings: Record<string, string>): Promise<ActionResult> {
    const actor = await getActor();
    if (!actor.user || actor.profile?.account_type !== "admin") return { success: false, message: "Forbidden." };

    const entries = Object.entries(settings)
        .map(([key, value]) => [key.trim(), String(value || "").trim()] as const)
        .filter(([key]) => allowedPlatformSettings.has(key) && !forbiddenSettingKeyPatterns.some((pattern) => pattern.test(key)));

    if (!entries.length) return { success: false, message: "No allowed platform settings were provided." };

    const admin = createAdminClient();
    for (const [key, value] of entries) {
        if (key === "booking_expiry_hours" && (!Number.isFinite(Number(value)) || Number(value) < 1 || Number(value) > 720)) {
            return { success: false, message: "Booking expiry hours must be between 1 and 720." };
        }

        const { error } = await admin
            .from("platform_settings")
            .upsert({
                key,
                value,
                description: settingDescription(key),
                updated_at: new Date().toISOString(),
            }, { onConflict: "key" });

        if (error) return { success: false, message: `Could not update ${key}.` };
    }

    await logAdminAction("UPDATE_PLATFORM_SETTINGS", actor.user.id, { keys: entries.map(([key]) => key) });
    revalidatePath("/admin/settings");
    return { success: true, message: "Platform settings updated." };
}

export async function updateSetting(key: string, value: string): Promise<ActionResult> {
    return updatePlatformSettings({ [key]: value });
}

function settingDescription(key: string) {
    const descriptions: Record<string, string> = {
        platform_name: "Public platform display name",
        support_email: "Support contact email shown in settings",
        default_city: "Default operating city or region",
        booking_expiry_hours: "Default booking opportunity expiry window in hours",
        whatsapp_enabled_display: "Public WhatsApp availability display flag",
        payment_mode_display: "Public payment mode label",
        qr_payment_label: "QR payment instruction text",
    };

    return descriptions[key] || "Platform setting";
}

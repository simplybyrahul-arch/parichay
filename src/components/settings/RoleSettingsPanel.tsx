"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import {
    updateAdminProfile,
    updateCreatorProfileSettings,
    updateNotificationPreferences,
    updatePassword,
    updatePlatformSettings,
    updateUserProfile,
} from "@/app/actions/settings";
import {
    creatorRoleOptions,
    formatCommaSeparated,
    mergeNotificationPreferences,
    type NotificationPreferences,
} from "@/lib/settings/defaults";

type Role = "client" | "creator" | "admin";

type UserProfile = {
    id: string;
    email?: string | null;
    full_name?: string | null;
    account_type?: string | null;
    phone?: string | null;
    whatsapp_phone?: string | null;
    city?: string | null;
    state?: string | null;
    notification_preferences?: Partial<NotificationPreferences> | null;
};

type CreatorProfile = {
    bio?: string | null;
    location?: string | null;
    city?: string | null;
    state?: string | null;
    phone?: string | null;
    whatsapp_phone?: string | null;
    role?: string | null;
    day_rate?: number | null;
    portfolio_url?: string | null;
    equipment?: unknown;
    tags?: unknown;
    service_cities?: unknown;
    capacity_per_day?: number | null;
    service_radius_km?: number | null;
    whatsapp_opt_in?: boolean | null;
    available_for_booking?: boolean | null;
    budget_flexibility?: boolean | null;
    travel_enabled?: boolean | null;
    verified?: boolean | null;
};

const clientPreferenceKeys: Array<[keyof NotificationPreferences, string]> = [
    ["email_notifications", "Email notifications"],
    ["whatsapp_notifications", "WhatsApp notifications"],
    ["booking_status_updates", "Booking status updates"],
    ["creator_interest_alerts", "Creator interest alerts"],
    ["payment_reminders", "Payment reminders"],
    ["parichay_coordinator_updates", "Parichay coordinator updates"],
    ["dispute_updates", "Dispute updates"],
];

const creatorPreferenceKeys: Array<[keyof NotificationPreferences, string]> = [
    ["whatsapp_notifications", "WhatsApp notifications"],
    ["email_notifications", "Email notifications"],
    ["new_opportunity_alerts", "New opportunity alerts"],
    ["selection_updates", "Selection updates"],
    ["project_updates", "Payment/project updates"],
    ["dispute_updates", "Dispute updates"],
];

const adminPreferenceKeys: Array<[keyof NotificationPreferences, string]> = [
    ["new_booking_alerts", "New booking alerts"],
    ["new_creator_signup_alerts", "New creator signup alerts"],
    ["creator_verification_pending_alerts", "Creator verification pending alerts"],
    ["payment_proof_uploaded_alerts", "Payment proof uploaded alerts"],
    ["dispute_updates", "Dispute raised alerts"],
    ["parichay_coordinator_updates", "Parichay assignment alerts"],
    ["whatsapp_failure_alerts", "WhatsApp failure alerts"],
];

const defaultPlatformSettings = {
    platform_name: "ShotcutCrew",
    support_email: "rahul@shotcutcrew.com",
    default_city: "Bilaspur",
    booking_expiry_hours: "72",
    payment_mode_display: "QR payment",
    qr_payment_label: "Scan the QR and submit UTR/payment proof.",
};

export function RoleSettingsPanel({ role }: { role: Role }) {
    const supabase = useMemo(() => createClient(), []);
    const [isPending, startTransition] = useTransition();
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
    const [preferences, setPreferences] = useState(mergeNotificationPreferences(null));
    const [platformSettings, setPlatformSettings] = useState(defaultPlatformSettings);
    const [passwords, setPasswords] = useState({ password: "", confirmPassword: "" });

    useEffect(() => {
        let mounted = true;

        async function loadSettings() {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            const { data: profile } = await supabase
                .from("users")
                .select("id, full_name, account_type, phone, whatsapp_phone, city, state, notification_preferences")
                .eq("id", user.id)
                .single();

            if (!mounted) return;
            const nextProfile = { ...(profile || {}), email: user.email || "" } as UserProfile;
            setUserProfile(nextProfile);
            setPreferences(mergeNotificationPreferences(nextProfile.notification_preferences));

            if (role === "creator") {
                const { data: creator } = await supabase
                    .from("creators")
                    .select("bio, location, city, state, phone, whatsapp_phone, role, day_rate, portfolio_url, equipment, tags, service_cities, capacity_per_day, service_radius_km, whatsapp_opt_in, available_for_booking, budget_flexibility, travel_enabled, verified")
                    .eq("id", user.id)
                    .single();
                if (mounted) setCreatorProfile((creator || {}) as CreatorProfile);
            }

            if (role === "admin") {
                const { data: settings } = await supabase.from("platform_settings").select("key, value");
                if (mounted && settings) {
                    setPlatformSettings((current) => ({
                        ...current,
                        ...Object.fromEntries(settings.map((setting) => [String(setting.key), String(setting.value)])),
                    }));
                }
            }

            if (mounted) setLoading(false);
        }

        loadSettings();
        return () => {
            mounted = false;
        };
    }, [role, supabase]);

    const updateUserField = (field: keyof UserProfile, value: string) => {
        setUserProfile((profile) => ({ ...(profile || { id: "" }), [field]: value }));
    };

    const updateCreatorField = (field: keyof CreatorProfile, value: string | boolean | number) => {
        setCreatorProfile((profile) => ({ ...(profile || {}), [field]: value }));
    };

    const submit = (promiseFactory: () => Promise<{ success: boolean; message: string }>) => {
        startTransition(async () => {
            const result = await promiseFactory();
            if (result.success) toast.success(result.message);
            else toast.error(result.message);
        });
    };

    const profilePayload = () => ({
        full_name: userProfile?.full_name || "",
        phone: userProfile?.phone || "",
        whatsapp_phone: userProfile?.whatsapp_phone || "",
        city: userProfile?.city || "",
        state: userProfile?.state || "",
    });

    const creatorPayload = () => ({
        ...profilePayload(),
        bio: creatorProfile?.bio || "",
        location: creatorProfile?.location || "",
        city: creatorProfile?.city || userProfile?.city || "",
        state: creatorProfile?.state || userProfile?.state || "",
        phone: creatorProfile?.phone || userProfile?.phone || "",
        whatsapp_phone: creatorProfile?.whatsapp_phone || userProfile?.whatsapp_phone || "",
        role: creatorProfile?.role || "",
        day_rate: creatorProfile?.day_rate || 0,
        portfolio_url: creatorProfile?.portfolio_url || "",
        equipment: formatCommaSeparated(creatorProfile?.equipment),
        tags: formatCommaSeparated(creatorProfile?.tags),
        service_cities: formatCommaSeparated(creatorProfile?.service_cities),
        capacity_per_day: creatorProfile?.capacity_per_day || null,
        service_radius_km: creatorProfile?.service_radius_km || 0,
        whatsapp_opt_in: creatorProfile?.whatsapp_opt_in !== false,
        available_for_booking: creatorProfile?.available_for_booking !== false,
        budget_flexibility: Boolean(creatorProfile?.budget_flexibility),
        travel_enabled: Boolean(creatorProfile?.travel_enabled),
    });

    if (loading) {
        return <div className="rounded-2xl border border-stone-100 bg-white p-8 text-stone-500 shadow-sm">Loading settings...</div>;
    }

    if (!userProfile) {
        return <div className="rounded-2xl border border-rose-100 bg-rose-50 p-8 text-rose-700">You must be logged in to manage settings.</div>;
    }

    const preferenceKeys = role === "admin" ? adminPreferenceKeys : role === "creator" ? creatorPreferenceKeys : clientPreferenceKeys;
    const canShowCreator = role === "creator" && creatorProfile;

    return (
        <div className="space-y-6">
            <SettingsCard title={role === "admin" ? "Admin Profile" : "Profile Information"}>
                <div className="grid md:grid-cols-2 gap-4">
                    <TextField label={role === "creator" ? "Full name / Studio name" : "Full name / company name"} value={userProfile.full_name || ""} onChange={(value) => updateUserField("full_name", value)} />
                    <TextField label="Phone number" value={userProfile.phone || ""} onChange={(value) => updateUserField("phone", value)} />
                    <TextField label="WhatsApp number" value={userProfile.whatsapp_phone || ""} onChange={(value) => updateUserField("whatsapp_phone", value)} />
                    <TextField label="City" value={userProfile.city || ""} onChange={(value) => updateUserField("city", value)} />
                    <TextField label="State" value={userProfile.state || ""} onChange={(value) => updateUserField("state", value)} />
                </div>
                <SaveButton disabled={isPending} onClick={() => submit(() => role === "admin" ? updateAdminProfile(profilePayload()) : updateUserProfile(profilePayload()))}>
                    Save Profile
                </SaveButton>
            </SettingsCard>

            {canShowCreator && (
                <>
                    <SettingsCard title="Creator Profile">
                        <div className="grid md:grid-cols-2 gap-4">
                            <TextField label="Bio" value={creatorProfile.bio || ""} onChange={(value) => updateCreatorField("bio", value)} textarea />
                            <TextField label="Location/address" value={creatorProfile.location || ""} onChange={(value) => updateCreatorField("location", value)} />
                            <TextField label="City" value={creatorProfile.city || userProfile.city || ""} onChange={(value) => updateCreatorField("city", value)} />
                            <TextField label="State" value={creatorProfile.state || userProfile.state || ""} onChange={(value) => updateCreatorField("state", value)} />
                            <TextField label="Phone number" value={creatorProfile.phone || userProfile.phone || ""} onChange={(value) => updateCreatorField("phone", value)} />
                            <TextField label="WhatsApp number" value={creatorProfile.whatsapp_phone || userProfile.whatsapp_phone || ""} onChange={(value) => updateCreatorField("whatsapp_phone", value)} />
                            <TextField label="Portfolio URL" value={creatorProfile.portfolio_url || ""} onChange={(value) => updateCreatorField("portfolio_url", value)} />
                            <TextField label="Base day rate" type="number" value={String(creatorProfile.day_rate || "")} onChange={(value) => updateCreatorField("day_rate", Number(value))} />
                        </div>
                    </SettingsCard>

                    <SettingsCard title="Services & Skills">
                        <div className="grid md:grid-cols-2 gap-4">
                            <label className="block">
                                <span className="block text-sm font-bold text-stone-700 mb-1.5">Primary service / role</span>
                                <select value={creatorProfile.role || ""} onChange={(event) => updateCreatorField("role", event.target.value)} className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-orange-500">
                                    <option value="">Select service</option>
                                    {creatorRoleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                            </label>
                            <TextField label="Tags / skills" value={formatCommaSeparated(creatorProfile.tags)} onChange={(value) => updateCreatorField("tags", value)} />
                            <TextField label="Equipment list" value={formatCommaSeparated(creatorProfile.equipment)} onChange={(value) => updateCreatorField("equipment", value)} />
                            <TextField label="Capacity per day" type="number" value={String(creatorProfile.capacity_per_day || "")} onChange={(value) => updateCreatorField("capacity_per_day", Number(value))} />
                        </div>
                    </SettingsCard>

                    <SettingsCard title="Travel & Booking Availability">
                        <p className="text-sm text-stone-500 mb-4">These fields help ShotcutCrew send you relevant booking opportunities.</p>
                        <div className="grid md:grid-cols-2 gap-4">
                            <Toggle label="Available for booking" checked={creatorProfile.available_for_booking !== false} onChange={(value) => updateCreatorField("available_for_booking", value)} />
                            <Toggle label="Can travel to other cities" checked={Boolean(creatorProfile.travel_enabled)} onChange={(value) => updateCreatorField("travel_enabled", value)} />
                            <Toggle label="Budget flexibility" checked={Boolean(creatorProfile.budget_flexibility)} onChange={(value) => updateCreatorField("budget_flexibility", value)} />
                            <TextField label="Service cities" value={formatCommaSeparated(creatorProfile.service_cities)} onChange={(value) => updateCreatorField("service_cities", value)} />
                            <TextField label="Service radius km" type="number" value={String(creatorProfile.service_radius_km || 0)} onChange={(value) => updateCreatorField("service_radius_km", Number(value))} />
                        </div>
                        <SaveButton disabled={isPending} onClick={() => submit(() => updateCreatorProfileSettings(creatorPayload()))}>
                            Save Creator Settings
                        </SaveButton>
                    </SettingsCard>

                    <SettingsCard title="Verification Status">
                        <p className={`text-sm font-semibold ${creatorProfile.verified ? "text-green-700" : "text-orange-700"}`}>
                            {creatorProfile.verified
                                ? "Your profile is verified and eligible for booking invites."
                                : "Your profile is under review. You will receive booking opportunities after admin verification."}
                        </p>
                    </SettingsCard>
                </>
            )}

            <SettingsCard title={role === "admin" ? "Admin Notifications" : role === "creator" ? "WhatsApp & Notifications" : "Notification Preferences"}>
                <div className="grid md:grid-cols-2 gap-3">
                    {preferenceKeys.map(([key, label]) => (
                        <Toggle
                            key={key}
                            label={label}
                            checked={Boolean(preferences[key])}
                            onChange={(value) => setPreferences((current) => ({ ...current, [key]: value }))}
                        />
                    ))}
                </div>
                {role === "creator" && creatorProfile && (
                    <div className="mt-3">
                        <Toggle label="WhatsApp opt-in" checked={creatorProfile.whatsapp_opt_in !== false} onChange={(value) => updateCreatorField("whatsapp_opt_in", value)} />
                    </div>
                )}
                <SaveButton disabled={isPending} onClick={() => submit(() => updateNotificationPreferences(preferences))}>
                    Save Preferences
                </SaveButton>
            </SettingsCard>

            {role === "admin" && (
                <>
                    <SettingsCard title="Platform Settings">
                        <div className="grid md:grid-cols-2 gap-4">
                            <TextField label="Platform name" value={platformSettings.platform_name} onChange={(value) => setPlatformSettings((current) => ({ ...current, platform_name: value }))} />
                            <TextField label="Support email" value={platformSettings.support_email} onChange={(value) => setPlatformSettings((current) => ({ ...current, support_email: value }))} />
                            <TextField label="Default city / operating region" value={platformSettings.default_city} onChange={(value) => setPlatformSettings((current) => ({ ...current, default_city: value }))} />
                            <TextField label="Booking expiry hours" type="number" value={platformSettings.booking_expiry_hours} onChange={(value) => setPlatformSettings((current) => ({ ...current, booking_expiry_hours: value }))} />
                            <TextField label="Payment mode display" value={platformSettings.payment_mode_display} onChange={(value) => setPlatformSettings((current) => ({ ...current, payment_mode_display: value }))} />
                            <TextField label="QR payment instruction" value={platformSettings.qr_payment_label} onChange={(value) => setPlatformSettings((current) => ({ ...current, qr_payment_label: value }))} />
                        </div>
                        <p className="text-xs text-stone-500 mt-3">Secrets such as Razorpay, WhatsApp, SMTP, or Supabase keys are never stored here.</p>
                        <SaveButton disabled={isPending} onClick={() => submit(() => updatePlatformSettings(platformSettings))}>
                            Save Platform Settings
                        </SaveButton>
                    </SettingsCard>

                    <SettingsCard title="System Information">
                        <div className="grid md:grid-cols-2 gap-3 text-sm">
                            <ReadOnly label="Environment" value={process.env.NODE_ENV || "development"} />
                            <ReadOnly label="Platform URL" value={process.env.NEXT_PUBLIC_APP_URL || "Configured by environment"} />
                            <ReadOnly label="WhatsApp" value={process.env.NEXT_PUBLIC_WHATSAPP_ENABLED === "true" ? "Enabled display" : "Disabled / server controlled"} />
                            <ReadOnly label="Payment mode" value={platformSettings.payment_mode_display} />
                        </div>
                    </SettingsCard>

                    <SettingsCard title="Support / Operations">
                        <div className="flex flex-wrap gap-3">
                            {[
                                ["/admin/users", "Go to Users"],
                                ["/admin/projects", "Go to Projects"],
                                ["/admin/disputes", "Go to Disputes"],
                                ["/admin/parichay", "Go to Parichay"],
                                ["/admin/analytics", "Go to Analytics"],
                            ].map(([href, label]) => (
                                <Link key={href} href={href} className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50">
                                    {label}
                                </Link>
                            ))}
                        </div>
                    </SettingsCard>
                </>
            )}

            <SettingsCard title="Security">
                <div className="grid md:grid-cols-2 gap-4">
                    <ReadOnly label="Email address" value={userProfile.email || "Not available"} />
                    <ReadOnly label="Email verification" value="Verified by Supabase Auth" />
                    <TextField label="New password" type="password" value={passwords.password} onChange={(value) => setPasswords((current) => ({ ...current, password: value }))} />
                    <TextField label="Confirm new password" type="password" value={passwords.confirmPassword} onChange={(value) => setPasswords((current) => ({ ...current, confirmPassword: value }))} />
                </div>
                <SaveButton disabled={isPending || !passwords.password} onClick={() => submit(() => updatePassword(passwords.password, passwords.confirmPassword))}>
                    Update Password
                </SaveButton>
            </SettingsCard>

            {role !== "admin" && (
                <SettingsCard title="Support">
                    <p className="text-sm text-stone-600">Contact support: <a className="font-bold text-orange-600" href="mailto:rahul@shotcutcrew.com">rahul@shotcutcrew.com</a></p>
                    <p className="text-sm text-stone-500 mt-2">To delete your account, contact support. Destructive account deletion is intentionally not available from settings.</p>
                    <div className="flex flex-wrap gap-3 mt-4">
                        <Link href="/terms" className="text-sm font-bold text-stone-700 hover:text-orange-600">Terms</Link>
                        <Link href="/privacy" className="text-sm font-bold text-stone-700 hover:text-orange-600">Privacy</Link>
                        <Link href="/contact" className="text-sm font-bold text-stone-700 hover:text-orange-600">Report an issue</Link>
                    </div>
                </SettingsCard>
            )}
        </div>
    );
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-stone-900 mb-4">{title}</h3>
            {children}
        </section>
    );
}

function TextField({ label, value, onChange, type = "text", textarea = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; textarea?: boolean }) {
    return (
        <label className="block">
            <span className="block text-sm font-bold text-stone-700 mb-1.5">{label}</span>
            {textarea ? (
                <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-orange-500" />
            ) : (
                <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-orange-500" />
            )}
        </label>
    );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
    return (
        <label className="flex items-center justify-between gap-4 rounded-xl border border-stone-100 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-700">
            <span>{label}</span>
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-orange-600" />
        </label>
    );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-stone-100 bg-stone-50 px-4 py-3">
            <div className="text-xs font-bold uppercase tracking-wide text-stone-500">{label}</div>
            <div className="mt-1 text-sm font-semibold text-stone-900">{value}</div>
        </div>
    );
}

function SaveButton({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
    return (
        <button type="button" disabled={disabled} onClick={onClick} className="mt-5 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60">
            {children}
        </button>
    );
}

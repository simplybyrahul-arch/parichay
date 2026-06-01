"use server";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { type BudgetTier, getEventTypeLabel } from "@/config/bookingOptions";
import { upsertQuickBookingFinancials } from "@/lib/payments/bookingFinance";
import { sendBookingCreatedEmail, sendBookingConfirmedEmail } from "@/lib/email/templates/customer";
import { sendBookingInvitationEmail } from "@/lib/email/templates/creator";
import { getUserEmail } from "@/lib/email/utils";

export type QuickBookingDraft = {
    eventType: string;
    customEventType?: string | null;
    shootDate: string;
    shootTime: string;
    durationHours: number;
    locationAddress: string;
    city: string;
    state?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    crewRequirements: Record<string, number>;
    equipmentRequirements?: Record<string, boolean>;
    postProductionRequirements?: Record<string, boolean>;
    budgetTier: BudgetTier;
    customBudgetAmount?: number | null;
};

export type QuickCreatorMatch = {
    creator_id: string;
    name: string;
    city: string;
    state: string | null;
    primary_service: string;
    starting_price: number;
    rating: number;
    completed_shoots: number;
    response_time: string;
    is_verified: boolean;
    profile_image_url: string | null;
    portfolio_url: string | null;
    available: boolean;
    score: number;
    match_label: string;
};

type CreatorRecord = {
    id: string;
    role: string | null;
    primary_service: string | null;
    service_tags: unknown;
    event_tags: unknown;
    equipment_tags: unknown;
    post_production_tags: unknown;
    specialization_tags: unknown;
    style_tags: unknown;
    city: string | null;
    state: string | null;
    location: string | null;
    day_rate: number | null;
    verified: boolean | null;
    profile_image_url: string | null;
    portfolio_url: string | null;
    tags: unknown;
    service_cities: unknown;
    budget_tiers: unknown;
    travel_radius_km: number | null;
    travel_locations: unknown;
    instant_booking_enabled: boolean | null;
    response_rate: number | null;
    completion_rate: number | null;
    repeat_clients: number | null;
    available_for_booking: boolean | null;
    budget_flexibility: boolean | null;
    rating: number | null;
    completed_shoots: number | null;
    response_time: string | null;
    profile_completeness: number | null;
    users?: { full_name?: string | null } | { full_name?: string | null }[] | null;
};

function getRequiredEnv(name: string) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is not configured`);
    return value;
}

function createAdminClient() {
    return createSupabaseAdminClient(
        getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
        getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

function normalize(value: string | null | undefined) {
    return (value || "").trim().toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ");
}

function extractTerms(value: unknown) {
    if (Array.isArray(value)) return value.map((item) => normalize(String(item))).filter(Boolean);
    if (typeof value === "string") return [normalize(value)].filter(Boolean);
    return [];
}

function validateDraft(input: QuickBookingDraft) {
    const eventType = input.eventType?.trim();
    const shootDate = input.shootDate?.trim();
    const shootTime = input.shootTime?.trim();
    const city = input.city?.trim();
    const locationAddress = input.locationAddress?.trim() || city;
    const durationHours = Number(input.durationHours || 0);
    const crewRequirements = Object.fromEntries(
        Object.entries(input.crewRequirements || {})
            .map(([key, value]) => [key, Math.max(0, Number(value || 0))])
            .filter(([key, value]) => Boolean(key) && Number(value) > 0)
    ) as Record<string, number>;
    const equipmentRequirements = Object.fromEntries(
        Object.entries(input.equipmentRequirements || {}).filter(([key, value]) => Boolean(key) && value === true)
    ) as Record<string, boolean>;
    const postProductionRequirements = Object.fromEntries(
        Object.entries(input.postProductionRequirements || {}).filter(([key, value]) => Boolean(key) && value === true)
    ) as Record<string, boolean>;

    if (!eventType) throw new Error("Event type is required.");
    if (eventType === "custom_requirement" && !input.customEventType?.trim()) throw new Error("Custom requirement is required.");
    if (!shootDate) throw new Error("Shoot date is required.");
    if (!shootTime) throw new Error("Shoot start time is required.");
    if (!Number.isFinite(durationHours) || durationHours <= 0) throw new Error("Estimated duration is required.");
    if (!city || !locationAddress) throw new Error("Shoot location is required.");
    if (Object.keys(crewRequirements).length === 0) throw new Error("Select at least one crew role.");

    return {
        eventType,
        customEventType: input.customEventType?.trim() || null,
        shootDate,
        shootTime,
        durationHours,
        locationAddress,
        city,
        state: input.state?.trim() || null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        crewRequirements,
        equipmentRequirements,
        postProductionRequirements,
        budgetTier: input.budgetTier || "standard",
        customBudgetAmount: input.customBudgetAmount || null,
        estimatedTotal: input.customBudgetAmount && input.customBudgetAmount > 0 ? Number(input.customBudgetAmount) : 0,
    };
}

export async function findQuickBookingMatches(input: QuickBookingDraft): Promise<{ success: boolean; message: string; matches: QuickCreatorMatch[]; estimated_total: number }> {
    try {
        const draft = validateDraft(input);
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, message: "Login is required.", matches: [], estimated_total: draft.estimatedTotal };

        const admin = createAdminClient();
        const { data: profile } = await admin
            .from("users")
            .select("account_type")
            .eq("id", user.id)
            .single();
        if (profile?.account_type !== "client") {
            return { success: false, message: "Only client accounts can use Quick Booking.", matches: [], estimated_total: draft.estimatedTotal };
        }

        const { data: creators, error } = await admin
            .from("creators")
            .select("id, role, primary_service, service_tags, event_tags, equipment_tags, post_production_tags, specialization_tags, style_tags, city, state, location, day_rate, verified, profile_image_url, portfolio_url, tags, service_cities, budget_tiers, travel_radius_km, travel_locations, instant_booking_enabled, response_rate, completion_rate, repeat_clients, available_for_booking, budget_flexibility, rating, completed_shoots, response_time, profile_completeness, users!creators_id_fkey(full_name)")
            .eq("verified", true);

        if (error) {
            console.error("Quick match creator fetch error:", error);
            return { success: false, message: "Could not find creators right now.", matches: [], estimated_total: draft.estimatedTotal };
        }

        const { data: availability } = await admin
            .from("creator_availability")
            .select("creator_id, is_available")
            .eq("available_date", draft.shootDate);
        const availabilityMap = new Map((availability || []).map((item) => [String(item.creator_id), item.is_available !== false]));

        const requestedCity = normalize(draft.city);
        const eventLabel = normalize(getEventTypeLabel(draft.eventType, draft.customEventType));
        const requestedRoles = Object.keys(draft.crewRequirements).map(normalize);
        const requestedEquipment = Object.keys(draft.equipmentRequirements).map(normalize);
        const requestedPostProduction = Object.keys(draft.postProductionRequirements).map(normalize);
        const requestedTerms = [...requestedRoles, ...requestedEquipment, ...requestedPostProduction];

        const matches = ((creators || []) as CreatorRecord[])
            .map((creator) => {
                if (creator.available_for_booking === false) return null;
                const creatorCity = normalize(creator.city || creator.location);
                const serviceCities = extractTerms(creator.service_cities);
                const serviceTags = extractTerms(creator.service_tags);
                const eventTags = extractTerms(creator.event_tags);
                const equipmentTags = extractTerms(creator.equipment_tags);
                const postProductionTags = extractTerms(creator.post_production_tags);
                const specializationTags = extractTerms(creator.specialization_tags);
                const styleTags = extractTerms(creator.style_tags);
                const budgetTiers = extractTerms(creator.budget_tiers);
                const travelLocations = extractTerms(creator.travel_locations);
                const terms = [normalize(creator.role), normalize(creator.primary_service), ...serviceTags, ...eventTags, ...equipmentTags, ...postProductionTags, ...specializationTags, ...styleTags, ...extractTerms(creator.tags), ...serviceCities, ...travelLocations].join(" ");
                const sameCity = requestedCity && creatorCity && (creatorCity.includes(requestedCity) || requestedCity.includes(creatorCity));
                const serviceCity = serviceCities.some((city) => city.includes(requestedCity) || requestedCity.includes(city));
                const travelLocation = travelLocations.some((city) => city.includes(requestedCity) || requestedCity.includes(city));
                const travelRadius = Number(creator.travel_radius_km || 0);
                const eventMatch = eventTags.some((tag) => tag === eventLabel || tag.includes(eventLabel) || eventLabel.includes(tag));
                const matchedServiceCount = requestedRoles.filter((role) => serviceTags.includes(role) || terms.includes(role)).length;
                const matchedEquipmentCount = requestedEquipment.filter((item) => equipmentTags.includes(item) || terms.includes(item)).length;
                const matchedPostProductionCount = requestedPostProduction.filter((item) => postProductionTags.includes(item) || terms.includes(item)).length;
                const specializationMatch = specializationTags.some((tag) => eventLabel.includes(tag) || terms.includes(tag));
                const styleMatch = styleTags.some((tag) => terms.includes(tag));
                const roleMatch = matchedServiceCount > 0 || eventMatch || terms.includes(eventLabel);
                const available = availabilityMap.get(creator.id) ?? true;
                const dayRate = Number(creator.day_rate || 0);
                const budgetTierFit = budgetTiers.length === 0 || budgetTiers.includes(normalize(draft.budgetTier)) || creator.budget_flexibility;

                let score = 0;
                if (creator.verified) score += 40;
                if (sameCity) score += 35;
                if (serviceCity) score += 25;
                if (travelLocation || travelRadius > 0) score += 12;
                if (eventMatch) score += 35;
                if (specializationMatch) score += 16;
                if (styleMatch) score += 8;
                if (matchedServiceCount > 0) score += 20 + matchedServiceCount * 15;
                if (matchedEquipmentCount > 0) score += matchedEquipmentCount * 6;
                if (matchedPostProductionCount > 0) score += matchedPostProductionCount * 6;
                if (available) score += 15;
                if (budgetTierFit) score += 10;
                score += Math.min(10, Number(creator.rating || 0) * 2);
                score += Math.min(10, Number(creator.profile_completeness || 0) / 10);
                score += Math.min(10, Number(creator.completed_shoots || 0) / 5);
                score += Math.min(8, Number(creator.response_rate || 0) / 15);
                score += Math.min(8, Number(creator.completion_rate || 0) / 15);
                if (creator.instant_booking_enabled) score += 5;

                if (!sameCity && !serviceCity && !travelLocation && !travelRadius && requestedCity) return null;
                if (!roleMatch && requestedTerms.length > 0) return null;

                const userRecord = Array.isArray(creator.users) ? creator.users[0] : creator.users;
                return {
                    creator_id: creator.id,
                    name: userRecord?.full_name || creator.role || "Verified Creator",
                    city: creator.city || creator.location || "City not set",
                    state: creator.state || null,
                    primary_service: creator.primary_service || creator.role || serviceTags[0] || "Production Service",
                    starting_price: dayRate,
                    rating: Number(creator.rating || 4.5),
                    completed_shoots: Number(creator.completed_shoots || 0),
                    response_time: creator.response_time || "Usually responds soon",
                    is_verified: Boolean(creator.verified),
                    profile_image_url: creator.profile_image_url,
                    portfolio_url: creator.portfolio_url,
                    available,
                    score,
                    match_label: score >= 130 ? "Best Match" : eventMatch ? `Recommended for ${getEventTypeLabel(draft.eventType, draft.customEventType)}` : sameCity ? "Popular near you" : "Service area match",
                } satisfies QuickCreatorMatch;
            })
            .filter((match): match is QuickCreatorMatch => Boolean(match))
            .sort((a, b) => b.score - a.score)
            .slice(0, 20);

        return { success: true, message: `${matches.length} creators found near you.`, matches, estimated_total: draft.estimatedTotal };
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : "Could not find matches.", matches: [], estimated_total: 0 };
    }
}

export async function selectQuickBookingCreator(input: QuickBookingDraft & { creatorId: string }) {
    try {
        const draft = validateDraft(input);
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, message: "Login is required." };

        const admin = createAdminClient();
        const { data: client } = await admin.from("users").select("full_name, account_type").eq("id", user.id).single();
        if (client?.account_type !== "client") {
            return { success: false, message: "Only client accounts can select a creator." };
        }

        const { data: creator, error: creatorError } = await admin
            .from("creators")
            .select("id, verified, available_for_booking")
            .eq("id", input.creatorId)
            .single();

        if (creatorError || !creator || creator.verified !== true || creator.available_for_booking === false) {
            return { success: false, message: "This creator is not available for quick booking." };
        }

        const { data: booking, error } = await admin
            .from("quick_bookings")
            .insert({
                client_id: user.id,
                creator_id: input.creatorId,
                event_type: draft.eventType,
                custom_event_type: draft.customEventType,
                shoot_date: draft.shootDate,
                shoot_time: draft.shootTime,
                duration_hours: draft.durationHours,
                location_address: draft.locationAddress,
                city: draft.city,
                state: draft.state,
                latitude: draft.latitude,
                longitude: draft.longitude,
                crew_requirements: draft.crewRequirements,
                equipment_requirements: draft.equipmentRequirements,
                post_production_requirements: draft.postProductionRequirements,
                budget_tier: draft.budgetTier,
                custom_budget_amount: draft.customBudgetAmount,
                estimated_total: draft.estimatedTotal,
                status: "pending_creator_acceptance",
            })
            .select("id")
            .single();

        if (error || !booking) {
            console.error("Quick booking create error:", error);
            return { success: false, message: "Could not create quick booking." };
        }

        const eventName = getEventTypeLabel(draft.eventType, draft.customEventType);
        const clientEmail = await getUserEmail(admin, user.id);
        if (clientEmail.email) {
            await sendBookingCreatedEmail(
                clientEmail.email,
                clientEmail.name || "Client",
                eventName,
                booking.id
            );
        }

        await upsertQuickBookingFinancials(admin, {
            id: booking.id,
            client_id: user.id,
            creator_id: input.creatorId,
            custom_budget_amount: draft.customBudgetAmount,
            estimated_total: draft.estimatedTotal,
        });

        const clientName = client?.full_name || "a client";
        const title = "New quick booking request";
        const message = `New quick booking request from ${clientName} for ${eventName} on ${draft.shootDate}.`;

        await admin.from("creator_notifications").insert({
            creator_id: input.creatorId,
            booking_id: booking.id,
            type: "quick_booking_request",
            title,
            message,
        });

        await admin.from("notifications").insert({
            user_id: input.creatorId,
            type: "quick_booking_request",
            title,
            message,
            data: { quick_booking_id: booking.id, cta_url: "/creator-dashboard" },
        });

        const creatorEmail = await getUserEmail(admin, input.creatorId);
        if (creatorEmail.email) {
            await sendBookingInvitationEmail(
                creatorEmail.email,
                creatorEmail.name || "Creator",
                clientName,
                eventName,
                draft.shootDate
            );
        }
        revalidatePath("/creator-dashboard");
        return { success: true, message: "Creator selected. They have been notified.", booking_id: booking.id };
    } catch (error) {
        console.error("Select quick booking creator error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Could not select creator." };
    }
}

export type CreatorQuickBookingRequest = {
    id: string;
    client_name: string;
    event_type: string;
    shoot_date: string;
    shoot_time: string;
    duration_hours: number;
    city: string;
    location_address: string;
    budget_tier: string;
    estimated_total: number;
    status: string;
    crew_requirements: Record<string, number>;
};

export async function listCreatorQuickBookings(): Promise<CreatorQuickBookingRequest[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const admin = createAdminClient();
    const { data, error } = await admin
        .from("quick_bookings")
        .select("id, event_type, custom_event_type, shoot_date, shoot_time, duration_hours, city, location_address, budget_tier, estimated_total, status, crew_requirements, users!quick_bookings_client_id_fkey(full_name)")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Creator quick bookings fetch error:", error);
        return [];
    }

    return (data || []).map((booking) => {
        const client = Array.isArray(booking.users) ? booking.users[0] : booking.users;
        return {
            id: String(booking.id),
            client_name: client?.full_name || "Client",
            event_type: getEventTypeLabel(String(booking.event_type), booking.custom_event_type as string | null),
            shoot_date: String(booking.shoot_date),
            shoot_time: String(booking.shoot_time),
            duration_hours: Number(booking.duration_hours || 0),
            city: String(booking.city || ""),
            location_address: String(booking.location_address || ""),
            budget_tier: String(booking.budget_tier || ""),
            estimated_total: Number(booking.estimated_total || 0),
            status: String(booking.status || ""),
            crew_requirements: (booking.crew_requirements || {}) as Record<string, number>,
        };
    });
}

export async function respondToQuickBooking(bookingId: string, status: "creator_accepted" | "creator_rejected" | "more_details_requested") {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Unauthorized." };

    const admin = createAdminClient();
    const { data: booking, error } = await admin
        .from("quick_bookings")
        .update({ status, responded_at: new Date().toISOString() })
        .eq("id", bookingId)
        .eq("creator_id", user.id)
        .eq("status", "pending_creator_acceptance")
        .select("id, client_id, event_type, custom_event_type")
        .single();

    if (error) {
        console.error("Quick booking response error:", error);
        return { success: false, message: "Could not update quick booking." };
    }

    if (status === "creator_accepted" && booking) {
        const [clientEmail, creatorEmail] = await Promise.all([
            getUserEmail(admin, booking.client_id),
            getUserEmail(admin, user.id)
        ]);
        if (clientEmail.email) {
            await sendBookingConfirmedEmail(
                clientEmail.email,
                clientEmail.name || "Client",
                getEventTypeLabel(String(booking.event_type), booking.custom_event_type as string | null),
                creatorEmail.name || "Creator",
                "your selected date"
            );
        }
    }

    revalidatePath("/creator-dashboard");
    return { success: true, message: "Quick booking updated." };
}

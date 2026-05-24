import type { SupabaseClient } from "@supabase/supabase-js";

export type BookingType =
    | "photographer"
    | "videographer"
    | "editor"
    | "studio"
    | "equipment"
    | "production_crew";

export type BookingMatchInput = {
    projectId?: string;
    bookingType: BookingType;
    bookingLocation?: string | null;
    eventDate?: string | null;
    bookingCreatedAt?: string | null;
    budget: number;
    estimatedDays?: number | null;
    requirementSummary?: string | null;
    limit?: number;
};

export type CreatorMatch = {
    creatorId: string;
    matchScore: number;
    matchReason: string;
};

type CreatorRecord = {
    id: string;
    role: string | null;
    location: string | null;
    city: string | null;
    state: string | null;
    day_rate: number | null;
    verified: boolean | null;
    equipment: unknown;
    tags: unknown;
    service_cities: unknown;
    creator_type: string | null;
    budget_flexibility: boolean | null;
    available_for_booking: boolean | null;
    travel_enabled: boolean | null;
    service_radius_km: number | null;
    capacity_per_day: number | null;
};

const roleTermsByBookingType: Record<BookingType, string[]> = {
    photographer: ["photo", "photographer", "photography"],
    videographer: ["video", "videographer", "camera", "dop", "cinematographer"],
    editor: ["editor", "edit", "post", "color", "video editor", "photo editor"],
    studio: ["studio", "production house", "company"],
    equipment: ["equipment", "equipment provider", "rental", "gear", "camera body", "lens", "light"],
    production_crew: ["director", "production", "crew", "production crew", "event crew", "camera", "audio", "sound", "dop", "photo", "video", "editor"],
};

function normalize(value: string | null | undefined) {
    return (value || "").trim().toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ");
}

function extractTerms(value: unknown) {
    if (Array.isArray(value)) {
        return value.map((item) => normalize(String(item))).filter(Boolean);
    }

    if (typeof value === "string") {
        return [normalize(value)].filter(Boolean);
    }

    return [];
}

function includesAny(source: string, terms: string[]) {
    return terms.some((term) => source.includes(term));
}

function hasRoleMatch(creator: CreatorRecord, bookingType: BookingType) {
    const terms = roleTermsByBookingType[bookingType];
    const searchable = [
        creator.role,
        creator.creator_type,
        ...extractTerms(creator.tags),
        ...extractTerms(creator.equipment),
    ]
        .map((value) => normalize(value))
        .join(" ");

    return includesAny(searchable, terms);
}

function getLocationSignals(creator: CreatorRecord, bookingLocation?: string | null) {
    const requestedLocation = normalize(bookingLocation);
    const city = normalize(creator.city);
    const state = normalize(creator.state);
    const location = normalize(creator.location);
    const serviceCities = extractTerms(creator.service_cities);
    const sameCityMatch = Boolean(
        requestedLocation &&
        (
            (city && requestedLocation.includes(city)) ||
            (city && city.includes(requestedLocation)) ||
            (!city && location && requestedLocation.includes(location)) ||
            (!city && location && location.includes(requestedLocation))
        )
    );
    const serviceCityMatch = Boolean(
        requestedLocation &&
        serviceCities.some((serviceCity) => requestedLocation.includes(serviceCity) || serviceCity.includes(requestedLocation))
    );
    const sameStateMatch = Boolean(state && requestedLocation.includes(state));
    const travelEnabled = creator.travel_enabled === true;
    const radiusTravelMatch = travelEnabled && Number(creator.service_radius_km || 0) > 0;
    const nearbyCityMatch = serviceCityMatch || sameStateMatch || radiusTravelMatch;

    return {
        sameCityMatch,
        serviceCityMatch,
        sameStateMatch,
        travelEnabled,
        radiusTravelMatch,
        nearbyCityMatch,
    };
}

function isUrgentBooking(eventDate?: string | null, bookingCreatedAt?: string | null) {
    if (!eventDate) return false;

    const created = bookingCreatedAt ? new Date(bookingCreatedAt) : new Date();
    const event = new Date(eventDate);
    if (Number.isNaN(event.getTime())) return false;

    created.setHours(0, 0, 0, 0);
    event.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((event.getTime() - created.getTime()) / (24 * 60 * 60 * 1000));
    return diffDays >= 0 && diffDays <= 2;
}

function getBudgetFit(
    creator: CreatorRecord,
    budget: number,
    estimatedDays: number
) {
    if (!budget || budget <= 0) {
        return { eligible: true, score: 5, reason: "Budget guidance requested" };
    }

    const dayRate = Number(creator.day_rate || 0);
    if (dayRate <= 0) {
        return { eligible: true, score: 5, reason: "No day rate listed" };
    }

    const requiredBudget = dayRate * estimatedDays;
    if (budget < requiredBudget) {
        if (creator.budget_flexibility && budget >= requiredBudget * 0.8) {
            return {
                eligible: true,
                score: 8,
                reason: "Budget is slightly below rate, but creator is negotiable",
            };
        }

        return {
            eligible: false,
            score: 0,
            reason: "Budget below creator day rate for estimated duration",
        };
    }

    if (budget > dayRate * 3) {
        return { eligible: true, score: 30, reason: "Premium budget fit" };
    }

    return { eligible: true, score: 20, reason: "Budget fits creator rate" };
}

export async function matchCreators(
    supabase: SupabaseClient,
    input: BookingMatchInput
): Promise<CreatorMatch[]> {
    const estimatedDays = Math.max(1, Number(input.estimatedDays || 1));
    const urgent = isUrgentBooking(input.eventDate, input.bookingCreatedAt);
    const defaultLimit = urgent ? 20 : 50;
    const limit = Math.min(Math.max(Number(input.limit || defaultLimit), 1), defaultLimit);
    const alreadyInvitedCreatorIds = new Set<string>();

    if (input.projectId) {
        const { data: existingInvites, error: inviteError } = await supabase
            .from("project_invites")
            .select("creator_id")
            .eq("project_id", input.projectId);

        if (inviteError) {
            console.error("Existing invite fetch error:", inviteError);
        }

        (existingInvites || []).forEach((invite) => {
            if (invite.creator_id) alreadyInvitedCreatorIds.add(String(invite.creator_id));
        });
    }

    const { data, error } = await supabase
        .from("creators")
        .select(`
            id,
            role,
            location,
            city,
            state,
            day_rate,
            verified,
            equipment,
            tags,
            service_cities,
            creator_type,
            budget_flexibility,
            available_for_booking,
            travel_enabled,
            service_radius_km,
            capacity_per_day
        `)
        .eq("verified", true);

    if (error) {
        throw error;
    }

    const creators = (data || []) as CreatorRecord[];

    return creators
        .map((creator) => {
            if (alreadyInvitedCreatorIds.has(creator.id)) return null;
            if (creator.available_for_booking === false) return null;
            if (creator.capacity_per_day !== null && creator.capacity_per_day <= 0) return null;

            const roleMatched = hasRoleMatch(creator, input.bookingType);
            if (!roleMatched) return null;

            const budgetFit = getBudgetFit(creator, input.budget, estimatedDays);
            if (!budgetFit.eligible) return null;

            const location = getLocationSignals(creator, input.bookingLocation);
            const hasCoverage = location.sameCityMatch
                || location.serviceCityMatch
                || location.sameStateMatch
                || location.radiusTravelMatch
                || (!urgent && location.travelEnabled);

            if (input.bookingLocation && !hasCoverage) {
                return null;
            }

            const reasons: string[] = [urgent ? "urgent booking" : "planned booking", budgetFit.reason];
            let score = 30 + budgetFit.score;

            if (location.sameCityMatch) {
                score += urgent ? 70 : 50;
                reasons.push(urgent ? "Same city creator matched for urgent booking" : "Same city creator matched");
            }

            if (location.serviceCityMatch) {
                score += urgent ? 50 : 50;
                reasons.push(urgent ? "Creator serves requested city and can respond quickly" : "Creator serves requested city");
            }

            if (location.travelEnabled) {
                score += urgent ? 15 : 35;
                if (urgent) score -= 10;
                reasons.push(urgent ? "Nearby travel-enabled creator matched for urgent booking" : "Creator can travel to the requested city with advance notice");
            }

            if (location.sameStateMatch && !location.sameCityMatch) {
                score += 20;
                reasons.push(urgent ? "nearby same-state creator for urgent booking" : "Nearby creator matched for planned booking");
            }

            if (normalize(creator.creator_type) && input.bookingType === "studio" && normalize(creator.creator_type).includes("studio")) {
                score += 10;
                reasons.push("studio profile match");
            }

            if (normalize(creator.creator_type) && input.bookingType === "equipment" && normalize(creator.creator_type).includes("equipment")) {
                score += 10;
                reasons.push("equipment provider match");
            }

            const tagTerms = extractTerms(creator.tags);
            const equipmentTerms = extractTerms(creator.equipment);
            const requirement = normalize(input.requirementSummary);
            const metadataMatch = [...tagTerms, ...equipmentTerms].some((term) => requirement.includes(term));
            if (metadataMatch) {
                score += 10;
                reasons.push("requirements match profile tags or equipment");
            }

            if (creator.capacity_per_day && creator.capacity_per_day > 1) {
                score += 4;
                reasons.push("available capacity");
            }

            return {
                creatorId: creator.id,
                matchScore: score,
                matchReason: reasons.join("; "),
            };
        })
        .filter((match): match is CreatorMatch => Boolean(match))
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);
}

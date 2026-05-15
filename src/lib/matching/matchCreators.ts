import type { SupabaseClient } from "@supabase/supabase-js";

export type BookingType =
    | "photographer"
    | "videographer"
    | "editor"
    | "studio"
    | "equipment"
    | "production_crew";

export type BookingMatchInput = {
    bookingType: BookingType;
    bookingLocation?: string | null;
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
    day_rate: number | null;
    verified: boolean | null;
    equipment: unknown;
    tags: unknown;
    creator_type: string | null;
    budget_flexibility: boolean | null;
    available_for_booking: boolean | null;
    capacity_per_day: number | null;
};

const roleTermsByBookingType: Record<BookingType, string[]> = {
    photographer: ["photo", "photographer", "photography"],
    videographer: ["video", "videographer", "camera", "dop", "cinematographer"],
    editor: ["editor", "edit", "post", "color"],
    studio: ["studio", "production house", "company"],
    equipment: ["equipment", "rental", "gear", "camera body", "lens", "light"],
    production_crew: ["director", "production", "crew", "camera", "audio", "sound", "dop", "photo", "video", "editor"],
};

function normalize(value: string | null | undefined) {
    return (value || "").trim().toLowerCase();
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

function hasLocationMatch(creator: CreatorRecord, bookingLocation?: string | null) {
    const requestedLocation = normalize(bookingLocation);
    if (!requestedLocation) return false;

    const city = normalize(creator.city);
    const location = normalize(creator.location);

    return Boolean(
        (city && requestedLocation.includes(city)) ||
        (city && city.includes(requestedLocation)) ||
        (location && requestedLocation.includes(location)) ||
        (location && location.includes(requestedLocation))
    );
}

function getBudgetFit(
    creator: CreatorRecord,
    budget: number,
    estimatedDays: number
) {
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
        return { eligible: true, score: 18, reason: "Premium budget fit" };
    }

    return { eligible: true, score: 14, reason: "Budget fits creator rate" };
}

export async function matchCreators(
    supabase: SupabaseClient,
    input: BookingMatchInput
): Promise<CreatorMatch[]> {
    const estimatedDays = Math.max(1, Number(input.estimatedDays || 1));
    const limit = Math.min(Math.max(Number(input.limit || 20), 1), 50);

    const { data, error } = await supabase
        .from("creators")
        .select(`
            id,
            role,
            location,
            city,
            day_rate,
            verified,
            equipment,
            tags,
            creator_type,
            budget_flexibility,
            available_for_booking,
            capacity_per_day
        `)
        .eq("verified", true);

    if (error) {
        throw error;
    }

    const creators = (data || []) as CreatorRecord[];

    return creators
        .map((creator) => {
            if (creator.available_for_booking === false) return null;
            if (creator.capacity_per_day !== null && creator.capacity_per_day <= 0) return null;

            const roleMatched = hasRoleMatch(creator, input.bookingType);
            if (!roleMatched) return null;

            const budgetFit = getBudgetFit(creator, input.budget, estimatedDays);
            if (!budgetFit.eligible) return null;

            const reasons: string[] = [budgetFit.reason];
            let score = 40 + budgetFit.score;

            if (hasLocationMatch(creator, input.bookingLocation)) {
                score += 20;
                reasons.push("location match");
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
                score += 8;
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

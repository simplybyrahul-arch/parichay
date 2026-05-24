import {
    BOOKING_CREW_OPTIONS,
    BOOKING_EVENT_OPTIONS,
    CUSTOM_EVENT_TYPE_ID,
    EQUIPMENT_REQUIREMENT_OPTIONS,
    POST_PRODUCTION_OPTIONS,
    getEventTypeLabel,
} from "@/config/bookingOptions";

type RequirementMap = Record<string, number | boolean>;

export function cleanRequirementMap<T extends RequirementMap>(requirements: T) {
    return Object.fromEntries(
        Object.entries(requirements).filter(([, value]) => value === true || Number(value || 0) > 0)
    );
}

export function formatRequirementLabels(requirements: RequirementMap, kind: "crew" | "equipment" | "post") {
    const options = kind === "crew"
        ? BOOKING_CREW_OPTIONS
        : kind === "equipment"
            ? EQUIPMENT_REQUIREMENT_OPTIONS
            : POST_PRODUCTION_OPTIONS;

    return options
        .filter((option) => {
            const value = requirements[option.id];
            return value === true || Number(value || 0) > 0;
        })
        .map((option) => {
            const value = requirements[option.id];
            return typeof value === "number" && value > 1 ? `${value}x ${option.label}` : option.label;
        });
}

export function findEventTypeFromText(text: string) {
    const normalized = text.toLowerCase();
    return BOOKING_EVENT_OPTIONS.find((option) => normalized.includes(option.label.toLowerCase()))?.id || CUSTOM_EVENT_TYPE_ID;
}

export function buildProjectRequirementSummary(input: {
    eventType: string;
    customEventType?: string;
    description: string;
    crewRequirements: Record<string, number>;
    equipmentRequirements: RequirementMap;
    postProductionRequirements: RequirementMap;
    location?: string;
    days?: number;
}) {
    const sections = [
        `Project type: ${getEventTypeLabel(input.eventType, input.customEventType)}`,
        input.location ? `Location: ${input.location}` : null,
        input.days ? `Shoot days: ${input.days}` : null,
        input.description ? `Brief: ${input.description}` : null,
        formatRequirementLabels(input.crewRequirements, "crew").length
            ? `Crew: ${formatRequirementLabels(input.crewRequirements, "crew").join(", ")}`
            : null,
        formatRequirementLabels(input.equipmentRequirements, "equipment").length
            ? `Equipment: ${formatRequirementLabels(input.equipmentRequirements, "equipment").join(", ")}`
            : null,
        formatRequirementLabels(input.postProductionRequirements, "post").length
            ? `Post-production: ${formatRequirementLabels(input.postProductionRequirements, "post").join(", ")}`
            : null,
    ].filter(Boolean);

    return sections.join("\n");
}

export function mapBudgetTierToPlanningBudget(tier: string, customAmount?: number | null) {
    if (customAmount && Number.isFinite(customAmount) && customAmount > 0) return customAmount;
    if (tier === "premium") return 75000;
    if (tier === "standard") return 40000;
    if (tier === "budget") return 25000;
    return 0;
}

import {
    BOOKING_CREW_CATEGORIES,
    BOOKING_EVENT_CATEGORIES,
    CREW_CATEGORY_ICONS,
    CUSTOM_EVENT_TYPE_ID,
    EQUIPMENT_REQUIREMENT_OPTIONS,
    POST_PRODUCTION_OPTIONS,
    getCrewRequirementSummary,
    getEventTypeLabel,
} from "@/config/bookingOptions";

export type ProductionEventOption = {
    id: string;
    label: string;
};

export type ProductionEventCategory = {
    id: string;
    label: string;
    icon: (typeof BOOKING_EVENT_CATEGORIES)[number]["icon"];
    options: ProductionEventOption[];
};

export type ProductionCrewRole = {
    id: string;
    name: string;
    category: string;
    priceMin: number;
    priceMax: number;
    info: string;
};

export type ProductionToggleOption = {
    id: string;
    label: string;
};

export { CREW_CATEGORY_ICONS, CUSTOM_EVENT_TYPE_ID, getCrewRequirementSummary, getEventTypeLabel };

export const EVENT_TYPE_CATEGORIES: ProductionEventCategory[] = BOOKING_EVENT_CATEGORIES;

export const PRODUCTION_CREW_ROLES: ProductionCrewRole[] = BOOKING_CREW_CATEGORIES.flatMap((category) =>
    category.options.map((role) => ({
        id: role.id,
        name: role.label,
        category: category.label,
        priceMin: 0,
        priceMax: 0,
        info: role.description || "",
    }))
);

export const POST_PRODUCTION_REQUIREMENT_OPTIONS: ProductionToggleOption[] = POST_PRODUCTION_OPTIONS;

export { EQUIPMENT_REQUIREMENT_OPTIONS };

export function estimateCrewBudget() {
    return 0;
}

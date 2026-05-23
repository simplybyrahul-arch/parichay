import {
    BOOKING_CREW_OPTIONS,
    BOOKING_EVENT_OPTIONS,
    BUDGET_TIER_OPTIONS,
    getEventTypeLabel,
    type BudgetTier,
} from "@/config/bookingOptions";

export const QUICK_EVENT_OPTIONS = BOOKING_EVENT_OPTIONS;
export const QUICK_CREW_ROLES = BOOKING_CREW_OPTIONS.map((role) => ({
    id: role.id,
    name: role.label,
    description: role.description || "",
}));
export const BUDGET_TIERS = BUDGET_TIER_OPTIONS;
export type { BudgetTier };

export function estimateQuickBookingTotal() {
    return 0;
}

export function getQuickEventLabel(eventType: string, customEventType?: string | null) {
    return getEventTypeLabel(eventType, customEventType);
}

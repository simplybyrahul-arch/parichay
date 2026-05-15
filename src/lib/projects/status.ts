export const activeOpportunityStatuses = ["open", "matching", "receiving_interest", "client_selecting"] as const;

export function isProjectActiveOpportunity(status: string | null | undefined) {
    return activeOpportunityStatuses.includes(status as (typeof activeOpportunityStatuses)[number]);
}

export function isProjectExpired(status: string | null | undefined) {
    return status === "expired";
}

export function isProjectOpenForResponses(status: string | null | undefined) {
    return isProjectActiveOpportunity(status);
}

export function isProjectSelectable(status: string | null | undefined) {
    return isProjectActiveOpportunity(status);
}

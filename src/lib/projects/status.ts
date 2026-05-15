export const activeOpportunityStatuses = ["open", "matching", "receiving_interest", "client_selecting"] as const;
export const clientCancellableStatuses = ["open", "matching", "receiving_interest", "client_selecting", "pending_payment"] as const;
export const receivedPaymentStatuses = ["escrowed", "coordinator_verified", "admin_verified", "payment_received", "paid", "received", "released"] as const;

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

export function isClientProjectCancellable(
    status: string | null | undefined,
    paymentStatus: string | null | undefined,
    selectedCreatorId?: string | null
) {
    if (!clientCancellableStatuses.includes(status as (typeof clientCancellableStatuses)[number])) {
        return false;
    }

    if (receivedPaymentStatuses.includes(paymentStatus as (typeof receivedPaymentStatuses)[number])) {
        return false;
    }

    if (status === "pending_payment") {
        return !receivedPaymentStatuses.includes(paymentStatus as (typeof receivedPaymentStatuses)[number]);
    }

    return !selectedCreatorId;
}

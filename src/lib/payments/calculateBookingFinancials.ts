export type FinanceBookingType = "quick_booking" | "custom_project" | "equipment_rental";

export type CalculateBookingFinancialsInput = {
    booking_type: FinanceBookingType;
    gross_amount: number;
    provider_id?: string | null;
    client_id?: string | null;
    gateway_fee?: number;
    tax_amount?: number;
};

export type BookingFinancialBreakdown = {
    gross_booking_amount: number;
    platform_commission_percent: number;
    platform_commission_amount: number;
    client_service_fee_percent: number;
    client_service_fee_amount: number;
    gateway_fee_amount: number;
    tax_amount: number;
    provider_payout_amount: number;
    client_payable_amount: number;
    platform_revenue: number;
    currency: "INR";
};

const COMMISSION_BY_BOOKING_TYPE: Record<FinanceBookingType, number> = {
    quick_booking: 12,
    custom_project: 15,
    equipment_rental: 8,
};

function roundInr(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getClientServiceFeePercent(grossAmount: number) {
    if (grossAmount < 10000) return 5;
    if (grossAmount <= 50000) return 4;
    return 3;
}

export function calculateBookingFinancials(input: CalculateBookingFinancialsInput): BookingFinancialBreakdown {
    const grossBookingAmount = Number(input.gross_amount || 0);
    if (!Number.isFinite(grossBookingAmount) || grossBookingAmount < 0) {
        throw new Error("Gross booking amount must be zero or greater.");
    }

    const platformCommissionPercent = COMMISSION_BY_BOOKING_TYPE[input.booking_type];
    if (platformCommissionPercent === undefined) {
        throw new Error(`Unsupported booking type: ${input.booking_type}`);
    }

    const clientServiceFeePercent = getClientServiceFeePercent(grossBookingAmount);
    const gatewayFeeAmount = roundInr(Math.max(0, Number(input.gateway_fee || 0)));
    const taxAmount = roundInr(Math.max(0, Number(input.tax_amount || 0)));
    const platformCommissionAmount = roundInr(grossBookingAmount * (platformCommissionPercent / 100));
    const clientServiceFeeAmount = roundInr(grossBookingAmount * (clientServiceFeePercent / 100));
    const providerPayoutAmount = roundInr(grossBookingAmount - platformCommissionAmount);
    const clientPayableAmount = roundInr(grossBookingAmount + clientServiceFeeAmount + taxAmount + gatewayFeeAmount);
    const platformRevenue = roundInr(platformCommissionAmount + clientServiceFeeAmount);

    return {
        gross_booking_amount: roundInr(grossBookingAmount),
        platform_commission_percent: platformCommissionPercent,
        platform_commission_amount: platformCommissionAmount,
        client_service_fee_percent: clientServiceFeePercent,
        client_service_fee_amount: clientServiceFeeAmount,
        gateway_fee_amount: gatewayFeeAmount,
        tax_amount: taxAmount,
        provider_payout_amount: providerPayoutAmount,
        client_payable_amount: clientPayableAmount,
        platform_revenue: platformRevenue,
        currency: "INR",
    };
}

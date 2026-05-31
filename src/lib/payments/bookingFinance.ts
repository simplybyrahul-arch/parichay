import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateBookingFinancials, type FinanceBookingType } from "./calculateBookingFinancials";

type ProjectFinanceSource = {
    id: string;
    client_id: string | null;
    selected_creator_id?: string | null;
    creator_id?: string | null;
    budget?: number | null;
    booking_type?: string | null;
};

type QuickBookingFinanceSource = {
    id: string;
    client_id: string | null;
    creator_id: string | null;
    custom_budget_amount?: number | null;
    estimated_total?: number | null;
};

type ProviderProfileRow = {
    id: string;
    user_id: string;
    provider_type: string;
};

type FinanceStatus =
    | "pending"
    | "quote_selected"
    | "payment_received"
    | "payout_ready"
    | "payout_released"
    | "refunded";

function projectBookingTypeToFinanceType(bookingType: string | null | undefined): FinanceBookingType {
    return bookingType === "equipment" ? "equipment_rental" : "custom_project";
}

function amountFromProject(project: ProjectFinanceSource) {
    return Number(project.budget || 0);
}

function amountFromQuickBooking(booking: QuickBookingFinanceSource) {
    return Number(booking.custom_budget_amount || booking.estimated_total || 0);
}

function aliasFinancialFields(breakdown: ReturnType<typeof calculateBookingFinancials>, status: FinanceStatus, clientId: string | null) {
    return {
        customer_id: clientId,
        gross_amount: breakdown.gross_booking_amount,
        platform_commission: breakdown.platform_commission_amount,
        provider_amount: breakdown.provider_payout_amount,
        escrow_amount: ["payment_received", "payout_ready"].includes(status) ? breakdown.gross_booking_amount : 0,
        status,
    };
}

async function upsertBookingFinancialRow(
    admin: SupabaseClient,
    payload: Record<string, unknown>,
    providerId: string | null
) {
    if (providerId) {
        const { data: pending } = await admin
            .from("booking_financials")
            .select("id")
            .eq("booking_id", String(payload.booking_id))
            .eq("booking_type", String(payload.booking_type))
            .is("provider_id", null)
            .maybeSingle();

        if (pending?.id) {
            return admin
                .from("booking_financials")
                .update(payload)
                .eq("id", pending.id)
                .select("*")
                .single();
        }

        return admin
            .from("booking_financials")
            .upsert(payload, { onConflict: "booking_id,booking_type,provider_id" })
            .select("*")
            .single();
    }

    const { data: existing, error: lookupError } = await admin
        .from("booking_financials")
        .select("id")
        .eq("booking_id", String(payload.booking_id))
        .eq("booking_type", String(payload.booking_type))
        .is("provider_id", null)
        .maybeSingle();

    if (lookupError) return { data: null, error: lookupError };

    if (existing?.id) {
        return admin
            .from("booking_financials")
            .update(payload)
            .eq("id", existing.id)
            .select("*")
            .single();
    }

    return admin
        .from("booking_financials")
        .insert(payload)
        .select("*")
        .single();
}

function fallbackProviderType(fallbackType: FinanceBookingType) {
    return fallbackType === "equipment_rental" ? "equipment_vendor" : "creator";
}

export async function ensureProviderProfileForUser(
    admin: SupabaseClient,
    userId: string,
    fallbackType: FinanceBookingType = "custom_project"
) {
    const expectedType = fallbackProviderType(fallbackType);
    const existingQuery = admin
        .from("provider_profiles")
        .select("id, user_id, provider_type")
        .eq("user_id", userId);

    if (expectedType === "equipment_vendor") {
        existingQuery.eq("provider_type", "equipment_vendor");
    } else {
        existingQuery.in("provider_type", ["creator", "studio"]);
    }

    const { data: existing } = await existingQuery.limit(1).maybeSingle();

    if (existing) return existing as ProviderProfileRow;

    const [{ data: user }, { data: creator }] = await Promise.all([
        admin.from("users").select("id, full_name, account_type").eq("id", userId).maybeSingle(),
        admin.from("creators").select("id, creator_type, city, state, verified, profile_completeness").eq("id", userId).maybeSingle(),
    ]);

    const creatorType = String(creator?.creator_type || "");
    const providerType = fallbackType === "equipment_rental"
        ? "equipment_vendor"
        : creatorType === "studio_owner"
            ? "studio"
            : "creator";

    const { data: inserted, error } = await admin
        .from("provider_profiles")
        .upsert({
            user_id: userId,
            provider_type: providerType,
            provider_subtype: creatorType === "studio_owner" ? "studio" : creatorType || "freelancer",
            business_name: user?.full_name || "ShotcutCrew Provider",
            city: creator?.city || null,
            state: creator?.state || null,
            verified: Boolean(creator?.verified),
            profile_completion: Number(creator?.profile_completeness || 40),
            updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,provider_type" })
        .select("id, user_id, provider_type")
        .single();

    if (error || !inserted) {
        console.error("Provider profile finance upsert error:", error);
        return null;
    }

    return inserted as ProviderProfileRow;
}

export async function upsertProjectBookingFinancials(
    admin: SupabaseClient,
    project: ProjectFinanceSource,
    options?: { gatewayFee?: number; taxAmount?: number; status?: FinanceStatus }
) {
    const providerUserId = project.selected_creator_id || project.creator_id || null;
    const financeType = projectBookingTypeToFinanceType(project.booking_type);
    const grossAmount = amountFromProject(project);
    if (!project.client_id) return null;

    const provider = providerUserId ? await ensureProviderProfileForUser(admin, providerUserId, financeType) : null;
    if (providerUserId && !provider) return null;

    const breakdown = calculateBookingFinancials({
        booking_type: financeType,
        gross_amount: grossAmount,
        gateway_fee: options?.gatewayFee,
        tax_amount: options?.taxAmount,
        provider_id: provider?.id,
        client_id: project.client_id,
    });

    const status = options?.status || (provider ? "quote_selected" : "pending");
    const { data, error } = await upsertBookingFinancialRow(admin, {
        booking_id: project.id,
        booking_type: financeType,
        provider_id: provider?.id || null,
        client_id: project.client_id,
        ...breakdown,
        ...aliasFinancialFields(breakdown, status, project.client_id),
        updated_at: new Date().toISOString(),
    }, provider?.id || null);

    if (error) {
        console.error("Project booking financial upsert error:", error);
        return null;
    }

    if (provider?.id) {
        await admin.from("provider_wallets").upsert({ provider_id: provider.id }, { onConflict: "provider_id" });
    }
    return data;
}

export async function upsertQuickBookingFinancials(
    admin: SupabaseClient,
    booking: QuickBookingFinanceSource,
    options?: { gatewayFee?: number; taxAmount?: number; status?: FinanceStatus }
) {
    const grossAmount = amountFromQuickBooking(booking);
    if (!booking.creator_id || !booking.client_id) return null;

    const provider = await ensureProviderProfileForUser(admin, booking.creator_id, "quick_booking");
    if (!provider) return null;

    const breakdown = calculateBookingFinancials({
        booking_type: "quick_booking",
        gross_amount: grossAmount,
        gateway_fee: options?.gatewayFee,
        tax_amount: options?.taxAmount,
        provider_id: provider.id,
        client_id: booking.client_id,
    });

    const status = options?.status || "quote_selected";
    const { data, error } = await upsertBookingFinancialRow(admin, {
        booking_id: booking.id,
        booking_type: "quick_booking",
        provider_id: provider.id,
        client_id: booking.client_id,
        ...breakdown,
        ...aliasFinancialFields(breakdown, status, booking.client_id),
        updated_at: new Date().toISOString(),
    }, provider.id);

    if (error) {
        console.error("Quick booking financial upsert error:", error);
        return null;
    }

    await admin.from("provider_wallets").upsert({ provider_id: provider.id }, { onConflict: "provider_id" });
    return data;
}

export async function upsertEquipmentRentalFinancialsForProvider(
    admin: SupabaseClient,
    input: {
        bookingId: string;
        clientId: string | null;
        providerId: string;
        grossAmount: number;
    },
    options?: { gatewayFee?: number; taxAmount?: number; status?: FinanceStatus }
) {
    if (!input.clientId || !input.providerId) return null;

    const breakdown = calculateBookingFinancials({
        booking_type: "equipment_rental",
        gross_amount: Number(input.grossAmount || 0),
        gateway_fee: options?.gatewayFee,
        tax_amount: options?.taxAmount,
        provider_id: input.providerId,
        client_id: input.clientId,
    });

    const status = options?.status || "quote_selected";
    const { data, error } = await upsertBookingFinancialRow(admin, {
        booking_id: input.bookingId,
        booking_type: "equipment_rental",
        provider_id: input.providerId,
        client_id: input.clientId,
        ...breakdown,
        ...aliasFinancialFields(breakdown, status, input.clientId),
        updated_at: new Date().toISOString(),
    }, input.providerId);

    if (error) {
        console.error("Equipment rental financial upsert error:", error);
        return null;
    }

    await admin.from("provider_wallets").upsert({ provider_id: input.providerId }, { onConflict: "provider_id" });
    return data;
}

export async function markBookingPaymentHeld(admin: SupabaseClient, bookingId: string, bookingType: FinanceBookingType) {
    const { data: rows } = await admin
        .from("booking_financials")
        .select("id, gross_booking_amount")
        .eq("booking_id", bookingId)
        .eq("booking_type", bookingType);

    const escrowAmountById = new Map((rows || []).map((row) => [String(row.id), Number(row.gross_booking_amount || 0)]));

    const { data: updatedRows, error } = await admin
        .from("booking_financials")
        .update({
            escrow_status: "escrow_held",
            payout_status: "not_ready",
            status: "payment_received",
            updated_at: new Date().toISOString(),
        })
        .eq("booking_id", bookingId)
        .eq("booking_type", bookingType)
        .select("id");

    if (error) console.error("Booking financial payment held update error:", error);

    await Promise.all((updatedRows || []).map((row) => admin
        .from("booking_financials")
        .update({ escrow_amount: escrowAmountById.get(String(row.id)) || 0 })
        .eq("id", row.id)));
}

export async function markBookingFinancialsRefunded(
    admin: SupabaseClient,
    bookingId: string,
    bookingType: FinanceBookingType,
    refundAmount?: number
) {
    const { error } = await admin
        .from("booking_financials")
        .update({
            escrow_status: "refunded",
            payout_status: "not_ready",
            status: "refunded",
            escrow_amount: 0,
            refund_amount: Math.max(0, Number(refundAmount || 0)),
            refunded_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("booking_id", bookingId)
        .eq("booking_type", bookingType);

    if (error) console.error("Booking financial refund update error:", error);
}

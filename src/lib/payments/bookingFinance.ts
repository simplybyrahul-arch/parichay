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

function projectBookingTypeToFinanceType(bookingType: string | null | undefined): FinanceBookingType {
    return bookingType === "equipment" ? "equipment_rental" : "custom_project";
}

function amountFromProject(project: ProjectFinanceSource) {
    return Number(project.budget || 0);
}

function amountFromQuickBooking(booking: QuickBookingFinanceSource) {
    return Number(booking.custom_budget_amount || booking.estimated_total || 0);
}

export async function ensureProviderProfileForUser(
    admin: SupabaseClient,
    userId: string,
    fallbackType: FinanceBookingType = "custom_project"
) {
    const { data: existing } = await admin
        .from("provider_profiles")
        .select("id, user_id, provider_type")
        .eq("user_id", userId)
        .maybeSingle();

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
        }, { onConflict: "user_id" })
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
    options?: { gatewayFee?: number; taxAmount?: number }
) {
    const providerUserId = project.selected_creator_id || project.creator_id || null;
    const financeType = projectBookingTypeToFinanceType(project.booking_type);
    const grossAmount = amountFromProject(project);
    if (!providerUserId || !project.client_id || grossAmount <= 0) return null;

    const provider = await ensureProviderProfileForUser(admin, providerUserId, financeType);
    if (!provider) return null;

    const breakdown = calculateBookingFinancials({
        booking_type: financeType,
        gross_amount: grossAmount,
        gateway_fee: options?.gatewayFee,
        tax_amount: options?.taxAmount,
        provider_id: provider.id,
        client_id: project.client_id,
    });

    const { data, error } = await admin
        .from("booking_financials")
        .upsert({
            booking_id: project.id,
            booking_type: financeType,
            provider_id: provider.id,
            client_id: project.client_id,
            ...breakdown,
            updated_at: new Date().toISOString(),
        }, { onConflict: "booking_id,booking_type,provider_id" })
        .select("*")
        .single();

    if (error) {
        console.error("Project booking financial upsert error:", error);
        return null;
    }

    await admin.from("provider_wallets").upsert({ provider_id: provider.id }, { onConflict: "provider_id" });
    return data;
}

export async function upsertQuickBookingFinancials(
    admin: SupabaseClient,
    booking: QuickBookingFinanceSource,
    options?: { gatewayFee?: number; taxAmount?: number }
) {
    const grossAmount = amountFromQuickBooking(booking);
    if (!booking.creator_id || !booking.client_id || grossAmount <= 0) return null;

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

    const { data, error } = await admin
        .from("booking_financials")
        .upsert({
            booking_id: booking.id,
            booking_type: "quick_booking",
            provider_id: provider.id,
            client_id: booking.client_id,
            ...breakdown,
            updated_at: new Date().toISOString(),
        }, { onConflict: "booking_id,booking_type,provider_id" })
        .select("*")
        .single();

    if (error) {
        console.error("Quick booking financial upsert error:", error);
        return null;
    }

    await admin.from("provider_wallets").upsert({ provider_id: provider.id }, { onConflict: "provider_id" });
    return data;
}

export async function markBookingPaymentHeld(admin: SupabaseClient, bookingId: string, bookingType: FinanceBookingType) {
    const { error } = await admin
        .from("booking_financials")
        .update({
            escrow_status: "escrow_held",
            payout_status: "not_ready",
            updated_at: new Date().toISOString(),
        })
        .eq("booking_id", bookingId)
        .eq("booking_type", bookingType);

    if (error) console.error("Booking financial payment held update error:", error);
}

"use server";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

type ActionResult = {
    success: boolean;
    message: string;
};

export type BookingFinancialRow = {
    id: string;
    booking_id: string;
    booking_type: string;
    provider_id: string | null;
    client_id: string | null;
    gross_booking_amount: number;
    platform_commission_amount: number;
    client_service_fee_amount: number;
    provider_payout_amount: number;
    client_payable_amount: number;
    platform_revenue: number;
    escrow_status: string;
    payout_status: string;
    currency: string;
    created_at: string;
    provider_profiles?: { business_name: string | null; provider_type: string | null } | null;
    users?: { full_name: string | null } | null;
};

export type PayoutTransactionRow = {
    id: string;
    provider_id: string;
    booking_id: string | null;
    booking_financial_id: string | null;
    gross_amount: number;
    commission_deducted: number;
    net_payout: number;
    payout_method: string | null;
    utr_number: string | null;
    status: string;
    released_at: string | null;
    created_at: string;
    provider_profiles?: { business_name: string | null; provider_type: string | null } | null;
};

export type FinanceDashboardData = {
    summary: {
        totalGMV: number;
        platformRevenue: number;
        pendingEscrow: number;
        pendingPayouts: number;
        completedPayouts: number;
        clientServiceFees: number;
        providerCommissionRevenue: number;
        equipmentRevenue: number;
        refundLiability: number;
    };
    financials: BookingFinancialRow[];
    pendingFinancials: BookingFinancialRow[];
    payouts: PayoutTransactionRow[];
};

function getRequiredEnv(name: string) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is not configured`);
    return value;
}

function createAdminClient() {
    return createSupabaseAdminClient(
        getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
        getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

async function requireAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { userId: null, error: "Unauthorized." };

    const { data: profile } = await supabase.from("users").select("account_type").eq("id", user.id).single();
    if (profile?.account_type !== "admin") return { userId: null, error: "Admin access required." };

    return { userId: user.id, error: null };
}

function sum(rows: BookingFinancialRow[], selector: (row: BookingFinancialRow) => number) {
    return rows.reduce((total, row) => total + selector(row), 0);
}

export async function getFinanceDashboardData(): Promise<FinanceDashboardData> {
    const auth = await requireAdmin();
    if (!auth.userId) {
        return {
            summary: {
                totalGMV: 0,
                platformRevenue: 0,
                pendingEscrow: 0,
                pendingPayouts: 0,
                completedPayouts: 0,
                clientServiceFees: 0,
                providerCommissionRevenue: 0,
                equipmentRevenue: 0,
                refundLiability: 0,
            },
            financials: [],
            pendingFinancials: [],
            payouts: [],
        };
    }

    const admin = createAdminClient();
    const [{ data: financialsData, error: financialError }, { data: payoutsData, error: payoutError }] = await Promise.all([
        admin
            .from("booking_financials")
            .select("*, provider_profiles(business_name, provider_type), users!booking_financials_client_id_fkey(full_name)")
            .order("created_at", { ascending: false })
            .limit(100),
        admin
            .from("payout_transactions")
            .select("*, provider_profiles(business_name, provider_type)")
            .order("created_at", { ascending: false })
            .limit(100),
    ]);

    if (financialError) console.error("Admin finance financials fetch error:", financialError);
    if (payoutError) console.error("Admin finance payouts fetch error:", payoutError);

    const financials = (financialsData || []) as BookingFinancialRow[];
    const payouts = (payoutsData || []) as PayoutTransactionRow[];
    const pendingFinancials = financials.filter((row) => row.payout_status === "ready" || row.escrow_status === "escrow_held");

    return {
        summary: {
            totalGMV: sum(financials, (row) => Number(row.gross_booking_amount || 0)),
            platformRevenue: sum(financials, (row) => Number(row.platform_revenue || 0)),
            pendingEscrow: sum(financials.filter((row) => row.escrow_status === "escrow_held"), (row) => Number(row.gross_booking_amount || 0)),
            pendingPayouts: sum(financials.filter((row) => row.payout_status === "ready"), (row) => Number(row.provider_payout_amount || 0)),
            completedPayouts: payouts.filter((row) => row.status === "completed").reduce((total, row) => total + Number(row.net_payout || 0), 0),
            clientServiceFees: sum(financials, (row) => Number(row.client_service_fee_amount || 0)),
            providerCommissionRevenue: sum(financials, (row) => Number(row.platform_commission_amount || 0)),
            equipmentRevenue: sum(financials.filter((row) => row.booking_type === "equipment_rental"), (row) => Number(row.platform_revenue || 0)),
            refundLiability: 0,
        },
        financials,
        pendingFinancials,
        payouts,
    };
}

export async function markFinancialPayoutReady(financialId: string): Promise<ActionResult> {
    const auth = await requireAdmin();
    if (!auth.userId) return { success: false, message: auth.error || "Unauthorized." };

    const admin = createAdminClient();
    const { error } = await admin.rpc("mark_booking_financial_payout_ready", {
        p_booking_financial_id: financialId,
    });

    if (error) {
        console.error("Mark payout ready error:", error);
        return { success: false, message: error.message || "Could not mark payout ready." };
    }

    revalidatePath("/admin/finance");
    return { success: true, message: "Payout marked ready." };
}

export async function releaseProviderPayout(financialId: string, payoutMethod: string, utrNumber: string): Promise<ActionResult> {
    const auth = await requireAdmin();
    if (!auth.userId) return { success: false, message: auth.error || "Unauthorized." };

    const cleanMethod = payoutMethod.trim();
    const cleanUtr = utrNumber.trim();
    if (!cleanMethod || !cleanUtr) {
        return { success: false, message: "Payout method and UTR/reference are required." };
    }

    const admin = createAdminClient();
    const { error } = await admin.rpc("release_provider_payout", {
        p_booking_financial_id: financialId,
        p_payout_method: cleanMethod,
        p_utr_number: cleanUtr,
    });

    if (error) {
        console.error("Release payout error:", error);
        return { success: false, message: error.message || "Could not release payout." };
    }

    revalidatePath("/admin/finance");
    return { success: true, message: "Payout released." };
}

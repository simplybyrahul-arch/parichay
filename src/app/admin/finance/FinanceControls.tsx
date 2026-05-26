"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
    markFinancialPayoutReady,
    releaseProviderPayout,
    type BookingFinancialRow,
} from "@/app/actions/finance";

export function FinanceControls({ financial }: { financial: BookingFinancialRow }) {
    const [isPending, startTransition] = useTransition();
    const [payoutMethod, setPayoutMethod] = useState("");
    const [utrNumber, setUtrNumber] = useState("");

    const canMarkReady = financial.escrow_status === "escrow_held" && financial.payout_status === "not_ready";
    const canRelease = financial.payout_status === "ready";

    function runMarkReady() {
        startTransition(async () => {
            const result = await markFinancialPayoutReady(financial.id);
            if (result.success) toast.success(result.message);
            else toast.error(result.message);
        });
    }

    function runRelease() {
        startTransition(async () => {
            const result = await releaseProviderPayout(financial.id, payoutMethod, utrNumber);
            if (result.success) {
                toast.success(result.message);
                setPayoutMethod("");
                setUtrNumber("");
            } else {
                toast.error(result.message);
            }
        });
    }

    if (!canMarkReady && !canRelease) {
        return <span className="text-xs text-stone-400">No action</span>;
    }

    return (
        <div className="space-y-2 min-w-[260px]">
            {canMarkReady && (
                <button
                    type="button"
                    disabled={isPending}
                    onClick={runMarkReady}
                    className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white hover:bg-orange-700 disabled:opacity-60"
                >
                    Mark Payout Ready
                </button>
            )}
            {canRelease && (
                <div className="space-y-2">
                    <input
                        value={payoutMethod}
                        onChange={(event) => setPayoutMethod(event.target.value)}
                        placeholder="Payout method"
                        className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs outline-none focus:border-orange-400"
                    />
                    <input
                        value={utrNumber}
                        onChange={(event) => setUtrNumber(event.target.value)}
                        placeholder="UTR/reference number"
                        className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs outline-none focus:border-orange-400"
                    />
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={runRelease}
                        className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-60"
                    >
                        Release Payout
                    </button>
                </div>
            )}
        </div>
    );
}

export function ExportFinanceCsv({ financials }: { financials: BookingFinancialRow[] }) {
    const csv = useMemo(() => {
        const headers = [
            "Booking ID",
            "Booking Type",
            "Provider",
            "Client",
            "Gross",
            "Commission",
            "Client Fee",
            "Provider Payout",
            "Platform Revenue",
            "Escrow Status",
            "Payout Status",
        ];
        const rows = financials.map((row) => [
            row.booking_id,
            row.booking_type,
            row.provider_profiles?.business_name || "",
            row.users?.full_name || "",
            row.gross_booking_amount,
            row.platform_commission_amount,
            row.client_service_fee_amount,
            row.provider_payout_amount,
            row.platform_revenue,
            row.escrow_status,
            row.payout_status,
        ]);
        return [headers, ...rows]
            .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
            .join("\n");
    }, [financials]);

    function downloadCsv() {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `shotcutcrew-finance-${new Date().toISOString().slice(0, 10)}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    return (
        <button
            type="button"
            onClick={downloadCsv}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-bold text-stone-700 hover:border-orange-300 hover:text-orange-700"
        >
            Export CSV
        </button>
    );
}

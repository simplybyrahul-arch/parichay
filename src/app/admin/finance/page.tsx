import { IndianRupee, Landmark, ReceiptText, WalletCards } from "lucide-react";
import { getFinanceDashboardData, type BookingFinancialRow, type PayoutTransactionRow } from "@/app/actions/finance";
import { ExportFinanceCsv, FinanceControls } from "./FinanceControls";

function formatMoney(value: number) {
    return `Rs ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function StatusBadge({ value }: { value: string }) {
    return (
        <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-bold capitalize text-orange-700">
            {value.replace(/_/g, " ")}
        </span>
    );
}

export default async function AdminFinancePage() {
    const data = await getFinanceDashboardData();

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-stone-900">Finance Dashboard</h2>
                    <p className="mt-1 text-stone-500">
                        Track GMV, platform revenue, internal payment holds, and manual provider payouts.
                    </p>
                </div>
                <ExportFinanceCsv financials={data.financials} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard icon={IndianRupee} label="Total GMV" value={formatMoney(data.summary.totalGMV)} />
                <SummaryCard icon={ReceiptText} label="Platform Revenue" value={formatMoney(data.summary.platformRevenue)} />
                <SummaryCard icon={Landmark} label="Pending Internal Hold" value={formatMoney(data.summary.pendingEscrow)} />
                <SummaryCard icon={WalletCards} label="Pending Payouts" value={formatMoney(data.summary.pendingPayouts)} />
                <SummaryCard icon={ReceiptText} label="Completed Payouts" value={formatMoney(data.summary.completedPayouts)} />
                <SummaryCard icon={ReceiptText} label="Client Service Fees" value={formatMoney(data.summary.clientServiceFees)} />
                <SummaryCard icon={ReceiptText} label="Commission Revenue" value={formatMoney(data.summary.providerCommissionRevenue)} />
                <SummaryCard icon={ReceiptText} label="Equipment Revenue" value={formatMoney(data.summary.equipmentRevenue)} />
            </div>

            <FinanceTable title="Recent Booking Financials" rows={data.financials} showActions />
            <FinanceTable title="Pending Payout Review" rows={data.pendingFinancials} showActions />
            <PayoutTable rows={data.payouts} />

            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-500">
                Refund liability: {formatMoney(data.summary.refundLiability)}. Refund automation is not implemented; disputes/refunds remain manual operations.
            </div>
        </div>
    );
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof IndianRupee; label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-stone-400">{label}</p>
                    <p className="mt-1 text-xl font-black text-stone-900">{value}</p>
                </div>
            </div>
        </div>
    );
}

function FinanceTable({ title, rows, showActions }: { title: string; rows: BookingFinancialRow[]; showActions?: boolean }) {
    return (
        <section className="rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-6 py-4">
                <h3 className="text-lg font-bold text-stone-900">{title}</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-stone-50 text-stone-900">
                        <tr>
                            <th className="px-6 py-3 font-semibold">Booking</th>
                            <th className="px-6 py-3 font-semibold">Provider</th>
                            <th className="px-6 py-3 font-semibold">Client</th>
                            <th className="px-6 py-3 font-semibold">Gross</th>
                            <th className="px-6 py-3 font-semibold">Platform</th>
                            <th className="px-6 py-3 font-semibold">Payout</th>
                            <th className="px-6 py-3 font-semibold">Status</th>
                            {showActions && <th className="px-6 py-3 font-semibold">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {rows.map((row) => (
                            <tr key={row.id} className="align-top">
                                <td className="px-6 py-4">
                                    <div className="font-mono text-xs text-stone-500">{row.booking_id.slice(0, 8)}</div>
                                    <div className="mt-1 font-bold capitalize text-stone-900">{row.booking_type.replace(/_/g, " ")}</div>
                                </td>
                                <td className="px-6 py-4 text-stone-700">{row.provider_profiles?.business_name || "Provider"}</td>
                                <td className="px-6 py-4 text-stone-700">{row.users?.full_name || "Client"}</td>
                                <td className="px-6 py-4 font-bold text-stone-900">{formatMoney(row.gross_amount || row.gross_booking_amount)}</td>
                                <td className="px-6 py-4 text-stone-700">{formatMoney(row.platform_revenue)}</td>
                                <td className="px-6 py-4 text-stone-700">{formatMoney(row.provider_amount || row.provider_payout_amount)}</td>
                                <td className="space-y-1 px-6 py-4">
                                    <StatusBadge value={row.status || "pending"} />
                                    <StatusBadge value={row.escrow_status} />
                                    <div><StatusBadge value={row.payout_status} /></div>
                                </td>
                                {showActions && (
                                    <td className="px-6 py-4">
                                        <FinanceControls financial={row} />
                                    </td>
                                )}
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={showActions ? 8 : 7} className="px-6 py-8 text-center text-stone-500">
                                    No finance records found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function PayoutTable({ rows }: { rows: PayoutTransactionRow[] }) {
    return (
        <section className="rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-6 py-4">
                <h3 className="text-lg font-bold text-stone-900">Completed Payout Transactions</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-stone-50 text-stone-900">
                        <tr>
                            <th className="px-6 py-3 font-semibold">Provider</th>
                            <th className="px-6 py-3 font-semibold">Gross</th>
                            <th className="px-6 py-3 font-semibold">Commission</th>
                            <th className="px-6 py-3 font-semibold">Net Payout</th>
                            <th className="px-6 py-3 font-semibold">Method</th>
                            <th className="px-6 py-3 font-semibold">UTR</th>
                            <th className="px-6 py-3 font-semibold">Released</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {rows.map((row) => (
                            <tr key={row.id}>
                                <td className="px-6 py-4 text-stone-700">{row.provider_profiles?.business_name || "Provider"}</td>
                                <td className="px-6 py-4">{formatMoney(row.gross_amount)}</td>
                                <td className="px-6 py-4">{formatMoney(row.commission_deducted)}</td>
                                <td className="px-6 py-4 font-bold text-green-700">{formatMoney(row.net_payout)}</td>
                                <td className="px-6 py-4">{row.payout_method || "-"}</td>
                                <td className="px-6 py-4 font-mono text-xs">{row.utr_number || "-"}</td>
                                <td className="px-6 py-4 text-xs text-stone-500">
                                    {row.released_at ? new Date(row.released_at).toLocaleString() : "-"}
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-stone-500">
                                    No payout transactions yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

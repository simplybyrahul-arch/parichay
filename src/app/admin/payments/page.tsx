import { createClient } from "@/utils/supabase/server";
import { ShieldCheck, XCircle } from "lucide-react";
import { QrPaymentVerificationControls } from "@/components/payments/QrPaymentVerificationControls";

type RelatedName = {
    full_name: string | null;
} | null;

type PaymentRow = {
    id: string;
    project_id: string;
    razorpay_order_id: string;
    razorpay_payment_id: string | null;
    amount: number;
    currency: string | null;
    status: string | null;
    payment_method: string | null;
    payment_reference: string | null;
    payment_proof_url: string | null;
    verified_at: string | null;
    verification_note: string | null;
    created_at: string;
    client: RelatedName;
    project: { title: string | null; status: string | null; payment_status: string | null } | null;
};

export default async function AdminPaymentsPage() {
    const supabase = await createClient();

    const { data: payments } = await supabase
        .from("payments")
        .select(`
            *,
            client:client_id(full_name),
            project:project_id(title, status, payment_status)
        `)
        .order("created_at", { ascending: false });

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Payments Ledger</h2>
                <p className="text-stone-500 mt-1">Track payment records, Razorpay orders, and QR payment verification.</p>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-600">
                        <thead className="bg-stone-50 border-b border-stone-200 text-stone-900">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Transaction ID</th>
                                <th className="px-6 py-4 font-semibold">Project & Client</th>
                                <th className="px-6 py-4 font-semibold">Amount</th>
                                <th className="px-6 py-4 font-semibold">Method</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold">Reference</th>
                                <th className="px-6 py-4 font-semibold">Verification</th>
                                <th className="px-6 py-4 font-semibold">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {((payments || []) as PaymentRow[]).map((payment) => (
                                <tr key={payment.id} className="hover:bg-stone-50/50 transition-colors align-top">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-mono text-xs font-medium text-stone-800 bg-stone-100 px-2 py-1 rounded border border-stone-200">
                                                {payment.razorpay_order_id}
                                            </span>
                                            {payment.razorpay_payment_id && (
                                                <span className="font-mono text-[10px] text-stone-500 bg-stone-50 px-1.5 py-0.5 rounded border border-stone-200" title="Payment ID">
                                                    {payment.razorpay_payment_id.slice(-8)}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-stone-900 truncate max-w-[200px]" title={payment.project?.title || undefined}>
                                            {payment.project?.title || "Unknown Project"}
                                        </div>
                                        <div className="text-xs text-stone-500 mt-0.5">{payment.client?.full_name || "Unknown Client"}</div>
                                        <div className="text-xs text-stone-400 mt-1">
                                            Project: {payment.project?.status || "unknown"} · Payment: {payment.project?.payment_status || "unknown"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-stone-900">
                                        {payment.currency === "INR" ? "Rs" : payment.currency} {(payment.amount / 100).toLocaleString("en-IN")}
                                    </td>
                                    <td className="px-6 py-4 capitalize">
                                        {(payment.payment_method || "razorpay_checkout").replace(/_/g, " ")}
                                    </td>
                                    <td className="px-6 py-4">
                                        <PaymentStatusBadge status={payment.status} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-mono text-xs text-stone-800">{payment.payment_reference || "-"}</div>
                                        {payment.payment_proof_url && (
                                            <a href={payment.payment_proof_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-orange-600 hover:text-orange-700">
                                                View proof
                                            </a>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 min-w-[260px]">
                                        {payment.payment_method === "qr_upi" ? (
                                            <div className="space-y-2">
                                                <div className="text-xs text-stone-500">
                                                    {payment.verified_at ? `Verified ${new Date(payment.verified_at).toLocaleString()}` : "Not verified"}
                                                </div>
                                                {payment.verification_note && <div className="text-xs text-stone-600">Note: {payment.verification_note}</div>}
                                                <QrPaymentVerificationControls projectId={payment.project_id} paymentId={payment.id} paymentStatus={payment.status} />
                                            </div>
                                        ) : (
                                            <span className="text-xs text-stone-400">Razorpay managed</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-stone-500">
                                        {new Date(payment.created_at).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            {!payments?.length && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-stone-500">
                                        No payments found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function PaymentStatusBadge({ status }: { status: string | null }) {
    if (["captured", "paid", "received"].includes(status || "")) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                <ShieldCheck className="w-3.5 h-3.5" /> Received
            </span>
        );
    }

    if (["failed", "rejected"].includes(status || "")) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                <XCircle className="w-3.5 h-3.5" /> {status}
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 capitalize">
            {status?.replace(/_/g, " ") || "pending"}
        </span>
    );
}

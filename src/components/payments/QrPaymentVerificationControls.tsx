"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { rejectQrPaymentProof, verifyQrPayment } from "@/app/actions/qrPayments";

type Props = {
    projectId: string;
    paymentId: string;
    paymentStatus: string | null;
};

export function QrPaymentVerificationControls({ projectId, paymentId, paymentStatus }: Props) {
    const [note, setNote] = useState("");
    const [isPending, startTransition] = useTransition();
    const canAct = ["pending", "qr_pending", "proof_uploaded"].includes(paymentStatus || "");

    const verify = () => {
        startTransition(async () => {
            const result = await verifyQrPayment(projectId, paymentId, note);
            if (result.success) toast.success(result.message);
            else toast.error(result.message);
        });
    };

    const reject = () => {
        if (!note.trim()) {
            toast.error("Add a rejection reason first.");
            return;
        }

        startTransition(async () => {
            const result = await rejectQrPaymentProof(projectId, paymentId, note);
            if (result.success) toast.success(result.message);
            else toast.error(result.message);
        });
    };

    return (
        <div className="space-y-3">
            <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                placeholder="Verification note or rejection reason"
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <div className="flex flex-col sm:flex-row gap-2">
                <button
                    onClick={verify}
                    disabled={isPending || !canAct}
                    className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50"
                >
                    {isPending ? "Saving..." : "Verify Payment Received"}
                </button>
                <button
                    onClick={reject}
                    disabled={isPending || !canAct}
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 disabled:opacity-50"
                >
                    Reject Payment Proof
                </button>
            </div>
        </div>
    );
}

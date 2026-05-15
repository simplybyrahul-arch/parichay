"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { raiseProjectDispute } from "@/app/actions/disputes";

type Props = {
    projectId: string;
    onSuccess: () => Promise<void>;
};

export function DisputeForm({ projectId, onSuccess }: Props) {
    const [reason, setReason] = useState("");
    const [details, setDetails] = useState("");
    const [isPending, startTransition] = useTransition();

    const submit = () => {
        startTransition(async () => {
            const result = await raiseProjectDispute(projectId, reason, details);
            if (result.success) {
                toast.success(result.message);
                setReason("");
                setDetails("");
                await onSuccess();
            } else {
                toast.error(result.message);
            }
        });
    };

    return (
        <section className="bg-white border border-rose-200 rounded-3xl p-8 shadow-sm">
            <h2 className="text-xl font-black text-stone-900 font-display mb-2 inline-flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" /> Raise a dispute
            </h2>
            <p className="text-stone-600 mb-5">If delivery has a problem, raise it within 48 hours so an admin can review the case.</p>
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">Reason</label>
                    <input
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm focus:outline-none focus:border-rose-500"
                        placeholder="e.g. Deliverables incomplete"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">Details</label>
                    <textarea
                        value={details}
                        onChange={(event) => setDetails(event.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm focus:outline-none focus:border-rose-500 resize-none"
                        rows={4}
                        placeholder="Share what happened and what needs review..."
                    />
                </div>
            </div>
            <button
                onClick={submit}
                disabled={isPending || !reason.trim()}
                className="mt-4 px-5 py-3 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition-colors disabled:opacity-50"
            >
                {isPending ? "Raising..." : "Raise Dispute"}
            </button>
        </section>
    );
}

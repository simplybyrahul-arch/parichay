"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { markDisputeUnderReview, resolveProjectDispute } from "@/app/actions/disputes";

type Props = {
    disputeId: string;
    status: string;
};

export function DisputeAdminControls({ disputeId, status }: Props) {
    const [resolution, setResolution] = useState("");
    const [isPending, startTransition] = useTransition();
    const canAct = ["open", "under_review"].includes(status);

    const review = () => {
        startTransition(async () => {
            const result = await markDisputeUnderReview(disputeId);
            if (result.success) toast.success(result.message);
            else toast.error(result.message);
        });
    };

    const resolve = (resolutionType: "full_release" | "partial_release" | "refund") => {
        if (!resolution.trim()) {
            toast.error("Resolution note is required.");
            return;
        }

        startTransition(async () => {
            const result = await resolveProjectDispute(disputeId, resolutionType, resolution);
            if (result.success) {
                toast.success(result.message);
                setResolution("");
            } else {
                toast.error(result.message);
            }
        });
    };

    if (!canAct) {
        return <div className="text-sm font-semibold text-stone-500">Resolved</div>;
    }

    return (
        <div className="space-y-3">
            <textarea
                value={resolution}
                onChange={(event) => setResolution(event.target.value)}
                rows={3}
                placeholder="Admin resolution note..."
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:border-rose-500 resize-none"
            />
            <div className="flex flex-wrap gap-2">
                <button onClick={review} disabled={isPending} className="px-3 py-2 rounded-lg bg-stone-100 text-stone-700 text-xs font-bold hover:bg-stone-200 disabled:opacity-50">
                    Under review
                </button>
                <button onClick={() => resolve("full_release")} disabled={isPending} className="px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 disabled:opacity-50">
                    Full release
                </button>
                <button onClick={() => resolve("partial_release")} disabled={isPending} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50">
                    Partial release
                </button>
                <button onClick={() => resolve("refund")} disabled={isPending} className="px-3 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50">
                    Refund
                </button>
            </div>
        </div>
    );
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cancelClientProject } from "@/app/actions/projects";

type Props = {
    projectId: string;
    onCancelled?: () => void | Promise<void>;
    compact?: boolean;
};

const cancellationReasons = [
    "Mistaken post",
    "Requirement changed",
    "Budget changed",
    "Found someone else",
    "Other",
];

export function CancelBookingButton({ projectId, onCancelled, compact = false }: Props) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState(cancellationReasons[0]);
    const [customReason, setCustomReason] = useState("");
    const [isPending, startTransition] = useTransition();

    const submitCancel = () => {
        const confirmed = window.confirm("Are you sure you want to cancel this booking? Invited creators will no longer be able to respond.");
        if (!confirmed) return;

        startTransition(async () => {
            const finalReason = reason === "Other" ? customReason : reason;
            const result = await cancelClientProject(projectId, finalReason);

            if (!result.success) {
                toast.error(result.message);
                return;
            }

            toast.success(result.message);
            setOpen(false);
            await onCancelled?.();
        });
    };

    return (
        <div className={compact ? "relative" : "rounded-2xl border border-rose-200 bg-rose-50 p-5"} onClick={(event) => event.stopPropagation()}>
            {!compact && (
                <div className="mb-4">
                    <h3 className="text-lg font-black text-stone-900">Cancel this booking</h3>
                    <p className="text-sm text-stone-600 mt-1">You can cancel this booking before it is confirmed or started.</p>
                </div>
            )}

            {!open ? (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className={compact
                        ? "px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg hover:bg-rose-100 transition-colors"
                        : "px-5 py-2.5 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 transition-colors"
                    }
                >
                    Cancel Booking
                </button>
            ) : (
                <div className={compact ? "mt-3 w-64 rounded-xl border border-rose-200 bg-white p-3 shadow-sm space-y-3" : "space-y-3"}>
                    <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wide text-stone-500">Reason optional</span>
                        <select
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            disabled={isPending}
                            className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-500"
                        >
                            {cancellationReasons.map((item) => (
                                <option key={item} value={item}>{item}</option>
                            ))}
                        </select>
                    </label>
                    {reason === "Other" && (
                        <input
                            value={customReason}
                            onChange={(event) => setCustomReason(event.target.value)}
                            disabled={isPending}
                            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-rose-500"
                            placeholder="Add reason"
                        />
                    )}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            disabled={isPending}
                            className="flex-1 px-3 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold hover:bg-stone-200 transition-colors disabled:opacity-60"
                        >
                            Keep Booking
                        </button>
                        <button
                            type="button"
                            onClick={submitCancel}
                            disabled={isPending}
                            className="flex-1 px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors disabled:opacity-60"
                        >
                            {isPending ? "Cancelling..." : "Confirm Cancel"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

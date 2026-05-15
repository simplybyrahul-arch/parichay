"use client";

import { useState, useTransition } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { respondToOpportunity, type CreatorOpportunity } from "@/app/actions/opportunities";

type Props = {
    opportunity: CreatorOpportunity;
};

const closedProjectStatuses = new Set(["expired", "cancelled", "completed", "disputed"]);
const assignedProjectStatuses = new Set(["confirmed", "in_progress", "delivered"]);

export function OpportunityResponseForm({ opportunity }: Props) {
    const [responseNote, setResponseNote] = useState(opportunity.response_note || "");
    const [availabilityNote, setAvailabilityNote] = useState(opportunity.availability_note || "");
    const [inviteStatus, setInviteStatus] = useState(opportunity.invite_status);
    const [isPending, startTransition] = useTransition();

    const isExpired = opportunity.project_status === "expired";
    const isCancelled = opportunity.project_status === "cancelled";
    const canRespond = !closedProjectStatuses.has(opportunity.project_status) && ["sent", "viewed"].includes(inviteStatus);
    const closedMessage = isCancelled
        ? "This booking has been cancelled and is no longer accepting responses."
        : isExpired
            ? "This booking has expired and is no longer accepting responses."
            : inviteStatus === "selected" || assignedProjectStatuses.has(opportunity.project_status)
                ? "You are selected for this booking. Use the timeline below for project updates."
            : inviteStatus === "interested"
                ? "Interested submitted"
                : inviteStatus === "declined"
                    ? "Declined"
                    : "This booking is no longer accepting responses.";

    const submitResponse = (status: "interested" | "declined") => {
        startTransition(async () => {
            const result = await respondToOpportunity(opportunity.project_id, status, responseNote, availabilityNote);
            if (result.success) {
                setInviteStatus(status);
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        });
    };

    return (
        <section className="bg-white border border-stone-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-5">
            <div>
                <h2 className="text-xl font-black text-stone-900 font-display">Your Response</h2>
                <p className="text-sm text-stone-500 mt-1">Share your availability and a short note for the client to review later.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">Response note</label>
                    <textarea
                        rows={5}
                        value={responseNote}
                        onChange={(event) => setResponseNote(event.target.value)}
                        disabled={!canRespond || isPending}
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-rose-500 transition-colors resize-none disabled:opacity-60"
                        placeholder="Tell the client why you are a good fit..."
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">Availability note</label>
                    <textarea
                        rows={5}
                        value={availabilityNote}
                        onChange={(event) => setAvailabilityNote(event.target.value)}
                        disabled={!canRespond || isPending}
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-rose-500 transition-colors resize-none disabled:opacity-60"
                        placeholder="Mention dates, timing, or team capacity..."
                    />
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                {canRespond ? (
                    <>
                        <button
                            onClick={() => submitResponse("declined")}
                            disabled={isPending}
                            className="flex-1 py-3 bg-stone-100 text-stone-700 font-bold rounded-xl hover:bg-stone-200 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
                        >
                            <XCircle className="w-4 h-4" />
                            Decline
                        </button>
                        <button
                            onClick={() => submitResponse("interested")}
                            disabled={isPending}
                            className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Mark Interested
                        </button>
                    </>
                ) : (
                    <div className="w-full rounded-xl bg-stone-50 border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-600">
                        {closedMessage}
                    </div>
                )}
            </div>
        </section>
    );
}

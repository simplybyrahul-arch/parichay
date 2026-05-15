"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellPlus, MessageCircle, Search, UserMinus } from "lucide-react";
import { adminDeactivateInvite, adminInviteCreator, adminRequeueWhatsApp } from "@/app/actions/adminMatching";

export type AdminInviteRow = {
    id: string;
    creator_id: string;
    creator_name: string;
    role: string | null;
    city: string | null;
    location: string | null;
    status: string;
    match_reason: string | null;
    match_score: number | null;
    notification_status: string | null;
    whatsapp_status: string | null;
    response_note: string | null;
    availability_note: string | null;
    created_at: string;
    responded_at: string | null;
};

export type CreatorCandidate = {
    id: string;
    name: string;
    role: string | null;
    city: string | null;
    location: string | null;
    creator_type: string | null;
    day_rate: number | null;
    verified: boolean | null;
    available_for_booking: boolean | null;
    already_invited: boolean;
};

export function AdminProjectControls({
    projectId,
    invites,
    candidates,
}: {
    projectId: string;
    invites: AdminInviteRow[];
    candidates: CreatorCandidate[];
}) {
    const [query, setQuery] = useState("");
    const [message, setMessage] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const filteredCandidates = useMemo(() => {
        const value = query.trim().toLowerCase();
        if (!value) return candidates;
        return candidates.filter((creator) => [
            creator.name,
            creator.role,
            creator.city,
            creator.location,
            creator.creator_type,
        ].some((field) => field?.toLowerCase().includes(value)));
    }, [candidates, query]);

    function runAction(action: () => Promise<{ success: boolean; message: string }>) {
        setMessage(null);
        startTransition(async () => {
            const result = await action();
            setMessage(result.message);
            if (result.success) router.refresh();
        });
    }

    return (
        <div className="space-y-8">
            <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-4">
                <div>
                    <h3 className="text-lg font-bold text-stone-900">Existing Project Invites</h3>
                    <p className="text-sm text-stone-500 mt-1">Review invite status, WhatsApp queue state, and creator responses.</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-600">
                        <thead className="bg-stone-50 text-stone-900">
                            <tr>
                                <th className="px-4 py-3">Creator</th>
                                <th className="px-4 py-3">Invite</th>
                                <th className="px-4 py-3">Match</th>
                                <th className="px-4 py-3">Notify</th>
                                <th className="px-4 py-3">WhatsApp</th>
                                <th className="px-4 py-3">Response</th>
                                <th className="px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {invites.map((invite) => (
                                <tr key={invite.id}>
                                    <td className="px-4 py-3">
                                        <div className="font-semibold text-stone-900">{invite.creator_name}</div>
                                        <div className="text-xs text-stone-500">{invite.role || "Creator"} · {invite.city || invite.location || "Location not set"}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge>{invite.status}</Badge>
                                        <div className="text-xs text-stone-400 mt-1">{new Date(invite.created_at).toLocaleString()}</div>
                                    </td>
                                    <td className="px-4 py-3 max-w-xs">
                                        <div>{invite.match_reason || "-"}</div>
                                        <div className="text-xs text-stone-400">{invite.match_score !== null ? `Score ${invite.match_score}` : ""}</div>
                                    </td>
                                    <td className="px-4 py-3">{invite.notification_status || "-"}</td>
                                    <td className="px-4 py-3">{invite.whatsapp_status || "-"}</td>
                                    <td className="px-4 py-3 max-w-xs">
                                        <div>{invite.response_note || "-"}</div>
                                        {invite.availability_note && <div className="text-xs text-stone-500 mt-1">{invite.availability_note}</div>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                disabled={isPending || invite.status === "inactive"}
                                                onClick={() => runAction(() => adminDeactivateInvite(invite.id))}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                                            >
                                                <UserMinus className="w-3.5 h-3.5" />
                                                Inactive
                                            </button>
                                            <button
                                                type="button"
                                                disabled={isPending || !["failed", "skipped_disabled", "not_sent"].includes(invite.whatsapp_status || "")}
                                                onClick={() => runAction(() => adminRequeueWhatsApp(invite.id))}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50"
                                            >
                                                <MessageCircle className="w-3.5 h-3.5" />
                                                Requeue
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {invites.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-stone-500">No invites for this project yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-bold text-stone-900">Manual Invite Verified Creators</h3>
                        <p className="text-sm text-stone-500 mt-1">Client selection stays client-controlled. Manual invites only add creators to the opportunity pool.</p>
                    </div>
                    <label className="relative max-w-sm w-full">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search role, city, type"
                            className="w-full rounded-xl border border-stone-200 pl-9 pr-3 py-2 text-sm outline-none focus:border-stone-400"
                        />
                    </label>
                </div>

                {message && (
                    <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-700">
                        {message}
                    </div>
                )}

                <div className="grid lg:grid-cols-2 gap-3">
                    {filteredCandidates.map((creator) => (
                        <div key={creator.id} className="rounded-xl border border-stone-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="font-bold text-stone-900">{creator.name}</div>
                                <div className="text-sm text-stone-600">
                                    {creator.role || "Creator"} · {creator.city || creator.location || "Location not set"}
                                </div>
                                <div className="text-xs text-stone-500 mt-1">
                                    {creator.creator_type || "creator"} · Rs {(creator.day_rate || 0).toLocaleString("en-IN")}/day
                                </div>
                            </div>
                            <button
                                type="button"
                                disabled={isPending || creator.already_invited}
                                onClick={() => runAction(() => adminInviteCreator(projectId, creator.id))}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-700 disabled:opacity-50"
                            >
                                <BellPlus className="w-4 h-4" />
                                {creator.already_invited ? "Invited" : "Invite"}
                            </button>
                        </div>
                    ))}
                    {filteredCandidates.length === 0 && (
                        <div className="rounded-xl border border-dashed border-stone-200 p-8 text-center text-stone-500 lg:col-span-2">
                            No verified available creators match this filter.
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

function Badge({ children }: { children: string }) {
    return (
        <span className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-bold capitalize text-stone-700">
            {children.replace(/_/g, " ")}
        </span>
    );
}

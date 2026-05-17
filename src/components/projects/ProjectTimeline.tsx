"use client";

import { useEffect, useState, useTransition } from "react";
import { Briefcase, CheckCircle, Clock, Plus } from "lucide-react";
import { toast } from "sonner";
import { addProjectUpdate, listProjectUpdates, type ProjectUpdate } from "@/app/actions/projectUpdates";

type Props = {
    projectId: string;
    projectStatus: string;
    canAdd?: boolean;
    emptyMessage?: string;
    onUpdated?: () => void | Promise<void>;
};

const timelineStatusOptions = [
    { value: "update", label: "General update" },
    { value: "milestone", label: "Milestone" },
    { value: "in_progress", label: "Work started" },
    { value: "delivered", label: "Delivered" },
];

const closedStatuses = new Set(["cancelled", "expired", "disputed", "completed"]);

export function ProjectTimeline({
    projectId,
    projectStatus,
    canAdd = true,
    emptyMessage = "No timeline updates yet. Add the first milestone when work starts.",
    onUpdated,
}: Props) {
    const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [status, setStatus] = useState("update");
    const [isPending, startTransition] = useTransition();

    const loadUpdates = async () => {
        setLoading(true);
        try {
            setUpdates(await listProjectUpdates(projectId));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUpdates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    const submit = () => {
        startTransition(async () => {
            const result = await addProjectUpdate(projectId, title, message, status);
            if (!result.success) {
                toast.error(result.message);
                return;
            }

            toast.success(result.message);
            setTitle("");
            setMessage("");
            setStatus("update");
            await loadUpdates();
            await onUpdated?.();
        });
    };

    const canPost = canAdd && !closedStatuses.has(projectStatus);

    return (
        <section className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm">
            <h2 className="text-xl font-black text-stone-900 font-display mb-4 inline-flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-orange-600" /> Timeline
            </h2>

            {canPost && (
                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 mb-6 space-y-3">
                    <div className="grid md:grid-cols-[1fr_180px] gap-3">
                        <input
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            className="w-full rounded-xl border border-orange-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500"
                            placeholder="Update title, e.g. Shoot completed"
                        />
                        <select
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                            className="w-full rounded-xl border border-orange-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500"
                        >
                            {timelineStatusOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                    <textarea
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-orange-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500 resize-none"
                        placeholder="Add notes, next steps, delivered files, or milestone details..."
                    />
                    <button
                        onClick={submit}
                        disabled={isPending || !title.trim()}
                        className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus className="w-4 h-4" />
                        {isPending ? "Adding..." : "Add Timeline Update"}
                    </button>
                </div>
            )}

            {loading ? (
                <div className="text-sm text-stone-500">Loading timeline...</div>
            ) : updates.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-6 text-sm text-stone-500">
                    {emptyMessage}
                </div>
            ) : (
                <div className="space-y-4">
                    {updates.map((update) => (
                        <div key={update.id} className="flex gap-3 rounded-2xl border border-stone-200 p-4">
                            <div className="mt-0.5">
                                {update.status === "delivered" || update.status === "completed" ? (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : (
                                    <Clock className="w-5 h-5 text-orange-600" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="font-bold text-stone-900">{update.title}</h3>
                                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-bold capitalize text-stone-600">
                                        {update.status.replace(/_/g, " ")}
                                    </span>
                                </div>
                                {update.message && <TimelineMessage message={update.message} />}
                                <div className="text-xs text-stone-400 mt-2">
                                    {update.author_name || "Project participant"} · {new Date(update.created_at).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

function TimelineMessage({ message }: { message: string }) {
    const lines = message.split("\n");

    return (
        <div className="text-sm text-stone-600 mt-1 whitespace-pre-wrap">
            {lines.map((line, index) => {
                const proofMatch = line.match(/^Proof file:\s*(https?:\/\/\S+)/i);
                if (proofMatch) {
                    return (
                        <div key={`${line}-${index}`}>
                            Proof file:{" "}
                            <a href={proofMatch[1]} target="_blank" rel="noreferrer" className="font-bold text-orange-700 hover:text-orange-800">
                                View uploaded proof
                            </a>
                        </div>
                    );
                }

                return <div key={`${line}-${index}`}>{line || " "}</div>;
            })}
        </div>
    );
}

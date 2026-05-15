import { createClient } from "@/utils/supabase/server";
import { ShieldAlert } from "lucide-react";
import { DisputeAdminControls } from "./DisputeAdminControls";

type RelatedUser = { full_name: string | null } | { full_name: string | null }[] | null;
type ProjectData = {
    title: string | null;
    status: string | null;
    selected_creator_id: string | null;
    client: RelatedUser;
    creator: ({ role: string | null; users: RelatedUser }) | ({ role: string | null; users: RelatedUser })[] | null;
};
type ProjectRelation = ProjectData | ProjectData[] | null;

type DisputeRow = {
    id: string;
    reason: string;
    details: string | null;
    status: string;
    resolution_type: string | null;
    resolution: string | null;
    created_at: string;
    resolved_at: string | null;
    projects: ProjectRelation;
};

function relatedName(value: RelatedUser) {
    const item = Array.isArray(value) ? value[0] : value;
    return item?.full_name || "Unknown";
}

function firstProject(value: ProjectRelation) {
    return Array.isArray(value) ? value[0] : value;
}

export default async function AdminDisputesPage() {
    const supabase = await createClient();

    const { data: disputes } = await supabase
        .from("project_disputes")
        .select(`
            id,
            reason,
            details,
            status,
            resolution_type,
            resolution,
            created_at,
            resolved_at,
            projects:project_id(
                title,
                status,
                selected_creator_id,
                client:client_id(full_name),
                creator:selected_creator_id(role, users(full_name))
            )
        `)
        .order("created_at", { ascending: false });

    const rows = (disputes || []) as unknown as DisputeRow[];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-stone-200 pb-6 mb-8 mt-2">
                <div className="p-3 bg-rose-100/50 text-rose-600 rounded-xl">
                    <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Disputes</h2>
                    <p className="text-stone-500 mt-1">Review client disputes and record internal resolution outcomes.</p>
                </div>
            </div>

            {rows.length === 0 ? (
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-12 text-center text-stone-500">
                    No disputes found.
                </div>
            ) : (
                <div className="grid xl:grid-cols-2 gap-4">
                    {rows.map((dispute) => {
                        const project = firstProject(dispute.projects);
                        const creator = Array.isArray(project?.creator) ? project?.creator[0] : project?.creator;
                        return (
                            <div key={dispute.id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="font-bold text-stone-900">{project?.title || "Unknown project"}</h3>
                                        <p className="text-xs text-stone-500 mt-1">
                                            Project: {project?.status || "unknown"} · Dispute: {dispute.status}
                                        </p>
                                    </div>
                                    <span className="text-xs font-bold uppercase px-2 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                                        {dispute.status}
                                    </span>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                                    <Meta label="Client" value={relatedName(project?.client || null)} />
                                    <Meta label="Creator" value={`${relatedName(creator?.users || null)}${creator?.role ? ` · ${creator.role}` : ""}`} />
                                    <Meta label="Raised" value={new Date(dispute.created_at).toLocaleString()} />
                                    <Meta label="Resolved" value={dispute.resolved_at ? new Date(dispute.resolved_at).toLocaleString() : "Not resolved"} />
                                </div>

                                <Note label="Reason" value={dispute.reason} />
                                {dispute.details && <Note label="Details" value={dispute.details} />}
                                {dispute.resolution_type && <Note label="Resolution Type" value={dispute.resolution_type.replace(/_/g, " ")} />}
                                {dispute.resolution && <Note label="Resolution" value={dispute.resolution} />}

                                <DisputeAdminControls disputeId={dispute.id} status={dispute.status} />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function Meta({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-xs font-semibold text-stone-500">{label}</div>
            <div className="font-medium text-stone-900">{value}</div>
        </div>
    );
}

function Note({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl bg-stone-50 border border-stone-100 p-3">
            <div className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-1">{label}</div>
            <p className="text-sm text-stone-700">{value}</p>
        </div>
    );
}

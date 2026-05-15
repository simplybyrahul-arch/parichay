import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { Clock, CheckCircle, FileText, Ban, PlayCircle, AlertTriangle, UserCog } from "lucide-react";
import { activeOpportunityStatuses } from "@/lib/projects/status";

type RelatedName = {
    full_name: string | null;
} | null;

type ProjectRow = {
    id: string;
    title: string;
    budget: number;
    status: string | null;
    payment_status: string | null;
    created_at: string;
    event_date: string | null;
    expires_at: string | null;
    parichay_assigned: boolean | null;
    selected_creator_id: string | null;
    client: RelatedName;
    selected_creator: ({ role: string | null; users: RelatedName | RelatedName[] | null } | { role: string | null; users: RelatedName | RelatedName[] | null }[]) | null;
};

type InviteRow = {
    project_id: string;
    status: string;
};

type DisputeRow = {
    project_id: string;
    status: string;
};

function isUrgentParichay(project: ProjectRow) {
    if (project.parichay_assigned || !["confirmed", "in_progress"].includes(project.status || "")) return false;
    if (!project.event_date) return false;
    const diff = new Date(project.event_date).getTime() - Date.now();
    return diff >= 0 && diff <= 48 * 60 * 60 * 1000;
}

function needsParichay(project: ProjectRow) {
    return !project.parichay_assigned && ["confirmed", "in_progress"].includes(project.status || "");
}

function isExpiringSoon(project: ProjectRow) {
    if (!project.expires_at || project.selected_creator_id) return false;
    if (!activeOpportunityStatuses.includes(project.status as (typeof activeOpportunityStatuses)[number])) return false;
    const diff = new Date(project.expires_at).getTime() - Date.now();
    return diff > 0 && diff <= 12 * 60 * 60 * 1000;
}

function getSelectedCreatorName(project: ProjectRow) {
    const creator = Array.isArray(project.selected_creator) ? project.selected_creator[0] : project.selected_creator;
    const user = Array.isArray(creator?.users) ? creator?.users[0] : creator?.users;
    return user?.full_name || creator?.role || null;
}

function incrementCount(map: Map<string, number>, projectId: string) {
    map.set(projectId, (map.get(projectId) || 0) + 1);
}

export default async function AdminProjectsPage() {
    const supabase = await createClient();

    const [{ data: projects }, { data: invites }, { data: disputes }] = await Promise.all([
        supabase
            .from("projects")
            .select(`
                *,
                client:client_id(full_name),
                selected_creator:selected_creator_id(role, users(full_name))
            `)
            .order("created_at", { ascending: false }),
        supabase
            .from("project_invites")
            .select("project_id, status"),
        supabase
            .from("project_disputes")
            .select("project_id, status"),
    ]);

    const inviteCountByProject = new Map<string, number>();
    const interestedCountByProject = new Map<string, number>();
    ((invites || []) as InviteRow[]).forEach((invite) => {
        incrementCount(inviteCountByProject, invite.project_id);
        if (["interested", "shortlisted", "selected"].includes(invite.status)) {
            incrementCount(interestedCountByProject, invite.project_id);
        }
    });

    const activeDisputeByProject = new Set(
        ((disputes || []) as DisputeRow[])
            .filter((dispute) => ["open", "under_review"].includes(dispute.status))
            .map((dispute) => dispute.project_id)
    );

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'cancelled': return <Ban className="w-4 h-4 text-rose-500" />;
            case 'in_progress': return <PlayCircle className="w-4 h-4 text-blue-500" />;
            case 'draft': return <FileText className="w-4 h-4 text-stone-500" />;
            case 'funded': return <CheckCircle className="w-4 h-4 text-purple-500" />;
            default: return <Clock className="w-4 h-4 text-orange-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return "bg-green-50 text-green-700 border-green-200";
            case 'cancelled': return "bg-rose-50 text-rose-700 border-rose-200";
            case 'in_progress': return "bg-blue-50 text-blue-700 border-blue-200";
            case 'draft': return "bg-stone-100 text-stone-700 border-stone-200";
            case 'funded': return "bg-purple-50 text-purple-700 border-purple-200";
            default: return "bg-orange-50 text-orange-700 border-orange-200"; // pending
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Projects</h2>
                <p className="text-stone-500 mt-1">Overview of all jobs and their current statuses.</p>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-600">
                        <thead className="bg-stone-50 border-b border-stone-200 text-stone-900">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Project Title</th>
                                <th className="px-6 py-4 font-semibold">Client</th>
                                <th className="px-6 py-4 font-semibold">Assigned Creator</th>
                                <th className="px-6 py-4 font-semibold">Budget</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold">Payment</th>
                                <th className="px-6 py-4 font-semibold">Invites</th>
                                <th className="px-6 py-4 font-semibold">Parichay</th>
                                <th className="px-6 py-4 font-semibold">Risks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {(projects as ProjectRow[] | null)?.map((project) => (
                                <tr key={project.id} className="hover:bg-stone-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <Link href={`/admin/projects/${project.id}`} className="font-medium text-stone-900 hover:text-purple-700">
                                            {project.title}
                                        </Link>
                                        <div className="text-xs text-stone-500 mt-0.5">{new Date(project.created_at).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {project.client?.full_name || 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {getSelectedCreatorName(project) ? (
                                            <span className="font-medium text-stone-900">{getSelectedCreatorName(project)}</span>
                                        ) : (
                                            <span className="text-stone-400 italic">Unassigned</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-stone-900">
                                        ₹{project.budget.toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${getStatusColor(project.status || 'pending')}`}>
                                            {getStatusIcon(project.status || 'pending')}
                                            {project.status?.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium border bg-stone-50 text-stone-700 border-stone-200 capitalize">
                                            {(project.payment_status || "not_required").replace(/_/g, " ")}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-stone-900">{inviteCountByProject.get(project.id) || 0} invites</div>
                                        <div className="text-xs text-stone-500">{interestedCountByProject.get(project.id) || 0} interested</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {project.parichay_assigned ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                                <CheckCircle className="w-3.5 h-3.5" /> Assigned
                                            </span>
                                        ) : isUrgentParichay(project) ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                                <AlertTriangle className="w-3.5 h-3.5" /> Urgent
                                            </span>
                                        ) : needsParichay(project) ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                                                <UserCog className="w-3.5 h-3.5" /> Needed
                                            </span>
                                        ) : (
                                            <span className="text-stone-400 italic">Not required</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-2">
                                            {activeDisputeByProject.has(project.id) && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                                    <AlertTriangle className="w-3.5 h-3.5" /> Dispute
                                                </span>
                                            )}
                                            {isExpiringSoon(project) && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                                                    <Clock className="w-3.5 h-3.5" /> Expiring
                                                </span>
                                            )}
                                            {!activeDisputeByProject.has(project.id) && !isExpiringSoon(project) && (
                                                <span className="text-stone-400 italic">Clear</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!projects?.length && (
                                <tr>
                                    <td colSpan={9} className="px-6 py-8 text-center text-stone-500">
                                        No projects found.
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

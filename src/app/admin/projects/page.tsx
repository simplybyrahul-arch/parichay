import { createClient } from "@/utils/supabase/server";
import { Clock, CheckCircle, FileText, Ban, PlayCircle } from "lucide-react";

export default async function AdminProjectsPage() {
    const supabase = await createClient();

    // Fetch projects
    const { data: projects } = await supabase
        .from("projects")
        .select(`
            *,
            client:client_id(full_name),
            creator:creator_id(full_name)
        `)
        .order("created_at", { ascending: false });

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
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {projects?.map((project: any) => (
                                <tr key={project.id} className="hover:bg-stone-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-stone-900">{project.title}</div>
                                        <div className="text-xs text-stone-500 mt-0.5">{new Date(project.created_at).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {project.client?.full_name || 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {project.creator?.full_name ? (
                                            <span className="font-medium text-stone-900">{project.creator?.full_name}</span>
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
                                </tr>
                            ))}
                            {!projects?.length && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-stone-500">
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

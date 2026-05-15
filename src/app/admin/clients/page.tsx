import { createClient } from "@/utils/supabase/server";

type ClientRow = {
    id: string;
    full_name: string | null;
    created_at: string;
    whatsapp_phone?: string | null;
};

type ProjectRow = {
    client_id: string | null;
    status: string | null;
};

type ClientStats = {
    total: number;
    active: number;
    completed: number;
    disputed: number;
};

const inactiveStatuses = new Set(["completed", "cancelled", "expired", "disputed"]);

function emptyStats(): ClientStats {
    return {
        total: 0,
        active: 0,
        completed: 0,
        disputed: 0,
    };
}

function buildStats(projects: ProjectRow[]) {
    const statsByClient = new Map<string, ClientStats>();

    projects.forEach((project) => {
        if (!project.client_id) return;

        const stats = statsByClient.get(project.client_id) || emptyStats();
        const status = project.status || "";

        stats.total += 1;
        if (!inactiveStatuses.has(status)) stats.active += 1;
        if (status === "completed") stats.completed += 1;
        if (status === "disputed") stats.disputed += 1;

        statsByClient.set(project.client_id, stats);
    });

    return statsByClient;
}

export default async function AdminClientsPage() {
    const supabase = await createClient();

    const { data: clientsData } = await supabase
        .from("users")
        .select("id, full_name, created_at, whatsapp_phone")
        .eq("account_type", "client")
        .order("created_at", { ascending: false });

    const clients = (clientsData || []) as ClientRow[];
    const clientIds = clients.map((client) => client.id);

    const { data: projectsData } = clientIds.length
        ? await supabase
            .from("projects")
            .select("client_id, status")
            .in("client_id", clientIds)
        : { data: [] };

    const statsByClient = buildStats((projectsData || []) as ProjectRow[]);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Clients</h2>
                <p className="text-stone-500 mt-1">View client accounts and booking activity across ShotcutCrew.</p>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-600">
                        <thead className="bg-stone-50 border-b border-stone-200 text-stone-900">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Name</th>
                                <th className="px-6 py-4 font-semibold">Email</th>
                                <th className="px-6 py-4 font-semibold">Phone</th>
                                <th className="px-6 py-4 font-semibold">Created At</th>
                                <th className="px-6 py-4 font-semibold">Total Bookings</th>
                                <th className="px-6 py-4 font-semibold">Active</th>
                                <th className="px-6 py-4 font-semibold">Completed</th>
                                <th className="px-6 py-4 font-semibold">Disputed</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {clients.map((client) => {
                                const stats = statsByClient.get(client.id) || emptyStats();

                                return (
                                    <tr key={client.id} className="hover:bg-stone-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-stone-900">{client.full_name || "Unknown client"}</div>
                                            <div className="text-xs text-stone-500 mt-0.5">{client.id}</div>
                                        </td>
                                        <td className="px-6 py-4 text-stone-400">
                                            {/* TODO: Add public users.email or a safe admin auth lookup if email needs to appear here. */}
                                            Not available
                                        </td>
                                        <td className="px-6 py-4">{client.whatsapp_phone || <span className="text-stone-400">Not available</span>}</td>
                                        <td className="px-6 py-4">{new Date(client.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-semibold text-stone-900">{stats.total}</td>
                                        <td className="px-6 py-4">{stats.active}</td>
                                        <td className="px-6 py-4">{stats.completed}</td>
                                        <td className="px-6 py-4">{stats.disputed}</td>
                                    </tr>
                                );
                            })}
                            {clients.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-stone-500">
                                        No client users found.
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

import { createClient } from "@/utils/supabase/server";
import { AlertTriangle, BarChart3, MessageCircle } from "lucide-react";

type ProjectRow = {
    id: string;
    title: string;
    status: string | null;
    payment_status: string | null;
    parichay_assigned: boolean | null;
    event_date: string | null;
    expires_at: string | null;
    selected_creator_id: string | null;
};

type InviteRow = {
    status: string;
    viewed_at: string | null;
    whatsapp_sent_at: string | null;
    whatsapp_status: string | null;
};

type WhatsAppRow = {
    id: string;
    project_id: string | null;
    creator_id: string | null;
    recipient_phone: string | null;
    status: string;
    error_message: string | null;
    created_at: string;
    project: { title: string | null } | { title: string | null }[] | null;
    creator: { role: string | null; users: { full_name: string | null } | { full_name: string | null }[] | null } | { role: string | null; users: { full_name: string | null } | { full_name: string | null }[] | null }[] | null;
};

function countBy<T>(items: T[], getter: (item: T) => string | null | undefined) {
    return items.reduce<Record<string, number>>((acc, item) => {
        const key = getter(item) || "unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
}

function getCreatorName(row: WhatsAppRow) {
    const creator = Array.isArray(row.creator) ? row.creator[0] : row.creator;
    const user = Array.isArray(creator?.users) ? creator?.users[0] : creator?.users;
    return user?.full_name || creator?.role || "Unknown creator";
}

function getProjectTitle(row: WhatsAppRow) {
    const project = Array.isArray(row.project) ? row.project[0] : row.project;
    return project?.title || "Unknown project";
}

async function getServerNow() {
    return Date.now();
}

export default async function AnalyticsPage() {
    const supabase = await createClient();

    const [{ data: projectsData }, { data: invitesData }, { data: whatsappData }, { data: disputesData }] = await Promise.all([
        supabase.from("projects").select("id, title, status, payment_status, parichay_assigned, event_date, expires_at, selected_creator_id"),
        supabase.from("project_invites").select("status, viewed_at, whatsapp_sent_at, whatsapp_status"),
        supabase.from("whatsapp_messages").select("id, project_id, creator_id, recipient_phone, status, error_message, created_at, project:project_id(title), creator:creator_id(role, users(full_name))").order("created_at", { ascending: false }).limit(50),
        supabase.from("project_disputes").select("id, status"),
    ]);

    const projects = (projectsData || []) as ProjectRow[];
    const invites = (invitesData || []) as InviteRow[];
    const whatsappMessages = (whatsappData || []) as unknown as WhatsAppRow[];
    const disputes = disputesData || [];

    const projectStatusCounts = countBy(projects, (project) => project.status);
    const inviteStatusCounts = countBy(invites, (invite) => invite.status);
    const paymentStatusCounts = countBy(projects, (project) => project.payment_status);
    const whatsappStatusCounts = countBy(whatsappMessages, (message) => message.status);
    const reminderSentCount = invites.filter((invite) => invite.whatsapp_status === "reminder_sent").length;
    const whatsappConversionCount = invites.filter((invite) => invite.viewed_at && invite.whatsapp_sent_at).length;
    const failedMessages = whatsappMessages.filter((message) => message.status === "failed");

    const now = await getServerNow();
    const parichayNeeded = projects.filter((project) => ["confirmed", "in_progress"].includes(project.status || "") && !project.parichay_assigned);
    const urgentParichay = parichayNeeded.filter((project) => project.event_date && new Date(project.event_date).getTime() - now <= 48 * 60 * 60 * 1000 && new Date(project.event_date).getTime() >= now);
    const openDisputes = disputes.filter((dispute) => ["open", "under_review"].includes(dispute.status || "")).length;
    const expiringSoon = projects.filter((project) => project.expires_at && !project.selected_creator_id && ["open", "matching", "receiving_interest", "client_selecting"].includes(project.status || "") && new Date(project.expires_at).getTime() - now <= 12 * 60 * 60 * 1000 && new Date(project.expires_at).getTime() > now);

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3 border-b border-stone-200 pb-6 mb-8 mt-2">
                <div className="p-3 bg-purple-100/50 text-purple-600 rounded-xl">
                    <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Admin Analytics</h2>
                    <p className="text-stone-500 mt-1">Booking funnel, invite health, WhatsApp delivery, and operational risks.</p>
                </div>
            </div>

            <MetricGrid title="Booking Funnel" metrics={[
                ["Total bookings", projects.length],
                ["Open/matching", (projectStatusCounts.open || 0) + (projectStatusCounts.matching || 0)],
                ["Receiving interest", projectStatusCounts.receiving_interest || 0],
                ["Client selecting", projectStatusCounts.client_selecting || 0],
                ["Pending payment", projectStatusCounts.pending_payment || 0],
                ["Confirmed", projectStatusCounts.confirmed || 0],
                ["In progress", projectStatusCounts.in_progress || 0],
                ["Delivered", projectStatusCounts.delivered || 0],
                ["Completed", projectStatusCounts.completed || 0],
                ["Expired", projectStatusCounts.expired || 0],
                ["Cancelled", projectStatusCounts.cancelled || 0],
                ["Disputed", projectStatusCounts.disputed || 0],
            ]} />

            <MetricGrid title="Invite Metrics" metrics={[
                ["Total invites", invites.length],
                ["Sent", inviteStatusCounts.sent || 0],
                ["Viewed", inviteStatusCounts.viewed || 0],
                ["Interested", inviteStatusCounts.interested || 0],
                ["Declined", inviteStatusCounts.declined || 0],
                ["Shortlisted", inviteStatusCounts.shortlisted || 0],
                ["Selected", inviteStatusCounts.selected || 0],
                ["Not selected/inactive", (inviteStatusCounts.not_selected || 0) + (inviteStatusCounts.inactive || 0)],
            ]} />

            <MetricGrid title="Payment Status" metrics={[
                ["Pending payment", paymentStatusCounts.pending_payment || 0],
                ["Internal payment received", paymentStatusCounts.escrowed || 0],
                ["Disputed", paymentStatusCounts.disputed || 0],
                ["Refunded", paymentStatusCounts.refunded || 0],
                ["Released", paymentStatusCounts.released || 0],
            ]} />

            <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-stone-900 mb-4 inline-flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-600" /> Operational Alerts</h3>
                <div className="grid md:grid-cols-5 gap-3">
                    <AlertCard label="Parichay needed" value={parichayNeeded.length} />
                    <AlertCard label="Urgent Parichay" value={urgentParichay.length} />
                    <AlertCard label="Open disputes" value={openDisputes} />
                    <AlertCard label="WhatsApp failed" value={failedMessages.length} />
                    <AlertCard label="Expiring in 12h" value={expiringSoon.length} />
                </div>
            </section>

            <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-5">
                <h3 className="text-lg font-bold text-stone-900 inline-flex items-center gap-2"><MessageCircle className="w-5 h-5 text-green-600" /> WhatsApp Delivery Health</h3>
                <div className="grid md:grid-cols-4 lg:grid-cols-7 gap-3">
                    <AlertCard label="Total" value={whatsappMessages.length} />
                    <AlertCard label="Queued" value={whatsappStatusCounts.queued || 0} />
                    <AlertCard label="Sent" value={whatsappStatusCounts.sent || 0} />
                    <AlertCard label="Delivered" value={whatsappStatusCounts.delivered || 0} />
                    <AlertCard label="Failed" value={whatsappStatusCounts.failed || 0} />
                    <AlertCard label="Skipped" value={whatsappStatusCounts.skipped_disabled || 0} />
                    <AlertCard label="Reminder sent" value={reminderSentCount} />
                </div>
                <div className="rounded-xl bg-stone-50 border border-stone-100 p-4 text-sm font-semibold text-stone-700">
                    WhatsApp to platform conversions: {whatsappConversionCount}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-600">
                        <thead className="bg-stone-50 text-stone-900">
                            <tr>
                                <th className="px-4 py-3">Project</th>
                                <th className="px-4 py-3">Creator</th>
                                <th className="px-4 py-3">Phone</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Error</th>
                                <th className="px-4 py-3">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {failedMessages.map((message) => (
                                <tr key={message.id}>
                                    <td className="px-4 py-3">{getProjectTitle(message)}</td>
                                    <td className="px-4 py-3">{getCreatorName(message)}</td>
                                    <td className="px-4 py-3">{message.recipient_phone || "-"}</td>
                                    <td className="px-4 py-3">{message.status}</td>
                                    <td className="px-4 py-3">{message.error_message || "-"}</td>
                                    <td className="px-4 py-3">{new Date(message.created_at).toLocaleString()}</td>
                                </tr>
                            ))}
                            {failedMessages.length === 0 && (
                                <tr><td colSpan={6} className="px-4 py-6 text-center text-stone-500">No failed WhatsApp messages.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

function MetricGrid({ title, metrics }: { title: string; metrics: [string, number][] }) {
    return (
        <section className="space-y-3">
            <h3 className="text-lg font-bold text-stone-900">{title}</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {metrics.map(([label, value]) => <AlertCard key={label} label={label} value={value} />)}
            </div>
        </section>
    );
}

function AlertCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold text-stone-500">{label}</div>
            <div className="text-2xl font-black text-stone-900 mt-1">{value}</div>
        </div>
    );
}

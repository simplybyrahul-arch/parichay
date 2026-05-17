import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Wallet, Clock, Tag } from "lucide-react";
import { getOpportunityDetail, markOpportunityViewed, validateWhatsAppInviteLink } from "@/app/actions/opportunities";
import { OpportunityResponseForm } from "./OpportunityResponseForm";
import { ProjectTimeline } from "@/components/projects/ProjectTimeline";
import { WorkProofUpload } from "./WorkProofUpload";

type Props = {
    params: Promise<{ projectId: string }>;
    searchParams: Promise<{
        ref?: string;
        creator_id?: string;
        token?: string;
    }>;
};

function formatCurrency(value: number | null) {
    if (!value) return "Budget not specified";
    return `Rs ${value.toLocaleString("en-IN")}`;
}

function formatValue(value: string | number | null | undefined, fallback = "Not specified") {
    return value === null || value === undefined || value === "" ? fallback : String(value);
}

export default async function OpportunityDetailPage({ params, searchParams }: Props) {
    const { projectId } = await params;
    const query = await searchParams;
    let tokenMessage: string | null = null;
    let result: Awaited<ReturnType<typeof getOpportunityDetail>>;

    if (query.ref === "whatsapp") {
        try {
            const tokenResult = await validateWhatsAppInviteLink(projectId, query.creator_id || null, query.token || null);
            tokenMessage = tokenResult.message;
        } catch (error) {
            console.error("WhatsApp opportunity token validation error:", error);
            tokenMessage = "Invite tracking could not be updated, but you can still view the booking if you have access.";
        }
    }

    try {
        await markOpportunityViewed(projectId);
    } catch (error) {
        console.error("Opportunity viewed tracking error:", error);
    }

    try {
        result = await getOpportunityDetail(projectId);
    } catch (error) {
        console.error("Opportunity detail load error:", error);
        result = {
            success: false,
            message: "Project details could not be loaded right now. Please try again or contact support if this continues.",
        };
    }

    if (!result.success || !result.opportunity) {
        return (
            <main className="min-h-screen bg-[#fdfbfb] flex items-center justify-center px-6">
                <div className="max-w-xl w-full bg-white border border-stone-200 rounded-3xl p-8 text-center shadow-sm">
                    <h1 className="text-2xl font-black text-stone-900 font-display mb-2">Opportunity unavailable</h1>
                    <p className="text-stone-500 mb-6">{result.message}</p>
                    {tokenMessage && (
                        <p className="text-sm text-stone-500 mb-6 rounded-xl bg-stone-50 border border-stone-200 p-3">{tokenMessage}</p>
                    )}
                    <Link href="/creator-dashboard" className="inline-flex px-6 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors">
                        Back to Creator Dashboard
                    </Link>
                </div>
            </main>
        );
    }

    const opportunity = result.opportunity;
    const isExpired = opportunity.project_status === "expired";
    const isAssigned = opportunity.invite_status === "selected";
    const responsesClosed = !["sent", "viewed"].includes(opportunity.invite_status)
        || ["confirmed", "in_progress", "delivered", "completed", "cancelled", "expired", "disputed"].includes(opportunity.project_status);

    return (
        <main className="min-h-screen bg-[#fdfbfb] px-6 py-10">
            <div className="max-w-4xl mx-auto space-y-6">
                <Link href="/creator-dashboard" className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 font-semibold">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Creator Dashboard
                </Link>

                {tokenMessage && (
                    <div className="rounded-2xl border border-stone-200 bg-white px-5 py-4 text-sm text-stone-600">
                        {tokenMessage}
                    </div>
                )}

                {isExpired && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-800">
                        This booking has expired and is no longer accepting responses.
                    </div>
                )}

                {responsesClosed && !isExpired && (
                    <div className="rounded-2xl border border-stone-200 bg-white px-5 py-4 text-sm font-semibold text-stone-700">
                        Details are available for this booking. Creator responses are currently closed.
                    </div>
                )}

                <section className="bg-white border border-stone-200 rounded-3xl p-6 md:p-8 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                            <div className="text-xs font-bold uppercase tracking-wide text-rose-600 mb-2">
                                {formatValue(opportunity.booking_type).replace(/_/g, " ")}
                            </div>
                            <h1 className="text-3xl font-black text-stone-900 font-display mb-3">{opportunity.title}</h1>
                            <p className="text-stone-600 leading-relaxed">{formatValue(opportunity.description, "No description provided.")}</p>
                        </div>
                        <div className="text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full bg-stone-100 text-stone-700 self-start">
                            Invite: {opportunity.invite_status}
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                        <InfoTile icon={<MapPin className="w-4 h-4 text-rose-600" />} label="Location" value={formatValue(opportunity.booking_location)} />
                        <InfoTile icon={<Calendar className="w-4 h-4 text-rose-600" />} label="Event Date" value={opportunity.event_date ? new Date(opportunity.event_date).toLocaleDateString() : "Not specified"} />
                        <InfoTile icon={<Clock className="w-4 h-4 text-rose-600" />} label="Estimated Days" value={formatValue(opportunity.estimated_days)} />
                        <InfoTile icon={<Wallet className="w-4 h-4 text-rose-600" />} label="Budget" value={formatCurrency(opportunity.budget)} />
                    </div>

                    <div className="grid md:grid-cols-2 gap-5 mt-8">
                        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                            <div className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-2">Requirement Summary</div>
                            <p className="text-sm text-stone-700 leading-relaxed">{formatValue(opportunity.requirement_summary, "No summary provided.")}</p>
                        </div>
                        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                            <div className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-2 inline-flex items-center gap-2">
                                <Tag className="w-3.5 h-3.5" />
                                Match Reason
                            </div>
                            <p className="text-sm text-stone-700 leading-relaxed">{formatValue(opportunity.match_reason, "Matched by creator profile.")}</p>
                        </div>
                    </div>
                </section>

                <OpportunityResponseForm opportunity={opportunity} />

                <WorkProofUpload
                    projectId={opportunity.project_id}
                    projectStatus={opportunity.project_status}
                    canUpload={isAssigned}
                />

                <ProjectTimeline
                    projectId={opportunity.project_id}
                    projectStatus={opportunity.project_status}
                    canAdd={isAssigned}
                    emptyMessage="No timeline updates yet. Add the first milestone when work starts."
                />
            </div>
        </main>
    );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50">
            <div className="flex items-center gap-2 text-xs text-stone-500 font-semibold mb-1">
                {icon}
                {label}
            </div>
            <div className="text-sm font-black text-stone-900 break-words">{value}</div>
        </div>
    );
}

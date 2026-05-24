import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CreditCard, MapPin, ShieldCheck, UserCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { AdminProjectControls, AdminInviteRow, CreatorCandidate } from "./AdminProjectControls";

type RelatedUser = { full_name: string | null; email?: string | null } | { full_name: string | null; email?: string | null }[] | null;

type ProjectRow = {
    id: string;
    title: string;
    description: string | null;
    budget: number;
    status: string | null;
    payment_status: string | null;
    booking_type: string | null;
    booking_location: string | null;
    event_date: string | null;
    requirement_summary: string | null;
    selected_creator_id: string | null;
    client: RelatedUser;
    selected_creator: ({ role: string | null; users: RelatedUser }) | ({ role: string | null; users: RelatedUser })[] | null;
};

type InviteData = {
    id: string;
    creator_id: string;
    status: string;
    match_reason: string | null;
    match_score: number | null;
    notification_status: string | null;
    whatsapp_status: string | null;
    response_note: string | null;
    availability_note: string | null;
    created_at: string;
    responded_at: string | null;
    creator: ({ role: string | null; city: string | null; location: string | null; users: RelatedUser }) | ({ role: string | null; city: string | null; location: string | null; users: RelatedUser })[] | null;
};

type CreatorData = {
    id: string;
    role: string | null;
    city: string | null;
    location: string | null;
    creator_type: string | null;
    day_rate: number | null;
    verified: boolean | null;
    available_for_booking: boolean | null;
    users: RelatedUser;
};

type RentalResponseData = {
    id: string;
    status: string;
    match_reason: string | null;
    match_score: number | null;
    quote_amount: number | null;
    notes: string | null;
    created_at: string;
    provider_profiles: {
        business_name: string | null;
        city: string | null;
        state: string | null;
        verified: boolean | null;
        equipment_vendor_profiles?: {
            delivery_available?: boolean | null;
            operator_support_available?: boolean | null;
            equipment_categories?: string[] | null;
        } | {
            delivery_available?: boolean | null;
            operator_support_available?: boolean | null;
            equipment_categories?: string[] | null;
        }[] | null;
    } | null;
};

function first<T>(value: T | T[] | null | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

function userName(value: RelatedUser, fallback = "Unknown") {
    return first(value)?.full_name || fallback;
}

function creatorName(creator: { role: string | null; users: RelatedUser } | null | undefined) {
    return userName(creator?.users || null, creator?.role || "Creator");
}

export default async function AdminProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: projectData } = await supabase
        .from("projects")
        .select(`
            id,
            title,
            description,
            budget,
            status,
            payment_status,
            booking_type,
            booking_location,
            event_date,
            requirement_summary,
            selected_creator_id,
            client:client_id(full_name),
            selected_creator:selected_creator_id(role, users(full_name))
        `)
        .eq("id", id)
        .single();

    if (!projectData) notFound();
    const project = projectData as unknown as ProjectRow;

    const [{ data: invitesData }, { data: creatorsData }, { data: rentalResponsesData }] = await Promise.all([
        supabase
            .from("project_invites")
            .select(`
                id,
                creator_id,
                status,
                match_reason,
                match_score,
                notification_status,
                whatsapp_status,
                response_note,
                availability_note,
                created_at,
                responded_at,
                creator:creator_id(role, city, location, users(full_name))
            `)
            .eq("project_id", id)
            .order("created_at", { ascending: false }),
        supabase
            .from("creators")
            .select("id, role, city, location, creator_type, day_rate, verified, available_for_booking, users(full_name)")
            .eq("verified", true)
            .order("role", { ascending: true }),
        supabase
            .from("equipment_rental_responses")
            .select("id, status, match_reason, match_score, quote_amount, notes, created_at, provider_profiles(business_name, city, state, verified, equipment_vendor_profiles(delivery_available, operator_support_available, equipment_categories))")
            .eq("project_id", id)
            .order("created_at", { ascending: false }),
    ]);

    const invitedIds = new Set((invitesData || []).map((invite) => invite.creator_id));

    const invites: AdminInviteRow[] = ((invitesData || []) as unknown as InviteData[]).map((invite) => {
        const creator = first(invite.creator);
        return {
            id: invite.id,
            creator_id: invite.creator_id,
            creator_name: creatorName(creator),
            role: creator?.role || null,
            city: creator?.city || null,
            location: creator?.location || null,
            status: invite.status,
            match_reason: invite.match_reason,
            match_score: invite.match_score,
            notification_status: invite.notification_status,
            whatsapp_status: invite.whatsapp_status,
            response_note: invite.response_note,
            availability_note: invite.availability_note,
            created_at: invite.created_at,
            responded_at: invite.responded_at,
        };
    });

    const candidates: CreatorCandidate[] = ((creatorsData || []) as unknown as CreatorData[])
        .filter((creator) => creator.available_for_booking !== false)
        .map((creator) => ({
            id: creator.id,
            name: userName(creator.users, creator.role || "Creator"),
            role: creator.role,
            city: creator.city,
            location: creator.location,
            creator_type: creator.creator_type,
            day_rate: creator.day_rate,
            verified: creator.verified,
            available_for_booking: creator.available_for_booking,
            already_invited: invitedIds.has(creator.id),
        }));

    const selectedCreator = first(project.selected_creator);
    const rentalResponses = (rentalResponsesData || []) as unknown as RentalResponseData[];

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <Link href="/admin/projects" className="inline-flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-stone-900 mb-3">
                        <ArrowLeft className="w-4 h-4" />
                        Back to projects
                    </Link>
                    <h2 className="text-2xl font-bold text-stone-900 tracking-tight">{project.title}</h2>
                    <p className="text-stone-500 mt-1">Admin project detail and manual matching override.</p>
                </div>
                <div className="text-right">
                    <Badge>{project.status || "unknown"}</Badge>
                    <div className="text-xs text-stone-500 mt-2">Payment: {project.payment_status || "not_required"}</div>
                </div>
            </div>

            <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-5">
                <div className="grid md:grid-cols-4 gap-4">
                    <Meta icon={<UserCheck className="w-4 h-4" />} label="Client" value={userName(project.client, "Unknown client")} />
                    <Meta icon={<ShieldCheck className="w-4 h-4" />} label="Selected Creator" value={selectedCreator ? creatorName(selectedCreator) : "Not selected"} />
                    <Meta icon={<MapPin className="w-4 h-4" />} label="Location" value={project.booking_location || "Not specified"} />
                    <Meta icon={<CalendarDays className="w-4 h-4" />} label="Event Date" value={project.event_date ? new Date(project.event_date).toLocaleDateString() : "Not specified"} />
                    <Meta icon={<CreditCard className="w-4 h-4" />} label="Budget" value={`Rs ${project.budget.toLocaleString("en-IN")}`} />
                    <Meta label="Booking Type" value={project.booking_type?.replace(/_/g, " ") || "Not specified"} />
                    <Meta label="Invite Count" value={String(invites.length)} />
                    <Meta label="Interested" value={String(invites.filter((invite) => ["interested", "shortlisted", "selected"].includes(invite.status)).length)} />
                </div>
                {project.requirement_summary && (
                    <div className="rounded-xl bg-stone-50 border border-stone-100 p-4">
                        <div className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-1">Requirement Summary</div>
                        <p className="text-sm text-stone-700">{project.requirement_summary}</p>
                    </div>
                )}
                {project.description && (
                    <div className="rounded-xl bg-stone-50 border border-stone-100 p-4">
                        <div className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-1">Description</div>
                        <p className="text-sm text-stone-700">{project.description}</p>
                    </div>
                )}
            </section>

            {project.booking_type === "equipment" && (
                <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
                    <div className="mb-4">
                        <h3 className="text-lg font-black text-stone-900">Equipment Vendor Responses</h3>
                        <p className="text-sm text-stone-500">Rental providers matched to this equipment request. These are separate from creator invites.</p>
                    </div>
                    <div className="space-y-3">
                        {rentalResponses.map((response) => {
                            const provider = response.provider_profiles;
                            const vendorProfile = first(provider?.equipment_vendor_profiles);
                            return (
                                <div key={response.id} className="rounded-xl border border-stone-100 bg-stone-50 p-4">
                                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <div className="font-black text-stone-900">{provider?.business_name || "Equipment vendor"}</div>
                                            <div className="text-xs text-stone-500">
                                                {[provider?.city, provider?.state].filter(Boolean).join(", ") || "City not set"} · {provider?.verified ? "Verified" : "Unverified"}
                                            </div>
                                            <div className="mt-2 text-xs text-stone-500">
                                                {vendorProfile?.delivery_available ? "Delivery available" : "Pickup/local only"} · {vendorProfile?.operator_support_available ? "Operator support" : "No operator support"}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge>{response.status}</Badge>
                                            {response.quote_amount ? <div className="mt-2 text-xs font-bold text-stone-700">Quote: Rs {Number(response.quote_amount).toLocaleString("en-IN")}</div> : null}
                                        </div>
                                    </div>
                                    {response.match_reason ? <p className="mt-3 text-xs font-semibold text-violet-700">{response.match_reason}</p> : null}
                                    {response.notes ? <p className="mt-2 text-sm text-stone-600">{response.notes}</p> : null}
                                    {vendorProfile?.equipment_categories?.length ? (
                                        <p className="mt-2 text-xs text-stone-500">Categories: {vendorProfile.equipment_categories.join(", ")}</p>
                                    ) : null}
                                </div>
                            );
                        })}
                        {rentalResponses.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 p-6 text-center text-sm text-stone-500">
                                No equipment vendors matched yet.
                            </div>
                        ) : null}
                    </div>
                </section>
            )}

            {project.booking_type !== "equipment" && (
                <AdminProjectControls projectId={project.id} invites={invites} candidates={candidates} />
            )}
        </div>
    );
}

function Meta({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
    return (
        <div className="min-w-0">
            <div className="text-xs font-semibold text-stone-500 flex items-center gap-1">
                {icon}
                {label}
            </div>
            <div className="font-medium text-stone-900 break-words">{value}</div>
        </div>
    );
}

function Badge({ children }: { children: string }) {
    return (
        <span className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-bold capitalize text-stone-700">
            {children.replace(/_/g, " ")}
        </span>
    );
}

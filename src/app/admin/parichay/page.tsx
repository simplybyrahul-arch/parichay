import { createClient } from "@/utils/supabase/server";
import { AlertTriangle, CheckCircle, MapPin, UserCog } from "lucide-react";
import { ParichayAssignmentControls } from "./ParichayAssignmentControls";
import { QrPaymentVerificationControls } from "@/components/payments/QrPaymentVerificationControls";
import { UpiPaymentQr } from "@/components/payments/UpiPaymentQr";
import { createProjectUpiPaymentPayload } from "@/lib/payments/upiQr";

type RelatedUser = {
    full_name: string | null;
    email?: string | null;
} | null;

type ProjectRow = {
    id: string;
    title: string;
    budget: number;
    status: string | null;
    payment_status: string | null;
    booking_type: string | null;
    booking_location: string | null;
    event_date: string | null;
    parichay_assigned: boolean | null;
    parichay_coordinator_id: string | null;
    client: RelatedUser | RelatedUser[] | null;
    selected_creator: ({ role: string | null; users: RelatedUser | RelatedUser[] | null }) | null;
    coordinator: RelatedUser | RelatedUser[] | null;
};

type PaymentRow = {
    id: string;
    project_id: string;
    amount: number;
    status: string | null;
    payment_method: string | null;
    payment_reference: string | null;
    payment_proof_url: string | null;
    verified_at: string | null;
    verification_note: string | null;
};

type Coordinator = {
    id: string;
    full_name: string | null;
};

function isFutureOrToday(value: string | null) {
    if (!value) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(value);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate.getTime() >= today.getTime();
}

function isUrgent(value: string | null, assigned: boolean | null) {
    if (!value || assigned) return false;
    const eventTime = new Date(value).getTime();
    const diff = eventTime - Date.now();
    return diff >= 0 && diff <= 48 * 60 * 60 * 1000;
}

function getCreatorName(project: ProjectRow) {
    const creatorUser = Array.isArray(project.selected_creator?.users)
        ? project.selected_creator?.users[0]
        : project.selected_creator?.users;
    return creatorUser?.full_name || "Selected creator";
}

function getRelatedName(value: RelatedUser | RelatedUser[] | null | undefined) {
    const related = Array.isArray(value) ? value[0] : value;
    return related?.full_name || null;
}

export default async function AdminParichayPage() {
    const supabase = await createClient();

    const { data: coordinatorsData } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("account_type", "admin")
        .order("full_name", { ascending: true });

    const coordinators = (coordinatorsData || []) as Coordinator[];

    const { data: projectData } = await supabase
        .from("projects")
        .select(`
            id,
            title,
            budget,
            status,
            payment_status,
            booking_type,
            booking_location,
            event_date,
            parichay_assigned,
            parichay_coordinator_id,
            client:client_id(full_name),
            selected_creator:selected_creator_id(role, users(full_name)),
            coordinator:parichay_coordinator_id(full_name)
        `)
        .in("status", ["confirmed", "in_progress", "delivered"])
        .order("event_date", { ascending: true, nullsFirst: false });

    const projects = (projectData || []) as unknown as ProjectRow[];
    const projectIds = projects.map((project) => project.id);
    const { data: paymentsData } = projectIds.length
        ? await supabase
            .from("payments")
            .select("id, project_id, amount, status, payment_method, payment_reference, payment_proof_url, verified_at, verification_note")
            .eq("payment_method", "qr_upi")
            .in("project_id", projectIds)
            .order("created_at", { ascending: false })
        : { data: [] };

    const paymentsByProject = new Map<string, PaymentRow>();
    ((paymentsData || []) as PaymentRow[]).forEach((payment) => {
        if (!paymentsByProject.has(payment.project_id)) paymentsByProject.set(payment.project_id, payment);
    });

    const needingAssignment = projects.filter((project) => ["confirmed", "in_progress"].includes(project.status || "") && isFutureOrToday(project.event_date) && !project.parichay_assigned);
    const assignedProjects = projects.filter((project) => project.parichay_assigned);

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Parichay Coordinator Assignment</h2>
                <p className="text-stone-500 mt-1">Assign team coordinators to confirmed or in-progress bookings.</p>
            </div>

            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-stone-900">Coordinator Needed</h3>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                        {needingAssignment.length} pending
                    </span>
                </div>

                {needingAssignment.length === 0 ? (
                    <EmptyState message="No confirmed or in-progress bookings currently need a Parichay coordinator." />
                ) : (
                    <div className="grid xl:grid-cols-2 gap-4">
                        {needingAssignment.map((project) => (
                            <ProjectCard key={project.id} project={project} coordinators={coordinators} mode="assign" payment={paymentsByProject.get(project.id) || null} />
                        ))}
                    </div>
                )}
            </section>

            <section className="space-y-4">
                <h3 className="text-lg font-bold text-stone-900">Assigned Parichay Coordinators</h3>
                {assignedProjects.length === 0 ? (
                    <EmptyState message="No Parichay coordinators assigned yet." />
                ) : (
                    <div className="grid xl:grid-cols-2 gap-4">
                        {assignedProjects.map((project) => (
                            <ProjectCard key={project.id} project={project} coordinators={coordinators} mode="change" payment={paymentsByProject.get(project.id) || null} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

function ProjectCard({ project, coordinators, mode, payment }: { project: ProjectRow; coordinators: Coordinator[]; mode: "assign" | "change"; payment: PaymentRow | null }) {
    const urgent = isUrgent(project.event_date, project.parichay_assigned);

    return (
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h4 className="font-bold text-stone-900">{project.title}</h4>
                    <div className="text-xs text-stone-500 mt-1">
                        {project.booking_type?.replace(/_/g, " ") || "Booking"} · {project.status}
                    </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${urgent ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-orange-50 text-orange-700 border-orange-200"}`}>
                    {urgent ? <AlertTriangle className="w-3.5 h-3.5" /> : <UserCog className="w-3.5 h-3.5" />}
                    {urgent ? "Urgent: within 48 hours" : project.parichay_assigned ? "Assigned" : "Coordinator needed"}
                </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <Meta label="Location" value={project.booking_location || "Not specified"} icon={<MapPin className="w-4 h-4" />} />
                <Meta label="Event date" value={project.event_date ? new Date(project.event_date).toLocaleDateString() : "Not specified"} />
                <Meta label="Client" value={getRelatedName(project.client) || "Unknown client"} />
                <Meta label="Creator" value={`${getCreatorName(project)}${project.selected_creator?.role ? ` · ${project.selected_creator.role}` : ""}`} />
                <Meta label="Budget" value={`Rs ${project.budget.toLocaleString("en-IN")}`} />
                <Meta label="Payment" value={project.payment_status || "not_required"} />
            </div>

            {project.parichay_assigned && (
                <div className="rounded-xl bg-green-50 border border-green-100 p-3 text-sm text-green-800 inline-flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Assigned to {getRelatedName(project.coordinator) || "admin coordinator"}
                </div>
            )}

            <ParichayAssignmentControls
                projectId={project.id}
                coordinators={coordinators}
                currentCoordinatorId={project.parichay_coordinator_id}
                mode={mode}
            />

            {project.parichay_assigned && !["payment_received", "paid"].includes(project.payment_status || "") && (
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 space-y-3">
                    <div>
                        <div className="text-sm font-black text-stone-900">QR Payment Collection</div>
                        <div className="text-xs text-stone-600">Status: {payment?.status || project.payment_status || "qr_pending"}</div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        <Meta label="Amount due" value={`Rs ${((payment?.amount || project.budget * 100) / 100).toLocaleString("en-IN")}`} />
                        <Meta label="Reference" value={payment?.payment_reference || "Not submitted"} />
                        <Meta label="Proof" value={payment?.payment_proof_url || "Not provided"} />
                        <Meta label="Verified" value={payment?.verified_at ? new Date(payment.verified_at).toLocaleString() : "No"} />
                    </div>
                    {payment?.verification_note && <div className="text-xs text-stone-600">Note: {payment.verification_note}</div>}
                    <CoordinatorQr project={project} payment={payment} />
                    {payment ? (
                        <QrPaymentVerificationControls projectId={project.id} paymentId={payment.id} paymentStatus={payment.status} />
                    ) : (
                        <div className="text-xs font-semibold text-orange-800">Verification actions appear after the client opens QR payment details or submits proof.</div>
                    )}
                </div>
            )}
        </div>
    );
}

function CoordinatorQr({ project, payment }: { project: ProjectRow; payment: PaymentRow | null }) {
    try {
        const payload = createProjectUpiPaymentPayload({ id: project.id, budget: project.budget });
        return (
            <div className="rounded-2xl border border-orange-100 bg-white p-4">
                <UpiPaymentQr
                    qrPayload={payment?.payment_method === "qr_upi" ? payload.qrPayload : payload.qrPayload}
                    amount={payload.amount}
                    upiId={payload.upiId}
                    payeeName={payload.payeeName}
                    transactionNote={payload.transactionNote}
                />
            </div>
        );
    } catch {
        return (
            <div className="rounded-xl border border-orange-200 bg-white p-3 text-xs font-semibold text-orange-800">
                Configure OWNER_UPI_ID and OWNER_ACCOUNT_NAME to display the project QR.
            </div>
        );
    }
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

function EmptyState({ message }: { message: string }) {
    return (
        <div className="bg-white rounded-2xl border border-dashed border-stone-200 p-8 text-center text-stone-500">
            {message}
        </div>
    );
}

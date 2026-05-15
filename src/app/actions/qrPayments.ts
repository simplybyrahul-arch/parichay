"use server";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createProjectUpiPaymentPayload } from "@/lib/payments/upiQr";

type ActionResult = {
    success: boolean;
    message: string;
};

export type ProjectQrPaymentDetails = {
    payment_id: string;
    payment_status: string;
    payment_reference: string | null;
    payment_proof_url: string | null;
    verification_note: string | null;
    qrPayload: string;
    amount: number;
    upiId: string;
    payeeName: string;
    transactionNote: string;
};

type ProjectRow = {
    id: string;
    title: string;
    budget: number | null;
    client_id: string;
    selected_creator_id: string | null;
    parichay_coordinator_id: string | null;
    status: string | null;
    payment_status: string | null;
};

type PaymentRow = {
    id: string;
    status: string | null;
    payment_reference: string | null;
    payment_proof_url: string | null;
    verification_note: string | null;
};

const qrProjectStatuses = new Set(["confirmed", "in_progress", "delivered"]);
const verifiablePaymentStatuses = new Set(["pending", "qr_pending", "proof_uploaded"]);

function getRequiredEnv(name: string) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is not configured`);
    return value;
}

function createAdminClient() {
    return createSupabaseAdminClient(
        getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
        getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}

async function getActor() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { userId: null, accountType: null, error: "Unauthorized." };

    const admin = createAdminClient();
    const { data: profile } = await admin
        .from("users")
        .select("account_type")
        .eq("id", user.id)
        .single();

    return {
        userId: user.id,
        accountType: String(profile?.account_type || ""),
        error: null,
    };
}

async function getProject(admin: ReturnType<typeof createAdminClient>, projectId: string) {
    const { data: project, error } = await admin
        .from("projects")
        .select("id, title, budget, client_id, selected_creator_id, parichay_coordinator_id, status, payment_status")
        .eq("id", projectId)
        .single();

    if (error || !project) return null;
    return project as ProjectRow;
}

function canViewQr(actor: { userId: string; accountType: string | null }, project: ProjectRow) {
    return actor.accountType === "admin"
        || project.client_id === actor.userId
        || project.parichay_coordinator_id === actor.userId;
}

function canVerifyQr(actor: { userId: string; accountType: string | null }, project: ProjectRow) {
    return actor.accountType === "admin" || project.parichay_coordinator_id === actor.userId;
}

async function findQrPayment(admin: ReturnType<typeof createAdminClient>, projectId: string) {
    const { data } = await admin
        .from("payments")
        .select("id, status, payment_reference, payment_proof_url, verification_note")
        .eq("project_id", projectId)
        .eq("payment_method", "qr_upi")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    return (data || null) as PaymentRow | null;
}

async function ensureQrPayment(admin: ReturnType<typeof createAdminClient>, project: ProjectRow) {
    const payload = createProjectUpiPaymentPayload({ id: project.id, budget: project.budget });
    const existingPayment = await findQrPayment(admin, project.id);

    if (existingPayment) {
        const { data: updatedPayment, error } = await admin
            .from("payments")
            .update({
                amount: payload.amountPaise,
                currency: "INR",
                coordinator_id: project.parichay_coordinator_id,
                qr_payload: payload.qrPayload,
            })
            .eq("id", existingPayment.id)
            .select("id, status, payment_reference, payment_proof_url, verification_note")
            .single();

        if (error || !updatedPayment) throw new Error("Could not update QR payment row.");
        return { payment: updatedPayment as PaymentRow, payload };
    }

    const { data: payment, error } = await admin
        .from("payments")
        .insert({
            project_id: project.id,
            client_id: project.client_id,
            creator_id: project.selected_creator_id,
            coordinator_id: project.parichay_coordinator_id,
            razorpay_order_id: `qr_${project.id}`,
            amount: payload.amountPaise,
            currency: "INR",
            status: "qr_pending",
            payment_type: "qr_upi",
            payment_method: "qr_upi",
            qr_payload: payload.qrPayload,
        })
        .select("id, status, payment_reference, payment_proof_url, verification_note")
        .single();

    if (error || !payment) throw new Error("Could not create QR payment row.");
    return { payment: payment as PaymentRow, payload };
}

async function createNotifications(admin: ReturnType<typeof createAdminClient>, notifications: Record<string, unknown>[]) {
    if (notifications.length === 0) return;
    const { error } = await admin.from("notifications").insert(notifications);
    if (error) console.error("QR payment notification error:", error);
}

async function auditQrPayment(admin: ReturnType<typeof createAdminClient>, actorId: string, action: string, targetId: string, metadata: Record<string, unknown>) {
    const { error } = await admin.from("audit_logs").insert({
        admin_id: actorId,
        action,
        target_id: targetId,
        metadata,
        ip_address: "server-action",
    });
    if (error) console.error("QR payment audit log error:", error);
}

async function adminUsers(admin: ReturnType<typeof createAdminClient>) {
    const { data } = await admin.from("users").select("id").eq("account_type", "admin");
    return data || [];
}

function safeQrDetails(payment: PaymentRow, payload: ReturnType<typeof createProjectUpiPaymentPayload>): ProjectQrPaymentDetails {
    return {
        payment_id: payment.id,
        payment_status: payment.status || "qr_pending",
        payment_reference: payment.payment_reference,
        payment_proof_url: payment.payment_proof_url,
        verification_note: payment.verification_note,
        qrPayload: payload.qrPayload,
        amount: payload.amount,
        upiId: payload.upiId,
        payeeName: payload.payeeName,
        transactionNote: payload.transactionNote,
    };
}

export async function getProjectQrPayment(projectId: string): Promise<{ success: boolean; message: string; payment?: ProjectQrPaymentDetails }> {
    const actor = await getActor();
    if (!actor.userId) return { success: false, message: actor.error || "Unauthorized." };

    const admin = createAdminClient();
    const project = await getProject(admin, projectId);
    if (!project) return { success: false, message: "Project not found." };
    if (!canViewQr({ userId: actor.userId, accountType: actor.accountType }, project)) {
        return { success: false, message: "You do not have permission to view this QR payment." };
    }
    if (!qrProjectStatuses.has(String(project.status))) {
        return { success: false, message: "QR payment is available only after booking confirmation." };
    }

    const { payment, payload } = await ensureQrPayment(admin, project);

    if (["not_required", "pending_payment", "qr_pending", "rejected"].includes(String(project.payment_status || ""))) {
        await admin.from("projects").update({ payment_status: "qr_pending" }).eq("id", project.id);
    }

    return { success: true, message: "QR payment loaded.", payment: safeQrDetails(payment, payload) };
}

export async function submitQrPaymentProof(projectId: string, paymentReference: string, proofUrl?: string | null): Promise<ActionResult> {
    const actor = await getActor();
    if (!actor.userId) return { success: false, message: actor.error || "Unauthorized." };

    const cleanReference = paymentReference.trim();
    if (!cleanReference) return { success: false, message: "UTR/reference number is required." };

    const admin = createAdminClient();
    const project = await getProject(admin, projectId);
    if (!project || project.client_id !== actor.userId) return { success: false, message: "Project not found." };
    if (!qrProjectStatuses.has(String(project.status))) {
        return { success: false, message: "Payment proof can be submitted only for confirmed, in-progress, or delivered projects." };
    }

    const { payment, payload } = await ensureQrPayment(admin, project);
    const { error: paymentError } = await admin
        .from("payments")
        .update({
            amount: payload.amountPaise,
            status: "proof_uploaded",
            payment_reference: cleanReference,
            payment_proof_url: proofUrl?.trim() || null,
            verification_note: null,
        })
        .eq("id", payment.id);

    if (paymentError) return { success: false, message: "Could not submit payment proof." };

    await admin.from("projects").update({ payment_status: "proof_uploaded" }).eq("id", project.id);

    const admins = await adminUsers(admin);
    await createNotifications(admin, [
        ...(project.parichay_coordinator_id ? [{
            user_id: project.parichay_coordinator_id,
            project_id: project.id,
            creator_id: project.selected_creator_id,
            type: "qr_payment_proof_uploaded",
            title: "Payment proof uploaded",
            message: "Client submitted QR payment proof for verification.",
            data: { project_id: project.id, payment_id: payment.id, cta_url: "/admin/parichay" },
        }] : []),
        ...admins.map((adminUser) => ({
            user_id: adminUser.id,
            project_id: project.id,
            creator_id: project.selected_creator_id,
            type: "qr_payment_proof_uploaded",
            title: "Payment proof uploaded",
            message: "Client submitted QR payment proof for verification.",
            data: { project_id: project.id, payment_id: payment.id, cta_url: "/admin/payments" },
        })),
    ]);

    await auditQrPayment(admin, actor.userId, "QR_PAYMENT_PROOF_UPLOADED", payment.id, { project_id: project.id });
    revalidatePath(`/dashboard/${project.id}`);
    revalidatePath("/admin/payments");
    revalidatePath("/admin/parichay");
    return { success: true, message: "Payment proof submitted. Waiting for coordinator/admin verification." };
}

export async function verifyQrPayment(projectId: string, paymentId: string, verificationNote?: string): Promise<ActionResult> {
    const actor = await getActor();
    if (!actor.userId) return { success: false, message: actor.error || "Unauthorized." };

    const admin = createAdminClient();
    const project = await getProject(admin, projectId);
    if (!project) return { success: false, message: "Project not found." };
    if (!canVerifyQr({ userId: actor.userId, accountType: actor.accountType }, project)) {
        return { success: false, message: "Only admin or the assigned coordinator can verify this payment." };
    }
    if (!qrProjectStatuses.has(String(project.status))) {
        return { success: false, message: "This project is not open for QR payment verification." };
    }

    const { data: payment } = await admin
        .from("payments")
        .select("id, status, payment_method")
        .eq("id", paymentId)
        .eq("project_id", project.id)
        .single();

    if (!payment || payment.payment_method !== "qr_upi") return { success: false, message: "QR payment not found." };
    if (!verifiablePaymentStatuses.has(String(payment.status))) {
        return { success: false, message: "This payment is not waiting for verification." };
    }

    const now = new Date().toISOString();
    const verifiedStatus = actor.accountType === "admin" ? "admin_verified" : "coordinator_verified";
    const { error: paymentError } = await admin
        .from("payments")
        .update({
            status: "received",
            verified_by: actor.userId,
            verified_at: now,
            verification_note: verificationNote?.trim() || verifiedStatus,
        })
        .eq("id", paymentId);

    if (paymentError) return { success: false, message: "Could not verify payment." };

    await admin
        .from("projects")
        .update({ payment_status: "payment_received", status: "completed" })
        .eq("id", project.id);

    const admins = actor.accountType === "admin" ? [] : await adminUsers(admin);
    await createNotifications(admin, [
        {
            user_id: project.client_id,
            project_id: project.id,
            creator_id: project.selected_creator_id,
            type: "qr_payment_verified",
            title: "Payment received",
            message: "Payment received and verified. Project completed.",
            data: { project_id: project.id, payment_id: paymentId, cta_url: `/dashboard/${project.id}` },
        },
        ...(project.selected_creator_id ? [{
            user_id: project.selected_creator_id,
            project_id: project.id,
            creator_id: project.selected_creator_id,
            type: "qr_payment_verified",
            title: "Project completed",
            message: "Project payment received and project completed.",
            data: { project_id: project.id, payment_id: paymentId, cta_url: "/creator-dashboard" },
        }] : []),
        ...admins.map((adminUser) => ({
            user_id: adminUser.id,
            project_id: project.id,
            creator_id: project.selected_creator_id,
            type: "qr_payment_verified",
            title: "Payment verified by coordinator",
            message: "Assigned coordinator verified QR payment received.",
            data: { project_id: project.id, payment_id: paymentId, cta_url: "/admin/payments" },
        })),
    ]);

    await auditQrPayment(admin, actor.userId, "QR_PAYMENT_VERIFIED", paymentId, { project_id: project.id });
    revalidatePath(`/dashboard/${project.id}`);
    revalidatePath("/admin/payments");
    revalidatePath("/admin/parichay");
    return { success: true, message: "Payment received and verified. Project completed." };
}

export async function rejectQrPaymentProof(projectId: string, paymentId: string, reason: string): Promise<ActionResult> {
    const actor = await getActor();
    if (!actor.userId) return { success: false, message: actor.error || "Unauthorized." };

    const cleanReason = reason.trim();
    if (!cleanReason) return { success: false, message: "Rejection reason is required." };

    const admin = createAdminClient();
    const project = await getProject(admin, projectId);
    if (!project) return { success: false, message: "Project not found." };
    if (!canVerifyQr({ userId: actor.userId, accountType: actor.accountType }, project)) {
        return { success: false, message: "Only admin or the assigned coordinator can reject this proof." };
    }

    const { data: payment } = await admin
        .from("payments")
        .select("id, payment_method")
        .eq("id", paymentId)
        .eq("project_id", project.id)
        .single();

    if (!payment || payment.payment_method !== "qr_upi") return { success: false, message: "QR payment not found." };

    const { error: paymentError } = await admin
        .from("payments")
        .update({
            status: "rejected",
            verification_note: cleanReason,
            verified_by: actor.userId,
            verified_at: new Date().toISOString(),
        })
        .eq("id", paymentId);

    if (paymentError) return { success: false, message: "Could not reject payment proof." };

    await admin.from("projects").update({ payment_status: "rejected" }).eq("id", project.id);

    await createNotifications(admin, [{
        user_id: project.client_id,
        project_id: project.id,
        creator_id: project.selected_creator_id,
        type: "qr_payment_rejected",
        title: "Payment proof rejected",
        message: "Payment proof rejected. Please submit correct UTR/reference or screenshot.",
        data: { project_id: project.id, payment_id: paymentId, cta_url: `/dashboard/${project.id}` },
    }]);

    await auditQrPayment(admin, actor.userId, "QR_PAYMENT_REJECTED", paymentId, { project_id: project.id, reason: cleanReason });
    revalidatePath(`/dashboard/${project.id}`);
    revalidatePath("/admin/payments");
    revalidatePath("/admin/parichay");
    return { success: true, message: "Payment proof rejected." };
}

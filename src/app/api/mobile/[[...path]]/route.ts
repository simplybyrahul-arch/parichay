import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { matchCreators, type BookingType } from "@/lib/matching/matchCreators";
import { createProjectUpiPaymentPayload } from "@/lib/payments/upiQr";
import { isClientProjectCancellable } from "@/lib/projects/status";
import { rateLimit } from "@/utils/rate-limit";
import { AUTH_RATE_LIMIT_WINDOW_MS, getAuthCallbackUrl, isValidEmail, validatePasswordStrength } from "@/utils/auth-security";

type RouteContext = {
    params: Promise<{ path?: string[] }>;
};

type Actor = {
    userId: string;
    email: string | null;
    accountType: string;
    fullName: string | null;
};

type ProjectRow = {
    id: string;
    title: string;
    description: string | null;
    budget: number | null;
    client_id: string;
    creator_id?: string | null;
    selected_creator_id?: string | null;
    parichay_coordinator_id?: string | null;
    status: string | null;
    payment_status?: string | null;
    booking_type?: string | null;
    booking_location?: string | null;
    event_date?: string | null;
    estimated_days?: number | null;
    requirement_summary?: string | null;
    selected_at?: string | null;
    created_at?: string;
};

const activeProjectStatuses = new Set(["open", "matching", "receiving_interest", "client_selecting"]);
const selectableProjectStatuses = new Set(["open", "matching", "receiving_interest", "client_selecting"]);
const lockedSelectionStatuses = new Set(["pending_payment", "confirmed", "in_progress", "completed", "cancelled", "expired", "disputed"]);
const qrProjectStatuses = new Set(["confirmed", "in_progress", "delivered"]);
const verifiablePaymentStatuses = new Set(["pending", "qr_pending", "proof_uploaded"]);
const allowedTimelineStatuses = new Set(["update", "milestone", "in_progress", "delivered", "completed"]);
const paymentProofBucket = "payment-proofs";
const workProofBucket = "work-proofs";
const maxPaymentProofSize = 5 * 1024 * 1024;
const maxWorkProofSize = 10 * 1024 * 1024;
const paymentProofTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const workProofTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf", "application/zip"]);

function getRequiredEnv(name: string) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is not configured`);
    return value;
}

function clientIp(req: NextRequest) {
    return (req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for") || "127.0.0.1")
        .split(",")[0]
        .trim();
}

async function enforceMobileAuthRateLimit(req: NextRequest, action: string, email?: string) {
    const { success, reset } = await rateLimit(`mobile:${action}:${clientIp(req)}:${email || "anonymous"}`, 5, AUTH_RATE_LIMIT_WINDOW_MS);
    if (success) return null;
    return fail(`Too many attempts. Please try again in ${Math.ceil(Math.max(1, reset - Date.now()) / 60000)} minute(s).`, 429);
}

function createAdminClient() {
    return createSupabaseClient(
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

function createAnonClient() {
    return createSupabaseClient(
        getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
        getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}

function createAuthenticatedClient(token: string) {
    return createSupabaseClient(
        getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
        getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
            global: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        }
    );
}

function ok<T>(body: T, status = 200) {
    return NextResponse.json(body, { status });
}

function fail(message: string, status = 400) {
    return NextResponse.json({ success: false, message, error: message }, { status });
}

async function routeParts(context: RouteContext) {
    const params = await context.params;
    return params.path || [];
}

async function readJson(req: NextRequest) {
    try {
        return await req.json();
    } catch {
        return {};
    }
}

function bearerToken(req: NextRequest) {
    return req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || null;
}

async function requireActor(req: NextRequest): Promise<{ actor: Actor; token: string } | NextResponse> {
    const token = bearerToken(req);
    if (!token) return fail("Unauthorized.", 401);

    const userClient = createAuthenticatedClient(token);
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    const user = authData.user;
    if (authError || !user) return fail("Unauthorized.", 401);
    if (!user.email_confirmed_at && !user.confirmed_at) return fail("Please verify your email before logging in.", 403);

    const { data: profile, error: profileError } = await userClient
        .from("users")
        .select("id, full_name, account_type")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) return fail("User profile was not found.", 404);

    return {
        token,
        actor: {
            userId: user.id,
            email: user.email || null,
            accountType: String(profile.account_type || ""),
            fullName: (profile.full_name as string | null) || null,
        },
    };
}

function isResponse(value: unknown): value is NextResponse {
    return value instanceof NextResponse;
}

function requireRole(actor: Actor, roles: string[]) {
    return roles.includes(actor.accountType) ? null : fail("Forbidden.", 403);
}

function mapProject(project: Record<string, unknown>) {
    return {
        id: String(project.id),
        title: String(project.title || "Untitled project"),
        description: (project.description as string | null) || null,
        status: (project.status as string | null) || null,
        payment_status: (project.payment_status as string | null) || null,
        booking_type: (project.booking_type as string | null) || null,
        booking_location: (project.booking_location as string | null) || null,
        event_date: (project.event_date as string | null) || null,
        estimated_days: (project.estimated_days as number | null) || null,
        budget: (project.budget as number | null) || null,
        requirement_summary: (project.requirement_summary as string | null) || null,
        selected_creator_id: (project.selected_creator_id as string | null) || null,
        parichay_coordinator_id: (project.parichay_coordinator_id as string | null) || null,
        created_at: (project.created_at as string | undefined) || undefined,
    };
}

function mapOpportunity(invite: Record<string, unknown>, project: Record<string, unknown>) {
    return {
        ...mapProject(project),
        invite_id: String(invite.id),
        project_id: String(project.id),
        project_status: String(project.status || ""),
        invite_status: String(invite.status || ""),
        match_reason: (invite.match_reason as string | null) || null,
        response_note: (invite.response_note as string | null) || null,
        availability_note: (invite.availability_note as string | null) || null,
        viewed_at: (invite.viewed_at as string | null) || null,
        responded_at: (invite.responded_at as string | null) || null,
    };
}

function validateBookingInput(body: Record<string, unknown>) {
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const bookingType = String(body.bookingType || body.booking_type || "").trim() as BookingType;
    const budget = Number(body.budget);
    const estimatedDays = Math.max(1, Number(body.estimatedDays || body.estimated_days || 1));
    const eventDate = body.eventDate || body.event_date;

    if (!bookingType) throw new Error("Booking type is required.");
    if (!title || title.length < 3) throw new Error("Booking title is required.");
    if (!description || description.length < 10) throw new Error("Booking description is required.");
    if (!Number.isFinite(budget) || budget <= 0) throw new Error("A valid booking budget is required.");
    if (!Number.isInteger(estimatedDays) || estimatedDays < 1) throw new Error("Estimated days must be at least 1.");
    if (eventDate && Number.isNaN(new Date(String(eventDate)).getTime())) throw new Error("Event date is invalid.");

    return {
        bookingType,
        bookingLocation: String(body.bookingLocation || body.booking_location || "").trim() || null,
        eventDate: eventDate ? String(eventDate) : null,
        estimatedDays,
        requirementSummary: String(body.requirementSummary || body.requirement_summary || "").trim() || description,
        budget,
        title,
        description,
    };
}

function notificationMessage(booking: ReturnType<typeof validateBookingInput>) {
    const parts = [
        booking.bookingType.replace(/_/g, " "),
        booking.bookingLocation ? `in ${booking.bookingLocation}` : null,
        booking.eventDate ? `on ${booking.eventDate}` : null,
        `budget Rs ${booking.budget.toLocaleString("en-IN")}`,
    ].filter(Boolean);
    return `A new ${parts.join(" ")} is available.`;
}

async function ensureBucket(admin: ReturnType<typeof createAdminClient>, bucket: string, maxSize: number, mimeTypes: Set<string>) {
    const { data: buckets, error: listError } = await admin.storage.listBuckets();
    if (listError) throw new Error("Could not access file storage.");
    if (buckets?.some((item) => item.name === bucket)) return;

    const { error } = await admin.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: maxSize,
        allowedMimeTypes: Array.from(mimeTypes),
    });
    if (error) throw new Error(error.message);
}

async function uploadProofFile(admin: ReturnType<typeof createAdminClient>, bucket: string, actor: Actor, projectId: string, file: File) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "proof";
    const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "proof";
    const path = `${projectId}/${actor.userId}-${Date.now()}.${safeExtension}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error } = await admin.storage.from(bucket).upload(path, bytes, {
        contentType: file.type,
        upsert: false,
    });
    if (error) throw new Error(error.message);

    const { data } = admin.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
}

async function getProject(admin: ReturnType<typeof createAdminClient>, projectId: string) {
    const { data, error } = await admin
        .from("projects")
        .select("id, title, description, budget, client_id, creator_id, selected_creator_id, parichay_coordinator_id, status, payment_status, booking_type, booking_location, event_date, estimated_days, requirement_summary, selected_at, created_at")
        .eq("id", projectId)
        .single();
    if (error || !data) return null;
    return data as ProjectRow;
}

function isParticipant(project: ProjectRow, actor: Actor) {
    return actor.accountType === "admin"
        || project.client_id === actor.userId
        || project.creator_id === actor.userId
        || project.selected_creator_id === actor.userId
        || project.parichay_coordinator_id === actor.userId;
}

function canWriteTimeline(project: ProjectRow, actor: Actor) {
    return actor.accountType === "admin"
        || project.creator_id === actor.userId
        || project.selected_creator_id === actor.userId
        || project.parichay_coordinator_id === actor.userId;
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
    return data || null;
}

async function ensureQrPayment(admin: ReturnType<typeof createAdminClient>, project: ProjectRow) {
    const payload = createProjectUpiPaymentPayload({ id: project.id, budget: project.budget });
    const existingPayment = await findQrPayment(admin, project.id);

    if (existingPayment) {
        const { data, error } = await admin
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
        if (error || !data) throw new Error("Could not update QR payment row.");
        return { payment: data, payload };
    }

    const { data, error } = await admin
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
    if (error || !data) throw new Error("Could not create QR payment row.");
    return { payment: data, payload };
}

function safeQrDetails(payment: Record<string, unknown>, payload: ReturnType<typeof createProjectUpiPaymentPayload>) {
    return {
        payment_id: String(payment.id),
        payment_status: String(payment.status || "qr_pending"),
        payment_reference: (payment.payment_reference as string | null) || null,
        payment_proof_url: (payment.payment_proof_url as string | null) || null,
        verification_note: (payment.verification_note as string | null) || null,
        qrPayload: payload.qrPayload,
        amount: payload.amount,
        upiId: payload.upiId,
        payeeName: payload.payeeName,
        transactionNote: payload.transactionNote,
    };
}

async function adminUsers(admin: ReturnType<typeof createAdminClient>) {
    const { data } = await admin.from("users").select("id").eq("account_type", "admin");
    return data || [];
}

async function handleSignup(req: NextRequest) {
    const body = await readJson(req);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || body.full_name || "").trim();
    const accountType = String(body.account_type || body.accountType || "client");
    const creatorType = body.creator_type || body.creatorType;
    const emailRedirectTo = getAuthCallbackUrl("/login?verified=1");

    if (!isValidEmail(email) || !password || !name) return fail("Name, valid email, and password are required.");
    const passwordError = validatePasswordStrength(password);
    if (passwordError) return fail(passwordError);
    const limitError = await enforceMobileAuthRateLimit(req, "signup", email);
    if (limitError) return limitError;
    if (!["client", "creator"].includes(accountType)) return fail("Invalid account type.");
    if (accountType === "creator" && !["freelancer", "studio_owner"].includes(String(creatorType || ""))) {
        return fail("Creator type must be freelancer or studio_owner.");
    }

    const role = String(body.role || "").trim();
    const phone = String(body.phone || "").trim();
    const city = String(body.city || "").trim();
    if (accountType === "creator" && (!role || !phone || !city)) return fail("Creator role, phone, and city are required.");

    const anon = createAnonClient();
    const { data, error } = await anon.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo,
            data: {
                full_name: name,
                account_type: accountType,
                ...(accountType === "creator" ? {
                    creator_type: String(creatorType),
                    role,
                    phone,
                    whatsapp_phone: String(body.whatsapp_phone || body.whatsappPhone || phone),
                    city,
                    state: String(body.state || ""),
                    day_rate: Number(body.day_rate || body.dayRate || 0),
                    portfolio_url: String(body.portfolio_url || body.portfolioUrl || ""),
                    whatsapp_opt_in: body.whatsapp_opt_in ?? body.whatsappOptIn ?? true,
                    available_for_booking: body.available_for_booking ?? body.availableForBooking ?? true,
                    budget_flexibility: body.budget_flexibility ?? body.budgetFlexibility ?? false,
                    travel_enabled: body.travel_enabled ?? body.travelEnabled ?? false,
                } : {}),
            },
        },
    });

    if (error) return fail(error.message);

    if (accountType === "creator" && data.user) {
        const admin = createAdminClient();
        const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "creator";
        const { error: creatorError } = await admin.from("creators").upsert({
            id: data.user.id,
            slug: `${slugBase}-${data.user.id.slice(0, 8)}`,
            role,
            phone,
            whatsapp_phone: String(body.whatsapp_phone || body.whatsappPhone || phone),
            city,
            state: String(body.state || "") || null,
            location: city,
            day_rate: Number(body.day_rate || body.dayRate || 0),
            portfolio_url: body.portfolio_url || body.portfolioUrl ? JSON.stringify({ link: String(body.portfolio_url || body.portfolioUrl), items: [] }) : null,
            creator_type: String(creatorType),
            whatsapp_opt_in: body.whatsapp_opt_in ?? body.whatsappOptIn ?? true,
            available_for_booking: body.available_for_booking ?? body.availableForBooking ?? true,
            budget_flexibility: body.budget_flexibility ?? body.budgetFlexibility ?? false,
            travel_enabled: body.travel_enabled ?? body.travelEnabled ?? false,
        }, { onConflict: "id" });
        if (creatorError) console.error("Mobile creator signup upsert error:", creatorError);
    }

    return ok({ success: true, message: "Account created. Please check your email and verify your account before logging in." });
}

async function handleResend(req: NextRequest) {
    const body = await readJson(req);
    const email = String(body.email || "").trim().toLowerCase();
    const emailRedirectTo = getAuthCallbackUrl("/login?verified=1");
    if (!isValidEmail(email)) return fail("Email is required.");
    const limitError = await enforceMobileAuthRateLimit(req, "resend-verification", email);
    if (limitError) return limitError;

    const anon = createAnonClient();
    const { error } = await anon.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo },
    });
    if (error) return fail(error.message);
    return ok({ success: true, message: "Verification email sent. Please check your inbox and spam folder." });
}

async function handleCreateBooking(req: NextRequest, actor: Actor, admin: ReturnType<typeof createAdminClient>) {
    const roleError = requireRole(actor, ["client"]);
    if (roleError) return roleError;

    const body = await readJson(req);
    let booking: ReturnType<typeof validateBookingInput>;
    try {
        booking = validateBookingInput(body);
    } catch (error) {
        return fail(error instanceof Error ? error.message : "Invalid booking.");
    }

    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const { data: project, error: projectError } = await admin
        .from("projects")
        .insert({
            client_id: actor.userId,
            title: booking.title,
            description: booking.description,
            budget: booking.budget,
            status: "receiving_interest",
            payment_status: "not_required",
            booking_type: booking.bookingType,
            booking_location: booking.bookingLocation,
            event_date: booking.eventDate,
            estimated_days: booking.estimatedDays,
            requirement_summary: booking.requirementSummary,
            expires_at: expiresAt,
        })
        .select("id, created_at")
        .single();

    if (projectError || !project) return fail("Could not create booking. Please try again.", 500);

    let inviteCount = 0;
    try {
        const matches = await matchCreators(admin, {
            projectId: project.id,
            bookingType: booking.bookingType,
            bookingLocation: booking.bookingLocation,
            eventDate: booking.eventDate,
            bookingCreatedAt: project.created_at,
            budget: booking.budget,
            estimatedDays: booking.estimatedDays,
            requirementSummary: booking.requirementSummary,
        });

        for (const match of matches) {
            const { data: invite } = await admin
                .from("project_invites")
                .insert({
                    project_id: project.id,
                    creator_id: match.creatorId,
                    status: "sent",
                    match_reason: match.matchReason,
                    match_score: match.matchScore,
                    notification_status: "pending",
                    whatsapp_status: "queued",
                })
                .select("id")
                .single();
            if (!invite) continue;

            const { error: notificationError } = await admin.from("notifications").insert({
                user_id: match.creatorId,
                project_id: project.id,
                creator_id: match.creatorId,
                type: "booking_opportunity",
                title: "New booking opportunity",
                message: notificationMessage(booking),
                data: {
                    project_id: project.id,
                    booking_type: booking.bookingType,
                    booking_location: booking.bookingLocation,
                    event_date: booking.eventDate,
                    budget: booking.budget,
                    invite_id: invite.id,
                    cta_url: `/opportunities/${project.id}`,
                },
            });
            await admin.from("project_invites").update({ notification_status: notificationError ? "failed" : "created" }).eq("id", invite.id);
            if (!notificationError) inviteCount += 1;
        }
    } catch (error) {
        console.error("Mobile creator matching error:", error);
    }

    return ok({
        success: true,
        message: "Booking created successfully. We are notifying matched verified creators.",
        project_id: project.id,
        match_count: inviteCount,
    });
}

async function loadInterestedCreators(admin: ReturnType<typeof createAdminClient>, projectId: string) {
    const { data: invites } = await admin
        .from("project_invites")
        .select("id, creator_id, status, response_note, availability_note, responded_at, match_reason, match_score")
        .eq("project_id", projectId)
        .in("status", ["interested", "shortlisted", "selected"])
        .order("responded_at", { ascending: true, nullsFirst: false });
    if (!invites?.length) return [];

    const creatorIds = invites.map((invite) => invite.creator_id).filter(Boolean);
    const { data: creators } = await admin
        .from("creators")
        .select("id, role, city, location, day_rate, verified, portfolio_url, profile_image_url")
        .in("id", creatorIds);
    const { data: users } = await admin.from("users").select("id, full_name").in("id", creatorIds);

    const creatorsById = new Map((creators || []).map((creator) => [creator.id, creator]));
    const usersById = new Map((users || []).map((user) => [user.id, user]));

    return invites.map((invite) => {
        const creator = creatorsById.get(invite.creator_id);
        const user = usersById.get(invite.creator_id);
        return {
            invite_id: String(invite.id),
            creator_id: String(invite.creator_id),
            name: String(user?.full_name || "Verified Creator"),
            full_name: String(user?.full_name || "Verified Creator"),
            role: (creator?.role as string | null) || null,
            city: (creator?.city as string | null) || null,
            location: (creator?.location as string | null) || null,
            day_rate: (creator?.day_rate as number | null) || null,
            verified: (creator?.verified as boolean | null) || null,
            portfolio_url: (creator?.portfolio_url as string | null) || null,
            profile_image_url: (creator?.profile_image_url as string | null) || null,
            response_note: (invite.response_note as string | null) || null,
            availability_note: (invite.availability_note as string | null) || null,
            responded_at: (invite.responded_at as string | null) || null,
            invite_status: String(invite.status || ""),
            status: String(invite.status || ""),
            match_reason: (invite.match_reason as string | null) || null,
            match_score: (invite.match_score as number | null) || null,
        };
    });
}

async function handleSelection(projectId: string, actor: Actor, admin: ReturnType<typeof createAdminClient>) {
    const roleError = requireRole(actor, ["client", "admin"]);
    if (roleError) return roleError;
    const project = await getProject(admin, projectId);
    if (!project) return fail("Project not found.", 404);
    if (actor.accountType !== "admin" && project.client_id !== actor.userId) return fail("You do not have permission to manage this project.", 403);
    const creators = await loadInterestedCreators(admin, projectId);
    return ok({ success: true, message: "Project loaded.", project: mapProject(project), creators, invites: creators });
}

async function updateInviteSelection(projectId: string, inviteId: string, actor: Actor, admin: ReturnType<typeof createAdminClient>, mode: "shortlist" | "select") {
    const roleError = requireRole(actor, ["client", "admin"]);
    if (roleError) return roleError;
    const project = await getProject(admin, projectId);
    if (!project) return fail("Project not found.", 404);
    if (actor.accountType !== "admin" && project.client_id !== actor.userId) return fail("You do not have permission to manage this project.", 403);

    if (mode === "shortlist") {
        if (lockedSelectionStatuses.has(String(project.status)) || project.selected_creator_id) return fail("This project is no longer accepting shortlist changes.");
        const { data: invite } = await admin.from("project_invites").select("id, status").eq("id", inviteId).eq("project_id", projectId).single();
        if (!invite) return fail("Creator invite was not found.", 404);
        if (invite.status !== "interested") return fail("Only interested creators can be shortlisted.");
        const { error } = await admin.from("project_invites").update({ status: "shortlisted" }).eq("id", inviteId);
        if (error) return fail("Could not shortlist creator.", 500);
        return ok({ success: true, message: "Creator shortlisted." });
    }

    if (project.selected_creator_id) return fail("A creator has already been selected for this project.");
    if (!selectableProjectStatuses.has(String(project.status))) return fail("This project is not open for creator selection.");

    const { data: invite } = await admin.from("project_invites").select("id, creator_id, status").eq("id", inviteId).eq("project_id", projectId).single();
    if (!invite) return fail("Creator invite was not found.", 404);
    if (!["interested", "shortlisted"].includes(String(invite.status))) return fail("Only interested or shortlisted creators can be selected.");

    const now = new Date().toISOString();
    const { error: projectError } = await admin.from("projects").update({
        selected_creator_id: invite.creator_id,
        selected_at: now,
        status: "confirmed",
        payment_status: "qr_pending",
    }).eq("id", projectId).is("selected_creator_id", null);
    if (projectError) return fail("Could not select creator.", 500);

    await admin.from("project_invites").update({ status: "selected" }).eq("id", inviteId);
    const { data: otherInvites } = await admin.from("project_invites").select("id, creator_id").eq("project_id", projectId).neq("id", inviteId).in("status", ["interested", "shortlisted", "viewed", "sent"]);
    await admin.from("project_invites").update({ status: "not_selected" }).eq("project_id", projectId).neq("id", inviteId).in("status", ["interested", "shortlisted", "viewed", "sent"]);

    const notifications = [
        {
            user_id: invite.creator_id,
            project_id: projectId,
            creator_id: invite.creator_id,
            type: "creator_selected",
            title: "You were selected for a booking",
            message: `The client selected you for ${project.title}. Booking is confirmed. QR payment will be verified after delivery.`,
            data: { project_id: projectId, invite_id: inviteId, cta_url: `/opportunities/${projectId}` },
        },
        ...((otherInvites || []).map((otherInvite) => ({
            user_id: otherInvite.creator_id,
            project_id: projectId,
            creator_id: otherInvite.creator_id,
            type: "creator_not_selected",
            title: "Booking update",
            message: `The client selected another creator for ${project.title}.`,
            data: { project_id: projectId, invite_id: otherInvite.id, cta_url: "/creator-dashboard" },
        }))),
    ];
    await admin.from("notifications").insert(notifications);
    return ok({ success: true, message: "Creator selected. Booking confirmed. QR payment will be collected after delivery." });
}

async function handleQrPayment(projectId: string, actor: Actor, admin: ReturnType<typeof createAdminClient>) {
    const project = await getProject(admin, projectId);
    if (!project) return fail("Project not found.", 404);
    const canView = project.client_id === actor.userId || project.parichay_coordinator_id === actor.userId;
    if (!canView) return fail("You do not have permission to view this QR payment.", 403);
    if (!qrProjectStatuses.has(String(project.status))) return fail("QR payment is available only after booking confirmation.");

    const { payment, payload } = await ensureQrPayment(admin, project);
    if (["not_required", "pending_payment", "qr_pending", "rejected"].includes(String(project.payment_status || ""))) {
        await admin.from("projects").update({ payment_status: "qr_pending" }).eq("id", project.id);
    }
    return ok({ success: true, message: "QR payment loaded.", payment: safeQrDetails(payment, payload) });
}

async function handlePaymentProofUpload(req: NextRequest, projectId: string, actor: Actor, admin: ReturnType<typeof createAdminClient>) {
    const project = await getProject(admin, projectId);
    if (!project || project.client_id !== actor.userId) return fail("Project not found.", 404);
    if (!qrProjectStatuses.has(String(project.status))) return fail("Payment proof can be uploaded only for confirmed, in-progress, or delivered projects.");

    const formData = await req.formData();
    const file = formData.get("proof");
    if (!(file instanceof File)) return fail("Please choose a screenshot or PDF proof file.");
    if (!paymentProofTypes.has(file.type)) return fail("Upload a PNG, JPG, WebP, or PDF file.");
    if (file.size > maxPaymentProofSize) return fail("Payment proof file must be 5 MB or smaller.");

    await ensureBucket(admin, paymentProofBucket, maxPaymentProofSize, paymentProofTypes);
    const proofUrl = await uploadProofFile(admin, paymentProofBucket, actor, projectId, file);
    return ok({ success: true, message: "Payment screenshot uploaded.", proofUrl });
}

async function handlePaymentProofSubmit(req: NextRequest, projectId: string, actor: Actor, admin: ReturnType<typeof createAdminClient>) {
    const body = await readJson(req);
    const paymentReference = String(body.paymentReference || body.payment_reference || "").trim();
    const proofUrl = body.proofUrl || body.proof_url;
    if (!paymentReference) return fail("UTR/reference number is required.");

    const project = await getProject(admin, projectId);
    if (!project || project.client_id !== actor.userId) return fail("Project not found.", 404);
    if (!qrProjectStatuses.has(String(project.status))) return fail("Payment proof can be submitted only for confirmed, in-progress, or delivered projects.");

    const { payment, payload } = await ensureQrPayment(admin, project);
    const { error } = await admin.from("payments").update({
        amount: payload.amountPaise,
        status: "proof_uploaded",
        payment_reference: paymentReference,
        payment_proof_url: proofUrl ? String(proofUrl).trim() : null,
        verification_note: null,
    }).eq("id", payment.id);
    if (error) return fail("Could not submit payment proof.", 500);

    await admin.from("projects").update({ payment_status: "proof_uploaded" }).eq("id", project.id);
    const admins = await adminUsers(admin);
    await admin.from("notifications").insert([
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
    return ok({ success: true, message: "Payment proof submitted. Waiting for coordinator/admin verification." });
}

async function handleCoordinatorPayment(projectId: string, paymentId: string, actor: Actor, admin: ReturnType<typeof createAdminClient>, mode: "verify" | "reject", note: string) {
    const project = await getProject(admin, projectId);
    if (!project) return fail("Project not found.", 404);
    if (project.parichay_coordinator_id !== actor.userId) return fail("Only the assigned Parichay coordinator can review this payment.", 403);
    if (!qrProjectStatuses.has(String(project.status))) return fail("This project is not open for QR payment verification.");

    const { data: payment } = await admin.from("payments").select("id, status, payment_method").eq("id", paymentId).eq("project_id", project.id).single();
    if (!payment || payment.payment_method !== "qr_upi") return fail("QR payment not found.", 404);

    if (mode === "verify") {
        if (!verifiablePaymentStatuses.has(String(payment.status))) return fail("This payment is not waiting for verification.");
        const { error } = await admin.from("payments").update({
            status: "received",
            verified_by: actor.userId,
            verified_at: new Date().toISOString(),
            verification_note: note.trim() || "coordinator_verified",
        }).eq("id", paymentId);
        if (error) return fail("Could not verify payment.", 500);
        await admin.from("projects").update({ payment_status: "payment_received", status: "completed" }).eq("id", project.id);
        await admin.from("notifications").insert([
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
        ]);
        return ok({ success: true, message: "Payment received and verified. Project completed." });
    }

    const reason = note.trim();
    if (!reason) return fail("Rejection reason is required.");
    const { error } = await admin.from("payments").update({
        status: "rejected",
        verification_note: reason,
        verified_by: actor.userId,
        verified_at: new Date().toISOString(),
    }).eq("id", paymentId);
    if (error) return fail("Could not reject payment proof.", 500);
    await admin.from("projects").update({ payment_status: "rejected" }).eq("id", project.id);
    await admin.from("notifications").insert({
        user_id: project.client_id,
        project_id: project.id,
        creator_id: project.selected_creator_id,
        type: "qr_payment_rejected",
        title: "Payment proof rejected",
        message: "Payment proof rejected. Please submit correct UTR/reference or screenshot.",
        data: { project_id: project.id, payment_id: paymentId, cta_url: `/dashboard/${project.id}` },
    });
    return ok({ success: true, message: "Payment proof rejected." });
}

async function handleCreatorOpportunities(actor: Actor, admin: ReturnType<typeof createAdminClient>) {
    const roleError = requireRole(actor, ["creator"]);
    if (roleError) return roleError;

    const { data: invites } = await admin
        .from("project_invites")
        .select("id, project_id, status, match_reason, response_note, availability_note, created_at, viewed_at, responded_at")
        .eq("creator_id", actor.userId)
        .order("created_at", { ascending: false });
    if (!invites?.length) return ok({ opportunities: [] });

    const projectIds = invites.map((invite) => invite.project_id).filter(Boolean);
    const { data: projects } = await admin
        .from("projects")
        .select("id, title, description, booking_type, booking_location, event_date, estimated_days, budget, requirement_summary, status, created_at")
        .in("id", projectIds);
    const projectsById = new Map((projects || []).map((project) => [project.id, project]));
    return ok({
        opportunities: invites.map((invite) => {
            const project = projectsById.get(invite.project_id);
            return project ? mapOpportunity(invite, project) : null;
        }).filter(Boolean),
    });
}

async function getOpportunity(projectId: string, actor: Actor, admin: ReturnType<typeof createAdminClient>) {
    const roleError = requireRole(actor, ["creator"]);
    if (roleError) return roleError;

    const { data: invite } = await admin
        .from("project_invites")
        .select("id, project_id, status, match_reason, response_note, availability_note, created_at, viewed_at, responded_at")
        .eq("project_id", projectId)
        .eq("creator_id", actor.userId)
        .maybeSingle();

    const project = await getProject(admin, projectId);
    if (!project) return fail("Project details could not be loaded.", 404);
    if (!invite && project.creator_id !== actor.userId && project.selected_creator_id !== actor.userId) return fail("Opportunity not found or you do not have access.", 404);

    const safeInvite = invite || {
        id: `assigned-${project.id}`,
        status: "selected",
        match_reason: "You are assigned to this booking.",
        response_note: null,
        availability_note: null,
        created_at: project.created_at || new Date().toISOString(),
        viewed_at: null,
        responded_at: null,
    };
    return ok({ success: true, message: "Opportunity loaded.", opportunity: mapOpportunity(safeInvite, project) });
}

async function markOpportunityViewed(projectId: string, actor: Actor, admin: ReturnType<typeof createAdminClient>) {
    const { data: invite } = await admin
        .from("project_invites")
        .select("id, status, viewed_at")
        .eq("project_id", projectId)
        .eq("creator_id", actor.userId)
        .maybeSingle();
    if (invite) {
        const update: Record<string, string> = {};
        if (!invite.viewed_at) update.viewed_at = new Date().toISOString();
        if (invite.status === "sent") update.status = "viewed";
        if (Object.keys(update).length) await admin.from("project_invites").update(update).eq("id", invite.id);
    }
    await admin.from("notifications").update({ read: true, read_at: new Date().toISOString() }).eq("user_id", actor.userId).eq("project_id", projectId).eq("type", "booking_opportunity").eq("read", false);
    return ok({ success: true, message: "Opportunity marked as viewed." });
}

async function respondOpportunity(req: NextRequest, projectId: string, actor: Actor, admin: ReturnType<typeof createAdminClient>) {
    const body = await readJson(req);
    const status = String(body.status || "");
    if (!["interested", "declined"].includes(status)) return fail("Invalid response status.");

    const { data: invite } = await admin
        .from("project_invites")
        .select("id, project_id, creator_id, status")
        .eq("project_id", projectId)
        .eq("creator_id", actor.userId)
        .single();
    if (!invite) return fail("Opportunity not found.", 404);

    const project = await getProject(admin, projectId);
    if (!project) return fail("Project not found.", 404);
    if (!activeProjectStatuses.has(String(project.status))) return fail("This booking is no longer accepting creator responses.");

    const { error } = await admin.from("project_invites").update({
        status,
        response_note: body.responseNote?.trim() || body.response_note?.trim() || null,
        availability_note: body.availabilityNote?.trim() || body.availability_note?.trim() || null,
        responded_at: new Date().toISOString(),
    }).eq("id", invite.id).eq("creator_id", actor.userId);
    if (error) return fail("Could not save your response.", 500);

    if (status === "interested" && ["open", "matching", "receiving_interest"].includes(String(project.status))) {
        await admin.from("projects").update({ status: "client_selecting" }).eq("id", projectId);
    }
    return ok({ success: true, message: status === "interested" ? "Interest submitted successfully." : "Opportunity declined." });
}

async function handleCreatorProfile(req: NextRequest, actor: Actor, admin: ReturnType<typeof createAdminClient>, method: string) {
    const roleError = requireRole(actor, ["creator"]);
    if (roleError) return roleError;

    if (method === "GET") {
        const { data } = await admin.from("creators").select("*").eq("id", actor.userId).single();
        return ok({ success: true, message: "Creator profile loaded.", profile: data || null });
    }

    const body = await readJson(req);
    const update = {
        role: body.role,
        city: body.city,
        phone: body.phone,
        whatsapp_phone: body.whatsapp_phone || body.whatsappPhone,
        location: body.location || body.city,
        day_rate: body.day_rate || body.dayRate,
        portfolio_url: body.portfolio_url || body.portfolioUrl,
        available_for_booking: body.available_for_booking ?? body.availableForBooking,
        travel_enabled: body.travel_enabled ?? body.travelEnabled,
        budget_flexibility: body.budget_flexibility ?? body.budgetFlexibility,
        whatsapp_opt_in: body.whatsapp_opt_in ?? body.whatsappOptIn,
    };
    const cleanUpdate = Object.fromEntries(Object.entries(update).filter(([, value]) => value !== undefined && value !== ""));
    const { error } = await admin.from("creators").update(cleanUpdate).eq("id", actor.userId);
    if (error) return fail("Could not update creator profile.", 500);
    return ok({ success: true, message: "Creator profile updated." });
}

async function handleStartProject(projectId: string, actor: Actor, admin: ReturnType<typeof createAdminClient>) {
    const roleError = requireRole(actor, ["creator"]);
    if (roleError) return roleError;
    const project = await getProject(admin, projectId);
    if (!project) return fail("Project not found.", 404);
    if (project.creator_id !== actor.userId && project.selected_creator_id !== actor.userId) return fail("You can start only your assigned projects.", 403);
    if (!["funded", "confirmed"].includes(String(project.status))) return fail("Only funded or confirmed projects can be started.");
    const { error } = await admin.from("projects").update({ status: "in_progress" }).eq("id", projectId).or(`creator_id.eq.${actor.userId},selected_creator_id.eq.${actor.userId}`);
    if (error) return fail("Could not start project.", 500);
    return ok({ success: true, message: "Project moved to in progress." });
}

async function handleWorkProofUpload(req: NextRequest, projectId: string, actor: Actor, admin: ReturnType<typeof createAdminClient>) {
    const project = await getProject(admin, projectId);
    if (!project) return fail("Project not found.", 404);
    const canUpload = actor.accountType === "admin" || project.creator_id === actor.userId || project.selected_creator_id === actor.userId || project.parichay_coordinator_id === actor.userId;
    if (!canUpload) return fail("Only the assigned creator or ShotcutCrew team can upload work proof.", 403);
    if (!qrProjectStatuses.has(String(project.status))) return fail("Proof of work can be uploaded only after the booking is confirmed.");

    const formData = await req.formData();
    const file = formData.get("proof");
    if (!(file instanceof File)) return fail("Please choose a screenshot, PDF, or ZIP file.");
    if (!workProofTypes.has(file.type)) return fail("Upload a PNG, JPG, WebP, PDF, or ZIP file.");
    if (file.size > maxWorkProofSize) return fail("Proof file must be 10 MB or smaller.");

    await ensureBucket(admin, workProofBucket, maxWorkProofSize, workProofTypes);
    const proofUrl = await uploadProofFile(admin, workProofBucket, actor, projectId, file);
    return ok({ success: true, message: "Proof file uploaded.", proofUrl });
}

async function handleTimeline(req: NextRequest, projectId: string, actor: Actor, admin: ReturnType<typeof createAdminClient>, method: string) {
    const project = await getProject(admin, projectId);
    if (!project) return fail("Project not found.", 404);
    if (!isParticipant(project, actor)) return fail("You do not have access to this project timeline.", 403);

    if (method === "GET") {
        const { data: updates } = await admin.from("project_updates").select("id, project_id, user_id, title, message, status, created_at").eq("project_id", projectId).order("created_at", { ascending: false });
        return ok({ updates: updates || [] });
    }

    if (!canWriteTimeline(project, actor)) return fail("Only the selected creator or ShotcutCrew team can add timeline updates.", 403);
    if (["cancelled", "expired", "disputed"].includes(String(project.status))) return fail("Timeline updates are closed for this project.");
    const body = await readJson(req);
    const title = String(body.title || "").trim();
    const message = String(body.message || "").trim();
    const status = allowedTimelineStatuses.has(String(body.status || "")) ? String(body.status) : "update";
    if (!title) return fail("Timeline title is required.");

    const { error } = await admin.from("project_updates").insert({ project_id: projectId, user_id: actor.userId, title, message: message || null, status });
    if (error) return fail("Could not add timeline update.", 500);
    if (status === "in_progress" && project.status === "confirmed") await admin.from("projects").update({ status: "in_progress" }).eq("id", projectId);
    if (status === "delivered" && ["confirmed", "in_progress"].includes(String(project.status))) await admin.from("projects").update({ status: "delivered", delivered_at: new Date().toISOString() }).eq("id", projectId);
    return ok({ success: true, message: "Timeline update added." });
}

async function handleDisputes(req: NextRequest, projectId: string, actor: Actor, admin: ReturnType<typeof createAdminClient>, method: string) {
    const project = await getProject(admin, projectId);
    if (!project) return fail("Project not found.", 404);
    if (project.client_id !== actor.userId && project.selected_creator_id !== actor.userId) return fail("Forbidden.", 403);

    if (method === "GET") {
        const { data } = await admin.from("project_disputes").select("id, project_id, raised_by, reason, details, status, resolution, resolution_type, created_at, resolved_at").eq("project_id", projectId).order("created_at", { ascending: false });
        return ok({ disputes: data || [] });
    }

    if (project.client_id !== actor.userId) return fail("Only the client can raise a dispute.", 403);
    if (project.status !== "delivered") return fail("Disputes can be raised only after delivery.");
    const body = await readJson(req);
    const reason = String(body.reason || "").trim();
    const details = String(body.details || "").trim();
    if (!reason) return fail("Dispute reason is required.");
    const { data: existing } = await admin.from("project_disputes").select("id").eq("project_id", projectId).in("status", ["open", "under_review"]).maybeSingle();
    if (existing) return fail("An active dispute already exists for this project.");
    const { data: dispute, error } = await admin.from("project_disputes").insert({ project_id: projectId, raised_by: actor.userId, reason, details: details || null, status: "open" }).select("id").single();
    if (error || !dispute) return fail("Could not raise dispute.", 500);
    await admin.from("projects").update({ status: "disputed", payment_status: "disputed" }).eq("id", projectId).eq("client_id", actor.userId);
    await admin.from("payments").update({ status: "disputed" }).eq("project_id", projectId).in("status", ["paid", "captured"]);
    return ok({ success: true, message: "Dispute raised. Admin will review the case." });
}

async function handleCreatorProjects(actor: Actor, admin: ReturnType<typeof createAdminClient>) {
    const roleError = requireRole(actor, ["creator"]);
    if (roleError) return roleError;

    const { data } = await admin
        .from("projects")
        .select("*")
        .or(`creator_id.eq.${actor.userId},selected_creator_id.eq.${actor.userId}`)
        .order("created_at", { ascending: false });
    return ok({ projects: (data || []).map(mapProject) });
}

function requireAdmin(actor: Actor) {
    return requireRole(actor, ["admin"]);
}

async function handleAdminOverview(actor: Actor, admin: ReturnType<typeof createAdminClient>) {
    const roleError = requireAdmin(actor);
    if (roleError) return roleError;

    const [users, creators, projects, payments, disputes] = await Promise.all([
        admin.from("users").select("id", { count: "exact", head: true }),
        admin.from("creators").select("id", { count: "exact", head: true }),
        admin.from("projects").select("id", { count: "exact", head: true }),
        admin.from("payments").select("id", { count: "exact", head: true }),
        admin.from("project_disputes").select("id", { count: "exact", head: true }),
    ]);

    return ok({
        overview: {
            users: users.count || 0,
            creators: creators.count || 0,
            projects: projects.count || 0,
            payments: payments.count || 0,
            disputes: disputes.count || 0,
        },
    });
}

async function handleAdminUsers(actor: Actor, admin: ReturnType<typeof createAdminClient>, accountType?: string) {
    const roleError = requireAdmin(actor);
    if (roleError) return roleError;

    let query = admin.from("users").select("id, full_name, email, account_type, created_at").order("created_at", { ascending: false }).limit(100);
    if (accountType) query = query.eq("account_type", accountType);
    const { data, error } = await query;
    if (error) return fail("Could not load users.", 500);
    return ok({ users: data || [] });
}

async function handleAdminCreators(actor: Actor, admin: ReturnType<typeof createAdminClient>) {
    const roleError = requireAdmin(actor);
    if (roleError) return roleError;

    const { data, error } = await admin
        .from("creators")
        .select("id, slug, role, city, location, creator_type, verified, available_for_booking, day_rate, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
    if (error) return fail("Could not load creators.", 500);
    return ok({ creators: data || [] });
}

async function handleAdminCreatorVerification(actor: Actor, admin: ReturnType<typeof createAdminClient>, creatorId: string, verified: boolean) {
    const roleError = requireAdmin(actor);
    if (roleError) return roleError;

    const { error } = await admin.from("creators").update({ verified }).eq("id", creatorId);
    if (error) return fail(verified ? "Could not verify creator." : "Could not unverify creator.", 500);
    await admin.from("audit_logs").insert({
        admin_id: actor.userId,
        action: verified ? "mobile_creator_verified" : "mobile_creator_unverified",
        target_id: creatorId,
        metadata: { creator_id: creatorId, verified },
        ip_address: "mobile-api",
    });
    return ok({ success: true, message: verified ? "Creator verified." : "Creator unverified." });
}

async function handleAdminProjects(actor: Actor, admin: ReturnType<typeof createAdminClient>) {
    const roleError = requireAdmin(actor);
    if (roleError) return roleError;

    const { data, error } = await admin.from("projects").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) return fail("Could not load projects.", 500);
    return ok({ projects: (data || []).map(mapProject) });
}

async function handleAdminProject(actor: Actor, admin: ReturnType<typeof createAdminClient>, projectId: string) {
    const roleError = requireAdmin(actor);
    if (roleError) return roleError;

    const project = await getProject(admin, projectId);
    if (!project) return fail("Project not found.", 404);
    return ok({ project: mapProject(project) });
}

async function handleAdminProjectInvites(actor: Actor, admin: ReturnType<typeof createAdminClient>, projectId: string) {
    const roleError = requireAdmin(actor);
    if (roleError) return roleError;

    const { data, error } = await admin
        .from("project_invites")
        .select("id, project_id, creator_id, status, match_reason, response_note, availability_note, viewed_at, responded_at, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
    if (error) return fail("Could not load project invites.", 500);
    return ok({ invites: data || [] });
}

async function handleAdminPayments(actor: Actor, admin: ReturnType<typeof createAdminClient>) {
    const roleError = requireAdmin(actor);
    if (roleError) return roleError;

    const { data, error } = await admin
        .from("payments")
        .select("id, project_id, client_id, creator_id, coordinator_id, amount, currency, status, payment_method, payment_reference, payment_proof_url, verification_note, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
    if (error) return fail("Could not load payments.", 500);
    return ok({ payments: data || [] });
}

async function handleAdminPaymentReview(req: NextRequest, actor: Actor, admin: ReturnType<typeof createAdminClient>, paymentId: string, mode: "verify" | "reject") {
    const roleError = requireAdmin(actor);
    if (roleError) return roleError;

    const body = await readJson(req);
    const note = String(body.verificationNote || body.verification_note || body.reason || "").trim();
    const { data: payment } = await admin
        .from("payments")
        .select("id, project_id, status, payment_method")
        .eq("id", paymentId)
        .single();
    if (!payment) return fail("Payment not found.", 404);
    if (mode === "verify" && !verifiablePaymentStatuses.has(String(payment.status))) return fail("This payment is not waiting for verification.");
    if (mode === "reject" && !note) return fail("Rejection reason is required.");

    const { error } = await admin.from("payments").update({
        status: mode === "verify" ? "received" : "rejected",
        verified_by: actor.userId,
        verified_at: new Date().toISOString(),
        verification_note: note || "admin_verified",
    }).eq("id", paymentId);
    if (error) return fail(mode === "verify" ? "Could not verify payment." : "Could not reject payment.", 500);

    if (payment.project_id) {
        await admin.from("projects").update({
            payment_status: mode === "verify" ? "payment_received" : "rejected",
            ...(mode === "verify" ? { status: "completed" } : {}),
        }).eq("id", payment.project_id);
    }

    return ok({ success: true, message: mode === "verify" ? "Payment verified." : "Payment rejected." });
}

async function handleAdminDisputes(actor: Actor, admin: ReturnType<typeof createAdminClient>) {
    const roleError = requireAdmin(actor);
    if (roleError) return roleError;

    const { data, error } = await admin
        .from("project_disputes")
        .select("id, project_id, raised_by, reason, details, status, resolution, resolution_type, created_at, resolved_at")
        .order("created_at", { ascending: false })
        .limit(100);
    if (error) return fail("Could not load disputes.", 500);
    return ok({ disputes: data || [] });
}

async function handleAdminDisputeUpdate(req: NextRequest, actor: Actor, admin: ReturnType<typeof createAdminClient>, disputeId: string, mode: "under_review" | "resolve") {
    const roleError = requireAdmin(actor);
    if (roleError) return roleError;

    const body = await readJson(req);
    if (mode === "under_review") {
        const { error } = await admin.from("project_disputes").update({ status: "under_review" }).eq("id", disputeId);
        if (error) return fail("Could not mark dispute under review.", 500);
        return ok({ success: true, message: "Dispute marked under review." });
    }

    const resolution = String(body.resolution || "").trim();
    const resolutionType = String(body.resolutionType || body.resolution_type || "admin_resolved").trim();
    if (!resolution) return fail("Resolution note is required.");
    const { data: dispute, error } = await admin
        .from("project_disputes")
        .update({
            status: "resolved",
            resolution,
            resolution_type: resolutionType,
            resolved_at: new Date().toISOString(),
        })
        .eq("id", disputeId)
        .select("project_id")
        .single();
    if (error || !dispute) return fail("Could not resolve dispute.", 500);
    await admin.from("projects").update({ status: "completed", payment_status: "payment_received" }).eq("id", dispute.project_id);
    return ok({ success: true, message: "Dispute resolved." });
}

async function handleCancel(projectId: string, req: NextRequest, actor: Actor, admin: ReturnType<typeof createAdminClient>) {
    const roleError = requireRole(actor, ["client"]);
    if (roleError) return roleError;
    const body = await readJson(req);
    const project = await getProject(admin, projectId);
    if (!project || project.client_id !== actor.userId) return fail("Project not found.", 404);
    if (!isClientProjectCancellable(project.status, project.payment_status || null, project.selected_creator_id || null)) return fail("This booking can no longer be cancelled.");
    const { data: paymentRows } = await admin.from("payments").select("id").eq("project_id", projectId).in("status", ["captured", "paid", "received", "released", "payment_received"]);
    if (paymentRows?.length) return fail("This booking has a received payment and cannot be cancelled here.");
    const { data: activeInvites } = await admin.from("project_invites").select("id, creator_id").eq("project_id", projectId).in("status", ["sent", "viewed", "interested", "shortlisted", "selected"]);
    const { error } = await admin.from("projects").update({ status: "cancelled" }).eq("id", projectId).eq("client_id", actor.userId);
    if (error) return fail("Could not cancel this booking.", 500);
    await admin.from("project_invites").update({ status: "inactive" }).eq("project_id", projectId).in("status", ["sent", "viewed", "interested", "shortlisted", "selected"]);
    const creatorIds = Array.from(new Set((activeInvites || []).map((invite) => invite.creator_id).filter(Boolean)));
    if (creatorIds.length) {
        await admin.from("notifications").insert(creatorIds.map((creatorId) => ({
            user_id: creatorId,
            project_id: project.id,
            creator_id: creatorId,
            type: "booking_cancelled",
            title: "Booking cancelled",
            message: `The client cancelled ${project.title}. This booking is no longer accepting responses.`,
            data: { project_id: project.id, cta_url: "/creator-dashboard" },
        })));
    }
    await admin.from("audit_logs").insert({ admin_id: actor.userId, action: "client_project_cancelled", target_id: projectId, metadata: { project_id: projectId, reason: String(body.reason || "").trim() || null }, ip_address: "mobile-api" });
    return ok({ success: true, message: "Booking cancelled. Invited creators can no longer respond." });
}

async function dispatch(req: NextRequest, context: RouteContext, method: string) {
    const parts = await routeParts(context);

    if (method === "POST" && parts.join("/") === "auth/signup") return handleSignup(req);
    if (method === "POST" && parts.join("/") === "auth/resend-verification") return handleResend(req);

    const auth = await requireActor(req);
    if (isResponse(auth)) return auth;
    const { actor } = auth;

    if (method === "GET" && parts.join("/") === "me") {
        return ok({ success: true, message: "Profile loaded.", profile: { id: actor.userId, full_name: actor.fullName, email: actor.email, account_type: actor.accountType } });
    }

    let admin: ReturnType<typeof createAdminClient>;
    try {
        admin = createAdminClient();
    } catch {
        return fail("Server authentication is not configured. Please contact support.", 500);
    }

    if (method === "POST" && parts.join("/") === "bookings") return handleCreateBooking(req, actor, admin);

    if (method === "GET" && parts.join("/") === "client/projects") {
        const roleError = requireRole(actor, ["client"]);
        if (roleError) return roleError;
        const { data } = await admin.from("projects").select("*").eq("client_id", actor.userId).order("created_at", { ascending: false });
        return ok({ projects: (data || []).map(mapProject) });
    }

    if (method === "GET" && parts[0] === "client" && parts[1] === "projects" && parts[2]) {
        const roleError = requireRole(actor, ["client"]);
        if (roleError) return roleError;
        const project = await getProject(admin, parts[2]);
        if (!project || project.client_id !== actor.userId) return fail("Project not found.", 404);
        return ok({ project: mapProject(project) });
    }

    if (method === "GET" && parts.join("/") === "creator/opportunities") return handleCreatorOpportunities(actor, admin);
    if (method === "GET" && parts.join("/") === "creator/projects") return handleCreatorProjects(actor, admin);
    if (parts[0] === "creator" && parts[1] === "opportunities" && parts[2]) {
        if (method === "GET" && parts.length === 3) return getOpportunity(parts[2], actor, admin);
        if (method === "POST" && parts[3] === "view") return markOpportunityViewed(parts[2], actor, admin);
        if (method === "POST" && parts[3] === "respond") return respondOpportunity(req, parts[2], actor, admin);
    }

    if (parts.join("/") === "creator/profile" && (method === "GET" || method === "PATCH")) return handleCreatorProfile(req, actor, admin, method);

    if (parts[0] === "projects" && parts[1]) {
        const projectId = parts[1];
        if (method === "POST" && parts[2] === "cancel") return handleCancel(projectId, req, actor, admin);
        if (method === "GET" && parts[2] === "selection") return handleSelection(projectId, actor, admin);
        if (method === "POST" && parts[2] === "shortlist") {
            const body = await readJson(req);
            return updateInviteSelection(projectId, String(body.inviteId || body.invite_id || ""), actor, admin, "shortlist");
        }
        if (method === "POST" && parts[2] === "select-creator") {
            const body = await readJson(req);
            return updateInviteSelection(projectId, String(body.inviteId || body.invite_id || ""), actor, admin, "select");
        }
        if (method === "GET" && parts[2] === "qr-payment") return handleQrPayment(projectId, actor, admin);
        if (method === "POST" && parts[2] === "payment-proof" && parts[3] === "upload") return handlePaymentProofUpload(req, projectId, actor, admin);
        if (method === "POST" && parts[2] === "payment-proof" && parts[3] === "submit") return handlePaymentProofSubmit(req, projectId, actor, admin);
        if ((method === "GET" || method === "POST") && parts[2] === "disputes") return handleDisputes(req, projectId, actor, admin, method);
        if (method === "POST" && parts[2] === "start") return handleStartProject(projectId, actor, admin);
        if (method === "POST" && parts[2] === "work-proof" && parts[3] === "upload") return handleWorkProofUpload(req, projectId, actor, admin);
        if ((method === "GET" || method === "POST") && parts[2] === "timeline") return handleTimeline(req, projectId, actor, admin, method);
    }

    if (method === "GET" && parts.join("/") === "notifications") {
        const { data } = await admin.from("notifications").select("id, project_id, type, title, message, data, read, created_at").eq("user_id", actor.userId).order("created_at", { ascending: false }).limit(30);
        return ok({
            notifications: (data || []).map((notification) => ({
                id: String(notification.id),
                project_id: (notification.project_id as string | null) || null,
                type: String(notification.type || ""),
                title: String(notification.title || "Notification"),
                message: String(notification.message || ""),
                read: Boolean(notification.read),
                created_at: String(notification.created_at),
                cta_url: typeof (notification.data as Record<string, unknown> | null)?.cta_url === "string" ? (notification.data as Record<string, string>).cta_url : null,
            })),
        });
    }

    if (method === "POST" && parts[0] === "notifications" && parts[1] && parts[2] === "read") {
        const { error } = await admin.from("notifications").update({ read: true, read_at: new Date().toISOString() }).eq("id", parts[1]).eq("user_id", actor.userId);
        if (error) return fail("Could not update notification.", 500);
        return ok({ success: true, message: "Notification marked as read." });
    }

    if (method === "GET" && parts.join("/") === "parichay/projects") {
        const { data } = await admin.from("projects").select("*").eq("parichay_coordinator_id", actor.userId).order("created_at", { ascending: false });
        return ok({ projects: (data || []).map(mapProject) });
    }

    if (parts[0] === "parichay" && parts[1] === "projects" && parts[2]) {
        const projectId = parts[2];
        if (method === "GET" && parts.length === 3) {
            const project = await getProject(admin, projectId);
            if (!project || project.parichay_coordinator_id !== actor.userId) return fail("Project not found.", 404);
            return ok({ project: mapProject(project) });
        }
        if (method === "POST" && parts[3] === "payment" && parts[4] === "verify") {
            const body = await readJson(req);
            return handleCoordinatorPayment(projectId, String(body.paymentId || body.payment_id || ""), actor, admin, "verify", String(body.verificationNote || body.verification_note || ""));
        }
        if (method === "POST" && parts[3] === "payment" && parts[4] === "reject") {
            const body = await readJson(req);
            return handleCoordinatorPayment(projectId, String(body.paymentId || body.payment_id || ""), actor, admin, "reject", String(body.reason || ""));
        }
    }

    if (parts[0] === "admin") {
        if (method === "GET" && parts[1] === "overview") return handleAdminOverview(actor, admin);
        if (method === "GET" && parts[1] === "users") return handleAdminUsers(actor, admin);
        if (method === "GET" && parts[1] === "clients") return handleAdminUsers(actor, admin, "client");
        if (method === "GET" && parts[1] === "creators" && parts.length === 2) return handleAdminCreators(actor, admin);
        if (method === "POST" && parts[1] === "creators" && parts[2] && parts[3] === "verify") return handleAdminCreatorVerification(actor, admin, parts[2], true);
        if (method === "POST" && parts[1] === "creators" && parts[2] && parts[3] === "unverify") return handleAdminCreatorVerification(actor, admin, parts[2], false);
        if (method === "GET" && parts[1] === "projects" && parts.length === 2) return handleAdminProjects(actor, admin);
        if (method === "GET" && parts[1] === "projects" && parts[2] && parts.length === 3) return handleAdminProject(actor, admin, parts[2]);
        if (method === "GET" && parts[1] === "projects" && parts[2] && parts[3] === "invites") return handleAdminProjectInvites(actor, admin, parts[2]);
        if (method === "GET" && parts[1] === "payments") return handleAdminPayments(actor, admin);
        if (method === "POST" && parts[1] === "payments" && parts[2] && parts[3] === "verify") return handleAdminPaymentReview(req, actor, admin, parts[2], "verify");
        if (method === "POST" && parts[1] === "payments" && parts[2] && parts[3] === "reject") return handleAdminPaymentReview(req, actor, admin, parts[2], "reject");
        if (method === "GET" && parts[1] === "disputes") return handleAdminDisputes(actor, admin);
        if (method === "POST" && parts[1] === "disputes" && parts[2] && parts[3] === "under-review") return handleAdminDisputeUpdate(req, actor, admin, parts[2], "under_review");
        if (method === "POST" && parts[1] === "disputes" && parts[2] && parts[3] === "resolve") return handleAdminDisputeUpdate(req, actor, admin, parts[2], "resolve");
        if (method === "GET" && parts[1] === "analytics") return handleAdminOverview(actor, admin);
    }

    return fail("Mobile API route not found.", 404);
}

export async function GET(req: NextRequest, context: RouteContext) {
    return dispatch(req, context, "GET");
}

export async function POST(req: NextRequest, context: RouteContext) {
    return dispatch(req, context, "POST");
}

export async function PATCH(req: NextRequest, context: RouteContext) {
    return dispatch(req, context, "PATCH");
}

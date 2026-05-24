"use server";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { matchCreators, type BookingType } from "@/lib/matching/matchCreators";
import { matchEquipmentVendors } from "@/lib/matching/matchEquipmentVendors";
import { revalidatePath } from "next/cache";

export type CreateBookingInput = {
    bookingType: BookingType;
    bookingLocation?: string | null;
    eventDate?: string | null;
    eventType?: string | null;
    customEventType?: string | null;
    crewRequirements?: Record<string, number> | null;
    equipmentRequirements?: Record<string, number | boolean> | null;
    postProductionRequirements?: Record<string, number | boolean> | null;
    equipmentOperatorRequired?: boolean;
    estimatedDays?: number | null;
    requirementSummary?: string | null;
    budget: number;
    title: string;
    description: string;
    initialStatus?: "receiving_interest" | "submitted" | "pending_review" | "open_for_quotes" | "checking_availability";
    notificationType?: string;
    notificationTitle?: string;
    notificationMessage?: string;
};

type CreateBookingResult = {
    success: boolean;
    project_id?: string;
    match_count?: number;
    message: string;
};

function getRequiredEnv(name: string) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not configured`);
    }
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

function validateBookingInput(input: CreateBookingInput) {
    const title = input.title?.trim();
    const description = input.description?.trim();
    const budget = Number(input.budget);
    const estimatedDays = Math.max(1, Number(input.estimatedDays || 1));

    if (!input.bookingType) {
        throw new Error("Booking type is required.");
    }

    if (!title || title.length < 3) {
        throw new Error("Booking title is required.");
    }

    if (!description || description.length < 10) {
        throw new Error("Booking description is required.");
    }

    if (!Number.isFinite(budget) || budget < 0) {
        throw new Error("A valid booking budget is required.");
    }

    if (!Number.isInteger(estimatedDays) || estimatedDays < 1) {
        throw new Error("Estimated days must be at least 1.");
    }

    if (input.eventDate && Number.isNaN(new Date(input.eventDate).getTime())) {
        throw new Error("Event date is invalid.");
    }

    const cleanCrewRequirements = Object.fromEntries(
        Object.entries(input.crewRequirements || {})
            .map(([key, value]) => [key, Math.max(0, Number(value || 0))])
            .filter(([key, value]) => Boolean(key) && Number(value) > 0)
    ) as Record<string, number>;

    const cleanRequirementMap = (value?: Record<string, number | boolean> | null) => {
        return Object.fromEntries(
            Object.entries(value || {}).filter(([key, selected]) => Boolean(key) && (selected === true || Number(selected) > 0))
        ) as Record<string, number | boolean>;
    };

    return {
        bookingType: input.bookingType,
        bookingLocation: input.bookingLocation?.trim() || null,
        eventDate: input.eventDate || null,
        eventType: input.eventType?.trim() || null,
        customEventType: input.customEventType?.trim() || null,
        crewRequirements: cleanCrewRequirements,
        equipmentRequirements: cleanRequirementMap(input.equipmentRequirements),
        postProductionRequirements: cleanRequirementMap(input.postProductionRequirements),
        equipmentOperatorRequired: input.equipmentOperatorRequired === true,
        estimatedDays,
        requirementSummary: input.requirementSummary?.trim() || description,
        budget,
        title,
        description,
        initialStatus: input.initialStatus || "receiving_interest",
        notificationType: input.notificationType || "booking_opportunity",
        notificationTitle: input.notificationTitle || "New booking opportunity",
        notificationMessage: input.notificationMessage?.trim() || null,
    };
}

async function notifyEquipmentVendors(
    admin: ReturnType<typeof createAdminClient>,
    projectId: string,
    booking: ReturnType<typeof validateBookingInput>
) {
    const matches = await matchEquipmentVendors(admin, {
        projectId,
        bookingLocation: booking.bookingLocation,
        equipmentRequirements: booking.equipmentRequirements,
        operatorRequired: booking.equipmentOperatorRequired,
    });

    let responseCount = 0;
    for (const match of matches) {
        const { data: response, error: responseError } = await admin
            .from("equipment_rental_responses")
            .insert({
                project_id: projectId,
                provider_id: match.providerId,
                status: "sent",
                match_reason: match.matchReason,
                match_score: match.matchScore,
            })
            .select("id")
            .single();

        if (responseError || !response) {
            console.error("Equipment rental response creation error:", responseError);
            continue;
        }

        const { error: notificationError } = await admin
            .from("notifications")
            .insert({
                user_id: match.userId,
                project_id: projectId,
                type: "equipment_rental_request",
                title: "New equipment rental request",
                message: "New equipment rental request. Confirm availability and quote.",
                data: {
                    project_id: projectId,
                    response_id: response.id,
                    cta_url: "/vendor-dashboard",
                    booking_location: booking.bookingLocation,
                    event_date: booking.eventDate,
                },
            });

        if (notificationError) {
            console.error("Equipment vendor notification creation error:", notificationError);
        }

        responseCount += 1;
    }

    return responseCount;
}

function formatNotificationMessage(input: ReturnType<typeof validateBookingInput>) {
    if (input.notificationMessage) return input.notificationMessage;

    const parts = [
        input.bookingType.replace(/_/g, " "),
        input.bookingLocation ? `in ${input.bookingLocation}` : null,
        input.eventDate ? `on ${input.eventDate}` : null,
        `budget Rs ${input.budget.toLocaleString("en-IN")}`,
    ].filter(Boolean);

    return `A new ${parts.join(" ")} is available.`;
}

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
    try {
        const booking = validateBookingInput(input);
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, message: "You must be logged in to create a booking." };
        }

        const { data: profile, error: profileError } = await supabase
            .from("users")
            .select("account_type")
            .eq("id", user.id)
            .single();

        if (profileError || profile?.account_type !== "client") {
            return { success: false, message: "Only client accounts can create bookings." };
        }

        const admin = createAdminClient();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();

        const { data: project, error: projectError } = await admin
            .from("projects")
            .insert({
                client_id: user.id,
                title: booking.title,
                description: booking.description,
                budget: booking.budget,
                status: booking.initialStatus,
                payment_status: "not_required",
                booking_type: booking.bookingType,
                booking_location: booking.bookingLocation,
                event_type: booking.eventType,
                custom_event_type: booking.customEventType,
                crew_requirements: booking.crewRequirements,
                equipment_requirements: booking.equipmentRequirements,
                post_production_requirements: booking.postProductionRequirements,
                event_date: booking.eventDate,
                estimated_days: booking.estimatedDays,
                requirement_summary: booking.requirementSummary,
                expires_at: expiresAt,
            })
            .select("id, created_at")
            .single();

        if (projectError || !project) {
            console.error("Booking project creation error:", projectError);
            return { success: false, message: "Could not create booking. Please try again." };
        }

        if (booking.bookingType === "equipment") {
            const responseCount = await notifyEquipmentVendors(admin, project.id, booking);
            revalidatePath("/dashboard");

            return {
                success: true,
                project_id: project.id,
                match_count: responseCount,
                message: "Rental request submitted. Verified equipment vendors are being notified.",
            };
        }

        let matches;
        try {
            matches = await matchCreators(admin, {
                projectId: project.id,
                bookingType: booking.bookingType,
                bookingLocation: booking.bookingLocation,
                eventDate: booking.eventDate,
                bookingCreatedAt: project.created_at,
                budget: booking.budget,
                estimatedDays: booking.estimatedDays,
                requirementSummary: booking.requirementSummary,
            });
        } catch (error) {
            console.error("Creator matching error:", error);
            revalidatePath("/dashboard");
            return {
                success: true,
                project_id: project.id,
                match_count: 0,
                message: "Booking created successfully. We are notifying matched verified creators.",
            };
        }

        let inviteCount = 0;
        const notificationMessage = formatNotificationMessage(booking);

        for (const match of matches) {
            const { data: invite, error: inviteError } = await admin
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

            if (inviteError || !invite) {
                console.error("Project invite creation error:", inviteError);
                continue;
            }

            const { error: notificationError } = await admin
                .from("notifications")
                .insert({
                    user_id: match.creatorId,
                    project_id: project.id,
                    creator_id: match.creatorId,
                    type: booking.notificationType,
                    title: booking.notificationTitle,
                    message: notificationMessage,
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

            if (notificationError) {
                console.error("Booking notification creation error:", notificationError);
                await admin
                    .from("project_invites")
                    .update({ notification_status: "failed" })
                    .eq("id", invite.id);
            } else {
                inviteCount += 1;
                await admin
                    .from("project_invites")
                    .update({ notification_status: "created" })
                    .eq("id", invite.id);
            }
        }

        revalidatePath("/dashboard");

        return {
            success: true,
            project_id: project.id,
            match_count: inviteCount,
            message: "Booking created successfully. We are notifying matched verified creators.",
        };
    } catch (error) {
        console.error("Create booking error:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Could not create booking. Please try again.",
        };
    }
}

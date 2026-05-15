"use server";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { matchCreators, type BookingType } from "@/lib/matching/matchCreators";
import { revalidatePath } from "next/cache";

export type CreateBookingInput = {
    bookingType: BookingType;
    bookingLocation?: string | null;
    eventDate?: string | null;
    estimatedDays?: number | null;
    requirementSummary?: string | null;
    budget: number;
    title: string;
    description: string;
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

    if (!Number.isFinite(budget) || budget <= 0) {
        throw new Error("A valid booking budget is required.");
    }

    if (!Number.isInteger(estimatedDays) || estimatedDays < 1) {
        throw new Error("Estimated days must be at least 1.");
    }

    if (input.eventDate && Number.isNaN(new Date(input.eventDate).getTime())) {
        throw new Error("Event date is invalid.");
    }

    return {
        bookingType: input.bookingType,
        bookingLocation: input.bookingLocation?.trim() || null,
        eventDate: input.eventDate || null,
        estimatedDays,
        requirementSummary: input.requirementSummary?.trim() || description,
        budget,
        title,
        description,
    };
}

function formatNotificationMessage(input: ReturnType<typeof validateBookingInput>) {
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

        if (projectError || !project) {
            console.error("Booking project creation error:", projectError);
            return { success: false, message: "Could not create booking. Please try again." };
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
                    type: "booking_opportunity",
                    title: "New booking opportunity",
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

import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { markBookingPaymentHeld, upsertProjectBookingFinancials } from "@/lib/payments/bookingFinance";

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

function safeCompareHex(a: string, b: string) {
    const left = Buffer.from(a, "hex");
    const right = Buffer.from(b, "hex");
    return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function POST(req: Request) {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, projectId } = await req.json();

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !projectId) {
            return NextResponse.json({ error: "Missing payment verification fields" }, { status: 400 });
        }

        const generatedSignature = crypto
            .createHmac("sha256", getRequiredEnv("RAZORPAY_KEY_SECRET"))
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (!safeCompareHex(generatedSignature, razorpay_signature)) {
            return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const admin = createAdminClient();

        const { data: paymentIntent, error: paymentLookupError } = await admin
            .from("payments")
            .select("id, amount, project_id, client_id, creator_id, status, payment_type")
            .eq("razorpay_order_id", razorpay_order_id)
            .eq("project_id", projectId)
            .eq("client_id", user.id)
            .single();

        if (paymentLookupError || !paymentIntent) {
            return NextResponse.json({ error: "Payment intent not found" }, { status: 404 });
        }

        if (paymentIntent.status !== "pending" || paymentIntent.payment_type !== "advance") {
            return NextResponse.json({ error: "Payment intent has already been processed" }, { status: 409 });
        }

        const { data: project, error: projectLookupError } = await admin
            .from("projects")
            .select("id, title, client_id, selected_creator_id, budget, status, payment_status, booking_type")
            .eq("id", projectId)
            .eq("client_id", user.id)
            .single();

        if (projectLookupError || !project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        if (project.status !== "pending_payment" || project.payment_status !== "pending_payment") {
            return NextResponse.json({ error: "Project is not awaiting advance payment" }, { status: 400 });
        }

        if (!project.selected_creator_id || project.selected_creator_id !== paymentIntent.creator_id) {
            return NextResponse.json({ error: "Selected creator does not match payment intent" }, { status: 400 });
        }

        if (paymentIntent.amount !== Math.round(Number(project.budget || 0) * 100)) {
            return NextResponse.json({ error: "Payment amount does not match project budget" }, { status: 400 });
        }

        const now = new Date().toISOString();

        const { error: paymentError } = await admin
            .from("payments")
            .update({
                razorpay_payment_id,
                razorpay_signature,
                status: "paid",
                payment_type: "advance",
                paid_at: now,
            })
            .eq("id", paymentIntent.id)
            .eq("status", "pending");

        if (paymentError) {
            console.error("Advance payment update error:", paymentError);
            return NextResponse.json({ error: "Failed to update payment record" }, { status: 500 });
        }

        // Internal escrow-ready status only: payment has been collected normally through Razorpay.
        // TODO future Razorpay Route:
        // - onboard creator/vendor linked accounts
        // - calculate platform commission
        // - split payment or create transfer after approval
        // - handle refunds/reversals
        // - implement actual escrow/settlement release
        // - add admin payout dashboard
        const { error: projectError } = await admin
            .from("projects")
            .update({
                status: "confirmed",
                payment_status: "escrowed",
                razorpay_order_id,
                payment_id: razorpay_payment_id,
                payment_signature: razorpay_signature,
            })
            .eq("id", projectId)
            .eq("client_id", user.id)
            .eq("status", "pending_payment");

        if (projectError) {
            console.error("Advance project update error:", projectError);
            return NextResponse.json({ error: "Failed to confirm booking" }, { status: 500 });
        }

        await upsertProjectBookingFinancials(admin, {
            id: project.id,
            client_id: project.client_id,
            selected_creator_id: project.selected_creator_id,
            creator_id: paymentIntent.creator_id,
            budget: project.budget,
            booking_type: project.booking_type,
        });
        await markBookingPaymentHeld(admin, project.id, project.booking_type === "equipment" ? "equipment_rental" : "custom_project");

        const notifications = [
            {
                user_id: project.selected_creator_id,
                project_id: projectId,
                creator_id: project.selected_creator_id,
                type: "advance_payment_received",
                title: "Payment received",
                message: "Client completed advance payment. Booking is now confirmed.",
                data: {
                    project_id: projectId,
                    cta_url: `/opportunities/${projectId}`,
                },
            },
            {
                user_id: user.id,
                project_id: projectId,
                creator_id: project.selected_creator_id,
                type: "payment_confirmed",
                title: "Payment successful",
                message: "Your booking is confirmed.",
                data: {
                    project_id: projectId,
                    cta_url: `/dashboard/${projectId}`,
                },
            },
        ];

        const { error: notificationError } = await admin
            .from("notifications")
            .insert(notifications);

        if (notificationError) {
            console.error("Advance payment notification error:", notificationError);
        }

        return NextResponse.json({ success: true, message: "Advance payment verified. Booking confirmed." });
    } catch (error) {
        console.error("Advance payment verification error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

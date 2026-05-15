import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

function getRequiredEnv(name: string) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not configured`);
    }
    return value;
}

function getRazorpayKeyId() {
    return process.env.RAZORPAY_KEY_ID || getRequiredEnv("NEXT_PUBLIC_RAZORPAY_KEY_ID");
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

export async function POST(req: Request) {
    try {
        const { projectId } = await req.json();

        if (!projectId) {
            return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const admin = createAdminClient();
        const { data: project, error: projectError } = await admin
            .from("projects")
            .select("id, title, budget, client_id, selected_creator_id, status, payment_status")
            .eq("id", projectId)
            .single();

        if (projectError || !project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        if (project.client_id !== user.id) {
            return NextResponse.json({ error: "Unauthorized to pay for this project" }, { status: 403 });
        }

        if (project.status !== "pending_payment" || project.payment_status !== "pending_payment") {
            return NextResponse.json({ error: "Project is not awaiting advance payment" }, { status: 400 });
        }

        if (!project.selected_creator_id) {
            return NextResponse.json({ error: "Creator selection is required before payment" }, { status: 400 });
        }

        const amountInPaise = Math.round(Number(project.budget || 0) * 100);
        if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) {
            return NextResponse.json({ error: "Project budget is invalid" }, { status: 400 });
        }

        const razorpay = new Razorpay({
            key_id: getRazorpayKeyId(),
            key_secret: getRequiredEnv("RAZORPAY_KEY_SECRET"),
        });

        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: "INR",
            receipt: `advance_${String(projectId).substring(0, 20)}`,
            notes: {
                projectId,
                clientId: user.id,
                creatorId: project.selected_creator_id,
                paymentType: "advance",
            },
        });

        if (!order) {
            return NextResponse.json({ error: "Failed to create Razorpay order" }, { status: 500 });
        }

        const { error: paymentError } = await admin
            .from("payments")
            .insert({
                project_id: projectId,
                client_id: user.id,
                creator_id: project.selected_creator_id,
                razorpay_order_id: order.id,
                amount: amountInPaise,
                currency: "INR",
                status: "pending",
                payment_type: "advance",
            });

        if (paymentError) {
            console.error("Advance payment intent insert error:", paymentError);
            return NextResponse.json({ error: "Failed to log payment intent" }, { status: 500 });
        }

        return NextResponse.json({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key: getRequiredEnv("NEXT_PUBLIC_RAZORPAY_KEY_ID"),
        });
    } catch (error) {
        console.error("Advance order creation error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
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

export async function POST(req: NextRequest) {
    try {
        const razorpay = new Razorpay({
            key_id: getRazorpayKeyId(),
            key_secret: getRequiredEnv("RAZORPAY_KEY_SECRET"),
        });

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { projectId } = await req.json();

        if (!projectId) {
            return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
        }

        // Fetch project details to get budget
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('budget, client_id, status')
            .eq('id', projectId)
            .single();

        if (projectError || !project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        if (project.client_id !== user.id) {
            return NextResponse.json({ error: "Unauthorized to fund this project" }, { status: 403 });
        }

        if (project.status !== 'pending') {
            return NextResponse.json({ error: "Project is already funded or cancelled" }, { status: 400 });
        }

        // Razorpay amount is in minimum unit (paise for INR)
        const amountInPaise = Math.round(project.budget * 100);

        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: `receipt_proj_${projectId.substring(0, 8)}`,
            notes: {
                projectId: projectId,
                clientId: user.id
            }
        };

        const order = await razorpay.orders.create(options);

        if (!order) {
            return NextResponse.json({ error: "Failed to create Razorpay order" }, { status: 500 });
        }

        // Save payment intent in Supabase
        const { error: paymentError } = await supabase
            .from('payments')
            .insert({
                project_id: projectId,
                client_id: user.id,
                razorpay_order_id: order.id,
                amount: amountInPaise,
                status: 'created'
            });

        if (paymentError) {
            console.error("Payment insert error:", paymentError);
            return NextResponse.json({ error: "Failed to log payment intent" }, { status: 500 });
        }

        return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency }, { status: 200 });
    } catch (error) {
        console.error("Order creation error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

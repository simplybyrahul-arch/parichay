import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

function getRequiredEnv(name: string) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not configured`);
    }
    return value;
}

function safeCompareHex(a: string, b: string) {
    const left = Buffer.from(a, "hex");
    const right = Buffer.from(b, "hex");
    return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function POST(req: NextRequest) {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, projectId } = await req.json();

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !projectId) {
            return NextResponse.json({ error: "Missing payment verification fields" }, { status: 400 });
        }

        const secret = getRequiredEnv("RAZORPAY_KEY_SECRET");

        // Create signature based on Razorpay docs
        // sha256(order_id + "|" + payment_id, secret)
        const generated_signature = crypto
            .createHmac("sha256", secret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        const isAuthentic = safeCompareHex(generated_signature, razorpay_signature);

        if (!isAuthentic) {
            return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
        }

        const supabase = await createClient();

        // Verify user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabaseAdmin = createSupabaseClient(
            getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
            getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        );

        const { data: paymentIntent, error: paymentLookupError } = await supabaseAdmin
            .from('payments')
            .select('id, amount, project_id, client_id, status')
            .eq('razorpay_order_id', razorpay_order_id)
            .eq('project_id', projectId)
            .eq('client_id', user.id)
            .single();

        if (paymentLookupError || !paymentIntent) {
            return NextResponse.json({ error: "Payment intent not found" }, { status: 404 });
        }

        if (paymentIntent.status !== 'created') {
            return NextResponse.json({ error: "Payment intent has already been processed" }, { status: 409 });
        }

        const { data: project, error: projectLookupError } = await supabaseAdmin
            .from('projects')
            .select('id, client_id, budget, status')
            .eq('id', projectId)
            .eq('client_id', user.id)
            .single();

        if (projectLookupError || !project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        if (project.status !== 'pending') {
            return NextResponse.json({ error: "Project is not awaiting funding" }, { status: 400 });
        }

        if (paymentIntent.amount !== Math.round(project.budget * 100)) {
            return NextResponse.json({ error: "Payment amount does not match project budget" }, { status: 400 });
        }

        // Update payment record
        const { error: paymentError } = await supabaseAdmin
            .from('payments')
            .update({
                razorpay_payment_id: razorpay_payment_id,
                razorpay_signature: razorpay_signature,
                status: 'captured'
            })
            .eq('id', paymentIntent.id)
            .eq('status', 'created');

        if (paymentError) {
            console.error("Payment update error:", paymentError);
            return NextResponse.json({ error: "Failed to update payment record" }, { status: 500 });
        }

        // Update project status to 'funded'
        const { error: projectError } = await supabaseAdmin
            .from('projects')
            .update({
                status: 'funded',
                razorpay_order_id: razorpay_order_id,
                payment_id: razorpay_payment_id,
                payment_signature: razorpay_signature
            })
            .eq('id', projectId)
            .eq('client_id', user.id)
            .eq('status', 'pending');

        if (projectError) {
            console.error("Project update error:", projectError);
            return NextResponse.json({ error: "Failed to update project status" }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "Payment verified successfully" }, { status: 200 });
    } catch (error) {
        console.error("Payment verification error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

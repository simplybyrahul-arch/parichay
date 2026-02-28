import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, projectId } = await req.json();

        const secret = process.env.RAZORPAY_KEY_SECRET || "placeholder_secret";

        // Create signature based on Razorpay docs
        // sha256(order_id + "|" + payment_id, secret)
        const generated_signature = crypto
            .createHmac("sha256", secret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        const isAuthentic = generated_signature === razorpay_signature;

        if (!isAuthentic) {
            return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
        }

        const supabase = await createClient();

        // Verify user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Update payment record
        const { error: paymentError } = await supabase
            .from('payments')
            .update({
                razorpay_payment_id: razorpay_payment_id,
                razorpay_signature: razorpay_signature,
                status: 'captured'
            })
            .eq('razorpay_order_id', razorpay_order_id);

        if (paymentError) {
            console.error("Payment update error:", paymentError);
            return NextResponse.json({ error: "Failed to update payment record" }, { status: 500 });
        }

        // Update project status to 'funded'
        const { error: projectError } = await supabase
            .from('projects')
            .update({
                status: 'funded',
                razorpay_order_id: razorpay_order_id,
                payment_id: razorpay_payment_id,
                payment_signature: razorpay_signature
            })
            .eq('id', projectId);

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

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { sendEmail } from "@/lib/email/resend";

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from('users')
        .select('account_type')
        .eq('id', user.id)
        .single();

    if (profile?.account_type !== 'admin') {
        return NextResponse.json({ error: "Forbidden: Requires Admin Privilege" }, { status: 403 });
    }

    const result = await sendEmail({
        to: "rahul@shotcutcrew.com",
        subject: "ShotcutCrew Resend Test",
        title: "Test Email",
        preheader: "This confirms Resend is working correctly.",
        content: "<p>This confirms Resend is working correctly.</p>"
    });

    if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Email sent successfully", id: result.id });
}

export async function POST(req: NextRequest) {
    return GET(req);
}

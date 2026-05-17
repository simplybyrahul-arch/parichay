import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

function safeNextPath(value: string | null) {
    if (!value || !value.startsWith("/") || value.startsWith("//")) {
        return "/login?verified=1";
    }

    return value;
}

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const next = safeNextPath(requestUrl.searchParams.get("next"));

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            const url = new URL(requestUrl);
            url.pathname = "/login";
            url.search = "";
            url.searchParams.set("error", "Email verification link is invalid or expired.");
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.redirect(new URL(next, requestUrl.origin));
}

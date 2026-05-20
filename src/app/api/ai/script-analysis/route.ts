import { NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { sanitizeScriptAnalysis, scriptAnalysisJsonSchema } from "@/lib/ai/scriptAnalysis";

export const runtime = "nodejs";

function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return null;

    return createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

function extractOutputText(response: Record<string, unknown>) {
    if (typeof response.output_text === "string") return response.output_text;

    const output = Array.isArray(response.output) ? response.output : [];
    for (const item of output) {
        const content = Array.isArray((item as { content?: unknown }).content) ? (item as { content: unknown[] }).content : [];
        for (const contentItem of content) {
            const text = (contentItem as { text?: unknown }).text;
            if (typeof text === "string") return text;
        }
    }

    return "";
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const scriptText = String(body?.scriptText || "").trim();

        if (scriptText.length < 30) {
            return NextResponse.json({ error: "Please provide at least a short project brief or script." }, { status: 400 });
        }

        if (scriptText.length > 60000) {
            return NextResponse.json({ error: "Script is too long. Please upload a shorter excerpt or summary." }, { status: 413 });
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 503 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Login is required to analyze a script." }, { status: 401 });
        }

        const response = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: process.env.OPENAI_SCRIPT_ANALYSIS_MODEL || "gpt-4o-mini",
                input: [
                    {
                        role: "system",
                        content: "You are a senior Indian film, commercial, event, and digital-content line producer. Break down scripts and briefs into practical production requirements. Return only JSON matching the schema.",
                    },
                    {
                        role: "user",
                        content: `Create a professional production breakdown for this script or brief. Detect scenes, logistics, crew, equipment, schedule, budget impact, permissions, risks, and vendor matching tags.\n\n${scriptText}`,
                    },
                ],
                text: {
                    format: {
                        type: "json_schema",
                        name: "shotcutcrew_script_analysis",
                        strict: true,
                        schema: scriptAnalysisJsonSchema,
                    },
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenAI script analysis error:", errorText);
            return NextResponse.json({ error: "AI analysis failed. Please try again." }, { status: 502 });
        }

        const raw = await response.json() as Record<string, unknown>;
        const outputText = extractOutputText(raw);
        const parsed = JSON.parse(outputText);
        const analysis = sanitizeScriptAnalysis(parsed);

        const admin = createAdminClient();
        if (admin) {
            const { error } = await admin.from("script_analyses").insert({
                user_id: user.id,
                input_text: scriptText,
                analysis_json: analysis,
            });
            if (error) console.error("Script analysis save error:", error);
        }

        return NextResponse.json(analysis);
    } catch (error) {
        console.error("Script analysis route error:", error);
        return NextResponse.json({ error: "Could not analyze this script. Please try again." }, { status: 500 });
    }
}

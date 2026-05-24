import { NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import {
    createFallbackScriptAnalysis,
    sanitizeScriptAnalysis,
    scriptAnalysisJsonSchema,
    type ScriptAnalysisResult,
} from "@/lib/ai/scriptAnalysis";

export const runtime = "nodejs";

const SCRIPT_ANALYSIS_LIMIT = 10;
const SCRIPT_ANALYSIS_WINDOW_HOURS = 1;

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

function extractJsonObject(text: string) {
    const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        throw new Error("AI response did not contain a JSON object.");
    }
    return cleaned.slice(firstBrace, lastBrace + 1);
}

function buildAnalysisPrompt(scriptText: string) {
    return `Create a professional Indian film, commercial, event, and digital-content production breakdown for this script or brief.

Return only valid JSON with these exact keys:
project_summary, detected_project_type, complexity_level, confidence, missing_information, recommended_crew, suggested_equipment, estimated_duration, post_production_time, locations, shot_requirements, props_art_direction, audio_requirements, lighting_requirements, permissions, risks_or_challenges, budget_range, production_checklist, vendor_matching_tags.

Crew items must use: { "role": string, "quantity": number, "reason": string }.
Equipment items must use: { "name": string, "quantity": number, "reason": string, "estimated_price_per_day": number }.
complexity_level must be low, medium, or high. confidence must be High, Medium, or Low.

Script / brief:
${scriptText}`;
}

async function analyzeWithGemini(scriptText: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const model = process.env.GEMINI_SCRIPT_ANALYSIS_MODEL || "gemini-2.0-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [
                {
                    role: "user",
                    parts: [{ text: buildAnalysisPrompt(scriptText) }],
                },
            ],
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`Gemini script analysis failed: ${await response.text()}`);
    }

    const payload = await response.json() as Record<string, unknown>;
    const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
    const firstCandidate = candidates[0] as { content?: { parts?: Array<{ text?: string }> } } | undefined;
    const outputText = firstCandidate?.content?.parts?.map((part) => part.text || "").join("\n") || "";
    return sanitizeScriptAnalysis(JSON.parse(extractJsonObject(outputText)));
}

async function analyzeWithOpenRouter(scriptText: string) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return null;

    const model = process.env.OPENROUTER_SCRIPT_ANALYSIS_MODEL || "google/gemma-3-27b-it:free";
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://www.shotcutcrew.com",
            "X-Title": "ShotcutCrew Script Analysis",
        },
        body: JSON.stringify({
            model,
            messages: [
                {
                    role: "system",
                    content: "You are a senior production manager. Return only valid JSON. Do not use markdown.",
                },
                { role: "user", content: buildAnalysisPrompt(scriptText) },
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
        }),
    });

    if (!response.ok) {
        throw new Error(`OpenRouter script analysis failed: ${await response.text()}`);
    }

    const payload = await response.json() as Record<string, unknown>;
    const choices = Array.isArray(payload.choices) ? payload.choices : [];
    const firstChoice = choices[0] as { message?: { content?: string } } | undefined;
    const outputText = firstChoice?.message?.content || "";
    return sanitizeScriptAnalysis(JSON.parse(extractJsonObject(outputText)));
}

async function analyzeWithOpenAI(scriptText: string) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

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
                    content: buildAnalysisPrompt(scriptText),
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
        throw new Error(`OpenAI script analysis failed: ${await response.text()}`);
    }

    const raw = await response.json() as Record<string, unknown>;
    return sanitizeScriptAnalysis(JSON.parse(extractOutputText(raw)));
}

async function runScriptAnalysis(scriptText: string): Promise<ScriptAnalysisResult> {
    const providers = [
        { name: "Gemini", analyze: analyzeWithGemini },
        { name: "OpenRouter", analyze: analyzeWithOpenRouter },
        { name: "OpenAI", analyze: analyzeWithOpenAI },
    ];

    for (const provider of providers) {
        try {
            const analysis = await provider.analyze(scriptText);
            if (analysis) return analysis;
        } catch (error) {
            console.error(`${provider.name} script analysis provider error:`, error);
        }
    }

    return createFallbackScriptAnalysis(scriptText);
}

async function isRateLimited(userId: string) {
    const admin = createAdminClient();
    if (!admin) return false;

    const since = new Date(Date.now() - SCRIPT_ANALYSIS_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    const { count, error } = await admin
        .from("script_analyses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", since);

    if (error) {
        console.error("Script analysis rate limit check error:", error);
        return false;
    }

    return Number(count || 0) >= SCRIPT_ANALYSIS_LIMIT;
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

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Login is required to analyze a script." }, { status: 401 });
        }

        if (await isRateLimited(user.id)) {
            return NextResponse.json(
                { error: `Script analysis limit reached. Please try again later.` },
                { status: 429 }
            );
        }

        const analysis = await runScriptAnalysis(scriptText);

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

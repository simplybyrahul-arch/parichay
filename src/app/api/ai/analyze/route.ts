import { NextResponse } from 'next/server';

type Rule = {
    terms: string[];
    role?: string;
    equipment?: string;
    requirement?: string;
};

const rules: Rule[] = [
    {
        terms: ["interview", "dialogue", "conversation", "podcast"],
        role: "1x Sound Mixer",
        equipment: "Lavalier Microphones + Field Recorder",
        requirement: "Clean dialogue capture and room-tone plan",
    },
    {
        terms: ["drone", "aerial", "top shot"],
        role: "1x Drone Operator",
        equipment: "Drone + ND Filters",
        requirement: "Flight permissions and weather backup required",
    },
    {
        terms: ["night", "low light", "evening"],
        role: "1x Gaffer / Lighting Technician",
        equipment: "High-output LED Lighting Kit",
        requirement: "Night lighting and power backup planning",
    },
    {
        terms: ["wedding", "event", "celebration"],
        role: "2x Camera Operators",
        equipment: "Dual Camera Setup + Stabilizer",
        requirement: "Multi-angle coverage and schedule sync",
    },
    {
        terms: ["product", "commercial", "brand", "ad"],
        role: "1x Director of Photography",
        equipment: "Prime Lens Kit + Controlled Lighting",
        requirement: "Shot-list and brand framing consistency",
    },
    {
        terms: ["documentary", "real", "travel", "outdoor"],
        role: "1x Production Assistant",
        equipment: "Lightweight Handheld / Run-and-gun Kit",
        requirement: "Location movement plan and backup batteries",
    },
    {
        terms: ["vfx", "green screen", "cgi"],
        role: "1x VFX / Post Specialist",
        equipment: "Green Screen + Tracking Markers",
        requirement: "Post-production compositing pipeline required",
    },
];

function includesAny(text: string, terms: string[]) {
    return terms.some((term) => text.includes(term));
}

function estimateDuration(text: string) {
    const length = text.trim().split(/\s+/).length;
    if (length < 120) return "1 shoot day + 2 days post-production";
    if (length < 350) return "2-3 shoot days + 4-6 days post-production";
    return "4-6 shoot days + 7-12 days post-production";
}

export async function POST(request: Request) {
    const body = await request.json();
    const scriptText = String(body?.scriptText || "").toLowerCase();

    if (!scriptText.trim()) {
        return NextResponse.json({ error: "scriptText is required" }, { status: 400 });
    }

    const roleSet = new Set<string>(["1x Director of Photography"]);
    const equipmentSet = new Set<string>([
        "Camera Body + Standard Lens Kit",
        "Basic LED 3-point Lighting",
        "Gimbal / Stabilizer",
    ]);
    const requirementSet = new Set<string>([
        "Location scouting and permissions checklist",
        "Shot list with priority scenes",
    ]);

    for (const rule of rules) {
        if (!includesAny(scriptText, rule.terms)) continue;
        if (rule.role) roleSet.add(rule.role);
        if (rule.equipment) equipmentSet.add(rule.equipment);
        if (rule.requirement) requirementSet.add(rule.requirement);
    }

    if (includesAny(scriptText, ["edit", "post", "color", "grade"])) {
        roleSet.add("1x Video Editor");
        requirementSet.add("Post workflow with review milestones");
    }

    const result = {
        roles: Array.from(roleSet),
        equipment: Array.from(equipmentSet),
        duration: estimateDuration(scriptText),
        requirements: Array.from(requirementSet),
    };

    return NextResponse.json(result);
}

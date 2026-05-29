export type ScriptAnalysisCrewItem = {
    role: string;
    quantity: number;
    reason: string;
};

export type ScriptAnalysisEquipmentItem = {
    name: string;
    quantity: number;
    reason: string;
    estimated_price_per_day: number;
};

export type ScriptAnalysisResult = {
    project_summary: string;
    detected_project_type: string;
    complexity_level: "low" | "medium" | "high";
    confidence: "High" | "Medium" | "Low";
    missing_information: string[];
    recommended_crew: ScriptAnalysisCrewItem[];
    suggested_equipment: ScriptAnalysisEquipmentItem[];
    estimated_duration: string;
    post_production_time: string;
    locations: string[];
    shot_requirements: string[];
    props_art_direction: string[];
    audio_requirements: string[];
    lighting_requirements: string[];
    permissions: string[];
    risks_or_challenges: string[];
    budget_range: string;
    production_checklist: string[];
    vendor_matching_tags: string[];
    analysis_source?: "ai" | "fallback_daily_limit" | "fallback_provider_error";
    ai_credit_used?: boolean;
    daily_ai_limit_remaining?: number;
    message?: string;
};

type KeywordRule = {
    terms: string[];
    crew?: ScriptAnalysisCrewItem[];
    equipment?: ScriptAnalysisEquipmentItem[];
    tags?: string[];
    shots?: string[];
    audio?: string[];
    lighting?: string[];
    risks?: string[];
};

const stringArrayKeys: Array<keyof ScriptAnalysisResult> = [
    "missing_information",
    "locations",
    "shot_requirements",
    "props_art_direction",
    "audio_requirements",
    "lighting_requirements",
    "permissions",
    "risks_or_challenges",
    "production_checklist",
    "vendor_matching_tags",
];

export function sanitizeScriptAnalysis(value: unknown): ScriptAnalysisResult {
    const record = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
    const result: ScriptAnalysisResult = {
        project_summary: String(record.project_summary || ""),
        detected_project_type: String(record.detected_project_type || "Custom Requirement"),
        complexity_level: ["low", "medium", "high"].includes(String(record.complexity_level)) ? record.complexity_level as ScriptAnalysisResult["complexity_level"] : "medium",
        confidence: ["High", "Medium", "Low"].includes(String(record.confidence)) ? record.confidence as ScriptAnalysisResult["confidence"] : "Medium",
        missing_information: [],
        recommended_crew: Array.isArray(record.recommended_crew)
            ? record.recommended_crew.map((item) => {
                const crew = item as Record<string, unknown>;
                return {
                    role: String(crew.role || "Production Crew"),
                    quantity: Math.max(1, Number(crew.quantity || 1)),
                    reason: String(crew.reason || "Recommended for this production."),
                };
            })
            : [],
        suggested_equipment: Array.isArray(record.suggested_equipment)
            ? record.suggested_equipment.map((item) => {
                const equipment = item as Record<string, unknown>;
                return {
                    name: String(equipment.name || "Production Equipment"),
                    quantity: Math.max(1, Number(equipment.quantity || 1)),
                    reason: String(equipment.reason || "Recommended for this production."),
                    estimated_price_per_day: Math.max(0, Number(equipment.estimated_price_per_day || 0)),
                };
            })
            : [],
        estimated_duration: String(record.estimated_duration || "To be confirmed"),
        post_production_time: String(record.post_production_time || "To be confirmed"),
        locations: [],
        shot_requirements: [],
        props_art_direction: [],
        audio_requirements: [],
        lighting_requirements: [],
        permissions: [],
        risks_or_challenges: [],
        budget_range: String(record.budget_range || "To be confirmed"),
        production_checklist: [],
        vendor_matching_tags: [],
    };

    for (const key of stringArrayKeys) {
        const source = record[key];
        result[key] = Array.isArray(source) ? source.map((item) => String(item)).filter(Boolean) as never : [] as never;
    }

    return result;
}

function hasAnyTerm(source: string, terms: string[]) {
    return terms.some((term) => source.includes(term));
}

function uniqueByName<T extends { name?: string; role?: string }>(items: T[]) {
    const seen = new Set<string>();
    return items.filter((item) => {
        const key = String(item.name || item.role || "").toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function createFallbackScriptAnalysis(scriptText: string): ScriptAnalysisResult {
    const source = scriptText.toLowerCase();
    const crew: ScriptAnalysisCrewItem[] = [
        { role: "Production Manager", quantity: 1, reason: "Needed to coordinate schedule, crew, logistics, and client approvals." },
        { role: "Director of Photography", quantity: 1, reason: "Needed to plan visual coverage and camera approach." },
        { role: "Video Editor", quantity: 1, reason: "Needed to assemble final deliverables and social cutdowns." },
    ];
    const equipment: ScriptAnalysisEquipmentItem[] = [
        { name: "Cinema Camera / Mirrorless Camera", quantity: 1, reason: "Core camera package for professional production coverage.", estimated_price_per_day: 0 },
        { name: "Tripod", quantity: 1, reason: "Stable shots for interviews, product visuals, and controlled scenes.", estimated_price_per_day: 0 },
        { name: "Storage and Data Backup", quantity: 1, reason: "Required to safely manage recorded footage and photos.", estimated_price_per_day: 0 },
    ];
    const shotRequirements = ["Create a shot list before production.", "Capture primary coverage and supporting B-roll."];
    const audioRequirements: string[] = [];
    const lightingRequirements: string[] = [];
    const risks: string[] = ["Final quote may change after exact location, crew count, and deliverables are confirmed."];
    const tags = new Set<string>(["production-breakdown"]);

    const rules: KeywordRule[] = [
        {
            terms: ["interview", "founder", "dialogue", "talking head", "testimonial"],
            crew: [
                { role: "Sound Engineer", quantity: 1, reason: "Dialogue/interview content needs clean audio capture." },
                { role: "Lighting Technician", quantity: 1, reason: "Interview setups need controlled key/fill lighting." },
            ],
            equipment: [
                { name: "Wireless Mic Kit", quantity: 1, reason: "Clean voice recording for interview/dialogue scenes.", estimated_price_per_day: 0 },
                { name: "Teleprompter", quantity: 1, reason: "Useful for scripted interview or brand-message delivery.", estimated_price_per_day: 0 },
                { name: "LED Light Kit", quantity: 1, reason: "Controlled interview lighting setup.", estimated_price_per_day: 0 },
            ],
            tags: ["interview-shoot", "clean-audio", "teleprompter"],
            audio: ["Use lavalier or wireless microphone backup.", "Record room tone and monitor audio during takes."],
            lighting: ["Use soft key light, fill control, and practical background separation."],
        },
        {
            terms: ["product", "e-commerce", "catalog", "food", "restaurant"],
            crew: [
                { role: "Photographer", quantity: 1, reason: "Product/photo deliverables require dedicated still photography coverage." },
                { role: "Photo Editor", quantity: 1, reason: "Product photos need retouching and delivery formatting." },
            ],
            equipment: [
                { name: "Product Lighting Setup", quantity: 1, reason: "Consistent lighting is needed for product close-ups.", estimated_price_per_day: 0 },
                { name: "Macro / Prime Lens Kit", quantity: 1, reason: "Useful for detailed product and close-up visuals.", estimated_price_per_day: 0 },
            ],
            tags: ["product-shoot", "photo-editing"],
            shots: ["Capture clean product close-ups, detail shots, and usage/context visuals."],
        },
        {
            terms: ["reel", "instagram", "youtube", "social", "creator", "shorts"],
            crew: [
                { role: "Camera Operator", quantity: 1, reason: "Social content needs fast handheld or gimbal coverage." },
                { role: "Motion Graphics Artist", quantity: 1, reason: "Short-form deliverables often need captions, hooks, and animated text." },
            ],
            equipment: [
                { name: "Gimbal / Stabilizer", quantity: 1, reason: "Smooth movement for reels and creator content.", estimated_price_per_day: 0 },
            ],
            tags: ["social-media-content", "reels"],
            shots: ["Plan vertical-format shots and short hook moments for social edits."],
        },
        {
            terms: ["drone", "aerial", "establishing"],
            crew: [{ role: "Drone Operator", quantity: 1, reason: "Aerial or establishing shots require a licensed drone operator." }],
            equipment: [{ name: "Drone", quantity: 1, reason: "Needed for aerial or cinematic establishing shots.", estimated_price_per_day: 0 }],
            tags: ["drone-available", "aerial-coverage"],
            risks: ["Drone permissions, weather, and local restrictions should be checked before shoot day."],
        },
        {
            terms: ["live", "livestream", "broadcast", "podcast"],
            crew: [
                { role: "Livestream Operator", quantity: 1, reason: "Live or broadcast production needs switching and stream monitoring." },
                { role: "Sound Engineer", quantity: 1, reason: "Podcast/live content depends heavily on reliable audio." },
            ],
            equipment: [
                { name: "Livestream Setup", quantity: 1, reason: "Needed for streaming, capture, and monitoring.", estimated_price_per_day: 0 },
                { name: "ATEM Switcher / Capture Card", quantity: 1, reason: "Useful for multi-camera live switching.", estimated_price_per_day: 0 },
            ],
            tags: ["livestream", "podcast-production"],
        },
        {
            terms: ["wedding", "pre wedding", "engagement"],
            crew: [
                { role: "Photographer", quantity: 1, reason: "Wedding/personal events need still photography coverage." },
                { role: "Videographer", quantity: 1, reason: "Wedding/personal events usually need video coverage and highlights." },
            ],
            equipment: [
                { name: "Gimbal / Stabilizer", quantity: 1, reason: "Useful for cinematic wedding movement shots.", estimated_price_per_day: 0 },
                { name: "Wireless Mic Kit", quantity: 1, reason: "Useful for vows, speeches, and ceremony audio.", estimated_price_per_day: 0 },
            ],
            tags: ["wedding", "event-coverage"],
        },
    ];

    for (const rule of rules) {
        if (!hasAnyTerm(source, rule.terms)) continue;
        if (rule.crew) crew.push(...rule.crew);
        if (rule.equipment) equipment.push(...rule.equipment);
        if (rule.tags) rule.tags.forEach((tag) => tags.add(tag));
        if (rule.shots) shotRequirements.push(...rule.shots);
        if (rule.audio) audioRequirements.push(...rule.audio);
        if (rule.lighting) lightingRequirements.push(...rule.lighting);
        if (rule.risks) risks.push(...rule.risks);
    }

    const deliverableCount = (scriptText.match(/\b(deliverable|reel|photo|edit|film|video|cutdown|episode)s?\b/gi) || []).length;
    const complexity = deliverableCount > 5 || crew.length > 7 ? "high" : crew.length > 4 ? "medium" : "low";

    return sanitizeScriptAnalysis({
        project_summary: "A production-ready breakdown was generated from the submitted brief using ShotcutCrew's local fallback analysis because no configured AI provider completed the request.",
        detected_project_type: hasAnyTerm(source, ["wedding", "engagement"]) ? "Wedding / Personal Event" : hasAnyTerm(source, ["product", "brand", "commercial"]) ? "Commercial / Brand Shoot" : "Custom Production",
        complexity_level: complexity,
        confidence: "Low",
        missing_information: [
            "AI provider unavailable or quota-limited; this is a rule-based fallback.",
            "Confirm exact location, final deliverables, crew availability, and budget before booking.",
        ],
        recommended_crew: uniqueByName(crew),
        suggested_equipment: uniqueByName(equipment),
        estimated_duration: complexity === "high" ? "2-3 shoot days, subject to location and deliverables." : "1 shoot day, subject to final scope.",
        post_production_time: complexity === "high" ? "7-14 days after shoot." : "3-7 days after shoot.",
        locations: hasAnyTerm(source, ["showroom", "office", "indoor"]) ? ["Indoor controlled location"] : ["Location to be confirmed"],
        shot_requirements: Array.from(new Set(shotRequirements)),
        props_art_direction: ["Confirm brand/product props, wardrobe, backgrounds, and visual references before shoot."],
        audio_requirements: audioRequirements.length ? Array.from(new Set(audioRequirements)) : ["Confirm whether dialogue, interviews, or live sound must be recorded."],
        lighting_requirements: lightingRequirements.length ? Array.from(new Set(lightingRequirements)) : ["Plan lighting based on indoor/outdoor location and shoot timing."],
        permissions: ["Confirm location permission and any music/brand/product usage permissions."],
        risks_or_challenges: Array.from(new Set(risks)),
        budget_range: "To be quoted after creator selection and final scope confirmation.",
        production_checklist: [
            "Finalize script/brief and deliverable list.",
            "Confirm shoot date, location, and access timing.",
            "Lock crew, equipment, and shot list.",
            "Prepare backups for audio, storage, power, and weather/location issues.",
            "Confirm review and delivery timeline.",
        ],
        vendor_matching_tags: Array.from(tags),
    });
}

export const scriptAnalysisJsonSchema = {
    type: "object",
    additionalProperties: false,
    required: [
        "project_summary",
        "detected_project_type",
        "complexity_level",
        "confidence",
        "missing_information",
        "recommended_crew",
        "suggested_equipment",
        "estimated_duration",
        "post_production_time",
        "locations",
        "shot_requirements",
        "props_art_direction",
        "audio_requirements",
        "lighting_requirements",
        "permissions",
        "risks_or_challenges",
        "budget_range",
        "production_checklist",
        "vendor_matching_tags",
    ],
    properties: {
        project_summary: { type: "string" },
        detected_project_type: { type: "string" },
        complexity_level: { type: "string", enum: ["low", "medium", "high"] },
        confidence: { type: "string", enum: ["High", "Medium", "Low"] },
        missing_information: { type: "array", items: { type: "string" } },
        recommended_crew: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                required: ["role", "quantity", "reason"],
                properties: {
                    role: { type: "string" },
                    quantity: { type: "integer" },
                    reason: { type: "string" },
                },
            },
        },
        suggested_equipment: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                required: ["name", "quantity", "reason", "estimated_price_per_day"],
                properties: {
                    name: { type: "string" },
                    quantity: { type: "integer" },
                    reason: { type: "string" },
                    estimated_price_per_day: { type: "number" },
                },
            },
        },
        estimated_duration: { type: "string" },
        post_production_time: { type: "string" },
        locations: { type: "array", items: { type: "string" } },
        shot_requirements: { type: "array", items: { type: "string" } },
        props_art_direction: { type: "array", items: { type: "string" } },
        audio_requirements: { type: "array", items: { type: "string" } },
        lighting_requirements: { type: "array", items: { type: "string" } },
        permissions: { type: "array", items: { type: "string" } },
        risks_or_challenges: { type: "array", items: { type: "string" } },
        budget_range: { type: "string" },
        production_checklist: { type: "array", items: { type: "string" } },
        vendor_matching_tags: { type: "array", items: { type: "string" } },
    },
} as const;

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

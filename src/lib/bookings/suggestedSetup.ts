import {
    BOOKING_CREW_OPTIONS,
    EQUIPMENT_REQUIREMENT_OPTIONS,
    POST_PRODUCTION_OPTIONS,
    getEventTypeLabel,
} from "@/config/bookingOptions";

export type SetupPresetId = "simple" | "standard" | "full" | "custom";

export type SuggestedProductionSetup = {
    title: string;
    rationale: string;
    crewRequirements: Record<string, number>;
    equipmentRequirements: Record<string, boolean>;
    postProductionRequirements: Record<string, boolean>;
    crewLabels: string[];
    equipmentLabels: string[];
    postProductionLabels: string[];
};

type SetupTemplate = {
    rationale: string;
    crew: Record<string, number>;
    equipment: string[];
    postProduction: string[];
    fullCrew?: Record<string, number>;
    fullEquipment?: string[];
    fullPostProduction?: string[];
};

const PERSONAL_EVENT_TYPES = new Set(["birthday_party", "anniversary", "baby_shower", "maternity_shoot", "family_shoot"]);
const WEDDING_EVENT_TYPES = new Set(["wedding", "pre_wedding", "engagement"]);
const PRODUCT_EVENT_TYPES = new Set(["product_shoot", "e_commerce_shoot", "food_photography", "restaurant_shoot", "real_estate_shoot"]);
const COMMERCIAL_EVENT_TYPES = new Set(["commercial_ad", "brand_campaign", "fashion_shoot", "automobile_shoot"]);
const CORPORATE_EVENT_TYPES = new Set(["corporate_event", "conference", "seminar", "award_show"]);
const INTERVIEW_EVENT_TYPES = new Set(["company_profile_shoot", "interview_shoot", "linkedin_professional_portrait"]);
const FILM_EVENT_TYPES = new Set(["music_video", "short_film", "documentary", "ott_web_series", "film_production", "live_performance"]);
const SOCIAL_EVENT_TYPES = new Set(["instagram_reel_shoot", "influencer_collaboration", "content_creation", "youtube_vlog"]);
const BROADCAST_EVENT_TYPES = new Set(["podcast_shoot", "livestream_production", "youtube_content"]);

const DEFAULT_TEMPLATE: SetupTemplate = {
    rationale: "A balanced starter setup works well when the requirement is still open-ended.",
    crew: { photographer: 1, videographer: 1 },
    equipment: ["camera", "lens_kit", "tripod", "led_lights"],
    postProduction: ["editing", "photo_retouching"],
    fullCrew: { camera_operator: 1, lighting_technician: 1, production_manager: 1 },
    fullEquipment: ["monitor", "gimbal", "wireless_mic"],
    fullPostProduction: ["color_grading", "social_media_cutdowns"],
};

function getTemplate(eventType: string): SetupTemplate {
    if (WEDDING_EVENT_TYPES.has(eventType)) {
        return {
            rationale: "Wedding shoots usually need photo, video, movement coverage, clean vows/audio, and polished highlight edits.",
            crew: { photographer: 1, videographer: 1, drone_operator: 1 },
            equipment: ["camera", "lens_kit", "gimbal", "wireless_mic", "drone"],
            postProduction: ["editing", "photo_retouching", "color_grading", "trailer_teaser", "social_media_cutdowns"],
            fullCrew: { assistant_photographer: 1, assistant_cameraman: 1, makeup_artist: 1, hair_stylist: 1, production_manager: 1 },
            fullEquipment: ["led_lights", "monitor", "audio_recorder"],
            fullPostProduction: ["subtitles", "data_backup"],
        };
    }

    if (PERSONAL_EVENT_TYPES.has(eventType)) {
        return {
            rationale: "Personal celebrations usually need strong photo coverage, light video support, and clean edited deliverables.",
            crew: { photographer: 1, videographer: 1 },
            equipment: ["camera", "lens_kit", "led_lights"],
            postProduction: ["photo_retouching", "editing"],
            fullCrew: { assistant_photographer: 1, lighting_technician: 1 },
            fullEquipment: ["gimbal", "wireless_mic", "softbox"],
            fullPostProduction: ["social_media_cutdowns"],
        };
    }

    if (PRODUCT_EVENT_TYPES.has(eventType)) {
        return {
            rationale: "Product and food shoots benefit from controlled lighting, lens choice, and detailed retouching.",
            crew: { photographer: 1, lighting_technician: 1, photo_editor: 1 },
            equipment: ["camera", "lens_kit", "led_lights", "softbox", "reflector"],
            postProduction: ["photo_retouching", "thumbnail_design"],
            fullCrew: { creative_director: 1, assistant_photographer: 1 },
            fullEquipment: ["monitor", "c_stand", "power_extension"],
            fullPostProduction: ["motion_graphics"],
        };
    }

    if (COMMERCIAL_EVENT_TYPES.has(eventType)) {
        return {
            rationale: "Commercial shoots usually need direction, camera coverage, lighting control, and brand-ready post-production.",
            crew: { director: 1, videographer: 1, camera_operator: 1, lighting_technician: 1 },
            equipment: ["camera", "lens_kit", "gimbal", "monitor", "led_lights"],
            postProduction: ["editing", "color_grading", "motion_graphics", "social_media_cutdowns"],
            fullCrew: { creative_director: 1, gaffer: 1, drone_operator: 1, production_manager: 1 },
            fullEquipment: ["drone", "rgb_lights", "c_stand", "wireless_mic"],
            fullPostProduction: ["vfx", "sound_design"],
        };
    }

    if (CORPORATE_EVENT_TYPES.has(eventType)) {
        return {
            rationale: "Corporate events need reliable coverage, clear audio, tripod stability, and fast usable edits.",
            crew: { photographer: 1, videographer: 1, sound_engineer: 1 },
            equipment: ["camera", "tripod", "wireless_mic", "mic_setup", "led_lights"],
            postProduction: ["editing", "subtitles"],
            fullCrew: { camera_operator: 1, livestream_operator: 1, production_manager: 1 },
            fullEquipment: ["livestream_setup", "atem_switcher", "audio_recorder", "monitor"],
            fullPostProduction: ["social_media_cutdowns", "data_backup"],
        };
    }

    if (INTERVIEW_EVENT_TYPES.has(eventType)) {
        return {
            rationale: "Interview-led shoots need controlled lighting, clean dialogue audio, stable framing, and captions.",
            crew: { videographer: 1, camera_operator: 1, sound_engineer: 1, lighting_technician: 1 },
            equipment: ["camera", "tripod", "led_lights", "wireless_mic", "teleprompter"],
            postProduction: ["editing", "subtitles", "color_grading"],
            fullCrew: { makeup_artist: 1, production_manager: 1 },
            fullEquipment: ["monitor", "audio_recorder", "softbox"],
            fullPostProduction: ["social_media_cutdowns"],
        };
    }

    if (FILM_EVENT_TYPES.has(eventType)) {
        return {
            rationale: "Film and music-led productions need direction, camera department, lighting, sound, and stronger finishing.",
            crew: { director: 1, camera_operator: 1, assistant_cameraman: 1, gaffer: 1, sound_engineer: 1, video_editor: 1 },
            equipment: ["camera", "lens_kit", "gimbal", "monitor", "led_lights", "audio_recorder"],
            postProduction: ["editing", "color_grading", "sound_design"],
            fullCrew: { creative_director: 1, production_manager: 1, drone_operator: 1, makeup_artist: 1 },
            fullEquipment: ["drone", "rgb_lights", "slider", "smoke_machine"],
            fullPostProduction: ["vfx", "motion_graphics", "trailer_teaser"],
        };
    }

    if (BROADCAST_EVENT_TYPES.has(eventType)) {
        return {
            rationale: "Podcast, YouTube, and livestream work needs dependable camera, clean audio, prompting or broadcast support, and social edits.",
            crew: { videographer: 1, camera_operator: 1, sound_engineer: 1, video_editor: 1 },
            equipment: ["camera", "tripod", "led_lights", "mic_setup", "wireless_mic", "teleprompter"],
            postProduction: ["editing", "subtitles", "thumbnail_design", "social_media_cutdowns"],
            fullCrew: { livestream_operator: 1, lighting_technician: 1 },
            fullEquipment: ["livestream_setup", "capture_card", "atem_switcher", "monitor"],
            fullPostProduction: ["sound_design"],
        };
    }

    if (SOCIAL_EVENT_TYPES.has(eventType)) {
        return {
            rationale: "Creator content usually needs agile video coverage, stable movement, simple lighting, and fast social-first edits.",
            crew: { videographer: 1, camera_operator: 1, video_editor: 1 },
            equipment: ["camera", "gimbal", "led_lights", "wireless_mic"],
            postProduction: ["editing", "thumbnail_design", "social_media_cutdowns", "subtitles"],
            fullCrew: { photographer: 1, lighting_technician: 1 },
            fullEquipment: ["teleprompter", "rgb_lights", "tripod"],
            fullPostProduction: ["motion_graphics"],
        };
    }

    return DEFAULT_TEMPLATE;
}

function applyPreset(template: SetupTemplate, preset: SetupPresetId) {
    const fullCrew = { ...template.crew, ...(preset === "full" ? template.fullCrew : {}) };
    const fullEquipment = [...template.equipment, ...(preset === "full" ? template.fullEquipment || [] : [])];
    const fullPostProduction = [...template.postProduction, ...(preset === "full" ? template.fullPostProduction || [] : [])];

    if (preset === "simple") {
        return {
            crew: Object.fromEntries(Object.entries(template.crew).slice(0, 2)),
            equipment: template.equipment.slice(0, 3),
            postProduction: template.postProduction.slice(0, 2),
        };
    }

    return {
        crew: fullCrew,
        equipment: fullEquipment,
        postProduction: fullPostProduction,
    };
}

function toBooleanMap(ids: string[]) {
    return ids.reduce<Record<string, boolean>>((items, id) => {
        items[id] = true;
        return items;
    }, {});
}

function getLabels(ids: string[], options: Array<{ id: string; label: string }>) {
    return ids
        .map((id) => options.find((option) => option.id === id)?.label)
        .filter((label): label is string => Boolean(label));
}

export function getSuggestedProductionSetup(eventType: string, setupPreset: SetupPresetId): SuggestedProductionSetup {
    const template = getTemplate(eventType);
    const applied = applyPreset(template, setupPreset);
    const crewIds = Object.keys(applied.crew);

    return {
        title: `Suggested setup for ${getEventTypeLabel(eventType).toLowerCase()}`,
        rationale: template.rationale,
        crewRequirements: applied.crew,
        equipmentRequirements: toBooleanMap(applied.equipment),
        postProductionRequirements: toBooleanMap(applied.postProduction),
        crewLabels: crewIds
            .map((id) => {
                const label = BOOKING_CREW_OPTIONS.find((option) => option.id === id)?.label;
                return label ? `${applied.crew[id]}x ${label}` : null;
            })
            .filter((label): label is string => Boolean(label)),
        equipmentLabels: getLabels(applied.equipment, EQUIPMENT_REQUIREMENT_OPTIONS),
        postProductionLabels: getLabels(applied.postProduction, POST_PRODUCTION_OPTIONS),
    };
}

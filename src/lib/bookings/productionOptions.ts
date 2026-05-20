import {
    BriefcaseBusiness,
    Building2,
    Camera,
    Film,
    Headphones,
    Heart,
    Lightbulb,
    Mic,
    MonitorPlay,
    PencilLine,
    Radio,
    Scissors,
    Shirt,
    Users,
    Video,
} from "lucide-react";

export type ProductionEventOption = {
    id: string;
    label: string;
};

export type ProductionEventCategory = {
    id: string;
    label: string;
    icon: typeof Heart;
    options: ProductionEventOption[];
};

export type ProductionCrewRole = {
    id: string;
    name: string;
    category: string;
    priceMin: number;
    priceMax: number;
    info: string;
};

export type ProductionToggleOption = {
    id: string;
    label: string;
};

export const CUSTOM_EVENT_TYPE_ID = "custom_requirement";

export const EVENT_TYPE_CATEGORIES: ProductionEventCategory[] = [
    {
        id: "weddings_personal",
        label: "Weddings & Personal",
        icon: Heart,
        options: [
            { id: "wedding", label: "Wedding" },
            { id: "pre_wedding", label: "Pre Wedding" },
            { id: "engagement", label: "Engagement" },
            { id: "birthday_party", label: "Birthday Party" },
            { id: "anniversary", label: "Anniversary" },
            { id: "baby_shower", label: "Baby Shower" },
            { id: "maternity_shoot", label: "Maternity Shoot" },
            { id: "family_shoot", label: "Family Shoot" },
        ],
    },
    {
        id: "commercial_brand",
        label: "Commercial & Brand",
        icon: BriefcaseBusiness,
        options: [
            { id: "product_shoot", label: "Product Shoot" },
            { id: "e_commerce_shoot", label: "E-commerce Shoot" },
            { id: "commercial_ad", label: "Commercial Ad" },
            { id: "brand_campaign", label: "Brand Campaign" },
            { id: "fashion_shoot", label: "Fashion Shoot" },
            { id: "food_photography", label: "Food Photography" },
            { id: "restaurant_shoot", label: "Restaurant Shoot" },
            { id: "real_estate_shoot", label: "Real Estate Shoot" },
            { id: "automobile_shoot", label: "Automobile Shoot" },
        ],
    },
    {
        id: "corporate_professional",
        label: "Corporate & Professional",
        icon: Building2,
        options: [
            { id: "corporate_event", label: "Corporate Event" },
            { id: "conference", label: "Conference" },
            { id: "seminar", label: "Seminar" },
            { id: "award_show", label: "Award Show" },
            { id: "company_profile_shoot", label: "Company Profile Shoot" },
            { id: "interview_shoot", label: "Interview Shoot" },
            { id: "linkedin_professional_portrait", label: "LinkedIn/Professional Portrait" },
        ],
    },
    {
        id: "entertainment_media",
        label: "Entertainment & Media",
        icon: Film,
        options: [
            { id: "music_video", label: "Music Video" },
            { id: "short_film", label: "Short Film" },
            { id: "documentary", label: "Documentary" },
            { id: "podcast_shoot", label: "Podcast Shoot" },
            { id: "youtube_content", label: "YouTube Content" },
            { id: "ott_web_series", label: "OTT/Web Series" },
            { id: "film_production", label: "Film Production" },
            { id: "live_performance", label: "Live Performance" },
        ],
    },
    {
        id: "social_creator",
        label: "Social Media & Creator",
        icon: MonitorPlay,
        options: [
            { id: "instagram_reel_shoot", label: "Instagram Reel Shoot" },
            { id: "influencer_collaboration", label: "Influencer Collaboration" },
            { id: "content_creation", label: "Content Creation" },
            { id: "youtube_vlog", label: "YouTube Vlog" },
            { id: "livestream_production", label: "Livestream Production" },
        ],
    },
    {
        id: "custom",
        label: "Custom",
        icon: PencilLine,
        options: [{ id: CUSTOM_EVENT_TYPE_ID, label: "Custom Requirement" }],
    },
];

export const PRODUCTION_CREW_ROLES: ProductionCrewRole[] = [
    { id: "photographer", name: "Photographer", category: "Photography", priceMin: 5000, priceMax: 15000, info: "Lead still photographer for events, products, portraits, or campaigns." },
    { id: "assistant_photographer", name: "Assistant Photographer", category: "Photography", priceMin: 2500, priceMax: 7000, info: "Supports lighting, angles, backup coverage, and shot coordination." },
    { id: "videographer", name: "Videographer", category: "Video", priceMin: 8000, priceMax: 20000, info: "Lead video capture for events, reels, interviews, and productions." },
    { id: "camera_operator", name: "Camera Operator", category: "Video", priceMin: 7000, priceMax: 18000, info: "Operates dedicated camera setups for multi-cam or directed shoots." },
    { id: "assistant_cameraman", name: "Assistant Cameraman", category: "Video", priceMin: 3000, priceMax: 9000, info: "Assists camera setup, focus, batteries, media, and rig changes." },
    { id: "photo_editor", name: "Photo Editor", category: "Editing", priceMin: 3000, priceMax: 12000, info: "Retouching, culling, grading, and final photo delivery." },
    { id: "video_editor", name: "Video Editor", category: "Editing", priceMin: 6000, priceMax: 25000, info: "Cuts, edits, syncs, and prepares final video deliverables." },
    { id: "color_grading_artist", name: "Color Grading Artist", category: "Editing", priceMin: 5000, priceMax: 20000, info: "Professional color correction and cinematic grading." },
    { id: "drone_operator", name: "Drone Operator", category: "Drone", priceMin: 5000, priceMax: 25000, info: "Aerial visuals with drone pilot and shoot safety planning." },
    { id: "sound_engineer", name: "Sound Engineer", category: "Audio", priceMin: 5000, priceMax: 18000, info: "Records and monitors clean production sound." },
    { id: "boom_operator", name: "Boom Operator", category: "Audio", priceMin: 3500, priceMax: 12000, info: "Handles boom mic placement and on-set audio support." },
    { id: "lighting_technician", name: "Lighting Technician", category: "Lighting", priceMin: 4000, priceMax: 15000, info: "Sets up and manages practical, studio, or event lighting." },
    { id: "gaffer", name: "Gaffer", category: "Lighting", priceMin: 7000, priceMax: 25000, info: "Leads lighting design and execution for production shoots." },
    { id: "production_manager", name: "Production Manager", category: "Production", priceMin: 8000, priceMax: 30000, info: "Manages schedules, vendors, logistics, and production execution." },
    { id: "production_assistant", name: "Production Assistant", category: "Production", priceMin: 2500, priceMax: 8000, info: "On-ground support for coordination, errands, and shoot setup." },
    { id: "director", name: "Director", category: "Production", priceMin: 15000, priceMax: 60000, info: "Creative lead for performance, visual direction, and storytelling." },
    { id: "creative_director", name: "Creative Director", category: "Production", priceMin: 20000, priceMax: 75000, info: "Owns campaign concept, visual language, and creative decisions." },
    { id: "makeup_artist", name: "Makeup Artist", category: "Beauty", priceMin: 4000, priceMax: 20000, info: "Makeup for talent, bridal, campaign, or production shoots." },
    { id: "hair_stylist", name: "Hair Stylist", category: "Beauty", priceMin: 3500, priceMax: 15000, info: "Hair styling and continuity for talent or client looks." },
    { id: "script_writer", name: "Script Writer", category: "Specialized", priceMin: 5000, priceMax: 30000, info: "Scripts, shot copy, voiceover text, or production outlines." },
    { id: "teleprompter_operator", name: "Teleprompter Operator", category: "Specialized", priceMin: 4000, priceMax: 15000, info: "Teleprompter operation for interviews, corporate videos, and speeches." },
    { id: "livestream_operator", name: "Livestream Operator", category: "Specialized", priceMin: 7000, priceMax: 30000, info: "Live broadcast setup, monitoring, and stream operation." },
    { id: "vfx_artist", name: "VFX Artist", category: "Specialized", priceMin: 8000, priceMax: 50000, info: "Compositing, cleanup, effects, and advanced post-production work." },
];

export const EQUIPMENT_REQUIREMENT_OPTIONS: ProductionToggleOption[] = [
    { id: "camera", label: "Camera" },
    { id: "drone", label: "Drone" },
    { id: "lights", label: "Lights" },
    { id: "gimbal", label: "Gimbal" },
    { id: "mic_setup", label: "Mic Setup" },
    { id: "teleprompter", label: "Teleprompter" },
    { id: "green_screen", label: "Green Screen" },
];

export const POST_PRODUCTION_REQUIREMENT_OPTIONS: ProductionToggleOption[] = [
    { id: "editing", label: "Editing" },
    { id: "color_grading", label: "Color Grading" },
    { id: "thumbnail_design", label: "Thumbnail Design" },
    { id: "motion_graphics", label: "Motion Graphics" },
    { id: "vfx", label: "VFX" },
];

export const CREW_CATEGORY_ICONS: Record<string, typeof Camera> = {
    Photography: Camera,
    Video,
    Editing: Scissors,
    Drone: Radio,
    Audio: Mic,
    Lighting: Lightbulb,
    Production: Users,
    Beauty: Shirt,
    Specialized: Headphones,
};

export function getEventTypeLabel(eventType: string, customEventType?: string | null) {
    if (eventType === CUSTOM_EVENT_TYPE_ID) return customEventType?.trim() || "Custom Requirement";

    for (const category of EVENT_TYPE_CATEGORIES) {
        const option = category.options.find((item) => item.id === eventType);
        if (option) return option.label;
    }

    return eventType.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function estimateCrewBudget(crewRequirements: Record<string, number>, days = 1) {
    return PRODUCTION_CREW_ROLES.reduce((total, role) => {
        const count = Number(crewRequirements[role.id] || 0);
        const midpoint = Math.round((role.priceMin + role.priceMax) / 2);
        return total + midpoint * count * Math.max(1, days);
    }, 0);
}

export function getCrewRequirementSummary(crewRequirements: Record<string, number>) {
    return PRODUCTION_CREW_ROLES
        .filter((role) => Number(crewRequirements[role.id] || 0) > 0)
        .map((role) => `${crewRequirements[role.id]}x ${role.name}`)
        .join(", ");
}

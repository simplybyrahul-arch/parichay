import {
    BriefcaseBusiness,
    Building2,
    Camera,
    Clapperboard,
    Film,
    Headphones,
    Heart,
    Lightbulb,
    Mic,
    MonitorPlay,
    Package,
    Palette,
    PencilLine,
    Radio,
    Scissors,
    Shirt,
    Sparkles,
    Users,
    Video,
} from "lucide-react";

export const CUSTOM_EVENT_TYPE_ID = "custom_requirement";

export type BookingOption = {
    id: string;
    label: string;
    description?: string;
    recommendedFor?: string[];
};

export type BookingCategory = {
    id: string;
    label: string;
    icon: typeof Heart;
    options: BookingOption[];
};

export const BOOKING_EVENT_CATEGORIES: BookingCategory[] = [
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
            { id: "linkedin_professional_portrait", label: "LinkedIn / Professional Portrait" },
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
            { id: "ott_web_series", label: "OTT / Web Series" },
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

export const BOOKING_CREW_CATEGORIES: BookingCategory[] = [
    {
        id: "photography",
        label: "Photography",
        icon: Camera,
        options: [
            { id: "photographer", label: "Photographer", description: "Captures still images for your shoot." },
            { id: "assistant_photographer", label: "Assistant Photographer", description: "Supports photography coverage, setup, and backup angles." },
        ],
    },
    {
        id: "video",
        label: "Video",
        icon: Video,
        options: [
            { id: "videographer", label: "Videographer", description: "Captures video coverage for the shoot." },
            { id: "camera_operator", label: "Camera Operator", description: "Operates a dedicated camera setup." },
            { id: "assistant_cameraman", label: "Assistant Cameraman", description: "Assists camera setup, focus, media, and rig changes." },
        ],
    },
    {
        id: "drone",
        label: "Drone",
        icon: Radio,
        options: [{ id: "drone_operator", label: "Drone Operator", description: "Captures aerial coverage where permitted." }],
    },
    {
        id: "audio",
        label: "Audio",
        icon: Mic,
        options: [
            { id: "sound_engineer", label: "Sound Engineer", description: "Records and monitors clean production sound." },
            { id: "boom_operator", label: "Boom Operator", description: "Handles boom microphone placement and movement." },
        ],
    },
    {
        id: "lighting",
        label: "Lighting",
        icon: Lightbulb,
        options: [
            { id: "lighting_technician", label: "Lighting Technician", description: "Sets up and controls lights for the shoot." },
            { id: "gaffer", label: "Gaffer", description: "Leads lighting execution for production shoots." },
        ],
    },
    {
        id: "production",
        label: "Production",
        icon: Users,
        options: [
            { id: "director", label: "Director", description: "Leads creative execution and performance." },
            { id: "creative_director", label: "Creative Director", description: "Owns visual direction and campaign concept." },
            { id: "production_manager", label: "Production Manager", description: "Manages schedule, logistics, and coordination." },
            { id: "production_assistant", label: "Production Assistant", description: "Supports on-ground production tasks." },
        ],
    },
    {
        id: "post_production_crew",
        label: "Post Production Crew",
        icon: Scissors,
        options: [
            { id: "photo_editor", label: "Photo Editor", description: "Edits, retouches, and prepares final images." },
            { id: "video_editor", label: "Video Editor", description: "Cuts and prepares final video deliverables." },
            { id: "color_grading_artist", label: "Color Grading Artist", description: "Handles color correction and grading." },
            { id: "motion_graphics_artist", label: "Motion Graphics Artist", description: "Creates animated graphics and titles." },
            { id: "vfx_artist", label: "VFX Artist", description: "Handles visual effects and compositing." },
        ],
    },
    {
        id: "beauty",
        label: "Beauty",
        icon: Shirt,
        options: [
            { id: "makeup_artist", label: "Makeup Artist", description: "Prepares talent makeup for camera." },
            { id: "hair_stylist", label: "Hair Stylist", description: "Styles and maintains talent hair continuity." },
        ],
    },
    {
        id: "specialized",
        label: "Specialized",
        icon: Headphones,
        options: [
            { id: "script_writer", label: "Script Writer", description: "Writes scripts, copy, and production outlines." },
            { id: "teleprompter_operator", label: "Teleprompter Operator", description: "Runs prompting for interviews and speeches." },
            { id: "livestream_operator", label: "Livestream Operator", description: "Operates livestream and broadcast workflows." },
        ],
    },
];

export const EQUIPMENT_REQUIREMENT_CATEGORIES: BookingCategory[] = [
    {
        id: "camera",
        label: "Camera",
        icon: Camera,
        options: [
            { id: "camera", label: "Camera" },
            { id: "lens_kit", label: "Lens Kit" },
            { id: "tripod", label: "Tripod" },
            { id: "gimbal", label: "Gimbal" },
            { id: "monitor", label: "Monitor" },
            { id: "slider", label: "Slider" },
            { id: "dolly", label: "Dolly" },
            { id: "jib_crane", label: "Jib / Crane" },
        ],
    },
    {
        id: "lighting",
        label: "Lighting",
        icon: Lightbulb,
        options: [
            { id: "led_lights", label: "LED Lights" },
            { id: "rgb_lights", label: "RGB Lights" },
            { id: "softbox", label: "Softbox" },
            { id: "reflector", label: "Reflector" },
            { id: "c_stand", label: "C-Stand" },
            { id: "power_extension", label: "Power Extension" },
        ],
    },
    {
        id: "audio",
        label: "Audio",
        icon: Mic,
        options: [
            { id: "mic_setup", label: "Mic Setup" },
            { id: "wireless_mic", label: "Wireless Mic" },
            { id: "boom_mic", label: "Boom Mic" },
            { id: "audio_recorder", label: "Audio Recorder" },
        ],
    },
    {
        id: "drone",
        label: "Drone",
        icon: Radio,
        options: [
            { id: "drone", label: "Drone" },
            { id: "fpv_drone", label: "FPV Drone" },
        ],
    },
    {
        id: "broadcast",
        label: "Broadcast",
        icon: MonitorPlay,
        options: [
            { id: "teleprompter", label: "Teleprompter" },
            { id: "livestream_setup", label: "Livestream Setup" },
            { id: "atem_switcher", label: "ATEM Switcher" },
            { id: "capture_card", label: "Capture Card" },
        ],
    },
    {
        id: "production",
        label: "Production",
        icon: Package,
        options: [
            { id: "green_screen", label: "Green Screen" },
            { id: "smoke_machine", label: "Smoke Machine" },
            { id: "props", label: "Props" },
            { id: "makeup_setup", label: "Makeup Setup" },
            { id: "generator", label: "Generator" },
        ],
    },
];

export const POST_PRODUCTION_CATEGORIES: BookingCategory[] = [
    {
        id: "post_production",
        label: "Post Production",
        icon: Clapperboard,
        options: [
            { id: "editing", label: "Editing" },
            { id: "photo_retouching", label: "Photo Retouching" },
            { id: "color_grading", label: "Color Grading" },
            { id: "thumbnail_design", label: "Thumbnail Design" },
            { id: "motion_graphics", label: "Motion Graphics" },
            { id: "vfx", label: "VFX" },
            { id: "sound_design", label: "Sound Design" },
            { id: "voiceover", label: "Voiceover" },
            { id: "subtitles", label: "Subtitles" },
            { id: "social_media_cutdowns", label: "Social Media Cutdowns" },
            { id: "trailer_teaser", label: "Trailer / Teaser" },
            { id: "data_backup", label: "Data Backup" },
        ],
    },
];

export const BUDGET_TIER_OPTIONS = [
    { id: "budget", label: "Budget", description: "Best for simple shoots" },
    { id: "standard", label: "Standard", description: "Best balance of quality and price", badge: "Recommended" },
    { id: "premium", label: "Premium", description: "Best experienced creators and stronger production setup" },
] as const;

export type BudgetTier = typeof BUDGET_TIER_OPTIONS[number]["id"];

export const CREW_CATEGORY_ICONS: Record<string, typeof Camera> = {
    Photography: Camera,
    Video,
    Drone: Radio,
    Audio: Mic,
    Lighting: Lightbulb,
    Production: Users,
    "Post Production Crew": Scissors,
    Beauty: Palette,
    Specialized: Sparkles,
};

export const BOOKING_EVENT_OPTIONS = BOOKING_EVENT_CATEGORIES.flatMap((category) => category.options);
export const BOOKING_CREW_OPTIONS = BOOKING_CREW_CATEGORIES.flatMap((category) => category.options);
export const EQUIPMENT_REQUIREMENT_OPTIONS = EQUIPMENT_REQUIREMENT_CATEGORIES.flatMap((category) => category.options);
export const POST_PRODUCTION_OPTIONS = POST_PRODUCTION_CATEGORIES.flatMap((category) => category.options);

export function getEventTypeLabel(eventType: string, customEventType?: string | null) {
    if (eventType === CUSTOM_EVENT_TYPE_ID) return customEventType?.trim() || "Custom Requirement";
    return BOOKING_EVENT_OPTIONS.find((option) => option.id === eventType)?.label || eventType.replace(/_/g, " ");
}

export function getCrewRequirementSummary(crewRequirements: Record<string, number>) {
    return BOOKING_CREW_OPTIONS
        .filter((role) => Number(crewRequirements[role.id] || 0) > 0)
        .map((role) => `${crewRequirements[role.id]}x ${role.label}`)
        .join(", ");
}

export function getSelectedCount(category: BookingCategory, selected: Record<string, number | boolean>) {
    return category.options.filter((option) => {
        const value = selected[option.id];
        return value === true || Number(value || 0) > 0;
    }).length;
}

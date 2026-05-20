import {
    BatteryCharging,
    Camera,
    Clapperboard,
    HardDrive,
    Headphones,
    Lightbulb,
    Monitor,
    Package,
    Plane,
    Radio,
    Sparkles,
    Video,
} from "lucide-react";

export type EquipmentItem = {
    id: string;
    name: string;
    category: string;
    subcategory: string;
    description: string;
    pricePerDay: number;
    availability: "Available" | "On request";
    recommendedFor?: string[];
};

export type EquipmentCategory = {
    id: string;
    name: string;
    icon: typeof Camera;
    items: EquipmentItem[];
};

export type EquipmentPackage = {
    id: string;
    name: string;
    description: string;
    estimatedPrice: number;
    items: Record<string, number>;
};

const item = (
    id: string,
    name: string,
    category: string,
    subcategory: string,
    description: string,
    pricePerDay: number,
    recommendedFor: string[] = [],
    availability: EquipmentItem["availability"] = "Available"
): EquipmentItem => ({ id, name, category, subcategory, description, pricePerDay, recommendedFor, availability });

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
    {
        id: "camera_equipment",
        name: "Camera Equipment",
        icon: Camera,
        items: [
            item("dslr_camera", "DSLR Camera", "Camera Equipment", "Camera", "Reliable stills and hybrid video camera body.", 2500, ["wedding", "birthday_party", "family_shoot"]),
            item("mirrorless_camera", "Mirrorless Camera", "Camera Equipment", "Camera", "Lightweight hybrid camera for photo and video shoots.", 3500, ["wedding", "instagram_reel_shoot", "youtube_vlog"]),
            item("cinema_camera", "Cinema Camera", "Camera Equipment", "Camera", "Production-grade camera with cinematic dynamic range.", 10000, ["commercial_ad", "music_video", "short_film"]),
            item("red_camera", "RED Camera", "Camera Equipment", "Camera", "High-end cinema camera for premium productions.", 25000, ["film_production", "brand_campaign"], "On request"),
            item("sony_fx_series", "Sony FX Series", "Camera Equipment", "Camera", "Full-frame cinema camera for events and commercial films.", 12000, ["wedding", "commercial_ad", "interview_shoot"]),
            item("canon_c_series", "Canon C Series", "Camera Equipment", "Camera", "Cinema camera suited for documentaries and interviews.", 11000, ["documentary", "interview_shoot"]),
            item("blackmagic_camera", "Blackmagic Camera", "Camera Equipment", "Camera", "Cinema camera with strong color and RAW workflow.", 9000, ["short_film", "music_video"]),
            item("gopro_action_camera", "GoPro / Action Camera", "Camera Equipment", "Camera", "Compact action camera for movement and POV shots.", 1500, ["automobile_shoot", "youtube_vlog"]),
            item("camera_body", "Camera Body", "Camera Equipment", "Camera", "Standard camera body for primary or B-cam use.", 3000),
            item("backup_camera_body", "Backup Camera Body", "Camera Equipment", "Camera", "Backup camera body for critical shoot coverage.", 2500),
            item("prime_lens_kit", "Prime Lens Kit", "Camera Equipment", "Lens", "Fast prime lenses for portraits, products, and cinematic depth.", 3500, ["product_shoot", "fashion_shoot", "interview_shoot"]),
            item("zoom_lens_kit", "Zoom Lens Kit", "Camera Equipment", "Lens", "Flexible zoom lens coverage for events and run-and-gun shoots.", 3000, ["wedding", "corporate_event"]),
            item("cine_lens_set", "Cine Lens Set", "Camera Equipment", "Lens", "Cinema lens set with consistent focus and color response.", 12000, ["commercial_ad", "film_production"], "On request"),
            item("macro_lens", "Macro Lens", "Camera Equipment", "Lens", "Close-up lens for product, jewelry, and food details.", 2500, ["product_shoot", "food_photography"]),
            item("telephoto_lens", "Telephoto Lens", "Camera Equipment", "Lens", "Long lens for stage, sports, and distance coverage.", 3500, ["live_performance", "award_show"]),
            item("wide_angle_lens", "Wide Angle Lens", "Camera Equipment", "Lens", "Wide view lens for interiors, real estate, and establishing shots.", 2500, ["real_estate_shoot"]),
            item("anamorphic_lens", "Anamorphic Lens", "Camera Equipment", "Lens", "Cinematic widescreen lens for premium visual style.", 15000, ["music_video", "film_production"], "On request"),
            item("tripod", "Tripod", "Camera Equipment", "Camera Support", "Stable camera support for interviews and events.", 800, ["interview_shoot", "corporate_event"]),
            item("monopod", "Monopod", "Camera Equipment", "Camera Support", "Mobile support for event and sports coverage.", 600),
            item("slider", "Slider", "Camera Equipment", "Camera Support", "Smooth linear camera movement for product and cinematic shots.", 2000, ["product_shoot", "food_photography"]),
            item("gimbal_stabilizer", "Gimbal / Stabilizer", "Camera Equipment", "Camera Support", "Smooth handheld movement for weddings, reels, and walk-throughs.", 2500, ["wedding", "instagram_reel_shoot"]),
            item("shoulder_rig", "Shoulder Rig", "Camera Equipment", "Camera Support", "Stable handheld rig for documentary and live movement.", 1500, ["documentary"]),
            item("handheld_rig", "Handheld Rig", "Camera Equipment", "Camera Support", "Compact rig for mobile camera operation.", 1200),
            item("jib_crane", "Jib / Crane", "Camera Equipment", "Camera Support", "Large camera movement for stage and cinematic reveals.", 8000, ["award_show", "film_production"], "On request"),
            item("dolly", "Dolly", "Camera Equipment", "Camera Support", "Track-based camera movement for controlled productions.", 7000, ["film_production"], "On request"),
            item("external_monitor", "External Monitor", "Camera Equipment", "Monitoring", "Camera monitor for focus, exposure, and framing.", 1200),
            item("director_monitor", "Director Monitor", "Camera Equipment", "Monitoring", "Client/director viewing monitor for production sets.", 2500, ["commercial_ad", "film_production"]),
            item("video_transmitter", "Video Transmitter", "Camera Equipment", "Monitoring", "Wireless camera feed transmission.", 3000, ["film_production", "livestream_production"]),
            item("video_village_setup", "Video Village Setup", "Camera Equipment", "Monitoring", "Multi-monitor review station for directors and clients.", 10000, ["commercial_ad"], "On request"),
            item("sd_cards", "SD Cards", "Camera Equipment", "Storage", "High-speed media cards for photo/video recording.", 500),
            item("cfexpress_cards", "CFexpress Cards", "Camera Equipment", "Storage", "Fast media for high-bitrate cinema recording.", 1500),
            item("ssd_recording_drive", "SSD Recording Drive", "Camera Equipment", "Storage", "External recording drive for cinema workflows.", 1200),
            item("card_reader", "Card Reader", "Camera Equipment", "Storage", "Fast media offload accessory.", 300),
        ],
    },
    {
        id: "lighting_equipment",
        name: "Lighting Equipment",
        icon: Lightbulb,
        items: [
            item("led_light_panel", "LED Light Panel", "Lighting Equipment", "Lights", "Soft LED panel for interviews, events, and small sets.", 1500, ["wedding", "interview_shoot"]),
            item("rgb_lights", "RGB Lights", "Lighting Equipment", "Lights", "Color lighting for music videos, reels, and creative setups.", 2500, ["music_video", "instagram_reel_shoot"]),
            item("cob_light", "COB Light", "Lighting Equipment", "Lights", "High-output continuous light for controlled shoots.", 3000, ["commercial_ad"]),
            item("fresnel_light", "Fresnel Light", "Lighting Equipment", "Lights", "Focused production light for cinematic control.", 3500, ["film_production"], "On request"),
            item("softbox", "Softbox", "Lighting Equipment", "Modifiers", "Soft light modifier for people, products, and food.", 700),
            item("ring_light", "Ring Light", "Lighting Equipment", "Lights", "Simple front light for beauty and creator content.", 800, ["youtube_vlog"]),
            item("tube_lights", "Tube Lights", "Lighting Equipment", "Lights", "Slim practical lights for creative frames.", 1800, ["music_video"]),
            item("spotlight", "Spotlight", "Lighting Equipment", "Lights", "Focused beam for stage, product, or dramatic accents.", 2000),
            item("reflector", "Reflector", "Lighting Equipment", "Modifiers", "Bounce and shape natural or artificial light.", 300),
            item("diffuser", "Diffuser", "Lighting Equipment", "Modifiers", "Softens harsh light for flattering images.", 400),
            item("flags_cutters", "Flags / Cutters", "Lighting Equipment", "Grip", "Shape and block light on set.", 500),
            item("c_stand", "C-Stand", "Lighting Equipment", "Grip", "Professional grip stand for lights and modifiers.", 500),
            item("light_stand", "Light Stand", "Lighting Equipment", "Grip", "Basic stand for LED panels and modifiers.", 300),
            item("power_extension_setup", "Power Extension Setup", "Lighting Equipment", "Power", "Power extensions and distribution support.", 800),
        ],
    },
    {
        id: "audio_equipment",
        name: "Audio Equipment",
        icon: Headphones,
        items: [
            item("shotgun_microphone", "Shotgun Microphone", "Audio Equipment", "Microphones", "Directional microphone for dialogue and ambient capture.", 1500, ["interview_shoot", "short_film"]),
            item("wireless_mic_kit", "Wireless Mic Kit", "Audio Equipment", "Microphones", "Wireless lapel microphones for speeches and interviews.", 2500, ["wedding", "conference", "podcast_shoot"]),
            item("lavalier_mic", "Lavalier Mic", "Audio Equipment", "Microphones", "Clip-on mic for interviews and presenters.", 1000, ["interview_shoot"]),
            item("boom_mic", "Boom Mic", "Audio Equipment", "Microphones", "Boom-mounted dialogue microphone.", 1800, ["short_film", "documentary"]),
            item("audio_recorder", "Audio Recorder", "Audio Equipment", "Recording", "Field recorder for clean separate audio.", 1800),
            item("mixer_console", "Mixer Console", "Audio Equipment", "Recording", "Audio mixer for multi-source capture.", 3500, ["livestream_production", "conference"]),
            item("headphones", "Headphones", "Audio Equipment", "Monitoring", "Monitoring headphones for audio quality checks.", 400),
            item("ifb_system", "IFB System", "Audio Equipment", "Monitoring", "Communication and cueing system for broadcast setups.", 4500, ["livestream_production"], "On request"),
        ],
    },
    {
        id: "drone_aerial",
        name: "Drone & Aerial",
        icon: Plane,
        items: [
            item("drone_basic", "Drone Basic", "Drone & Aerial", "Drone", "Standard aerial camera drone.", 5000, ["wedding", "real_estate_shoot"]),
            item("fpv_drone", "FPV Drone", "Drone & Aerial", "Drone", "Dynamic first-person drone for action shots.", 12000, ["automobile_shoot", "music_video"], "On request"),
            item("cinema_drone", "Cinema Drone", "Drone & Aerial", "Drone", "Heavy-lift or premium drone for cinema cameras.", 25000, ["film_production"], "On request"),
            item("drone_pilot", "Drone Pilot", "Drone & Aerial", "Crew", "Licensed/experienced pilot for safe aerial operation.", 7000, ["wedding", "commercial_ad"]),
            item("drone_spotter", "Drone Spotter", "Drone & Aerial", "Crew", "Spotter support for controlled drone operation.", 3000),
        ],
    },
    {
        id: "livestream_broadcast",
        name: "Live Stream & Broadcast",
        icon: Radio,
        items: [
            item("livestream_encoder", "Livestream Encoder", "Live Stream & Broadcast", "Streaming", "Hardware/software encoder for reliable live streaming.", 5000, ["livestream_production"]),
            item("atem_switcher", "ATEM Switcher", "Live Stream & Broadcast", "Switching", "Multi-camera video switcher.", 3500, ["conference", "livestream_production"]),
            item("multi_cam_setup", "Multi-Cam Setup", "Live Stream & Broadcast", "Camera", "Multi-camera package for broadcast coverage.", 15000, ["award_show", "conference"]),
            item("streaming_laptop", "Streaming Laptop", "Live Stream & Broadcast", "Streaming", "Laptop configured for live production software.", 2500),
            item("capture_card", "Capture Card", "Live Stream & Broadcast", "Streaming", "HDMI/SDI capture device for live input.", 1200),
            item("teleprompter", "Teleprompter", "Live Stream & Broadcast", "Prompting", "Prompting setup for speeches, interviews, and explainers.", 3500, ["interview_shoot"]),
            item("live_monitor_setup", "Live Monitor Setup", "Live Stream & Broadcast", "Monitoring", "Monitoring setup for live program feeds.", 4000),
        ],
    },
    {
        id: "production_support",
        name: "Production Support",
        icon: Package,
        items: [
            item("generator", "Generator", "Production Support", "Power", "Backup power for outdoor or high-load shoots.", 5000, ["wedding", "film_production"]),
            item("vanity_van", "Vanity Van", "Production Support", "Talent", "Talent preparation and holding space.", 12000, ["film_production", "brand_campaign"], "On request"),
            item("makeup_setup", "Makeup Setup", "Production Support", "Beauty", "Mirror, chair, lights, and basic makeup station.", 2500, ["fashion_shoot"]),
            item("costume_rack", "Costume Rack", "Production Support", "Wardrobe", "Wardrobe rack and hangers for styling continuity.", 1000),
            item("green_screen", "Green Screen", "Production Support", "Set", "Chroma backdrop for VFX and virtual backgrounds.", 2500, ["vfx", "podcast_shoot"]),
            item("smoke_machine", "Smoke Machine", "Production Support", "Effects", "Atmosphere effect for music videos and stylized shoots.", 2000, ["music_video"]),
            item("props_package", "Props Package", "Production Support", "Art", "Basic prop package for scene dressing.", 3000, ["short_film"], "On request"),
            item("production_tent", "Production Tent", "Production Support", "Logistics", "Outdoor shade/control area for crew and equipment.", 2500),
        ],
    },
    {
        id: "post_production",
        name: "Post Production",
        icon: Clapperboard,
        items: [
            item("editing_workstation", "Editing Workstation", "Post Production", "Editing", "High-performance edit system for on-site or post workflow.", 4000),
            item("color_grading_setup", "Color Grading Setup", "Post Production", "Color", "Color-accurate monitor and grading workstation.", 6000, ["commercial_ad"]),
            item("motion_graphics", "Motion Graphics", "Post Production", "Graphics", "Motion graphics support for titles and branded visuals.", 8000, ["brand_campaign"]),
            item("vfx_services", "VFX Services", "Post Production", "VFX", "Visual effects, cleanup, and compositing services.", 12000, ["film_production"], "On request"),
            item("thumbnail_design", "Thumbnail Design", "Post Production", "Design", "YouTube/social thumbnail design support.", 1500, ["youtube_content"]),
            item("dit_data_backup", "DIT/Data Backup", "Post Production", "Data", "On-set media offload, backup, and data integrity support.", 5000, ["film_production", "commercial_ad"]),
        ],
    },
];

export const EQUIPMENT_PACKAGES: EquipmentPackage[] = [
    {
        id: "wedding_basic",
        name: "Wedding Basic Kit",
        description: "Core gear for single-day wedding coverage.",
        estimatedPrice: 18500,
        items: { mirrorless_camera: 2, zoom_lens_kit: 1, gimbal_stabilizer: 1, led_light_panel: 2, wireless_mic_kit: 1 },
    },
    {
        id: "wedding_premium",
        name: "Wedding Premium Kit",
        description: "Multi-camera wedding kit with aerials and stronger lighting.",
        estimatedPrice: 42000,
        items: { sony_fx_series: 1, mirrorless_camera: 2, prime_lens_kit: 1, zoom_lens_kit: 1, gimbal_stabilizer: 1, drone_basic: 1, wireless_mic_kit: 2, led_light_panel: 4 },
    },
    {
        id: "youtube_creator",
        name: "YouTube Creator Kit",
        description: "Compact kit for creator, vlog, and social video production.",
        estimatedPrice: 10500,
        items: { mirrorless_camera: 1, ring_light: 1, wireless_mic_kit: 1, tripod: 1, teleprompter: 1 },
    },
    {
        id: "commercial_shoot",
        name: "Commercial Shoot Kit",
        description: "Controlled brand/product shoot package.",
        estimatedPrice: 47000,
        items: { cinema_camera: 1, prime_lens_kit: 1, macro_lens: 1, cob_light: 2, softbox: 2, slider: 1, director_monitor: 1 },
    },
    {
        id: "podcast",
        name: "Podcast Kit",
        description: "Camera, audio, and basic lighting for podcast recording.",
        estimatedPrice: 13500,
        items: { mirrorless_camera: 2, lavalier_mic: 2, audio_recorder: 1, led_light_panel: 2, tripod: 2 },
    },
    {
        id: "cinema_production",
        name: "Cinema Production Kit",
        description: "High-end package for short films, music videos, and premium productions.",
        estimatedPrice: 92000,
        items: { red_camera: 1, cine_lens_set: 1, director_monitor: 1, video_transmitter: 1, gaffer: 0, cob_light: 3, c_stand: 6, flags_cutters: 4, audio_recorder: 1, boom_mic: 1 },
    },
    {
        id: "livestream",
        name: "Livestream Kit",
        description: "Multi-camera streaming setup for events and corporate productions.",
        estimatedPrice: 36000,
        items: { multi_cam_setup: 1, atem_switcher: 1, livestream_encoder: 1, capture_card: 2, wireless_mic_kit: 2, live_monitor_setup: 1 },
    },
];

export const EQUIPMENT_CATEGORY_ICONS: Record<string, typeof Camera> = {
    "Camera Equipment": Camera,
    "Lighting Equipment": Lightbulb,
    "Audio Equipment": Headphones,
    "Drone & Aerial": Plane,
    "Live Stream & Broadcast": Radio,
    "Production Support": Package,
    "Post Production": Clapperboard,
    Storage: HardDrive,
    Power: BatteryCharging,
    Monitoring: Monitor,
    Video,
    Sparkles,
};

export const ALL_EQUIPMENT_ITEMS = EQUIPMENT_CATEGORIES.flatMap((category) => category.items);

export function getEquipmentItemById(id: string) {
    return ALL_EQUIPMENT_ITEMS.find((item) => item.id === id);
}

export function getRecommendedEquipment(eventType: string | null | undefined) {
    if (!eventType) return [];
    return ALL_EQUIPMENT_ITEMS.filter((item) => item.recommendedFor?.includes(eventType)).slice(0, 8);
}

export function estimateEquipmentTotal(items: Array<{ id: string; count: number }>, days: number) {
    return items.reduce((total, selected) => {
        const catalogItem = getEquipmentItemById(selected.id);
        return total + (catalogItem?.pricePerDay || 0) * selected.count * Math.max(1, days);
    }, 0);
}

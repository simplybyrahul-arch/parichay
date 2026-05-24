import { EQUIPMENT_CATEGORIES } from "@/lib/bookings/equipmentCatalog";

export type EquipmentVendorCategory = {
    id: string;
    label: string;
    description: string;
};

export const EQUIPMENT_VENDOR_CATEGORIES: EquipmentVendorCategory[] = [
    { id: "camera", label: "Cameras", description: "Camera bodies, cinema cameras, and backup bodies." },
    { id: "lens_kits", label: "Lens Kits", description: "Prime, zoom, cine, macro, telephoto, and wide lenses." },
    { id: "monitors", label: "Monitors", description: "On-camera monitors, director monitors, and video village setups." },
    { id: "gimbals", label: "Gimbals", description: "Gimbals, stabilizers, sliders, rigs, dollies, and cranes." },
    { id: "led_lights", label: "LED Lights", description: "LED panels, COB lights, RGB lights, and tube lights." },
    { id: "softboxes_cstands", label: "Softboxes & C-Stands", description: "Softboxes, reflectors, flags, C-stands, and light stands." },
    { id: "audio", label: "Audio Gear", description: "Wireless mics, boom mics, recorders, mixers, and IFB systems." },
    { id: "drone", label: "Drone", description: "Basic drones, FPV drones, cinema drones, pilots, and spotters." },
    { id: "broadcast", label: "Broadcast & Livestream", description: "ATEM switchers, encoders, capture cards, and teleprompters." },
    { id: "production", label: "Production Support", description: "Green screen, smoke machine, generator, props, and makeup setup." },
];

const CATEGORY_ALIASES: Record<string, string[]> = {
    camera: ["camera", "dslr", "mirrorless", "cinema camera", "red camera", "sony fx", "canon c", "blackmagic", "gopro", "body"],
    lens_kits: ["lens", "prime", "zoom", "cine", "macro", "telephoto", "wide angle", "anamorphic"],
    monitors: ["monitor", "transmitter", "video village"],
    gimbals: ["gimbal", "stabilizer", "tripod", "monopod", "slider", "rig", "jib", "crane", "dolly"],
    led_lights: ["light", "led", "rgb", "cob", "fresnel", "ring light", "tube", "spotlight"],
    softboxes_cstands: ["softbox", "reflector", "diffuser", "flag", "c-stand", "stand", "power extension"],
    audio: ["mic", "microphone", "audio", "recorder", "mixer", "headphone", "ifb", "boom"],
    drone: ["drone", "fpv", "aerial", "pilot", "spotter"],
    broadcast: ["livestream", "stream", "atem", "switcher", "capture", "teleprompter", "broadcast", "encoder"],
    production: ["green screen", "smoke", "generator", "props", "makeup", "vanity", "tent", "costume"],
};

function normalize(value: string) {
    return value.toLowerCase().replace(/[_/-]+/g, " ").replace(/\s+/g, " ").trim();
}

export function getVendorCategoryLabel(id: string) {
    return EQUIPMENT_VENDOR_CATEGORIES.find((category) => category.id === id)?.label || id.replace(/_/g, " ");
}

export function inferVendorCategoriesFromEquipment(requirements: Record<string, number | boolean>) {
    const selectedIds = Object.entries(requirements)
        .filter(([, value]) => value === true || Number(value) > 0)
        .map(([id]) => id);

    const catalogItems = EQUIPMENT_CATEGORIES.flatMap((category) => category.items);
    const terms = selectedIds.map((id) => {
        const item = catalogItems.find((catalogItem) => catalogItem.id === id);
        return normalize(`${id} ${item?.name || ""} ${item?.category || ""} ${item?.subcategory || ""}`);
    });

    return EQUIPMENT_VENDOR_CATEGORIES
        .filter((category) => {
            const aliases = CATEGORY_ALIASES[category.id] || [category.label];
            return terms.some((term) => aliases.some((alias) => term.includes(normalize(alias))));
        })
        .map((category) => category.id);
}

export function calculateProfileCompletion(input: {
    businessName?: string | null;
    contactName?: string | null;
    city?: string | null;
    phone?: string | null;
    warehouseAddress?: string | null;
    equipmentCategories?: string[] | null;
    deliveryAvailable?: boolean | null;
}) {
    const checks = [
        Boolean(input.businessName?.trim()),
        Boolean(input.contactName?.trim()),
        Boolean(input.city?.trim()),
        Boolean(input.phone?.trim()),
        Boolean(input.warehouseAddress?.trim()),
        Boolean(input.equipmentCategories?.length),
        input.deliveryAvailable !== null && input.deliveryAvailable !== undefined,
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

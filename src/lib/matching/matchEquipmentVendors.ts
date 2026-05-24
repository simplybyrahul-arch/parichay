import type { SupabaseClient } from "@supabase/supabase-js";
import { inferVendorCategoriesFromEquipment } from "@/lib/equipment/vendors";

export type EquipmentVendorMatch = {
    providerId: string;
    userId: string;
    matchScore: number;
    matchReason: string;
};

type ProviderProfile = {
    id: string;
    user_id: string;
    business_name: string | null;
    city: string | null;
    state: string | null;
    verified: boolean | null;
};

type VendorProfile = {
    provider_id: string;
    delivery_available: boolean | null;
    delivery_radius_km: number | null;
    operator_support_available: boolean | null;
    equipment_categories: unknown;
};

type InventoryItem = {
    provider_id: string;
    category: string | null;
    equipment_name: string | null;
    availability_status: string | null;
    is_active: boolean | null;
};

function normalize(value: string | null | undefined) {
    return (value || "").trim().toLowerCase().replace(/[_/-]+/g, " ").replace(/\s+/g, " ");
}

function toArray(value: unknown) {
    if (Array.isArray(value)) return value.map((item) => normalize(String(item))).filter(Boolean);
    if (typeof value === "string") return [normalize(value)].filter(Boolean);
    return [];
}

export async function matchEquipmentVendors(
    admin: SupabaseClient,
    input: {
        projectId: string;
        bookingLocation?: string | null;
        equipmentRequirements?: Record<string, number | boolean> | null;
        operatorRequired?: boolean;
    }
): Promise<EquipmentVendorMatch[]> {
    const requestedCategories = inferVendorCategoriesFromEquipment(input.equipmentRequirements || {});
    const requestedTerms = [
        ...Object.keys(input.equipmentRequirements || {}),
        ...requestedCategories,
    ].map(normalize);
    const requestedCity = normalize(input.bookingLocation);

    const { data: providers, error: providerError } = await admin
        .from("provider_profiles")
        .select("id, user_id, business_name, city, state, verified")
        .eq("provider_type", "equipment_vendor")
        .eq("verified", true);

    if (providerError) {
        console.error("Equipment provider fetch error:", providerError);
        return [];
    }

    const providerRows = (providers || []) as ProviderProfile[];
    if (providerRows.length === 0) return [];

    const providerIds = providerRows.map((provider) => provider.id);

    const [{ data: vendorProfiles }, { data: inventory }] = await Promise.all([
        admin
            .from("equipment_vendor_profiles")
            .select("provider_id, delivery_available, delivery_radius_km, operator_support_available, equipment_categories")
            .in("provider_id", providerIds),
        admin
            .from("equipment_inventory")
            .select("provider_id, category, equipment_name, availability_status, is_active")
            .in("provider_id", providerIds)
            .eq("is_active", true),
    ]);

    const vendorByProvider = new Map((vendorProfiles || []).map((vendor) => [String(vendor.provider_id), vendor as VendorProfile]));
    const inventoryByProvider = new Map<string, InventoryItem[]>();
    for (const item of (inventory || []) as InventoryItem[]) {
        const items = inventoryByProvider.get(item.provider_id) || [];
        items.push(item);
        inventoryByProvider.set(item.provider_id, items);
    }

    return providerRows
        .map((provider) => {
            const vendor = vendorByProvider.get(provider.id);
            if (!vendor) return null;

            const vendorCategories = toArray(vendor.equipment_categories);
            const items = inventoryByProvider.get(provider.id) || [];
            const inventoryTerms = items.map((item) => normalize(`${item.category || ""} ${item.equipment_name || ""}`));
            const sameCity = requestedCity && normalize(provider.city) && (
                requestedCity.includes(normalize(provider.city)) || normalize(provider.city).includes(requestedCity)
            );
            const categoryMatches = requestedCategories.filter((category) => vendorCategories.includes(normalize(category))).length;
            const inventoryMatches = requestedTerms.filter((term) => inventoryTerms.some((inventoryTerm) => inventoryTerm.includes(term) || term.includes(inventoryTerm))).length;
            const deliveryMatch = vendor.delivery_available === true;
            const operatorMatch = !input.operatorRequired || vendor.operator_support_available === true;

            if (!sameCity && !deliveryMatch && categoryMatches === 0 && inventoryMatches === 0) return null;
            if (!operatorMatch) return null;

            let score = 0;
            const reasons: string[] = [];

            score += 30;
            if (sameCity) {
                score += 40;
                reasons.push("same city");
            }
            if (categoryMatches > 0) {
                score += categoryMatches * 20;
                reasons.push("matching rental categories");
            }
            if (inventoryMatches > 0) {
                score += inventoryMatches * 15;
                reasons.push("matching inventory");
            }
            if (deliveryMatch) {
                score += 10;
                reasons.push("delivery available");
            }
            if (input.operatorRequired && vendor.operator_support_available) {
                score += 10;
                reasons.push("operator support available");
            }

            return {
                providerId: provider.id,
                userId: provider.user_id,
                matchScore: score,
                matchReason: reasons.length ? `Equipment vendor matched: ${reasons.join(", ")}.` : "Verified equipment vendor matched.",
            };
        })
        .filter((match): match is EquipmentVendorMatch => Boolean(match))
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 30);
}

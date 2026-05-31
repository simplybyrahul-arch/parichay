"use server";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { calculateProfileCompletion } from "@/lib/equipment/vendors";
import { upsertEquipmentRentalFinancialsForProvider } from "@/lib/payments/bookingFinance";
import { sendBookingEmailToUser } from "@/lib/email/bookingEmails";

type ActionResult = {
    success: boolean;
    message: string;
};

export type VendorInventoryItem = {
    id: string;
    provider_id: string;
    category: string;
    equipment_name: string;
    brand: string | null;
    model: string | null;
    quantity: number;
    condition: string;
    operator_required: boolean;
    delivery_available: boolean;
    security_deposit: number | null;
    images: string[];
    availability_status: string;
    is_active: boolean;
    created_at: string;
};

export type VendorRentalRequest = {
    id: string;
    project_id: string;
    status: string;
    match_reason: string | null;
    match_score: number | null;
    quote_amount: number | null;
    notes: string | null;
    created_at: string;
    project_title: string;
    project_description: string;
    project_status: string;
    booking_location: string | null;
    event_date: string | null;
    estimated_days: number | null;
    requirement_summary: string | null;
    client_name: string | null;
};

export type VendorAvailabilityDay = {
    id: string;
    available_date: string;
    status: "available" | "limited" | "blocked";
    notes: string | null;
};

export type VendorOperator = {
    id: string;
    name: string;
    role: string;
    phone: string | null;
    skills: string[];
    available_for_bookings: boolean;
    notes: string | null;
};

export type VendorMaintenanceLog = {
    id: string;
    inventory_id: string | null;
    title: string;
    status: "scheduled" | "in_progress" | "completed";
    maintenance_date: string | null;
    notes: string | null;
    equipment_name: string | null;
};

export type VendorDashboardData = {
    user: {
        id: string;
        email: string | null;
        full_name: string | null;
    };
    provider: {
        id: string;
        business_name: string | null;
        contact_name: string | null;
        city: string | null;
        state: string | null;
        verified: boolean;
        profile_completion: number;
    };
    vendor: {
        phone: string | null;
        whatsapp_phone: string | null;
        warehouse_address: string | null;
        gst_number: string | null;
        years_in_business: number | null;
        delivery_available: boolean;
        delivery_radius_km: number;
        operator_support_available: boolean;
        equipment_categories: string[];
        response_time: string | null;
        business_logo_url: string | null;
    } | null;
    inventory: VendorInventoryItem[];
    requests: VendorRentalRequest[];
    availability: VendorAvailabilityDay[];
    operators: VendorOperator[];
    maintenanceLogs: VendorMaintenanceLog[];
};

function getRequiredEnv(name: string) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is not configured`);
    return value;
}

function createAdminClient() {
    return createSupabaseAdminClient(
        getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
        getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

function toArray(value: unknown): string[] {
    if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
    if (typeof value === "string" && value.trim()) return [value.trim()];
    return [];
}

function cleanText(value: FormDataEntryValue | null) {
    return String(value || "").trim();
}

function cleanNumber(value: FormDataEntryValue | null, fallback: number | null = null) {
    const numberValue = Number(value || 0);
    return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : fallback;
}

async function requireVendor() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Login required.");

    const admin = createAdminClient();
    const { data: profile, error } = await admin
        .from("users")
        .select("id, full_name, account_type")
        .eq("id", user.id)
        .single();

    if (error || !["equipment_vendor", "creator"].includes(String(profile?.account_type || ""))) {
        throw new Error("Equipment vendor access is required.");
    }

    const { data: provider, error: providerError } = await admin
        .from("provider_profiles")
        .select("id, user_id, business_name, contact_name, city, state, verified, profile_completion")
        .eq("user_id", user.id)
        .eq("provider_type", "equipment_vendor")
        .maybeSingle();

    if (providerError || !provider) {
        throw new Error("Equipment vendor profile was not found.");
    }

    return { admin, user, userProfile: profile, provider };
}

export async function createHybridVendorProfile(formData: FormData): Promise<ActionResult> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Login required.");

        const admin = createAdminClient();
        const { data: profile, error: profileError } = await admin
            .from("users")
            .select("id, full_name, account_type")
            .eq("id", user.id)
            .single();

        if (profileError || profile?.account_type !== "creator") {
            return { success: false, message: "Only creator accounts can add equipment vendor access from this dashboard." };
        }

        const businessName = cleanText(formData.get("business_name"));
        const contactName = cleanText(formData.get("contact_name")) || profile.full_name || businessName;
        const phone = cleanText(formData.get("phone"));
        const city = cleanText(formData.get("city"));
        const warehouseAddress = cleanText(formData.get("warehouse_address"));
        const equipmentCategories = cleanText(formData.get("equipment_categories"))
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);

        if (!businessName || !contactName || !phone || !city || !warehouseAddress || equipmentCategories.length === 0) {
            return { success: false, message: "Business name, contact, phone, city, warehouse address, and equipment categories are required." };
        }

        const profileCompletion = calculateProfileCompletion({
            businessName,
            contactName,
            city,
            phone,
            warehouseAddress,
            equipmentCategories,
            deliveryAvailable: String(formData.get("delivery_available")) === "true",
        });

        const { data: provider, error: providerError } = await admin
            .from("provider_profiles")
            .upsert({
                user_id: user.id,
                provider_type: "equipment_vendor",
                provider_subtype: "individual_vendor",
                business_name: businessName,
                contact_name: contactName,
                city,
                state: cleanText(formData.get("state")) || null,
                profile_completion: profileCompletion,
                verified: false,
                updated_at: new Date().toISOString(),
            }, { onConflict: "user_id,provider_type" })
            .select("id")
            .single();

        if (providerError || !provider) throw providerError || new Error("Could not create vendor provider profile.");

        const { error: vendorError } = await admin
            .from("equipment_vendor_profiles")
            .upsert({
                provider_id: provider.id,
                phone,
                whatsapp_phone: cleanText(formData.get("whatsapp_phone")) || phone,
                warehouse_address: warehouseAddress,
                gst_number: cleanText(formData.get("gst_number")) || null,
                years_in_business: cleanNumber(formData.get("years_in_business")),
                delivery_available: String(formData.get("delivery_available")) === "true",
                delivery_radius_km: cleanNumber(formData.get("delivery_radius_km"), 0),
                operator_support_available: String(formData.get("operator_support_available")) === "true",
                equipment_categories: equipmentCategories,
                updated_at: new Date().toISOString(),
            }, { onConflict: "provider_id" });

        if (vendorError) throw vendorError;

        revalidatePath("/creator-dashboard");
        revalidatePath("/vendor-dashboard");
        return { success: true, message: "Equipment vendor profile created. Admin verification is required before receiving rental requests." };
    } catch (error) {
        console.error("Hybrid vendor profile create error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Could not create equipment vendor profile." };
    }
}

export async function getVendorDashboardData(): Promise<VendorDashboardData> {
    const { admin, user, userProfile, provider } = await requireVendor();

    const [{ data: vendor }, { data: inventory }, { data: responses }, { data: availability }, { data: operators }, { data: maintenanceLogs }] = await Promise.all([
        admin
            .from("equipment_vendor_profiles")
            .select("*")
            .eq("provider_id", provider.id)
            .maybeSingle(),
        admin
            .from("equipment_inventory")
            .select("*")
            .eq("provider_id", provider.id)
            .order("created_at", { ascending: false }),
        admin
            .from("equipment_rental_responses")
            .select("*, projects!equipment_rental_responses_project_id_fkey(id, title, description, status, booking_location, event_date, estimated_days, requirement_summary, users!client_id(full_name))")
            .eq("provider_id", provider.id)
            .order("created_at", { ascending: false }),
        admin
            .from("equipment_vendor_availability")
            .select("id, available_date, status, notes")
            .eq("provider_id", provider.id)
            .order("available_date", { ascending: true }),
        admin
            .from("equipment_vendor_operators")
            .select("id, name, role, phone, skills, available_for_bookings, notes")
            .eq("provider_id", provider.id)
            .order("created_at", { ascending: false }),
        admin
            .from("equipment_maintenance_logs")
            .select("id, inventory_id, title, status, maintenance_date, notes, equipment_inventory(equipment_name)")
            .eq("provider_id", provider.id)
            .order("created_at", { ascending: false }),
    ]);

    const requests = ((responses || []) as Array<Record<string, unknown>>).map((response) => {
        const project = response.projects as Record<string, unknown> | null;
        const client = project?.users as { full_name?: string | null } | { full_name?: string | null }[] | null | undefined;
        const clientName = Array.isArray(client) ? client[0]?.full_name : client?.full_name;
        return {
            id: String(response.id),
            project_id: String(response.project_id),
            status: String(response.status),
            match_reason: response.match_reason ? String(response.match_reason) : null,
            match_score: response.match_score === null ? null : Number(response.match_score || 0),
            quote_amount: response.quote_amount === null ? null : Number(response.quote_amount || 0),
            notes: response.notes ? String(response.notes) : null,
            created_at: String(response.created_at),
            project_title: String(project?.title || "Equipment Rental Request"),
            project_description: String(project?.description || ""),
            project_status: String(project?.status || ""),
            booking_location: project?.booking_location ? String(project.booking_location) : null,
            event_date: project?.event_date ? String(project.event_date) : null,
            estimated_days: project?.estimated_days === null ? null : Number(project?.estimated_days || 0),
            requirement_summary: project?.requirement_summary ? String(project.requirement_summary) : null,
            client_name: clientName || null,
        };
    });

    return {
        user: {
            id: user.id,
            email: user.email || null,
            full_name: userProfile.full_name || null,
        },
        provider: {
            id: provider.id,
            business_name: provider.business_name,
            contact_name: provider.contact_name,
            city: provider.city,
            state: provider.state,
            verified: Boolean(provider.verified),
            profile_completion: Number(provider.profile_completion || 0),
        },
        vendor: vendor ? {
            phone: vendor.phone,
            whatsapp_phone: vendor.whatsapp_phone,
            warehouse_address: vendor.warehouse_address,
            gst_number: vendor.gst_number,
            years_in_business: vendor.years_in_business,
            delivery_available: Boolean(vendor.delivery_available),
            delivery_radius_km: Number(vendor.delivery_radius_km || 0),
            operator_support_available: Boolean(vendor.operator_support_available),
            equipment_categories: toArray(vendor.equipment_categories),
            response_time: vendor.response_time,
            business_logo_url: vendor.business_logo_url,
        } : null,
        inventory: ((inventory || []) as VendorInventoryItem[]).map((item) => ({
            ...item,
            images: toArray(item.images),
        })),
        requests,
        availability: ((availability || []) as VendorAvailabilityDay[]).map((day) => ({
            ...day,
            status: day.status as VendorAvailabilityDay["status"],
        })),
        operators: ((operators || []) as VendorOperator[]).map((operator) => ({
            ...operator,
            skills: toArray(operator.skills),
            available_for_bookings: Boolean(operator.available_for_bookings),
        })),
        maintenanceLogs: ((maintenanceLogs || []) as Array<Record<string, unknown>>).map((log) => {
            const inventoryRecord = log.equipment_inventory as { equipment_name?: string | null } | { equipment_name?: string | null }[] | null | undefined;
            const inventoryName = Array.isArray(inventoryRecord) ? inventoryRecord[0]?.equipment_name : inventoryRecord?.equipment_name;
            return {
                id: String(log.id),
                inventory_id: log.inventory_id ? String(log.inventory_id) : null,
                title: String(log.title),
                status: String(log.status) as VendorMaintenanceLog["status"],
                maintenance_date: log.maintenance_date ? String(log.maintenance_date) : null,
                notes: log.notes ? String(log.notes) : null,
                equipment_name: inventoryName || null,
            };
        }),
    };
}

export async function updateVendorProfile(formData: FormData): Promise<ActionResult> {
    try {
        const { admin, provider } = await requireVendor();
        const businessName = cleanText(formData.get("business_name"));
        const contactName = cleanText(formData.get("contact_name"));
        const phone = cleanText(formData.get("phone"));
        const city = cleanText(formData.get("city"));
        const warehouseAddress = cleanText(formData.get("warehouse_address"));
        const equipmentCategories = cleanText(formData.get("equipment_categories")).split(",").map((item) => item.trim()).filter(Boolean);

        if (!businessName || !contactName || !phone || !city || !warehouseAddress || equipmentCategories.length === 0) {
            return { success: false, message: "Business name, contact, phone, city, warehouse address, and categories are required." };
        }

        const profileCompletion = calculateProfileCompletion({
            businessName,
            contactName,
            city,
            phone,
            warehouseAddress,
            equipmentCategories,
            deliveryAvailable: String(formData.get("delivery_available")) === "true",
        });

        const { error: providerError } = await admin
            .from("provider_profiles")
            .update({
                business_name: businessName,
                contact_name: contactName,
                city,
                state: cleanText(formData.get("state")) || null,
                profile_completion: profileCompletion,
                updated_at: new Date().toISOString(),
            })
            .eq("id", provider.id);

        if (providerError) throw providerError;

        const { error: vendorError } = await admin
            .from("equipment_vendor_profiles")
            .upsert({
                provider_id: provider.id,
                phone,
                whatsapp_phone: cleanText(formData.get("whatsapp_phone")) || phone,
                warehouse_address: warehouseAddress,
                gst_number: cleanText(formData.get("gst_number")) || null,
                years_in_business: cleanNumber(formData.get("years_in_business")),
                delivery_available: String(formData.get("delivery_available")) === "true",
                delivery_radius_km: cleanNumber(formData.get("delivery_radius_km"), 0),
                operator_support_available: String(formData.get("operator_support_available")) === "true",
                equipment_categories: equipmentCategories,
                response_time: cleanText(formData.get("response_time")) || null,
                business_logo_url: cleanText(formData.get("business_logo_url")) || null,
                updated_at: new Date().toISOString(),
            }, { onConflict: "provider_id" });

        if (vendorError) throw vendorError;

        revalidatePath("/vendor-dashboard");
        return { success: true, message: "Vendor profile saved." };
    } catch (error) {
        console.error("Vendor profile save error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Could not save vendor profile." };
    }
}

export async function saveInventoryItem(formData: FormData): Promise<ActionResult> {
    try {
        const { admin, provider } = await requireVendor();
        const id = cleanText(formData.get("id"));
        const equipmentName = cleanText(formData.get("equipment_name"));
        const category = cleanText(formData.get("category"));
        const quantity = cleanNumber(formData.get("quantity"), 1);

        if (!equipmentName || !category) {
            return { success: false, message: "Equipment name and category are required." };
        }

        const payload = {
            provider_id: provider.id,
            category,
            equipment_name: equipmentName,
            brand: cleanText(formData.get("brand")) || null,
            model: cleanText(formData.get("model")) || null,
            quantity: Math.max(0, Number(quantity || 0)),
            condition: cleanText(formData.get("condition")) || "good",
            operator_required: String(formData.get("operator_required")) === "true",
            delivery_available: String(formData.get("delivery_available")) === "true",
            security_deposit: cleanNumber(formData.get("security_deposit")),
            images: cleanText(formData.get("images")).split(",").map((item) => item.trim()).filter(Boolean),
            availability_status: cleanText(formData.get("availability_status")) || "available",
            is_active: String(formData.get("is_active")) !== "false",
            updated_at: new Date().toISOString(),
        };

        const query = id
            ? admin.from("equipment_inventory").update(payload).eq("id", id).eq("provider_id", provider.id)
            : admin.from("equipment_inventory").insert(payload);

        const { error } = await query;
        if (error) throw error;

        revalidatePath("/vendor-dashboard");
        return { success: true, message: "Inventory saved." };
    } catch (error) {
        console.error("Inventory save error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Could not save inventory." };
    }
}

export async function deleteInventoryItem(itemId: string): Promise<ActionResult> {
    try {
        const { admin, provider } = await requireVendor();
        const { error } = await admin
            .from("equipment_inventory")
            .delete()
            .eq("id", itemId)
            .eq("provider_id", provider.id);

        if (error) throw error;

        revalidatePath("/vendor-dashboard");
        return { success: true, message: "Inventory item deleted." };
    } catch (error) {
        console.error("Inventory delete error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Could not delete inventory item." };
    }
}

export async function respondToRentalRequest(responseId: string, status: "available" | "quoted" | "declined" | "unavailable", quoteAmount?: number, notes?: string): Promise<ActionResult> {
    try {
        const { admin, provider } = await requireVendor();
        const allowed = new Set(["available", "quoted", "declined", "unavailable"]);
        if (!allowed.has(status)) {
            return { success: false, message: "Invalid rental response status." };
        }

        const cleanQuoteAmount = status === "quoted" ? Number(quoteAmount || 0) : null;
        const { data: response, error } = await admin
            .from("equipment_rental_responses")
            .update({
                status,
                quote_amount: cleanQuoteAmount,
                notes: notes?.trim() || null,
                responded_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", responseId)
            .eq("provider_id", provider.id)
            .select("project_id, projects!equipment_rental_responses_project_id_fkey(id, title, client_id)")
            .single();

        if (error) throw error;

        if (status === "quoted" && cleanQuoteAmount !== null && cleanQuoteAmount >= 0 && response?.project_id) {
            const project = Array.isArray(response.projects) ? response.projects[0] : response.projects;
            await upsertEquipmentRentalFinancialsForProvider(admin, {
                bookingId: String(response.project_id),
                clientId: project?.client_id ? String(project.client_id) : null,
                providerId: provider.id,
                grossAmount: cleanQuoteAmount,
            }, { status: "quote_selected" });

            await sendBookingEmailToUser(admin, project?.client_id ? String(project.client_id) : null, {
                type: "quote_received",
                bookingTitle: project?.title ? String(project.title) : "Equipment rental request",
                ctaUrl: "/dashboard",
                amount: cleanQuoteAmount,
            });
        }

        revalidatePath("/vendor-dashboard");
        return { success: true, message: "Rental request response saved." };
    } catch (error) {
        console.error("Rental response update error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Could not update rental request." };
    }
}

export async function saveVendorAvailability(formData: FormData): Promise<ActionResult> {
    try {
        const { admin, provider } = await requireVendor();
        const availableDate = cleanText(formData.get("available_date"));
        const status = cleanText(formData.get("status")) || "available";
        const allowed = new Set(["available", "limited", "blocked"]);

        if (!availableDate) return { success: false, message: "Date is required." };
        if (!allowed.has(status)) return { success: false, message: "Invalid availability status." };

        const { error } = await admin
            .from("equipment_vendor_availability")
            .upsert({
                provider_id: provider.id,
                available_date: availableDate,
                status,
                notes: cleanText(formData.get("notes")) || null,
                updated_at: new Date().toISOString(),
            }, { onConflict: "provider_id,available_date" });

        if (error) throw error;
        revalidatePath("/vendor-dashboard");
        return { success: true, message: "Availability saved." };
    } catch (error) {
        console.error("Vendor availability save error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Could not save availability." };
    }
}

export async function deleteVendorAvailability(availabilityId: string): Promise<ActionResult> {
    try {
        const { admin, provider } = await requireVendor();
        const { error } = await admin
            .from("equipment_vendor_availability")
            .delete()
            .eq("id", availabilityId)
            .eq("provider_id", provider.id);

        if (error) throw error;
        revalidatePath("/vendor-dashboard");
        return { success: true, message: "Availability removed." };
    } catch (error) {
        console.error("Vendor availability delete error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Could not remove availability." };
    }
}

export async function saveVendorOperator(formData: FormData): Promise<ActionResult> {
    try {
        const { admin, provider } = await requireVendor();
        const id = cleanText(formData.get("id"));
        const name = cleanText(formData.get("name"));
        const role = cleanText(formData.get("role"));

        if (!name || !role) return { success: false, message: "Operator name and role are required." };

        const payload = {
            provider_id: provider.id,
            name,
            role,
            phone: cleanText(formData.get("phone")) || null,
            skills: cleanText(formData.get("skills")).split(",").map((item) => item.trim()).filter(Boolean),
            available_for_bookings: String(formData.get("available_for_bookings")) === "true",
            notes: cleanText(formData.get("notes")) || null,
            updated_at: new Date().toISOString(),
        };

        const query = id
            ? admin.from("equipment_vendor_operators").update(payload).eq("id", id).eq("provider_id", provider.id)
            : admin.from("equipment_vendor_operators").insert(payload);

        const { error } = await query;
        if (error) throw error;
        revalidatePath("/vendor-dashboard");
        return { success: true, message: "Operator saved." };
    } catch (error) {
        console.error("Vendor operator save error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Could not save operator." };
    }
}

export async function deleteVendorOperator(operatorId: string): Promise<ActionResult> {
    try {
        const { admin, provider } = await requireVendor();
        const { error } = await admin
            .from("equipment_vendor_operators")
            .delete()
            .eq("id", operatorId)
            .eq("provider_id", provider.id);

        if (error) throw error;
        revalidatePath("/vendor-dashboard");
        return { success: true, message: "Operator deleted." };
    } catch (error) {
        console.error("Vendor operator delete error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Could not delete operator." };
    }
}

export async function saveMaintenanceLog(formData: FormData): Promise<ActionResult> {
    try {
        const { admin, provider } = await requireVendor();
        const id = cleanText(formData.get("id"));
        const title = cleanText(formData.get("title"));
        const status = cleanText(formData.get("status")) || "scheduled";
        const inventoryId = cleanText(formData.get("inventory_id")) || null;
        const allowed = new Set(["scheduled", "in_progress", "completed"]);

        if (!title) return { success: false, message: "Maintenance title is required." };
        if (!allowed.has(status)) return { success: false, message: "Invalid maintenance status." };

        if (inventoryId) {
            const { data: item } = await admin
                .from("equipment_inventory")
                .select("id")
                .eq("id", inventoryId)
                .eq("provider_id", provider.id)
                .maybeSingle();
            if (!item) return { success: false, message: "Selected inventory item was not found." };
        }

        const payload = {
            provider_id: provider.id,
            inventory_id: inventoryId,
            title,
            status,
            maintenance_date: cleanText(formData.get("maintenance_date")) || null,
            notes: cleanText(formData.get("notes")) || null,
            updated_at: new Date().toISOString(),
        };

        const query = id
            ? admin.from("equipment_maintenance_logs").update(payload).eq("id", id).eq("provider_id", provider.id)
            : admin.from("equipment_maintenance_logs").insert(payload);

        const { error } = await query;
        if (error) throw error;

        if (inventoryId && status !== "completed") {
            await admin
                .from("equipment_inventory")
                .update({ availability_status: "maintenance", updated_at: new Date().toISOString() })
                .eq("id", inventoryId)
                .eq("provider_id", provider.id);
        }

        revalidatePath("/vendor-dashboard");
        return { success: true, message: "Maintenance log saved." };
    } catch (error) {
        console.error("Maintenance log save error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Could not save maintenance log." };
    }
}

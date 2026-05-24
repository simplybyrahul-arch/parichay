import { createClient } from "@/utils/supabase/server";
import { UsersTable } from "./UsersTable";

export default async function UsersPage() {
    const supabase = await createClient();

    // Fetch all users
    const { data: users } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

    // Fetch all creators (to get verified status)
    const { data: creators } = await supabase
        .from("creators")
        .select("*");

    const { data: providers } = await supabase
        .from("provider_profiles")
        .select("*, equipment_vendor_profiles(*)");

    const usersData = users?.map(user => {
        const creatorData = creators?.find(c => c.id === user.id);
        const providerData = providers?.find(provider => provider.user_id === user.id);
        const vendorProfile = Array.isArray(providerData?.equipment_vendor_profiles)
            ? providerData?.equipment_vendor_profiles[0]
            : providerData?.equipment_vendor_profiles;
        return {
            ...user,
            creator_verified: creatorData?.verified || false,
            creator_role: creatorData?.role,
            creator_city: creatorData?.city,
            creator_phone: creatorData?.phone,
            creator_whatsapp_phone: creatorData?.whatsapp_phone,
            creator_day_rate: creatorData?.day_rate,
            creator_available_for_booking: creatorData?.available_for_booking,
            creator_travel_enabled: creatorData?.travel_enabled,
            creator_service_cities: creatorData?.service_cities,
            provider_verified: providerData?.verified || false,
            provider_type: providerData?.provider_type,
            provider_subtype: providerData?.provider_subtype,
            provider_business_name: providerData?.business_name,
            provider_city: providerData?.city,
            provider_state: providerData?.state,
            vendor_phone: vendorProfile?.phone,
            vendor_whatsapp_phone: vendorProfile?.whatsapp_phone,
            vendor_delivery_available: vendorProfile?.delivery_available,
            vendor_operator_support_available: vendorProfile?.operator_support_available,
            vendor_equipment_categories: vendorProfile?.equipment_categories,
        };
    }) || [];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Users Management</h2>
                <p className="text-stone-500 mt-1">Manage all clients and creators across the platform.</p>
            </div>
            
            <UsersTable users={usersData} />
        </div>
    );
}

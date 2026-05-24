import { createClient } from "@/utils/supabase/server";
import { verifyEquipmentVendor } from "@/app/actions/admin";

type VendorRow = {
    id: string;
    user_id: string;
    business_name: string | null;
    contact_name: string | null;
    city: string | null;
    state: string | null;
    verified: boolean;
    profile_completion: number;
    equipment_vendor_profiles?: {
        phone?: string | null;
        whatsapp_phone?: string | null;
        warehouse_address?: string | null;
        delivery_available?: boolean | null;
        operator_support_available?: boolean | null;
        equipment_categories?: string[] | null;
    } | {
        phone?: string | null;
        whatsapp_phone?: string | null;
        warehouse_address?: string | null;
        delivery_available?: boolean | null;
        operator_support_available?: boolean | null;
        equipment_categories?: string[] | null;
    }[] | null;
};

export default async function AdminVendorsPage() {
    const supabase = await createClient();
    const { data: vendors } = await supabase
        .from("provider_profiles")
        .select("*, equipment_vendor_profiles(*)")
        .eq("provider_type", "equipment_vendor")
        .order("created_at", { ascending: false });

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Equipment Vendors</h2>
                <p className="text-stone-500 mt-1">Review rental businesses, service categories, delivery support, and verification status.</p>
            </div>

            <div className="grid gap-4">
                {((vendors || []) as VendorRow[]).map((vendor) => {
                    const profile = Array.isArray(vendor.equipment_vendor_profiles)
                        ? vendor.equipment_vendor_profiles[0]
                        : vendor.equipment_vendor_profiles;
                    return (
                        <div key={vendor.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-lg font-black text-stone-900">{vendor.business_name || "Unnamed vendor"}</h3>
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${vendor.verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                                            {vendor.verified ? "Verified" : "Unverified"}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm text-stone-500">{vendor.contact_name || "Contact not set"} · {[vendor.city, vendor.state].filter(Boolean).join(", ") || "City not set"}</p>
                                    <div className="mt-4 grid gap-2 text-sm text-stone-600 md:grid-cols-2">
                                        <span>Phone: {profile?.phone || profile?.whatsapp_phone || "Not set"}</span>
                                        <span>Profile: {vendor.profile_completion || 0}% complete</span>
                                        <span>{profile?.delivery_available ? "Delivery available" : "Delivery not set"}</span>
                                        <span>{profile?.operator_support_available ? "Operator support" : "No operator support"}</span>
                                        <span className="md:col-span-2">Warehouse: {profile?.warehouse_address || "Not set"}</span>
                                        <span className="md:col-span-2">Categories: {profile?.equipment_categories?.join(", ") || "None selected"}</span>
                                    </div>
                                </div>
                                <form action={async () => {
                                    "use server";
                                    await verifyEquipmentVendor(vendor.user_id, !vendor.verified);
                                }}>
                                    <button className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700">
                                        {vendor.verified ? "Revoke Verification" : "Verify Vendor"}
                                    </button>
                                </form>
                            </div>
                        </div>
                    );
                })}
                {!vendors?.length ? (
                    <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-10 text-center text-stone-500">
                        No equipment vendors found yet.
                    </div>
                ) : null}
            </div>
        </div>
    );
}

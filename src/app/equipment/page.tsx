import Link from "next/link";
import { CheckCircle, PackageCheck, Truck, Users } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { Header } from "@/components/Header";
import { getVendorCategoryLabel } from "@/lib/equipment/vendors";

type VendorMarketplaceRow = {
    id: string;
    business_name: string | null;
    city: string | null;
    state: string | null;
    verified: boolean | null;
    equipment_vendor_profiles?: {
        delivery_available?: boolean | null;
        operator_support_available?: boolean | null;
        equipment_categories?: string[] | null;
        business_logo_url?: string | null;
        response_time?: string | null;
    } | {
        delivery_available?: boolean | null;
        operator_support_available?: boolean | null;
        equipment_categories?: string[] | null;
        business_logo_url?: string | null;
        response_time?: string | null;
    }[] | null;
    equipment_inventory?: {
        equipment_name?: string | null;
        category?: string | null;
    }[];
};

function first<T>(value: T | T[] | null | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

export default async function EquipmentMarketplacePage() {
    const supabase = await createClient();
    const { data: vendors } = await supabase
        .from("provider_profiles")
        .select("id, business_name, city, state, verified, equipment_vendor_profiles(delivery_available, operator_support_available, equipment_categories, business_logo_url, response_time), equipment_inventory(equipment_name, category)")
        .eq("provider_type", "equipment_vendor")
        .eq("verified", true)
        .order("created_at", { ascending: false });

    const vendorRows = (vendors || []) as VendorMarketplaceRow[];

    return (
        <main className="min-h-screen bg-[#fffcf8]">
            <Header />
            <section className="px-6 pb-16 pt-32">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-10 max-w-3xl">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700">
                            <PackageCheck className="h-4 w-4" />
                            Equipment Marketplace
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-stone-950 md:text-6xl">Find production rental vendors.</h1>
                        <p className="mt-4 text-lg font-medium leading-relaxed text-stone-600">
                            Browse verified camera, lighting, audio, drone, broadcast, and production support vendors. Submit a rental request to confirm availability and quotes.
                        </p>
                        <Link href="/book" className="mt-6 inline-flex rounded-full bg-violet-600 px-6 py-3 text-sm font-black text-white hover:bg-violet-700">
                            Request Equipment Availability
                        </Link>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {vendorRows.map((vendor) => {
                            const profile = first(vendor.equipment_vendor_profiles);
                            const inventoryHighlights = (vendor.equipment_inventory || [])
                                .slice(0, 4)
                                .map((item) => item.equipment_name || getVendorCategoryLabel(item.category || ""))
                                .filter(Boolean);
                            return (
                                <article key={vendor.id} className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
                                    {profile?.business_logo_url ? (
                                        <img src={profile.business_logo_url} alt={vendor.business_name || "Equipment vendor"} className="h-44 w-full object-cover" />
                                    ) : (
                                        <div className="flex h-44 items-center justify-center bg-violet-50 text-violet-600">
                                            <PackageCheck className="h-14 w-14" />
                                        </div>
                                    )}
                                    <div className="p-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h2 className="text-lg font-black text-stone-900">{vendor.business_name || "Equipment Vendor"}</h2>
                                                <p className="text-sm text-stone-500">{[vendor.city, vendor.state].filter(Boolean).join(", ") || "Location not set"}</p>
                                            </div>
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">
                                                <CheckCircle className="h-3.5 w-3.5" /> Verified
                                            </span>
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {profile?.delivery_available ? <Badge icon={<Truck className="h-3 w-3" />} text="Delivery Available" /> : null}
                                            {profile?.operator_support_available ? <Badge icon={<Users className="h-3 w-3" />} text="Operator Support" /> : null}
                                            {(profile?.equipment_categories || []).slice(0, 3).map((category) => <Badge key={category} text={getVendorCategoryLabel(category)} />)}
                                        </div>
                                        <div className="mt-4 rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">
                                            <b className="text-stone-900">Inventory:</b> {inventoryHighlights.join(", ") || "Inventory details on request"}
                                        </div>
                                        <p className="mt-3 text-xs font-semibold text-stone-500">{profile?.response_time || "Response time not tracked yet"}</p>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    {vendorRows.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-stone-200 bg-white p-12 text-center">
                            <PackageCheck className="mx-auto h-12 w-12 text-violet-300" />
                            <h2 className="mt-4 text-xl font-black text-stone-900">No verified equipment vendors yet</h2>
                            <p className="mt-2 text-stone-500">Rental vendors will appear here after admin verification.</p>
                        </div>
                    ) : null}
                </div>
            </section>
        </main>
    );
}

function Badge({ text, icon }: { text: string; icon?: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-black text-violet-700">
            {icon}
            {text}
        </span>
    );
}

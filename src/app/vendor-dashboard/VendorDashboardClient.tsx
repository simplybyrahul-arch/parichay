"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    BarChart3,
    CalendarDays,
    CheckCircle,
    ClipboardList,
    LogOut,
    Package,
    Settings,
    Truck,
    Users,
    Wrench,
    XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { logout } from "@/app/actions/auth";
import {
    deleteInventoryItem,
    respondToRentalRequest,
    saveInventoryItem,
    updateVendorProfile,
    type VendorDashboardData,
    type VendorInventoryItem,
    type VendorRentalRequest,
} from "@/app/actions/equipmentVendors";
import { EQUIPMENT_VENDOR_CATEGORIES, getVendorCategoryLabel } from "@/lib/equipment/vendors";

type TabKey = "overview" | "inventory" | "requests" | "availability" | "logistics" | "operators" | "maintenance" | "settings";

const inventoryStatuses = ["available", "limited", "unavailable", "maintenance"];

export function VendorDashboardClient({ initialData }: { initialData: VendorDashboardData }) {
    const router = useRouter();
    const supabase = createClient();
    const [activeTab, setActiveTab] = useState<TabKey>("overview");
    const [data, setData] = useState(initialData);
    const [editingItem, setEditingItem] = useState<VendorInventoryItem | null>(null);
    const [isPending, startTransition] = useTransition();
    const openRequests = data.requests.filter((request) => ["sent", "viewed"].includes(request.status));
    const availableInventory = data.inventory.filter((item) => item.is_active && item.availability_status === "available");

    const categorySummary = useMemo(() => {
        const categories = data.vendor?.equipment_categories || [];
        return categories.map(getVendorCategoryLabel).join(", ") || "No categories selected";
    }, [data.vendor?.equipment_categories]);

    const refresh = () => router.refresh();

    const handleLogout = async () => {
        await logout();
    };

    const handleProfileSave = (formData: FormData) => {
        startTransition(async () => {
            const result = await updateVendorProfile(formData);
            if (result.success) {
                toast.success(result.message);
                refresh();
            } else {
                toast.error(result.message);
            }
        });
    };

    const handleInventorySave = async (formData: FormData) => {
        startTransition(async () => {
            const imageFile = formData.get("image_file");
            const imageUrls = formData.get("images") ? String(formData.get("images")).split(",").filter(Boolean) : [];

            if (imageFile instanceof File && imageFile.size > 0) {
                if (imageFile.size > 10 * 1024 * 1024) {
                    toast.error("Inventory image must be under 10MB.");
                    return;
                }
                const fileExt = imageFile.name.split(".").pop() || "jpg";
                const filePath = `${data.user.id}/${crypto.randomUUID()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from("equipment-inventory").upload(filePath, imageFile);
                if (uploadError) {
                    toast.error(uploadError.message);
                    return;
                }
                const { data: publicUrl } = supabase.storage.from("equipment-inventory").getPublicUrl(filePath);
                imageUrls.push(publicUrl.publicUrl);
            }

            formData.set("images", imageUrls.join(","));
            const result = await saveInventoryItem(formData);
            if (result.success) {
                toast.success(result.message);
                setEditingItem(null);
                refresh();
            } else {
                toast.error(result.message);
            }
        });
    };

    const handleDeleteInventory = (itemId: string) => {
        if (!window.confirm("Delete this inventory item?")) return;
        startTransition(async () => {
            const result = await deleteInventoryItem(itemId);
            if (result.success) {
                toast.success(result.message);
                setData((current) => ({
                    ...current,
                    inventory: current.inventory.filter((item) => item.id !== itemId),
                }));
            } else {
                toast.error(result.message);
            }
        });
    };

    const handleRentalResponse = (request: VendorRentalRequest, status: "available" | "quoted" | "declined" | "unavailable") => {
        const quote = status === "quoted" ? Number(window.prompt("Quote amount in INR", String(request.quote_amount || "")) || 0) : undefined;
        const notes = window.prompt("Notes for the client/admin", request.notes || "") || "";
        startTransition(async () => {
            const result = await respondToRentalRequest(request.id, status, quote, notes);
            if (result.success) {
                toast.success(result.message);
                refresh();
            } else {
                toast.error(result.message);
            }
        });
    };

    const navItems = [
        { key: "overview", label: "Overview", icon: BarChart3 },
        { key: "inventory", label: "Inventory", icon: Package },
        { key: "requests", label: "Rental Requests", icon: ClipboardList, badge: openRequests.length },
        { key: "availability", label: "Availability Calendar", icon: CalendarDays },
        { key: "logistics", label: "Delivery & Logistics", icon: Truck },
        { key: "operators", label: "Operators & Technicians", icon: Users },
        { key: "maintenance", label: "Maintenance", icon: Wrench },
        { key: "settings", label: "Settings", icon: Settings },
    ] as const;

    return (
        <div className="min-h-screen bg-stone-50">
            <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 flex-col border-r border-stone-200 bg-white md:flex">
                <div className="border-b border-stone-100 p-6">
                    <div className="text-xl font-black text-stone-900">ShotcutCrew Vendor</div>
                    <div className="mt-1 text-sm text-stone-500">{data.provider.business_name || data.user.full_name || "Equipment Vendor"}</div>
                </div>
                <nav className="flex-1 space-y-1 p-4">
                    {navItems.map((item) => (
                        <button
                            key={item.key}
                            onClick={() => setActiveTab(item.key)}
                            className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold transition-colors ${activeTab === item.key ? "bg-violet-50 text-violet-700" : "text-stone-600 hover:bg-stone-50"}`}
                        >
                            <span className="flex items-center gap-3"><item.icon className="h-5 w-5" />{item.label}</span>
                            {"badge" in item && item.badge ? <span className="rounded-full bg-violet-600 px-2 py-0.5 text-xs text-white">{item.badge}</span> : null}
                        </button>
                    ))}
                </nav>
                <div className="border-t border-stone-100 p-4">
                    <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50">
                        <LogOut className="h-5 w-5" /> Sign Out
                    </button>
                </div>
            </aside>

            <main className="md:pl-72">
                <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 px-5 py-4 backdrop-blur md:px-8">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-2xl font-black text-stone-900">Equipment Vendor Dashboard</h1>
                            <p className="text-sm text-stone-500">Manage inventory, rental requests, delivery, and vendor settings.</p>
                        </div>
                        <div className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${data.provider.verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                            {data.provider.verified ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            {data.provider.verified ? "Verified vendor" : "Under admin review"}
                        </div>
                    </div>
                    <div className="mt-4 flex gap-2 overflow-x-auto md:hidden">
                        {navItems.map((item) => (
                            <button key={item.key} onClick={() => setActiveTab(item.key)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${activeTab === item.key ? "bg-violet-600 text-white" : "bg-stone-100 text-stone-700"}`}>
                                {item.label}
                            </button>
                        ))}
                    </div>
                </header>

                <div className="p-5 md:p-8">
                    {activeTab === "overview" && (
                        <div className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-4">
                                <StatCard label="Inventory Items" value={data.inventory.length.toString()} />
                                <StatCard label="Available Items" value={availableInventory.length.toString()} />
                                <StatCard label="Open Requests" value={openRequests.length.toString()} />
                                <StatCard label="Profile Strength" value={`${data.provider.profile_completion}%`} />
                            </div>
                            <Section title="Vendor Snapshot" description="This is how ShotcutCrew understands your rental business for matching.">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <InfoRow label="Business" value={data.provider.business_name || "Not set"} />
                                    <InfoRow label="Contact" value={data.provider.contact_name || "Not set"} />
                                    <InfoRow label="City" value={[data.provider.city, data.provider.state].filter(Boolean).join(", ") || "Not set"} />
                                    <InfoRow label="Categories" value={categorySummary} />
                                    <InfoRow label="Delivery" value={data.vendor?.delivery_available ? `Available within ${data.vendor.delivery_radius_km || 0}km` : "Not available"} />
                                    <InfoRow label="Operator Support" value={data.vendor?.operator_support_available ? "Available" : "Not available"} />
                                </div>
                            </Section>
                        </div>
                    )}

                    {activeTab === "inventory" && (
                        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
                            <Section title="Inventory" description="Add rental-grade gear. Verified inventory improves equipment request matching.">
                                <div className="grid gap-4 md:grid-cols-2">
                                    {data.inventory.map((item) => (
                                        <div key={item.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                                            {item.images[0] ? <img src={item.images[0]} alt={item.equipment_name} className="mb-4 h-40 w-full rounded-xl object-cover" /> : null}
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <h3 className="font-black text-stone-900">{item.equipment_name}</h3>
                                                    <p className="text-sm text-stone-500">{[item.brand, item.model].filter(Boolean).join(" ") || getVendorCategoryLabel(item.category)}</p>
                                                </div>
                                                <span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-bold capitalize text-violet-700">{item.availability_status}</span>
                                            </div>
                                            <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold text-stone-600">
                                                <span>Qty: {item.quantity}</span>
                                                <span>Condition: {item.condition}</span>
                                                <span>{item.delivery_available ? "Delivery" : "Pickup only"}</span>
                                                <span>{item.operator_required ? "Operator required" : "Operator optional"}</span>
                                            </div>
                                            <div className="mt-4 flex gap-2">
                                                <button onClick={() => setEditingItem(item)} className="rounded-xl bg-stone-900 px-3 py-2 text-xs font-bold text-white">Edit</button>
                                                <button onClick={() => handleDeleteInventory(item.id)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">Delete</button>
                                            </div>
                                        </div>
                                    ))}
                                    {data.inventory.length === 0 ? <EmptyState text="No inventory yet. Add cameras, lights, drones, audio gear, and production tools." /> : null}
                                </div>
                            </Section>
                            <InventoryForm item={editingItem} isPending={isPending} onCancel={() => setEditingItem(null)} onSubmit={handleInventorySave} />
                        </div>
                    )}

                    {activeTab === "requests" && (
                        <Section title="Rental Requests" description="Respond with availability, decline, or submit a quote. Actual payment and deposits are handled later.">
                            <div className="space-y-4">
                                {data.requests.map((request) => (
                                    <div key={request.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                            <div>
                                                <h3 className="text-lg font-black text-stone-900">{request.project_title}</h3>
                                                <p className="mt-1 text-sm text-stone-500">{request.client_name || "Client"} · {request.booking_location || "Location pending"} · {request.event_date || "Date pending"}</p>
                                            </div>
                                            <span className="w-fit rounded-full bg-violet-50 px-3 py-1 text-xs font-black uppercase text-violet-700">{request.status}</span>
                                        </div>
                                        <p className="mt-4 whitespace-pre-line rounded-xl bg-stone-50 p-4 text-sm text-stone-700">{request.requirement_summary || request.project_description}</p>
                                        {request.match_reason ? <p className="mt-3 text-xs font-semibold text-violet-700">{request.match_reason}</p> : null}
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <button onClick={() => handleRentalResponse(request, "available")} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Available</button>
                                            <button onClick={() => handleRentalResponse(request, "quoted")} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white">Submit Quote</button>
                                            <button onClick={() => handleRentalResponse(request, "unavailable")} className="rounded-xl bg-stone-100 px-4 py-2 text-sm font-bold text-stone-700">Unavailable</button>
                                            <button onClick={() => handleRentalResponse(request, "declined")} className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600">Decline</button>
                                        </div>
                                    </div>
                                ))}
                                {data.requests.length === 0 ? <EmptyState text="No equipment rental requests yet. Verified vendors receive matched requests here." /> : null}
                            </div>
                        </Section>
                    )}

                    {activeTab === "settings" && (
                        <VendorProfileForm data={data} isPending={isPending} onSubmit={handleProfileSave} />
                    )}

                    {["availability", "logistics", "operators", "maintenance"].includes(activeTab) && (
                        <Section title={navItems.find((item) => item.key === activeTab)?.label || "Vendor Tools"} description="This area is prepared for rental operations. Use inventory, rental requests, and settings for V1.">
                            <EmptyState text="Detailed workflow controls for this section will be added after live rental operations begin." />
                        </Section>
                    )}
                </div>
            </main>
        </div>
    );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
    return (
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-5">
                <h2 className="text-xl font-black text-stone-900">{title}</h2>
                <p className="mt-1 text-sm text-stone-500">{description}</p>
            </div>
            {children}
        </section>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-bold text-stone-500">{label}</div>
            <div className="mt-2 text-3xl font-black text-stone-900">{value}</div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl bg-stone-50 p-4">
            <div className="text-xs font-black uppercase tracking-wide text-stone-400">{label}</div>
            <div className="mt-1 font-bold text-stone-900">{value}</div>
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-8 text-center text-sm font-semibold text-stone-500">
            {text}
        </div>
    );
}

function InventoryForm({
    item,
    isPending,
    onSubmit,
    onCancel,
}: {
    item: VendorInventoryItem | null;
    isPending: boolean;
    onSubmit: (formData: FormData) => void;
    onCancel: () => void;
}) {
    return (
        <form action={onSubmit} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-xl font-black text-stone-900">{item ? "Edit Inventory" : "Add Inventory"}</h2>
            <input type="hidden" name="id" value={item?.id || ""} />
            <input type="hidden" name="images" value={item?.images.join(",") || ""} />
            <div className="mt-5 space-y-4">
                <Field label="Equipment Name" name="equipment_name" defaultValue={item?.equipment_name || ""} required />
                <label className="block">
                    <span className="mb-1 block text-sm font-bold text-stone-700">Category</span>
                    <select name="category" defaultValue={item?.category || ""} required className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-violet-500">
                        <option value="">Select category</option>
                        {EQUIPMENT_VENDOR_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
                    </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Brand" name="brand" defaultValue={item?.brand || ""} />
                    <Field label="Model" name="model" defaultValue={item?.model || ""} />
                    <Field label="Quantity" name="quantity" type="number" defaultValue={String(item?.quantity || 1)} />
                    <Field label="Security Deposit" name="security_deposit" type="number" defaultValue={String(item?.security_deposit || "")} />
                </div>
                <label className="block">
                    <span className="mb-1 block text-sm font-bold text-stone-700">Condition</span>
                    <select name="condition" defaultValue={item?.condition || "good"} className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-violet-500">
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="service_due">Service due</option>
                    </select>
                </label>
                <label className="block">
                    <span className="mb-1 block text-sm font-bold text-stone-700">Availability</span>
                    <select name="availability_status" defaultValue={item?.availability_status || "available"} className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold capitalize outline-none focus:border-violet-500">
                        {inventoryStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                </label>
                <label className="block">
                    <span className="mb-1 block text-sm font-bold text-stone-700">Upload Image</span>
                    <input type="file" name="image_file" accept="image/jpeg,image/png,image/webp" className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold" />
                </label>
                <div className="grid gap-2">
                    <Checkbox name="delivery_available" label="Delivery available for this item" defaultChecked={item?.delivery_available || false} />
                    <Checkbox name="operator_required" label="Operator required / provided" defaultChecked={item?.operator_required || false} />
                    <Checkbox name="is_active" label="Active listing" defaultChecked={item?.is_active ?? true} />
                </div>
                <div className="flex gap-2">
                    <button disabled={isPending} className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{isPending ? "Saving..." : "Save Inventory"}</button>
                    {item ? <button type="button" onClick={onCancel} className="rounded-xl bg-stone-100 px-4 py-3 text-sm font-black text-stone-700">Cancel</button> : null}
                </div>
            </div>
        </form>
    );
}

function VendorProfileForm({ data, isPending, onSubmit }: { data: VendorDashboardData; isPending: boolean; onSubmit: (formData: FormData) => void }) {
    const selectedCategories = data.vendor?.equipment_categories || [];
    return (
        <form action={onSubmit} className="space-y-6">
            <Section title="Vendor Settings" description="Update only safe rental-business fields. Admin verification remains read-only.">
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Business Name" name="business_name" defaultValue={data.provider.business_name || ""} required />
                    <Field label="Contact Name" name="contact_name" defaultValue={data.provider.contact_name || ""} required />
                    <Field label="Phone" name="phone" defaultValue={data.vendor?.phone || ""} required />
                    <Field label="WhatsApp" name="whatsapp_phone" defaultValue={data.vendor?.whatsapp_phone || ""} />
                    <Field label="City" name="city" defaultValue={data.provider.city || ""} required />
                    <Field label="State" name="state" defaultValue={data.provider.state || ""} />
                    <Field label="Years in Business" name="years_in_business" type="number" defaultValue={String(data.vendor?.years_in_business || "")} />
                    <Field label="Delivery Radius km" name="delivery_radius_km" type="number" defaultValue={String(data.vendor?.delivery_radius_km || 0)} />
                    <Field label="GST Number" name="gst_number" defaultValue={data.vendor?.gst_number || ""} />
                    <Field label="Response Time" name="response_time" defaultValue={data.vendor?.response_time || ""} placeholder="e.g. Usually responds within 2 hours" />
                </div>
                <label className="mt-4 block">
                    <span className="mb-1 block text-sm font-bold text-stone-700">Warehouse / Store Address</span>
                    <textarea name="warehouse_address" defaultValue={data.vendor?.warehouse_address || ""} rows={3} required className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-violet-500" />
                </label>
                <input type="hidden" name="equipment_categories" value={selectedCategories.join(",")} />
                <div className="mt-4 rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">
                    Selected categories: <b>{selectedCategories.map(getVendorCategoryLabel).join(", ") || "None"}</b>
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                    <Checkbox name="delivery_available" label="Delivery available" defaultChecked={data.vendor?.delivery_available || false} />
                    <Checkbox name="operator_support_available" label="Operator support available" defaultChecked={data.vendor?.operator_support_available || false} />
                </div>
                <button disabled={isPending} className="mt-5 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{isPending ? "Saving..." : "Save Vendor Settings"}</button>
            </Section>
        </form>
    );
}

function Field({ label, name, defaultValue, type = "text", required = false, placeholder = "" }: { label: string; name: string; defaultValue: string; type?: string; required?: boolean; placeholder?: string }) {
    return (
        <label className="block">
            <span className="mb-1 block text-sm font-bold text-stone-700">{label}</span>
            <input name={name} type={type} min={type === "number" ? 0 : undefined} defaultValue={defaultValue} required={required} placeholder={placeholder} className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-violet-500" />
        </label>
    );
}

function Checkbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
    return (
        <label className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold text-stone-700">
            <span>{label}</span>
            <input type="checkbox" name={name} value="true" defaultChecked={defaultChecked} className="h-4 w-4 rounded border-stone-300 text-violet-600 focus:ring-violet-500" />
        </label>
    );
}

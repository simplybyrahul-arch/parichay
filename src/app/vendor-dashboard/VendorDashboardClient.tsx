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
    deleteVendorAvailability,
    deleteVendorOperator,
    respondToRentalRequest,
    saveInventoryItem,
    saveMaintenanceLog,
    saveVendorAvailability,
    saveVendorOperator,
    updateVendorProfile,
    type VendorDashboardData,
    type VendorMaintenanceLog,
    type VendorOperator,
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
    const [editingOperator, setEditingOperator] = useState<VendorOperator | null>(null);
    const [editingMaintenance, setEditingMaintenance] = useState<VendorMaintenanceLog | null>(null);
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

    const runAction = (action: () => Promise<{ success: boolean; message: string }>, onSuccess?: () => void) => {
        startTransition(async () => {
            const result = await action();
            if (result.success) {
                toast.success(result.message);
                onSuccess?.();
                refresh();
            } else {
                toast.error(result.message);
            }
        });
    };

    const handleAvailabilitySave = (formData: FormData) => {
        runAction(() => saveVendorAvailability(formData));
    };

    const handleAvailabilityDelete = (availabilityId: string) => {
        if (!window.confirm("Remove this availability entry?")) return;
        runAction(() => deleteVendorAvailability(availabilityId));
    };

    const handleOperatorSave = (formData: FormData) => {
        runAction(() => saveVendorOperator(formData), () => setEditingOperator(null));
    };

    const handleOperatorDelete = (operatorId: string) => {
        if (!window.confirm("Delete this operator / technician?")) return;
        runAction(() => deleteVendorOperator(operatorId), () => setEditingOperator(null));
    };

    const handleMaintenanceSave = (formData: FormData) => {
        runAction(() => saveMaintenanceLog(formData), () => setEditingMaintenance(null));
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

                    {activeTab === "availability" && (
                        <AvailabilityPanel data={data} isPending={isPending} onSubmit={handleAvailabilitySave} onDelete={handleAvailabilityDelete} />
                    )}

                    {activeTab === "logistics" && (
                        <LogisticsPanel data={data} isPending={isPending} onSubmit={handleProfileSave} />
                    )}

                    {activeTab === "operators" && (
                        <OperatorsPanel
                            data={data}
                            editingOperator={editingOperator}
                            isPending={isPending}
                            onEdit={setEditingOperator}
                            onCancel={() => setEditingOperator(null)}
                            onSubmit={handleOperatorSave}
                            onDelete={handleOperatorDelete}
                        />
                    )}

                    {activeTab === "maintenance" && (
                        <MaintenancePanel
                            data={data}
                            editingLog={editingMaintenance}
                            isPending={isPending}
                            onEdit={setEditingMaintenance}
                            onCancel={() => setEditingMaintenance(null)}
                            onSubmit={handleMaintenanceSave}
                        />
                    )}

                    {activeTab === "settings" && (
                        <VendorProfileForm data={data} isPending={isPending} onSubmit={handleProfileSave} />
                    )}
                </div>
            </main>
        </div>
    );
}

function AvailabilityPanel({
    data,
    isPending,
    onSubmit,
    onDelete,
}: {
    data: VendorDashboardData;
    isPending: boolean;
    onSubmit: (formData: FormData) => void;
    onDelete: (availabilityId: string) => void;
}) {
    const blockedCount = data.availability.filter((day) => day.status === "blocked").length;
    const limitedCount = data.availability.filter((day) => day.status === "limited").length;
    const upcomingRequests = data.requests.filter((request) => request.event_date).slice(0, 6);

    return (
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <Section title="Availability Calendar" description="Block dates, mark limited availability, and review rental request dates. These entries are used by future rental matching.">
                <div className="mb-5 grid gap-3 md:grid-cols-3">
                    <StatCard label="Saved Dates" value={data.availability.length.toString()} />
                    <StatCard label="Blocked Dates" value={blockedCount.toString()} />
                    <StatCard label="Limited Dates" value={limitedCount.toString()} />
                </div>
                <div className="space-y-3">
                    {data.availability.map((day) => (
                        <div key={day.id} className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <div className="font-black text-stone-900">{formatDate(day.available_date)}</div>
                                <div className="mt-1 text-sm text-stone-500">{day.notes || "No notes"}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${day.status === "blocked" ? "bg-red-50 text-red-700" : day.status === "limited" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{day.status}</span>
                                <button type="button" onClick={() => onDelete(day.id)} className="rounded-xl bg-stone-100 px-3 py-2 text-xs font-bold text-stone-700">Remove</button>
                            </div>
                        </div>
                    ))}
                    {data.availability.length === 0 ? <EmptyState text="No availability entries yet. Add blocked or limited dates before accepting rentals." /> : null}
                </div>
            </Section>
            <div className="space-y-6">
                <form action={onSubmit} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
                    <h2 className="text-xl font-black text-stone-900">Add Availability</h2>
                    <div className="mt-5 space-y-4">
                        <Field label="Date" name="available_date" type="date" defaultValue="" required />
                        <label className="block">
                            <span className="mb-1 block text-sm font-bold text-stone-700">Status</span>
                            <select name="status" defaultValue="blocked" className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-violet-500">
                                <option value="available">Available</option>
                                <option value="limited">Limited</option>
                                <option value="blocked">Blocked / unavailable</option>
                            </select>
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-sm font-bold text-stone-700">Notes</span>
                            <textarea name="notes" rows={3} className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-violet-500" placeholder="Booked, maintenance, delivery team unavailable..." />
                        </label>
                        <button disabled={isPending} className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{isPending ? "Saving..." : "Save Date"}</button>
                    </div>
                </form>
                <Section title="Upcoming Request Dates" description="Dates from matched rental requests.">
                    <div className="space-y-3">
                        {upcomingRequests.map((request) => (
                            <div key={request.id} className="rounded-2xl bg-stone-50 p-4">
                                <div className="text-sm font-black text-stone-900">{request.project_title}</div>
                                <div className="mt-1 text-xs font-semibold text-stone-500">{request.event_date ? formatDate(request.event_date) : "Date pending"} · {request.booking_location || "Location pending"}</div>
                            </div>
                        ))}
                        {upcomingRequests.length === 0 ? <EmptyState text="No dated rental requests yet." /> : null}
                    </div>
                </Section>
            </div>
        </div>
    );
}

function LogisticsPanel({ data, isPending, onSubmit }: { data: VendorDashboardData; isPending: boolean; onSubmit: (formData: FormData) => void }) {
    return (
        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Section title="Delivery & Logistics" description="Control delivery availability, warehouse address, delivery radius, and operating area.">
                <div className="grid gap-4 md:grid-cols-2">
                    <InfoRow label="Delivery Status" value={data.vendor?.delivery_available ? "Delivery available" : "Pickup / client-arranged transport"} />
                    <InfoRow label="Delivery Radius" value={`${data.vendor?.delivery_radius_km || 0} km`} />
                    <InfoRow label="Warehouse" value={data.vendor?.warehouse_address || "Not set"} />
                    <InfoRow label="City" value={[data.provider.city, data.provider.state].filter(Boolean).join(", ") || "Not set"} />
                    <InfoRow label="Operator Support" value={data.vendor?.operator_support_available ? "Available" : "Not available"} />
                    <InfoRow label="Response Time" value={data.vendor?.response_time || "Not set"} />
                </div>
            </Section>
            <VendorProfileForm data={data} isPending={isPending} onSubmit={onSubmit} compact title="Update Logistics" />
        </div>
    );
}

function OperatorsPanel({
    data,
    editingOperator,
    isPending,
    onEdit,
    onCancel,
    onSubmit,
    onDelete,
}: {
    data: VendorDashboardData;
    editingOperator: VendorOperator | null;
    isPending: boolean;
    onEdit: (operator: VendorOperator) => void;
    onCancel: () => void;
    onSubmit: (formData: FormData) => void;
    onDelete: (operatorId: string) => void;
}) {
    return (
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <Section title="Operators & Technicians" description="Manage pilots, camera operators, lighting technicians, and setup crew available with rentals.">
                <div className="grid gap-4 md:grid-cols-2">
                    {data.operators.map((operator) => (
                        <div key={operator.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="font-black text-stone-900">{operator.name}</h3>
                                    <p className="text-sm text-stone-500">{operator.role}</p>
                                </div>
                                <span className={`rounded-full px-2 py-1 text-xs font-bold ${operator.available_for_bookings ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-600"}`}>{operator.available_for_bookings ? "Available" : "Unavailable"}</span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {operator.skills.map((skill) => <span key={skill} className="rounded-full bg-violet-50 px-2 py-1 text-xs font-bold text-violet-700">{skill}</span>)}
                            </div>
                            <p className="mt-3 text-sm text-stone-600">{operator.notes || operator.phone || "No notes"}</p>
                            <div className="mt-4 flex gap-2">
                                <button type="button" onClick={() => onEdit(operator)} className="rounded-xl bg-stone-900 px-3 py-2 text-xs font-bold text-white">Edit</button>
                                <button type="button" onClick={() => onDelete(operator.id)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">Delete</button>
                            </div>
                        </div>
                    ))}
                    {data.operators.length === 0 ? <EmptyState text="No operators added yet. Add pilots, camera operators, or technicians you can provide with rentals." /> : null}
                </div>
            </Section>
            <OperatorForm operator={editingOperator} isPending={isPending} onSubmit={onSubmit} onCancel={onCancel} />
        </div>
    );
}

function MaintenancePanel({
    data,
    editingLog,
    isPending,
    onEdit,
    onCancel,
    onSubmit,
}: {
    data: VendorDashboardData;
    editingLog: VendorMaintenanceLog | null;
    isPending: boolean;
    onEdit: (log: VendorMaintenanceLog) => void;
    onCancel: () => void;
    onSubmit: (formData: FormData) => void;
}) {
    const maintenanceInventory = data.inventory.filter((item) => item.availability_status === "maintenance");
    return (
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <Section title="Maintenance" description="Track gear service, repairs, and items currently marked under maintenance.">
                <div className="mb-5 grid gap-3 md:grid-cols-2">
                    <StatCard label="Maintenance Logs" value={data.maintenanceLogs.length.toString()} />
                    <StatCard label="Items In Maintenance" value={maintenanceInventory.length.toString()} />
                </div>
                <div className="space-y-3">
                    {data.maintenanceLogs.map((log) => (
                        <div key={log.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <h3 className="font-black text-stone-900">{log.title}</h3>
                                    <p className="text-sm text-stone-500">{log.equipment_name || "General maintenance"} · {log.maintenance_date ? formatDate(log.maintenance_date) : "No date"}</p>
                                </div>
                                <span className="w-fit rounded-full bg-violet-50 px-3 py-1 text-xs font-black uppercase text-violet-700">{log.status.replace(/_/g, " ")}</span>
                            </div>
                            <p className="mt-3 text-sm text-stone-600">{log.notes || "No notes"}</p>
                            <button type="button" onClick={() => onEdit(log)} className="mt-4 rounded-xl bg-stone-900 px-3 py-2 text-xs font-bold text-white">Edit</button>
                        </div>
                    ))}
                    {data.maintenanceLogs.length === 0 ? <EmptyState text="No maintenance logs yet. Add service records for cameras, lights, drones, and audio gear." /> : null}
                </div>
            </Section>
            <MaintenanceForm log={editingLog} inventory={data.inventory} isPending={isPending} onSubmit={onSubmit} onCancel={onCancel} />
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

function OperatorForm({
    operator,
    isPending,
    onSubmit,
    onCancel,
}: {
    operator: VendorOperator | null;
    isPending: boolean;
    onSubmit: (formData: FormData) => void;
    onCancel: () => void;
}) {
    return (
        <form action={onSubmit} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-xl font-black text-stone-900">{operator ? "Edit Operator" : "Add Operator"}</h2>
            <input type="hidden" name="id" value={operator?.id || ""} />
            <div className="mt-5 space-y-4">
                <Field label="Name" name="name" defaultValue={operator?.name || ""} required />
                <Field label="Role" name="role" defaultValue={operator?.role || ""} placeholder="Drone pilot, camera operator, lighting technician" required />
                <Field label="Phone" name="phone" defaultValue={operator?.phone || ""} />
                <Field label="Skills" name="skills" defaultValue={operator?.skills.join(", ") || ""} placeholder="Drone, gimbal, lighting setup" />
                <label className="block">
                    <span className="mb-1 block text-sm font-bold text-stone-700">Notes</span>
                    <textarea name="notes" rows={3} defaultValue={operator?.notes || ""} className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-violet-500" />
                </label>
                <Checkbox name="available_for_bookings" label="Available for rental bookings" defaultChecked={operator?.available_for_bookings ?? true} />
                <div className="flex gap-2">
                    <button disabled={isPending} className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{isPending ? "Saving..." : "Save Operator"}</button>
                    {operator ? <button type="button" onClick={onCancel} className="rounded-xl bg-stone-100 px-4 py-3 text-sm font-black text-stone-700">Cancel</button> : null}
                </div>
            </div>
        </form>
    );
}

function MaintenanceForm({
    log,
    inventory,
    isPending,
    onSubmit,
    onCancel,
}: {
    log: VendorMaintenanceLog | null;
    inventory: VendorInventoryItem[];
    isPending: boolean;
    onSubmit: (formData: FormData) => void;
    onCancel: () => void;
}) {
    return (
        <form action={onSubmit} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-xl font-black text-stone-900">{log ? "Edit Maintenance" : "Add Maintenance"}</h2>
            <input type="hidden" name="id" value={log?.id || ""} />
            <div className="mt-5 space-y-4">
                <Field label="Title" name="title" defaultValue={log?.title || ""} placeholder="Lens cleaning, drone propeller replacement" required />
                <label className="block">
                    <span className="mb-1 block text-sm font-bold text-stone-700">Inventory Item</span>
                    <select name="inventory_id" defaultValue={log?.inventory_id || ""} className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-violet-500">
                        <option value="">General / not tied to item</option>
                        {inventory.map((item) => <option key={item.id} value={item.id}>{item.equipment_name}</option>)}
                    </select>
                </label>
                <label className="block">
                    <span className="mb-1 block text-sm font-bold text-stone-700">Status</span>
                    <select name="status" defaultValue={log?.status || "scheduled"} className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-violet-500">
                        <option value="scheduled">Scheduled</option>
                        <option value="in_progress">In progress</option>
                        <option value="completed">Completed</option>
                    </select>
                </label>
                <Field label="Maintenance Date" name="maintenance_date" type="date" defaultValue={log?.maintenance_date || ""} />
                <label className="block">
                    <span className="mb-1 block text-sm font-bold text-stone-700">Notes</span>
                    <textarea name="notes" rows={3} defaultValue={log?.notes || ""} className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-violet-500" />
                </label>
                <div className="flex gap-2">
                    <button disabled={isPending} className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{isPending ? "Saving..." : "Save Maintenance"}</button>
                    {log ? <button type="button" onClick={onCancel} className="rounded-xl bg-stone-100 px-4 py-3 text-sm font-black text-stone-700">Cancel</button> : null}
                </div>
            </div>
        </form>
    );
}

function VendorProfileForm({
    data,
    isPending,
    onSubmit,
    compact = false,
    title = "Vendor Settings",
}: {
    data: VendorDashboardData;
    isPending: boolean;
    onSubmit: (formData: FormData) => void;
    compact?: boolean;
    title?: string;
}) {
    const selectedCategories = data.vendor?.equipment_categories || [];
    return (
        <form action={onSubmit} className="space-y-6">
            <Section title={title} description="Update only safe rental-business fields. Admin verification remains read-only.">
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
            {!compact ? null : (
                <p className="text-xs font-semibold text-stone-500">For business identity and category changes, use Settings.</p>
            )}
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

function formatDate(value: string) {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

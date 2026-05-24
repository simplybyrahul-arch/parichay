"use client";

import { verifyCreator, verifyEquipmentVendor } from "@/app/actions/admin";
import { CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type UserData = {
    id: string;
    full_name: string | null;
    account_type: string;
    created_at: string;
    creator_verified: boolean;
    creator_role?: string;
    creator_city?: string | null;
    creator_phone?: string | null;
    creator_whatsapp_phone?: string | null;
    creator_day_rate?: number | null;
    creator_available_for_booking?: boolean | null;
    creator_travel_enabled?: boolean | null;
    creator_service_cities?: string[] | null;
    provider_verified?: boolean;
    provider_type?: string | null;
    provider_subtype?: string | null;
    provider_business_name?: string | null;
    provider_city?: string | null;
    provider_state?: string | null;
    vendor_phone?: string | null;
    vendor_whatsapp_phone?: string | null;
    vendor_delivery_available?: boolean | null;
    vendor_operator_support_available?: boolean | null;
    vendor_equipment_categories?: string[] | null;
};

export const UsersTable = ({ users }: { users: UserData[] }) => {
    const router = useRouter();
    const [tableUsers, setTableUsers] = useState(users);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleVerifyToggle = async (userId: string, currentStatus: boolean) => {
        setLoadingId(userId);
        try {
            await verifyCreator(userId, !currentStatus);
            setTableUsers((currentUsers) => currentUsers.map((user) => (
                user.id === userId ? { ...user, creator_verified: !currentStatus } : user
            )));
            router.refresh();
            toast.success(`Creator ${!currentStatus ? 'verified' : 'unverified'} successfully`);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to update status");
        } finally {
            setLoadingId(null);
        }
    };

    const handleVendorVerifyToggle = async (userId: string, currentStatus: boolean) => {
        setLoadingId(userId);
        try {
            await verifyEquipmentVendor(userId, !currentStatus);
            setTableUsers((currentUsers) => currentUsers.map((user) => (
                user.id === userId ? { ...user, provider_verified: !currentStatus } : user
            )));
            router.refresh();
            toast.success(`Equipment vendor ${!currentStatus ? 'verified' : 'unverified'} successfully`);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to update vendor status");
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-stone-600">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-900">
                        <tr>
                            <th className="px-6 py-4 font-semibold">User</th>
                            <th className="px-6 py-4 font-semibold">Role</th>
                            <th className="px-6 py-4 font-semibold">Account Type</th>
                            <th className="px-6 py-4 font-semibold">Verification</th>
                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {tableUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-stone-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-stone-900">{user.full_name || "Unknown"}</div>
                                    <div className="text-xs text-stone-500 mt-0.5">{new Date(user.created_at).toLocaleDateString()}</div>
                                </td>
                                <td className="px-6 py-4">
                                    {user.account_type === 'creator' ? (
                                        <div className="space-y-1">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                {user.creator_role || 'Creator'}
                                            </span>
                                            <div className="text-xs text-stone-500">
                                                {user.creator_city || "City not set"} · Rs {(user.creator_day_rate || 0).toLocaleString("en-IN")}/day
                                            </div>
                                            <div className="text-xs text-stone-500">
                                                Phone: {user.creator_phone || user.creator_whatsapp_phone || "Not set"}
                                            </div>
                                            <div className="text-xs text-stone-500">
                                                {user.creator_available_for_booking === false ? "Unavailable" : "Available"} · {user.creator_travel_enabled ? "Travel enabled" : "Local only"}
                                            </div>
                                            {user.creator_service_cities?.length ? (
                                                <div className="text-xs text-stone-500">Cities: {user.creator_service_cities.join(", ")}</div>
                                            ) : null}
                                        </div>
                                    ) : user.account_type === 'equipment_vendor' ? (
                                        <div className="space-y-1">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
                                                Equipment Vendor
                                            </span>
                                            <div className="text-xs text-stone-500">
                                                {user.provider_business_name || user.full_name || "Business not set"}
                                            </div>
                                            <div className="text-xs text-stone-500">
                                                {[user.provider_city, user.provider_state].filter(Boolean).join(", ") || "City not set"}
                                            </div>
                                            <div className="text-xs text-stone-500">
                                                Phone: {user.vendor_phone || user.vendor_whatsapp_phone || "Not set"}
                                            </div>
                                            <div className="text-xs text-stone-500">
                                                {user.vendor_delivery_available ? "Delivery available" : "Pickup/local only"} Â· {user.vendor_operator_support_available ? "Operator support" : "No operator support"}
                                            </div>
                                            {user.vendor_equipment_categories?.length ? (
                                                <div className="text-xs text-stone-500">Categories: {user.vendor_equipment_categories.join(", ")}</div>
                                            ) : null}
                                        </div>
                                    ) : (
                                        <span className="text-stone-400">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 capitalize">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                        user.account_type === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                        user.account_type === 'creator' ? 'bg-stone-100 text-stone-700 border-stone-200' :
                                        user.account_type === 'equipment_vendor' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                                        'bg-orange-50 text-orange-700 border-orange-200'
                                    }`}>
                                        {user.account_type}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {user.account_type === 'creator' ? (
                                        user.creator_verified ? (
                                            <div className="flex items-center gap-1.5 text-green-600">
                                                <CheckCircle className="w-4 h-4" />
                                                <span className="font-medium">Verified</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-stone-400">
                                                <XCircle className="w-4 h-4" />
                                                <span>Unverified</span>
                                            </div>
                                        )
                                    ) : user.account_type === 'equipment_vendor' ? (
                                        user.provider_verified ? (
                                            <div className="flex items-center gap-1.5 text-green-600">
                                                <CheckCircle className="w-4 h-4" />
                                                <span className="font-medium">Verified</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-stone-400">
                                                <XCircle className="w-4 h-4" />
                                                <span>Unverified</span>
                                            </div>
                                        )
                                    ) : (
                                        <span className="text-stone-400">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {user.account_type === 'creator' && (
                                        <button
                                            onClick={() => handleVerifyToggle(user.id, user.creator_verified)}
                                            disabled={loadingId === user.id}
                                            className="text-sm font-medium text-orange-600 hover:text-orange-700 disabled:opacity-50 transition-colors"
                                        >
                                            {loadingId === user.id ? "Processing..." : (user.creator_verified ? "Revoke" : "Verify")}
                                        </button>
                                    )}
                                    {user.account_type === 'equipment_vendor' && (
                                        <button
                                            onClick={() => handleVendorVerifyToggle(user.id, Boolean(user.provider_verified))}
                                            disabled={loadingId === user.id}
                                            className="text-sm font-medium text-violet-600 hover:text-violet-700 disabled:opacity-50 transition-colors"
                                        >
                                            {loadingId === user.id ? "Processing..." : (user.provider_verified ? "Revoke" : "Verify")}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {tableUsers.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-stone-500">
                                    No users found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

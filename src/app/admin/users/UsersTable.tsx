"use client";

import { verifyCreator } from "@/app/actions/admin";
import { CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type UserData = {
    id: string;
    full_name: string | null;
    account_type: string;
    created_at: string;
    creator_verified: boolean;
    creator_role?: string;
};

export const UsersTable = ({ users }: { users: UserData[] }) => {
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleVerifyToggle = async (userId: string, currentStatus: boolean) => {
        setLoadingId(userId);
        try {
            await verifyCreator(userId, !currentStatus);
            toast.success(`Creator ${!currentStatus ? 'verified' : 'unverified'} successfully`);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to update status");
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
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-stone-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-stone-900">{user.full_name || "Unknown"}</div>
                                    <div className="text-xs text-stone-500 mt-0.5">{new Date(user.created_at).toLocaleDateString()}</div>
                                </td>
                                <td className="px-6 py-4">
                                    {user.account_type === 'creator' ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                            {user.creator_role || 'Creator'}
                                        </span>
                                    ) : (
                                        <span className="text-stone-400">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 capitalize">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                        user.account_type === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                        user.account_type === 'creator' ? 'bg-stone-100 text-stone-700 border-stone-200' :
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
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
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

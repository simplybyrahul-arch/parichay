import { Settings as SettingsIcon } from "lucide-react";
import { RoleSettingsPanel } from "@/components/settings/RoleSettingsPanel";

export default function AdminSettingsPage() {
    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex items-center gap-3 border-b border-stone-200 pb-6 mb-8 mt-2">
                <div className="p-3 bg-orange-100/50 text-orange-600 rounded-xl">
                    <SettingsIcon className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Admin Settings</h2>
                    <p className="text-stone-500 mt-1">Manage admin profile, platform preferences, notifications, and security.</p>
                </div>
            </div>

            <RoleSettingsPanel role="admin" />
        </div>
    );
}

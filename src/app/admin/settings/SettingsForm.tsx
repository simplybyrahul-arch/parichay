"use client";

import { updateSetting } from "@/app/actions/settings";
import { useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";

type Setting = {
    key: string;
    value: string;
    description: string;
};

export const SettingsForm = ({ settings }: { settings: Setting[] }) => {
    const [localSettings, setLocalSettings] = useState<Record<string, string>>(
        settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {})
    );
    const [savingKey, setSavingKey] = useState<string | null>(null);

    const handleSave = async (key: string) => {
        setSavingKey(key);
        try {
            await updateSetting(key, localSettings[key]);
            toast.success("Setting updated safely");
        } catch (error: any) {
            toast.error(error.message || "Failed to update setting");
            // Revert on fail
            setLocalSettings(prev => ({
                ...prev,
                [key]: settings.find(s => s.key === key)?.value || ""
            }));
        } finally {
            setSavingKey(null);
        }
    };

    const handleChange = (key: string, value: string) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="space-y-6">
            {settings.map((setting) => {
                const isDirty = localSettings[setting.key] !== setting.value;
                const isBoolean = setting.value === 'true' || setting.value === 'false';

                return (
                    <div key={setting.key} className="bg-white p-6 rounded-2xl border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-stone-900 tracking-tight capitalize">
                                {setting.key.replace(/_/g, ' ')}
                            </h3>
                            <p className="text-sm text-stone-500 mt-1">{setting.description}</p>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            {isBoolean ? (
                                <select 
                                    className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-500 outline-none"
                                    value={localSettings[setting.key]}
                                    onChange={(e) => handleChange(setting.key, e.target.value)}
                                >
                                    <option value="true">Enabled</option>
                                    <option value="false">Disabled</option>
                                </select>
                            ) : (
                                <input 
                                    type="text"
                                    className="px-4 py-2 w-32 bg-stone-50 border border-stone-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-500 outline-none"
                                    value={localSettings[setting.key]}
                                    onChange={(e) => handleChange(setting.key, e.target.value)}
                                />
                            )}
                            
                            <button
                                onClick={() => handleSave(setting.key)}
                                disabled={!isDirty || savingKey === setting.key}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    isDirty 
                                    ? "bg-orange-600 text-white hover:bg-orange-700 shadow-sm" 
                                    : "bg-stone-100 text-stone-400 cursor-not-allowed"
                                }`}
                            >
                                <Save className="w-4 h-4" />
                                {savingKey === setting.key ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

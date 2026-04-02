import { createClient } from "@/utils/supabase/server";
import { SettingsForm } from "./SettingsForm";
import { Settings as SettingsIcon } from "lucide-react";

export default async function AdminSettingsPage() {
    const supabase = await createClient();

    // Fetch platform settings
    const { data: settings } = await supabase
        .from("platform_settings")
        .select("*")
        .order("key", { ascending: true });

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex items-center gap-3 border-b border-stone-200 pb-6 mb-8 mt-2">
                <div className="p-3 bg-orange-100/50 text-orange-600 rounded-xl">
                    <SettingsIcon className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Platform Settings</h2>
                    <p className="text-stone-500 mt-1">Configure global parameters and security thresholds.</p>
                </div>
            </div>

            <SettingsForm settings={settings || []} />
            
            {!settings?.length && (
                <div className="p-8 text-center text-stone-500 bg-stone-50 rounded-2xl border border-stone-200 border-dashed">
                    Run the database migration to view settings.
                </div>
            )}
        </div>
    );
}

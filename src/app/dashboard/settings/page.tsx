import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { RoleSettingsPanel } from "@/components/settings/RoleSettingsPanel";

export default function ClientSettingsPage() {
    return (
        <main className="min-h-screen bg-stone-50 px-6 py-10">
            <div className="mx-auto max-w-5xl space-y-6">
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-stone-600 hover:text-orange-600">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
                </Link>
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-orange-100/60 p-3 text-orange-600">
                        <Settings className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-stone-900">Account Settings</h1>
                        <p className="text-stone-500">Manage your profile, notifications, and security preferences.</p>
                    </div>
                </div>
                <RoleSettingsPanel role="client" />
            </div>
        </main>
    );
}

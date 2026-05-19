import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { RoleSettingsPanel } from "@/components/settings/RoleSettingsPanel";

export default function CreatorSettingsPage() {
    return (
        <main className="min-h-screen bg-stone-50 px-6 py-10">
            <div className="mx-auto max-w-5xl space-y-6">
                <Link href="/creator-dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-stone-600 hover:text-rose-600">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Creator Dashboard
                </Link>
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-rose-100/60 p-3 text-rose-600">
                        <Settings className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-stone-900">Creator Settings</h1>
                        <p className="text-stone-500">Manage your creator profile, availability, services, and notifications.</p>
                    </div>
                </div>
                <RoleSettingsPanel role="creator" />
            </div>
        </main>
    );
}

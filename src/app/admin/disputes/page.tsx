import { ShieldAlert, LifeBuoy } from "lucide-react";

export default function AdminDisputesPage() {
    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex items-center gap-3 border-b border-stone-200 pb-6 mb-8 mt-2">
                <div className="p-3 bg-rose-100/50 text-rose-600 rounded-xl">
                    <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Active Disputes</h2>
                    <p className="text-stone-500 mt-1">Review flagged Escrow payments and manually resolve conflicts.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mb-4 border border-stone-100">
                    <LifeBuoy className="w-8 h-8 text-stone-300" />
                </div>
                <h3 className="text-lg font-bold text-stone-900 mb-2">No Active Disputes</h3>
                <p className="text-stone-500 max-w-md mx-auto">
                    There are currently no disputes between clients and creators. All Escrow payments are progressing normally.
                </p>
                <div className="mt-8 pt-8 border-t border-stone-100 w-full text-sm text-stone-400">
                    Disputes raised via support emails will automatically populate here in future iterations.
                </div>
            </div>
        </div>
    );
}

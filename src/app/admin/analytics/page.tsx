import { createClient } from "@/utils/supabase/server";
import { AnalyticsCharts } from "./AnalyticsCharts";
import { LineChart as ChartIcon } from "lucide-react";

export default async function AnalyticsPage() {
    const supabase = await createClient();

    // Fetch projects to group by date
    const { data: projects } = await supabase
        .from("projects")
        .select("created_at")
        .order("created_at", { ascending: true });

    // Process projects
    const projectMap = new Map<string, number>();
    projects?.forEach(p => {
        const date = new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        projectMap.set(date, (projectMap.get(date) || 0) + 1);
    });
    
    const projectData = Array.from(projectMap.entries()).map(([date, count]) => ({ date, count }));

    // Fetch payments to group by date
    const { data: payments } = await supabase
        .from("payments")
        .select("amount, created_at, status")
        .eq("status", "captured")
        .order("created_at", { ascending: true });

    // Process payments (in rupees)
    const paymentMap = new Map<string, number>();
    payments?.forEach(p => {
        const date = new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        paymentMap.set(date, (paymentMap.get(date) || 0) + (p.amount / 100));
    });

    const paymentData = Array.from(paymentMap.entries()).map(([date, amount]) => ({ date, amount }));

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-stone-200 pb-6 mb-8 mt-2">
                <div className="p-3 bg-purple-100/50 text-purple-600 rounded-xl">
                    <ChartIcon className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Advanced Analytics</h2>
                    <p className="text-stone-500 mt-1">Visualize platform growth and escrow volume over time.</p>
                </div>
            </div>

            <AnalyticsCharts projectData={projectData} paymentData={paymentData} />
        </div>
    );
}

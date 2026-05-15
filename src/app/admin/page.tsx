import { createClient } from "@/utils/supabase/server";
import { Users, Briefcase, IndianRupee, ShieldCheck } from "lucide-react";

export default async function AdminDashboard() {
    const supabase = await createClient();

    const { count: totalUsers } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });

    const { count: activeCreators } = await supabase
        .from("creators")
        .select("*", { count: "exact", head: true });

    const { count: activeProjects } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .in("status", ["funded", "in_progress"]);

    const { data: payments } = await supabase
        .from("payments")
        .select("amount")
        .eq("status", "captured");

    const totalPayments = payments?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

    const stats = [
        {
            name: "Total Users",
            value: totalUsers || 0,
            icon: Users,
            description: "Registered across the platform",
        },
        {
            name: "Active Creators",
            value: activeCreators || 0,
            icon: ShieldCheck,
            description: "Ready for bookings",
        },
        {
            name: "Active Projects",
            value: activeProjects || 0,
            icon: Briefcase,
            description: "Currently funded or in progress",
        },
        {
            name: "Total Payment Vol",
            value: `₹${(totalPayments / 100).toLocaleString('en-IN')}`, // Amount is in paise
            icon: IndianRupee,
            description: "Captured and secured",
        },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Overview</h2>
                <p className="text-stone-500 mt-1">High-level metrics for your marketplace.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <div
                        key={stat.name}
                        className="bg-white overflow-hidden rounded-2xl border border-stone-200 shadow-sm p-6"
                    >
                        <div className="flex items-center gap-4 border-b border-stone-100 pb-4 mb-4">
                            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-stone-500">{stat.name}</p>
                                <p className="text-3xl font-bold text-stone-900 tracking-tight">{stat.value}</p>
                            </div>
                        </div>
                        <p className="text-sm font-medium text-stone-500">{stat.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

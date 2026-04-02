"use client";
import { LayoutDashboard, Users, FolderKanban, IndianRupee, LogOut, LineChart, ShieldAlert, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const handleLogout = useCallback(async () => {
        try {
            await supabase.auth.signOut();
            toast.success("Logged out successfully");
            router.push("/login");
            router.refresh();
        } catch (error) {
            toast.error("Failed to log out");
        }
    }, [supabase, router]);

    const navItems = [
        { href: "/admin", label: "Overview", icon: LayoutDashboard },
        { href: "/admin/analytics", label: "Analytics", icon: LineChart },
        { href: "/admin/users", label: "Users", icon: Users },
        { href: "/admin/projects", label: "Projects", icon: FolderKanban },
        { href: "/admin/payments", label: "Ledger", icon: IndianRupee },
        { href: "/admin/disputes", label: "Disputes", icon: ShieldAlert },
        { href: "/admin/settings", label: "Settings", icon: Settings },
    ];

    return (
        <div className="flex min-h-screen bg-stone-50">
            <aside className="w-64 bg-white border-r border-stone-200 hidden md:flex flex-col fixed inset-y-0 z-10">
                <div className="h-16 flex items-center px-6 border-b border-stone-200 text-stone-900 font-bold text-xl tracking-tight">
                    ShotcutCrew Admin
                </div>
                <nav className="flex-1 py-4 px-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    isActive
                                        ? "bg-orange-50 text-orange-700"
                                        : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                                }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? "text-orange-600" : "text-stone-400"}`} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="p-4 border-t border-stone-200">
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-stone-600 hover:bg-rose-50 hover:text-rose-600 transition-colors group"
                    >
                        <LogOut className="w-5 h-5 text-stone-400 group-hover:text-rose-500" />
                        Sign Out
                    </button>
                </div>
            </aside>

            <main className="flex-1 flex flex-col min-w-0 md:pl-64">
                <div className="h-16 flex items-center px-8 border-b border-stone-200 bg-white sticky top-0 z-10">
                    <h1 className="text-xl font-semibold text-stone-800 tracking-tight">
                        {navItems.find(item => item.href === pathname)?.label || "Admin Panel"}
                    </h1>
                </div>
                <div className="flex-1 p-8 overflow-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import {
    LayoutDashboard,
    Briefcase,
    MessageSquare,
    CreditCard,
    Settings,
    Bell,
    Search,
    MoreVertical,
    CheckCircle,
    Clock,
    AlertCircle,
    LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { toast } from "sonner";
import { logout } from "../actions/auth";
import { BrandLogo } from "@/components/BrandLogo";

type Project = {
    id: string;
    title: string;
    budget: number;
    status: string;
    created_at: string;
};

type RazorpaySuccessResponse = {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
};

type RazorpayFailureResponse = {
    error?: {
        description?: string;
    };
};

type RazorpayOptions = {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    handler: (response: RazorpaySuccessResponse) => Promise<void>;
    prefill: {
        name: string;
        email: string;
    };
    theme: {
        color: string;
    };
};

type RazorpayInstance = {
    on: (event: 'payment.failed', handler: (response: RazorpayFailureResponse) => void) => void;
    open: () => void;
};

type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

type WindowWithRazorpay = Window & {
    Razorpay?: RazorpayConstructor;
};

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState("overview");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Auth State
    const [userEmail, setUserEmail] = useState<string | null>("Loading...");
    const [userId, setUserId] = useState<string | null>(null);
    const supabase = createClient();
    const router = useRouter();

    // Data State using SWR for caching
    const fetcher = async (uid: string) => {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('client_id', uid)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    };

    const { data: projects = [], isValidating: loading, mutate } = useSWR(
        userId ? ['projects', userId] : null,
        ([, uid]) => fetcher(uid as string)
    );

    const [isFunding, setIsFunding] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email ?? "User");
                setUserId(user.id);
            } else {
                setUserEmail("Unknown User");
                router.push("/login");
            }
        };
        fetchUserData();
    }, [supabase, router]);

    const handleLogout = async () => {
        await logout();
    };

    const handleFundEscrow = async (project: Project) => {
        setIsFunding(project.id);
        const toastId = toast.loading("Initializing secure escrow payment...");

        try {
            // 1. Create order on the server
            const orderRes = await fetch('/api/razorpay/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: project.id })
            });

            const orderData = await orderRes.json();

            if (!orderRes.ok) {
                throw new Error(orderData.error || "Failed to create order");
            }

            // 2. Initialize Razorpay Checkout
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_placeholder",
                amount: orderData.amount,
                currency: orderData.currency,
                name: "ShotcutCrew Creative Escrow",
                description: `Funding for Project: ${project.title}`,
                order_id: orderData.orderId,
                handler: async function (response: RazorpaySuccessResponse) {
                    toast.loading("Verifying payment...", { id: toastId });

                    // 3. Verify Payment
                    const verifyRes = await fetch('/api/razorpay/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            projectId: project.id
                        })
                    });

                    const verifyData = await verifyRes.json();

                    if (verifyRes.ok && verifyData.success) {
                        toast.success("Successfully funded Escrow! Developer will be notified.", { id: toastId });
                        mutate(); // refresh data via SWR
                    } else {
                        toast.error(verifyData.error || "Verification failed", { id: toastId });
                    }
                },
                prefill: {
                    name: userEmail?.split('@')[0] || "Client",
                    email: userEmail || ""
                },
                theme: {
                    color: "#f97316" // Orange-500
                }
            };

            const razorpay = (window as WindowWithRazorpay).Razorpay;
            if (!razorpay) {
                throw new Error("Payment gateway is not available right now.");
            }
            const rzp = new razorpay(options);

            rzp.on('payment.failed', function (response: RazorpayFailureResponse) {
                toast.error(`Payment Failed: ${response.error?.description || "Unknown"}`, { id: toastId });
            });

            rzp.open();
            toast.dismiss(toastId);

        } catch (error: unknown) {
            console.error("Funding error:", error);
            toast.error((error as Error).message || "Something went wrong", { id: toastId });
        } finally {
            setIsFunding(null);
        }
    };

    const formatProjectDate = (value: string) => {
        return new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: "UTC",
        }).format(new Date(value));
    };

    // Calculate Dynamic Stats
    const activeProjectCount = projects.filter(p => !['completed', 'cancelled'].includes(p.status)).length;
    const totalSpent = projects.reduce((acc, curr) => acc + curr.budget, 0);

    const renderSidebarContent = () => (
        <>
            <div
                onClick={() => router.push('/')}
                className="p-6 border-b border-stone-100 cursor-pointer flex justify-between items-center"
            >
                <BrandLogo href="/" width={170} height={50} className="h-auto w-[140px] md:w-[170px]" priority />
                <button aria-label="Close sidebar" title="Close sidebar" className="md:hidden text-stone-400" onClick={() => setMobileMenuOpen(false)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </button>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                <NavItem
                    icon={<LayoutDashboard className="w-5 h-5" />}
                    label="Overview"
                    isActive={activeTab === "overview"}
                    onClick={() => { setActiveTab("overview"); setMobileMenuOpen(false); }}
                />
                <NavItem
                    icon={<Briefcase className="w-5 h-5" />}
                    label="Projects"
                    isActive={activeTab === "projects"}
                    onClick={() => { setActiveTab("projects"); setMobileMenuOpen(false); }}
                    badge={activeProjectCount.toString()}
                />
                <NavItem
                    icon={<MessageSquare className="w-5 h-5" />}
                    label="Messages"
                    isActive={activeTab === "messages"}
                    onClick={() => { setActiveTab("messages"); setMobileMenuOpen(false); }}
                    badge="0"
                />
                <NavItem
                    icon={<CreditCard className="w-5 h-5" />}
                    label="Billing & Escrow"
                    isActive={activeTab === "billing"}
                    onClick={() => { setActiveTab("billing"); setMobileMenuOpen(false); }}
                />
            </nav>

            <div className="p-4 border-t border-stone-100">
                <NavItem
                    icon={<Settings className="w-5 h-5" />}
                    label="Settings"
                    isActive={activeTab === "settings"}
                    onClick={() => { setActiveTab("settings"); setMobileMenuOpen(false); }}
                />

                <button
                    onClick={handleLogout}
                    className="w-full mt-2 flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-600 transition-colors font-medium text-sm"
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </button>

                {/* User Profile Snippet */}
                <div className="mt-4 flex items-center gap-3 px-2 py-2 rounded-xl bg-stone-50 transition-colors">
                    <div className="w-9 h-9 flex-shrink-0 bg-stone-200 text-stone-600 rounded-full flex items-center justify-center font-bold text-sm uppercase">
                        {userEmail?.charAt(0) || "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-stone-900 truncate" title={userEmail || ""}>{userEmail}</p>
                        <p className="text-xs text-stone-500 truncate">ShotcutCrew Account</p>
                    </div>
                </div>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-[#fdfbfb] flex flex-col md:flex-row">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

            {/* Sidebar (Desktop) */}
            <aside className="w-64 bg-white border-r border-stone-100 hidden md:flex flex-col h-screen sticky top-0">
                {renderSidebarContent()}
            </aside>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)}
                            className="fixed inset-0 bg-stone-900/50 z-40 md:hidden"
                        />
                        <motion.aside
                            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 w-80 max-w-[80vw] bg-white border-r border-stone-100 flex flex-col z-50 md:hidden"
                        >
                            {renderSidebarContent()}
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-h-screen max-w-full">

                {/* Top Header */}
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-stone-100 flex items-center justify-between px-6 sticky top-0 z-20">
                    <div className="flex items-center gap-4 flex-1">
                        {/* Mobile Menu Toggle */}
                        <button aria-label="Open sidebar" title="Open sidebar" onClick={() => setMobileMenuOpen(true)} className="md:hidden p-2 -ml-2 text-stone-600 hover:bg-stone-100 rounded-lg">
                            <MoreVertical className="w-5 h-5" />
                        </button>

                        <div className="relative max-w-md w-full hidden sm:block">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                                suppressHydrationWarning
                                type="text"
                                placeholder="Search projects, creators, or messages..."
                                className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-full text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            suppressHydrationWarning
                            aria-label="Open notifications"
                            title="Open notifications"
                            onClick={() => setActiveTab("notifications")}
                            className="w-10 h-10 rounded-full bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-colors relative"
                        >
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                        </button>
                        <button suppressHydrationWarning onClick={() => router.push('/book')} className="px-5 py-2 hidden sm:flex bg-orange-600 text-white text-sm font-bold rounded-full hover:bg-orange-700 transition-colors items-center gap-2">
                            New Project
                        </button>
                    </div>
                </header>

                {/* Dashboard Content */}
                <div className="flex-1 p-6 md:p-8">
                    <div className="max-w-5xl mx-auto space-y-8">

                        {activeTab === "overview" && (
                            <>
                                {/* Greeting */}
                                <div>
                                    <h1 className="text-3xl font-black text-stone-900 font-display tracking-tight mb-2">Welcome back!</h1>
                                    <p className="text-stone-500">You have {activeProjectCount} active project(s).</p>
                                </div>

                                {/* Quick Stats Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <StatCard title="Total Committed" value={`₹${totalSpent.toLocaleString()}`} trend="Lifetime volume" icon={<CreditCard className="w-5 h-5 text-orange-600" />} />
                                    <StatCard title="Active Projects" value={activeProjectCount.toString()} trend="Currently ongoing" icon={<Briefcase className="w-5 h-5 text-blue-600" />} />
                                    <StatCard title="Escrow Balance" value="₹0" trend="Awaiting milestone" icon={<LayoutDashboard className="w-5 h-5 text-green-600" />} />
                                </div>

                                {/* Active Projects List */}
                                <section>
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-bold text-stone-900 font-display">Active Projects</h2>
                                        <button
                                            suppressHydrationWarning
                                            onClick={() => setActiveTab("projects")}
                                            className="text-sm font-semibold text-orange-600 hover:text-orange-700"
                                        >
                                            View All
                                        </button>
                                    </div>

                                    {loading ? (
                                        <div className="text-center py-12 bg-white rounded-2xl border border-stone-100">
                                            <div className="w-8 h-8 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin mx-auto mb-4"></div>
                                            <p className="text-stone-500 font-medium">Loading your projects...</p>
                                        </div>
                                    ) : projects.length === 0 ? (
                                        <div className="text-center py-16 bg-white rounded-2xl border border-stone-100 shadow-sm">
                                            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Briefcase className="w-8 h-8" />
                                            </div>
                                            <h3 className="text-xl font-bold text-stone-900 mb-2 font-display">No projects yet</h3>
                                            <p className="text-stone-500 max-w-sm mx-auto mb-6">You haven&apos;t booked any creators or started any projects yet.</p>
                                            <button suppressHydrationWarning onClick={() => router.push('/book')} className="px-6 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors inline-flex items-center gap-2">
                                                Start a New Project
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {projects.map((project) => (
                                                <div
                                                    key={project.id}
                                                    onClick={() => router.push(`/dashboard/${project.id}`)}
                                                    className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all group flex flex-col lg:flex-row gap-6 lg:items-center cursor-pointer"
                                                >
                                                    {/* Project Info */}
                                                    <div className="flex-1 flex gap-4">
                                                        <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0 font-display font-bold text-xs ring-1 ring-orange-100 uppercase">
                                                            {project.status.slice(0, 2)}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-stone-900 text-lg mb-1 group-hover:text-orange-600 transition-colors line-clamp-1">{project.title}</h3>
                                                            <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-stone-500">
                                                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatProjectDate(project.created_at)}</span>
                                                                <span className="w-1 h-1 bg-stone-300 rounded-full" />
                                                                <span className="text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md truncate max-w-[150px]">{project.description}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Milestone Status */}
                                                    <div className="flex-1 lg:max-w-xs">
                                                        <div className="flex justify-between text-xs font-medium mb-2 uppercase tracking-wide">
                                                            <span className="text-stone-500">Status</span>
                                                            <span className={project.status === 'pending' ? 'text-orange-500 font-bold' : 'text-blue-600 font-bold'}>{project.status}</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${project.status === 'pending' ? 'bg-orange-400 w-1/4' : 'bg-blue-500 w-1/2'}`} />
                                                        </div>
                                                    </div>

                                                    {/* Escrow & Action */}
                                                    <div className="flex items-center justify-between lg:justify-end gap-6 lg:w-48">
                                                        <div className="text-right flex-1">
                                                            <div className="font-bold text-stone-900">₹{project.budget.toLocaleString()}</div>
                                                            <div className={`text-[10px] font-bold uppercase tracking-wider ${project.status === 'pending' ? 'text-amber-500' : 'text-green-600'}`}>
                                                                {project.status === 'pending' ? '○ Unfunded' : '● Funded'}
                                                            </div>
                                                        </div>
                                                        {project.status === 'pending' ? (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleFundEscrow(project); }}
                                                                disabled={isFunding === project.id}
                                                                className="px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                                                            >
                                                                {isFunding === project.id ? "Securing..." : "Fund Escrow"}
                                                            </button>
                                                        ) : (
                                                            <ChevronRightIcon className="w-5 h-5 text-stone-400 group-hover:text-orange-500 transition-colors" />
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </>
                        )}

                        {activeTab === "projects" && (
                            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-stone-100 shadow-sm text-center">
                                <Briefcase className="w-16 h-16 text-orange-200 mb-4" />
                                <h2 className="text-2xl font-bold text-stone-900 mb-2">All Projects</h2>
                                <p className="text-stone-500 max-w-md">Browse through your entire history of creative projects, active bookings, and draft scopes.</p>
                            </div>
                        )}

                        {activeTab === "messages" && (
                            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-stone-100 shadow-sm text-center">
                                <MessageSquare className="w-16 h-16 text-orange-200 mb-4" />
                                <h2 className="text-2xl font-bold text-stone-900 mb-2">Direct Messages</h2>
                                <p className="text-stone-500 max-w-md">Communicate with creators, share files, and keep a clean record of all project-related chat threads.</p>
                            </div>
                        )}

                        {activeTab === "billing" && (
                            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-stone-100 shadow-sm text-center">
                                <CreditCard className="w-16 h-16 text-orange-200 mb-4" />
                                <h2 className="text-2xl font-bold text-stone-900 mb-2">Billing & Escrow</h2>
                                <p className="text-stone-500 max-w-md">Manage your payment methods, fund escrows safely, and review past invoices natively.</p>
                            </div>
                        )}

                        {activeTab === "settings" && (
                            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-stone-100 shadow-sm text-center">
                                <Settings className="w-16 h-16 text-orange-200 mb-4" />
                                <h2 className="text-2xl font-bold text-stone-900 mb-2">Account Settings</h2>
                                <p className="text-stone-500 max-w-md">Update your password, manage notification preferences, and configure your company profile.</p>
                            </div>
                        )}

                        {activeTab === "notifications" && (
                            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-stone-100 shadow-sm text-center">
                                <Bell className="w-16 h-16 text-orange-200 mb-4" />
                                <h2 className="text-2xl font-bold text-stone-900 mb-2">Notifications</h2>
                                <p className="text-stone-500 max-w-md">You have no new notifications.</p>
                            </div>
                        )}

                    </div>
                </div>
            </main>

        </div>
    );
}

// Helper Components
function NavItem({ icon, label, isActive, onClick, badge }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void, badge?: string }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-orange-50 text-orange-600 font-bold shadow-sm ring-1 ring-orange-500/10' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900 font-medium'}`}
        >
            <div className="flex items-center gap-3">
                <span className={isActive ? 'text-orange-500' : 'text-stone-400'}>{icon}</span>
                {label}
            </div>
            {badge && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-orange-600 text-white' : 'bg-stone-200 text-stone-600'}`}>
                    {badge}
                </span>
            )}
        </button>
    )
}

function StatCard({ title, value, trend, icon }: { title: string, value: string, trend: string, icon: React.ReactNode }) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center border border-stone-100">
                    {icon}
                </div>
                <MoreVertical className="w-4 h-4 text-stone-400" />
            </div>
            <div className="space-y-1">
                <h4 className="text-sm font-semibold text-stone-500">{title}</h4>
                <div className="text-2xl font-black text-stone-900 font-display tracking-tight">{value}</div>
                <div className="text-xs font-medium text-stone-400">{trend}</div>
            </div>
        </div>
    )
}

function ChevronRightIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m9 18 6-6-6-6" />
        </svg>
    )
}

"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import {
    LayoutDashboard,
    Wallet,
    MessageSquare,
    Calendar,
    Settings,
    Bell,
    Search,
    MoreVertical,
    Camera,
    CheckCircle,
    Clock,
    Inbox,
    Star,
    PenTool,
    Plus,
    Image as ImageIcon,
    LayoutTemplate,
    LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { logout } from "../actions/auth";
import { BrandLogo } from "@/components/BrandLogo";

export default function CreatorDashboard() {
    const [activeTab, setActiveTab] = useState("overview");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Auth State
    const [userEmail, setUserEmail] = useState<string | null>("Loading...");
    const [userId, setUserId] = useState<string | null>(null);
        const [creatorType, setCreatorType] = useState<string | null>(null);
    const supabase = createClient();
    const router = useRouter();

    const getRelativeTime = (value: string) => {
        const then = new Date(value).getTime();
        const now = Date.now();
        const diff = Math.max(0, now - then);
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return "Just now";
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return new Date(value).toLocaleDateString();
    };

    // Data fetcher for requests
    const fetchRequests = async () => {
        if (!userId) return [];

        const { data, error } = await supabase
            .from('projects')
            .select(`
                id, 
                title, 
                description, 
                budget, 
                status, 
                created_at,
                users!client_id(full_name)
            `)
            .eq('creator_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
            // Formatting data to match the UI expectation
            return data.map(req => {
                const clientName = Array.isArray(req.users)
                    ? (req.users[0] as { full_name?: string })?.full_name
                    : (req.users as { full_name?: string })?.full_name;

                return {
                    id: req.id,
                    client: clientName || "Unknown Client",
                    type: req.title,
                    role: req.description,
                    date: new Date(req.created_at).toLocaleDateString(),
                    budget: `₹${req.budget.toLocaleString()}`,
                    status: req.status === 'pending' ? 'New Request' : req.status,
                    timeAgo: getRelativeTime(req.created_at)
                };
            });
        }
        return [];
    };

    // Data fetcher for profile
    const fetchProfileData = async (uid: string) => {
        const { data, error } = await supabase.from('creators').select('bio, location, day_rate, portfolio_url, verified').eq('id', uid).single();
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "Row not found"
        return data || { bio: "", location: "", day_rate: 0, portfolio_url: "", verified: false };
    };

    // Editor Profile State
    const [bio, setBio] = useState("");
    const [location, setLocation] = useState("");
    const [dayRate, setDayRate] = useState<number | string>(0);
    const [portfolioUrl, setPortfolioUrl] = useState("");

    // SWR Hooks
    const { data: requests = [], isValidating: loading, mutate: mutateRequests } = useSWR(
        userId ? ['creator-requests', userId] : null,
        fetchRequests
    );

    const { data: profile } = useSWR(
        userId ? ['creator-profile', userId] : null,
        ([, uid]) => fetchProfileData(uid as string),
        {
            onSuccess: (data) => {
                setBio(data.bio);
                setLocation(data.location);
                setDayRate(data.day_rate);
                setPortfolioUrl(data.portfolio_url || "");
            }
        }
    );

    useEffect(() => {
        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email ?? "User");
                setUserId(user.id);
                setCreatorType(user.user_metadata?.creator_type || null);
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

    const handleAcceptRequest = async (id: string) => {
        if (!userId) return;

        const updatePromise = new Promise((resolve, reject) => {
            supabase
                .from('projects')
                .update({ status: 'in_progress', creator_id: userId })
                .eq('id', id)
                .then(({ error }) => {
                    if (error) reject(error);
                    else resolve(true);
                });
        });

        toast.promise(updatePromise, {
            loading: 'Accepting request...',
            success: () => {
                mutateRequests(); // Refresh list via SWR
                return 'Request accepted successfully!';
            },
            error: 'Failed to accept request'
        });
    }

    const handleSaveProfile = async () => {
        if (!userId) return;

        // Mandatory field validation based on creator_type
        if (creatorType === 'studio_owner') {
            if (!location.trim()) {
                toast.error("Location / Address is required for Studio profiles.");
                return;
            }
            if (!portfolioUrl.trim()) {
                toast.error("Portfolio URL is required for Studio profiles.");
                return;
            }
        } else if (creatorType === 'freelancer') {
            if (!portfolioUrl.trim()) {
                toast.error("Portfolio URL is required for Freelancer profiles.");
                return;
            }
        }

        const updatePromise = new Promise(async (resolve, reject) => {
            // Check if profile exists
            const { data: existing } = await supabase.from('creators').select('id').eq('id', userId).single();

            const numDayRate = typeof dayRate === 'string' ? parseInt(dayRate) || 0 : dayRate;

            if (existing) {
                const { error } = await supabase.from('creators').update({
                    bio,
                    location,
                    day_rate: numDayRate,
                    portfolio_url: portfolioUrl
                }).eq('id', userId);

                if (error) reject(error);
                else resolve(true);
            } else {
                const generatedSlug = (userEmail || `creator-${userId}`).split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);
                const { error } = await supabase.from('creators').insert({
                    id: userId,
                    slug: generatedSlug,
                    role: "Creator", // Default fallback
                    bio,
                    location: location || "Remote",
                    day_rate: numDayRate,
                    portfolio_url: portfolioUrl
                });

                if (error) reject(error);
                else resolve(true);
            }
        });

        toast.promise(updatePromise, {
            loading: 'Saving profile...',
            success: 'Profile saved successfully!',
            error: 'Failed to save profile'
        });
    }

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
                    icon={<PenTool className="w-5 h-5" />}
                    label="Portfolio Editor"
                    isActive={activeTab === "editor"}
                    onClick={() => { setActiveTab("editor"); setMobileMenuOpen(false); }}
                />
                <NavItem
                    icon={<Inbox className="w-5 h-5" />}
                    label="Booking Requests"
                    isActive={activeTab === "requests"}
                    onClick={() => { setActiveTab("requests"); setMobileMenuOpen(false); }}
                    badge={requests.filter(r => r.status === 'New Request').length.toString()}
                />
                <NavItem
                    icon={<MessageSquare className="w-5 h-5" />}
                    label="Messages"
                    isActive={activeTab === "messages"}
                    onClick={() => { setActiveTab("messages"); setMobileMenuOpen(false); }}
                    badge="0"
                />
                <NavItem
                    icon={<Calendar className="w-5 h-5" />}
                    label="Availability"
                    isActive={activeTab === "calendar"}
                    onClick={() => { setActiveTab("calendar"); setMobileMenuOpen(false); }}
                />
                <NavItem
                    icon={<Wallet className="w-5 h-5" />}
                    label="Earnings"
                    isActive={activeTab === "earnings"}
                    onClick={() => { setActiveTab("earnings"); setMobileMenuOpen(false); }}
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
                    <div className="w-9 h-9 flex-shrink-0 bg-stone-900 text-white rounded-full flex items-center justify-center font-bold text-sm overflow-hidden uppercase">
                        {userEmail?.charAt(0) || "C"}
                        {/* <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80" alt="Creator Avatar" className="w-full h-full object-cover" /> */}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-stone-900 truncate" title={userEmail || ""}>{userEmail}</p>
                        <p className="text-xs text-stone-500 truncate">Creator Account</p>
                    </div>
                </div>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-[#fdfbfb] flex flex-col md:flex-row">

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)}
                            className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-40 md:hidden"
                        />
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                            className="fixed inset-y-0 left-0 w-[80%] max-w-sm bg-white shadow-2xl z-50 flex flex-col md:hidden"
                        >
                            {renderSidebarContent()}
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Sidebar (Desktop) */}
            <aside className="w-64 bg-white border-r border-stone-100 hidden md:flex flex-col h-screen sticky top-0">
                {renderSidebarContent()}
            </aside>

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
                                type="text"
                                placeholder="Search briefs, clients, or messages..."
                                className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-full text-sm focus:outline-none focus:border-rose-500 focus:bg-white transition-colors"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            aria-label="Open notifications"
                            title="Open notifications"
                            onClick={() => setActiveTab("notifications")}
                            className="w-10 h-10 rounded-full bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-colors relative"
                        >
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                        </button>
                        <button onClick={() => router.push(`/creators/${userId}`)} className="px-5 py-2 hidden sm:flex bg-stone-900 text-white text-sm font-bold rounded-full hover:bg-stone-800 transition-colors items-center gap-2">
                            View Public Profile
                        </button>
                    </div>
                </header>

                {/* Dashboard Content */}
                <div className="flex-1 p-6 md:p-8">
                    <div className="max-w-5xl mx-auto space-y-8">

                        {activeTab === "overview" && (
                            <>
                                {/* Greeting */}
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                                    <div>
                                        <h1 className="text-3xl font-black text-stone-900 font-display tracking-tight mb-2">Dashboard Overview</h1>
                                        <p className="text-stone-500">You have {requests.filter(r => r.status === 'New Request').length} new booking requests to review.</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm font-medium text-stone-600 bg-white px-4 py-2 rounded-xl border border-stone-200 shadow-sm">
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                        </span>
                                        Accepting New Jobs
                                    </div>
                                </div>

                                {/* Quick Stats Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <StatCard
                                        title="Total Earnings"
                                        value={`₹${requests
                                            .filter(r => r.status === 'completed')
                                            .reduce((sum, r) => sum + Number((r.budget as string).replace(/[^0-9]/g, '')), 0)
                                            .toLocaleString()}`}
                                        trend="Captured from completed jobs"
                                        icon={<Wallet className="w-5 h-5 text-green-600" />}
                                    />
                                    <StatCard title="Profile Views" value="-" trend="Not tracked in current schema" icon={<Camera className="w-5 h-5 text-rose-600" />} />
                                    <StatCard title="Jobs Completed" value={requests.filter(r => r.status === 'completed').length.toString()} trend="From project statuses" icon={<CheckCircle className="w-5 h-5 text-blue-600" />} />
                                    <StatCard title="Trust Score" value={profile?.verified ? 'Verified' : 'Unverified'} trend="From creator profile" icon={<Star className="w-5 h-5 text-amber-500" />} />
                                </div>

                                {/* Recent Booking Requests */}
                                <section>
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-bold text-stone-900 font-display">Open Studio Requests</h2>
                                        <button
                                            onClick={() => setActiveTab("requests")}
                                            className="text-sm font-semibold text-rose-600 hover:text-rose-700"
                                        >
                                            View All
                                        </button>
                                    </div>

                                    {loading ? (
                                        <div className="text-center py-12 bg-white rounded-2xl border border-stone-100">
                                            <div className="w-8 h-8 rounded-full border-4 border-rose-200 border-t-rose-600 animate-spin mx-auto mb-4"></div>
                                            <p className="text-stone-500 font-medium">Fetching market requests...</p>
                                        </div>
                                    ) : requests.length === 0 ? (
                                        <div className="text-center py-16 bg-white rounded-2xl border border-stone-100 shadow-sm">
                                            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Inbox className="w-8 h-8" />
                                            </div>
                                            <h3 className="text-xl font-bold text-stone-900 mb-2 font-display">Inbox Zero</h3>
                                            <p className="text-stone-500 max-w-sm mx-auto mb-6">There are no open requests in the marketplace right now. Keep your profile updated to attract clients!</p>
                                        </div>
                                    ) : (
                                        <div className="grid lg:grid-cols-2 gap-4">
                                            {requests.map((req) => (
                                                <div key={req.id} className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md hover:border-rose-200 transition-all flex flex-col">

                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center font-bold text-stone-700 text-sm">
                                                                {req.client.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <h3 className="font-bold text-stone-900 leading-tight truncate max-w-[150px]">{req.client}</h3>
                                                                <span className="text-xs font-medium text-stone-500">{req.timeAgo}</span>
                                                            </div>
                                                        </div>
                                                        <div className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${req.status === 'New Request' ? 'text-rose-600 bg-rose-50' : 'text-blue-600 bg-blue-50'}`}>
                                                            {req.status}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3 mb-6 flex-1">
                                                        <div className="flex items-start gap-3">
                                                            <Camera className="w-4 h-4 text-stone-400 mt-0.5 flex-shrink-0" />
                                                            <div className="min-w-0">
                                                                <div className="text-sm font-bold text-stone-900 truncate">{req.type}</div>
                                                                <div className="text-xs text-stone-500 break-words line-clamp-2">{req.role}</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <Calendar className="w-4 h-4 text-stone-400 mt-0.5" />
                                                            <div>
                                                                <div className="text-sm font-bold text-stone-900">{req.date}</div>
                                                                <div className="text-xs text-stone-500">Dates are somewhat flexible</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <Wallet className="w-4 h-4 text-stone-400 mt-0.5" />
                                                            <div>
                                                                <div className="text-sm font-bold text-stone-900">{req.budget}</div>
                                                                <div className="text-xs text-stone-500">Estimated Total (Before Fees)</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-3 pt-4 border-t border-stone-100">
                                                        <button className="flex-1 py-2.5 bg-stone-50 text-stone-700 font-bold rounded-xl hover:bg-stone-100 transition-colors text-sm">
                                                            Decline
                                                        </button>
                                                        <button
                                                            onClick={() => handleAcceptRequest(req.id)}
                                                            className="flex-1 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors text-sm"
                                                        >
                                                            Accept Brief
                                                        </button>
                                                    </div>

                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </>
                        )}


                        {activeTab === "editor" && (
                            <div className="space-y-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-6">
                                    <div>
                                        <h2 className="text-2xl font-black text-stone-900 font-display tracking-tight">Portfolio Editor</h2>
                                        <p className="text-stone-500 text-sm mt-1">Manage what clients see on your public profile.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => {
                                                if (!userId) return;
                                                router.push(`/creators/${userId}`);
                                            }}
                                            disabled={!userId}
                                            className="px-5 py-2.5 bg-white border border-stone-200 text-stone-700 text-sm font-bold rounded-full hover:bg-stone-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Preview
                                        </button>
                                        <button
                                            onClick={handleSaveProfile}
                                            className="px-5 py-2.5 bg-rose-600 text-white text-sm font-bold rounded-full hover:bg-rose-700 transition-colors"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 space-y-8">

                                        {/* Basic Information */}
                                        <section className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm space-y-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2"><PenTool className="w-5 h-5 text-stone-400" /> Basic Information</h3>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-bold text-stone-700 mb-1">Biography</label>
                                                    <textarea
                                                        rows={4}
                                                        value={bio}
                                                        onChange={(e) => setBio(e.target.value)}
                                                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-rose-500 transition-colors resize-none placeholder-stone-400"
                                                        placeholder="Briefly describe your experience and unique style..."
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-bold text-stone-700 mb-1">
                                                            Location {creatorType === 'studio_owner' && <span className="text-rose-500 ml-0.5">*</span>}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={location}
                                                            onChange={(e) => setLocation(e.target.value)}
                                                            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-rose-500 transition-colors placeholder-stone-400"
                                                            placeholder="e.g. Mumbai, India"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-bold text-stone-700 mb-1">Base Day Rate (₹)</label>
                                                        <input
                                                            type="number"
                                                            value={dayRate}
                                                            onChange={(e) => setDayRate(parseInt(e.target.value) || 0)}
                                                            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-rose-500 transition-colors placeholder-stone-400"
                                                            placeholder="Format: 15000"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </section>
                                        {/* Portfolio URL */}
                                        <div>
                                            <label className="block text-sm font-bold text-stone-700 mb-1">
                                                Portfolio URL
                                                {(creatorType === 'studio_owner' || creatorType === 'freelancer') && <span className="text-rose-500 ml-0.5">*</span>}
                                            </label>
                                            <input
                                                type="url"
                                                value={portfolioUrl}
                                                onChange={(e) => setPortfolioUrl(e.target.value)}
                                                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-rose-500 transition-colors placeholder-stone-400"
                                                placeholder="https://yourportfolio.com or Behance/Dribbble/Instagram link"
                                            />
                                            {(creatorType === 'studio_owner' || creatorType === 'freelancer') && (
                                                <p className="text-xs text-stone-400 mt-1">Required. Add your primary portfolio or social media link.</p>
                                            )}
                                        </div>

                                        {/* Services & Rates */}
                                        <section className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm space-y-6">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2"><LayoutTemplate className="w-5 h-5 text-stone-400" /> Services & Packages</h3>
                                                <button
                                                    onClick={() => toast.info("Opening Package Creator...")}
                                                    className="text-sm font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                                                >
                                                    <Plus className="w-4 h-4" /> Add Package
                                                </button>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="p-4 rounded-2xl border border-stone-100 bg-stone-50">
                                                    <p className="text-sm text-stone-600">
                                                        Package data is not stored in the current database schema yet. Use your profile fields above to keep your public information up to date.
                                                    </p>
                                                </div>
                                            </div>
                                        </section>

                                        {/* Portfolio Grid Items */}
                                        <section className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm space-y-6">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-stone-400" /> Portfolio Grid</h3>
                                                <button
                                                    onClick={() => toast.info("Opening Media Uploader...")}
                                                    className="text-sm font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                                                >
                                                    <Plus className="w-4 h-4" /> Upload
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                {/* Grid Image 1 */}
                                                <div className="aspect-[4/5] rounded-xl overflow-hidden relative group cursor-pointer bg-stone-100">
                                                    <img src="https://images.unsplash.com/photo-1579969035677-44f2d7a229ad?w=500&q=80" alt="Portfolio" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    <div className="absolute inset-0 bg-stone-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <span className="text-white font-bold text-sm">Edit</span>
                                                    </div>
                                                </div>
                                                {/* Grid Image 2 */}
                                                <div className="aspect-[4/5] rounded-xl overflow-hidden relative group cursor-pointer bg-stone-100">
                                                    <img src="https://images.unsplash.com/photo-1621618844896-1ca0eb1ce9a4?w=500&q=80" alt="Portfolio" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    <div className="absolute inset-0 bg-stone-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <span className="text-white font-bold text-sm">Edit</span>
                                                    </div>
                                                </div>
                                                {/* Add New */}
                                                <div className="aspect-[4/5] rounded-xl border-2 border-dashed border-stone-200 hover:border-rose-300 hover:bg-rose-50 transition-colors flex flex-col items-center justify-center text-stone-400 group cursor-pointer">
                                                    <Plus className="w-8 h-8 mb-2 group-hover:text-rose-500" />
                                                    <span className="text-sm font-medium group-hover:text-rose-600">Add Project</span>
                                                </div>
                                            </div>
                                        </section>
                                    </div>

                                    {/* Sidebar Tips */}
                                    <div className="space-y-6">
                                        <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100">
                                            <h4 className="font-bold text-orange-900 mb-2">Profile Optimization</h4>
                                            <p className="text-sm text-orange-800 leading-relaxed mb-4">
                                                Creators with clear, transparent pricing packages receive 3x more bookings. Make sure to define what is included (and excluded) clearly.
                                            </p>
                                            <div className="h-1.5 w-full bg-orange-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-orange-500 w-[85%] rounded-full"></div>
                                            </div>
                                            <p className="text-xs text-orange-700 mt-2 font-medium">Profile completeness: 85%</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "requests" && (
                            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-stone-100 shadow-sm text-center">
                                <Inbox className="w-16 h-16 text-rose-200 mb-4" />
                                <h2 className="text-2xl font-bold text-stone-900 mb-2">Booking Requests</h2>
                                <p className="text-stone-500 max-w-md">Manage your incoming project requests, send counter-proposals, and negotiate terms with clients here.</p>
                            </div>
                        )}

                        {activeTab === "messages" && (
                            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-stone-100 shadow-sm text-center">
                                <MessageSquare className="w-16 h-16 text-rose-200 mb-4" />
                                <h2 className="text-2xl font-bold text-stone-900 mb-2">Direct Messages</h2>
                                <p className="text-stone-500 max-w-md">Communicate with your clients, share files, and keep a clean record of all project-related chat threads.</p>
                            </div>
                        )}

                        {activeTab === "calendar" && (
                            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-stone-100 shadow-sm text-center">
                                <Calendar className="w-16 h-16 text-rose-200 mb-4" />
                                <h2 className="text-2xl font-bold text-stone-900 mb-2">Availability Calendar</h2>
                                <p className="text-stone-500 max-w-md">Block off your calendar, sync with Google or Apple, and make sure clients only book you when you&apos;re free.</p>
                            </div>
                        )}

                        {activeTab === "earnings" && (
                            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-stone-100 shadow-sm text-center">
                                <Wallet className="w-16 h-16 text-rose-200 mb-4" />
                                <h2 className="text-2xl font-bold text-stone-900 mb-2">Earnings & Payouts</h2>
                                <p className="text-stone-500 max-w-md">Track funds stuck in Escrow, request withdrawals, and manage your tax documents and invoices natively.</p>
                            </div>
                        )}

                        {activeTab === "settings" && (
                            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-stone-100 shadow-sm text-center">
                                <Settings className="w-16 h-16 text-rose-200 mb-4" />
                                <h2 className="text-2xl font-bold text-stone-900 mb-2">Account Settings</h2>
                                <p className="text-stone-500 max-w-md">Update your password, manage notification preferences, and configure payment gateways logic here.</p>
                            </div>
                        )}

                        {activeTab === "notifications" && (
                            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-stone-100 shadow-sm text-center">
                                <Bell className="w-16 h-16 text-rose-200 mb-4" />
                                <h2 className="text-2xl font-bold text-stone-900 mb-2">Notifications</h2>
                                <p className="text-stone-500 max-w-md">You have 1 unread message and 2 new booking requests.</p>
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
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-rose-50 text-rose-600 font-bold shadow-sm ring-1 ring-rose-500/10' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900 font-medium'}`}
        >
            <div className="flex items-center gap-3">
                <span className={isActive ? 'text-rose-500' : 'text-stone-400'}>{icon}</span>
                {label}
            </div>
            {badge && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-rose-600 text-white' : 'bg-stone-200 text-stone-600'}`}>
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

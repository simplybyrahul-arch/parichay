"use client";

import { useState, useEffect, useRef } from "react";
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
    Inbox,
    Star,
    PenTool,
    Plus,
    Image as ImageIcon,
    LayoutTemplate,
    LogOut,
    MapPin
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { logout } from "../actions/auth";
import { BrandLogo } from "@/components/BrandLogo";
import { listCreatorOpportunities, respondToOpportunity, type CreatorOpportunity } from "../actions/opportunities";
import { startAssignedProject } from "../actions/creatorProjects";
import { listMyNotifications, markNotificationRead, type UserNotification } from "../actions/notifications";
import { commaList, creatorServiceOptions, parseCommaList } from "@/lib/creators/services";
import { formatPaymentStatus } from "@/lib/projects/statusLabels";
import { RoleSettingsPanel } from "@/components/settings/RoleSettingsPanel";
import { deletePortfolioItem, listMyPortfolioItems, updatePortfolioItem, uploadPortfolioMedia, type PortfolioItem } from "../actions/portfolio";

const closedProjectStatuses = new Set(["expired", "cancelled", "completed", "disputed"]);
const acceptedPortfolioTypes = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime", "video/webm"]);
const maxPortfolioImageSize = 10 * 1024 * 1024;
const maxPortfolioVideoSize = 100 * 1024 * 1024;

function formatCurrency(value: number | null) {
    if (!value) return "Budget not specified";
    return `Rs ${value.toLocaleString("en-IN")}`;
}

function canRespondToOpportunity(opportunity: CreatorOpportunity) {
    return !closedProjectStatuses.has(opportunity.project_status) && ["sent", "viewed"].includes(opportunity.invite_status);
}

function getOpportunityDisplayStatus(opportunity: CreatorOpportunity) {
    if (opportunity.project_status === "cancelled") return "Cancelled";
    if (opportunity.project_status === "expired" || opportunity.invite_status === "inactive") return "Expired/Inactive";
    if (opportunity.invite_status === "interested") return "Interested submitted";
    if (opportunity.invite_status === "declined") return "Declined";
    return opportunity.invite_status;
}

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
                payment_status,
                selected_creator_id,
                created_at,
                users!client_id(full_name)
            `)
            .or(`creator_id.eq.${userId},selected_creator_id.eq.${userId}`)
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
                    budget: `Rs ${Number(req.budget || 0).toLocaleString()}`,
                    status: req.status === 'pending' ? 'New Request' : req.status,
                    paymentStatus: req.payment_status,
                    selectedCreatorId: req.selected_creator_id,
                    timeAgo: getRelativeTime(req.created_at)
                };
            });
        }
        return [];
    };

    const fetchOpportunities = async () => {
        if (!userId) return [];
        return listCreatorOpportunities();
    };

    // Data fetcher for profile
    const fetchProfileData = async (uid: string) => {
        const { data, error } = await supabase
            .from('creators')
            .select('bio, location, city, state, phone, whatsapp_phone, role, day_rate, portfolio_url, verified, equipment, tags, capacity_per_day, service_cities, service_radius_km, travel_enabled, available_for_booking, budget_flexibility, whatsapp_opt_in')
            .eq('id', uid)
            .single();
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "Row not found"
        return data || {
            bio: "",
            location: "",
            city: "",
            state: "",
            phone: "",
            whatsapp_phone: "",
            role: "",
            day_rate: 0,
            portfolio_url: "",
            verified: false,
            equipment: [],
            tags: [],
            capacity_per_day: null,
            service_cities: [],
            service_radius_km: 0,
            travel_enabled: false,
            available_for_booking: true,
            budget_flexibility: false,
            whatsapp_opt_in: true,
        };
    };

    // Editor Profile State
    const [bio, setBio] = useState("");
    const [location, setLocation] = useState("");
    const [city, setCity] = useState("");
    const [stateName, setStateName] = useState("");
    const [phone, setPhone] = useState("");
    const [whatsappPhone, setWhatsappPhone] = useState("");
    const [role, setRole] = useState("");
    const [dayRate, setDayRate] = useState<number | string>(0);
    const [portfolioUrl, setPortfolioUrl] = useState("");
    const [equipmentList, setEquipmentList] = useState("");
    const [tagsList, setTagsList] = useState("");
    const [capacityPerDay, setCapacityPerDay] = useState<number | string>("");
    const [serviceCities, setServiceCities] = useState("");
    const [serviceRadiusKm, setServiceRadiusKm] = useState<number | string>(0);
    const [travelEnabled, setTravelEnabled] = useState(false);
    const [availableForBooking, setAvailableForBooking] = useState(true);
    const [budgetFlexibility, setBudgetFlexibility] = useState(false);
    const [whatsappOptIn, setWhatsappOptIn] = useState(true);
    const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
    const [uploadStatus, setUploadStatus] = useState("");
    const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // SWR Hooks
    const { data: requests = [], isValidating: loading, mutate: mutateRequests } = useSWR(
        userId ? ['creator-requests', userId] : null,
        fetchRequests
    );

    const { data: opportunities = [], isValidating: opportunitiesLoading, mutate: mutateOpportunities } = useSWR(
        userId ? ['creator-opportunities', userId] : null,
        fetchOpportunities
    );
    const { data: notifications = [], mutate: mutateNotifications } = useSWR<UserNotification[]>(
        userId ? ['creator-notifications', userId] : null,
        () => listMyNotifications()
    );
    const { mutate: mutatePortfolioItems } = useSWR<PortfolioItem[]>(
        userId ? ['creator-portfolio-items', userId] : null,
        () => listMyPortfolioItems(),
        {
            onSuccess: (items) => setPortfolioItems(items),
        }
    );

    const { data: profile } = useSWR(
        userId ? ['creator-profile', userId] : null,
        ([, uid]) => fetchProfileData(uid as string),
        {
            onSuccess: (data) => {
                setBio(data.bio || "");
                setLocation(data.location || "");
                setCity(data.city || "");
                setStateName(data.state || "");
                setPhone(data.phone || "");
                setWhatsappPhone(data.whatsapp_phone || "");
                setRole(data.role || "");
                setDayRate(data.day_rate || 0);
                setEquipmentList(commaList(data.equipment));
                setTagsList(commaList(data.tags));
                setCapacityPerDay(data.capacity_per_day || "");
                setServiceCities(commaList(data.service_cities));
                setServiceRadiusKm(data.service_radius_km || 0);
                setTravelEnabled(Boolean(data.travel_enabled));
                setAvailableForBooking(data.available_for_booking !== false);
                setBudgetFlexibility(Boolean(data.budget_flexibility));
                setWhatsappOptIn(data.whatsapp_opt_in !== false);
                let parsedLink = data.portfolio_url || "";
                try {
                    const parsed = JSON.parse(data.portfolio_url || "{}");
                    if (parsed.link !== undefined) {
                        parsedLink = parsed.link;
                    }
                } catch {}
                setPortfolioUrl(parsedLink);
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
                setRole((current) => current || user.user_metadata?.role || "");
                setPhone((current) => current || user.user_metadata?.phone || "");
                setWhatsappPhone((current) => current || user.user_metadata?.whatsapp_phone || "");
                setCity((current) => current || user.user_metadata?.city || "");
                setStateName((current) => current || user.user_metadata?.state || "");
                setDayRate((current) => current || user.user_metadata?.day_rate || 0);
                setPortfolioUrl((current) => current || user.user_metadata?.portfolio_url || "");
                setTravelEnabled(Boolean(user.user_metadata?.travel_enabled));
                setAvailableForBooking(user.user_metadata?.available_for_booking !== false);
                setBudgetFlexibility(Boolean(user.user_metadata?.budget_flexibility));
                setWhatsappOptIn(user.user_metadata?.whatsapp_opt_in !== false);
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

        const updatePromise = startAssignedProject(id).then((result) => {
            if (!result.success) throw new Error(result.message);
            return true;
        });

        toast.promise(updatePromise, {
            loading: 'Accepting request...',
            success: () => {
                mutateRequests(); // Refresh list via SWR
                return 'Request accepted successfully!';
            },
            error: (error) => error instanceof Error ? error.message : 'Failed to accept request'
        });
    }

    const handleOpportunityResponse = (projectId: string, status: "interested" | "declined") => {
        const responsePromise = respondToOpportunity(projectId, status);

        toast.promise(responsePromise, {
            loading: status === "interested" ? "Submitting interest..." : "Declining opportunity...",
            success: (result) => {
                if (!result.success) {
                    throw new Error(result.message);
                }
                mutateOpportunities();
                return result.message;
            },
            error: (error) => error instanceof Error ? error.message : "Could not update opportunity response.",
        });
    };

    const handleSaveProfile = async () => {
        if (!userId) return;

        // Mandatory field validation based on creator_type
        const cleanPhone = phone.replace(/[^\d+]/g, "");
        if (!role) {
            toast.error("Primary service is required.");
            return;
        }
        if (!city.trim()) {
            toast.error("City is required.");
            return;
        }
        if (cleanPhone.length < 10) {
            toast.error("A valid phone number is required.");
            return;
        }
        if (!dayRate || Number(dayRate) <= 0) {
            toast.error("Base day rate is required for matching.");
            return;
        }
        if (creatorType === 'studio_owner') {
            if (!location.trim()) {
                toast.error("Location / Address is required for Studio profiles.");
                return;
            }
        }

        const updatePromise = new Promise(async (resolve, reject) => {
            const numDayRate = typeof dayRate === 'string' ? parseInt(dayRate) || 0 : dayRate;
            const numCapacity = typeof capacityPerDay === 'string' ? parseInt(capacityPerDay) || null : capacityPerDay || null;
            const numRadius = typeof serviceRadiusKm === 'string' ? parseInt(serviceRadiusKm) || 0 : serviceRadiusKm || 0;
            const generatedSlug = (userEmail || `creator-${userId}`).split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + userId.slice(0, 8);
            const profilePayload = {
                id: userId,
                slug: generatedSlug,
                role,
                bio,
                location: location || city,
                city,
                state: stateName || null,
                phone,
                whatsapp_phone: whatsappPhone || (whatsappOptIn ? phone : null),
                day_rate: numDayRate,
                portfolio_url: JSON.stringify({ link: portfolioUrl, items: portfolioItems }),
                equipment: parseCommaList(equipmentList),
                tags: parseCommaList(tagsList),
                capacity_per_day: numCapacity,
                service_cities: parseCommaList(serviceCities),
                service_radius_km: numRadius,
                travel_enabled: travelEnabled,
                available_for_booking: availableForBooking,
                budget_flexibility: budgetFlexibility,
                whatsapp_opt_in: whatsappOptIn,
                creator_type: creatorType,
            };

            const { error } = await supabase.from('creators').upsert(profilePayload, { onConflict: 'id' });
            if (error) {
                console.error("Creator profile save error:", error);
                reject(error);
                return;
            }

            resolve(true);
        });

        toast.promise(updatePromise, {
            loading: 'Saving profile...',
            success: 'Profile saved successfully',
            error: (error) => error instanceof Error ? error.message : 'Failed to save profile'
        });
    }

    const validatePortfolioFile = (file: File) => {
        if (!acceptedPortfolioTypes.has(file.type)) {
            return "Supported files: jpg, jpeg, png, webp, mp4, mov, webm.";
        }

        if (file.type.startsWith("image/") && file.size > maxPortfolioImageSize) {
            return `${file.name} is larger than 10MB.`;
        }

        if (file.type.startsWith("video/") && file.size > maxPortfolioVideoSize) {
            return `${file.name} is larger than 100MB.`;
        }

        return null;
    };

    const handlePortfolioUpload = async (files: FileList | null) => {
        if (!files?.length) return;
        setUploadingPortfolio(true);

        const selectedFiles = Array.from(files);
        for (let index = 0; index < selectedFiles.length; index += 1) {
            const file = selectedFiles[index];
            const validationError = validatePortfolioFile(file);
            if (validationError) {
                toast.error(validationError);
                continue;
            }

            setUploadStatus(`Uploading ${index + 1} of ${selectedFiles.length}: ${file.name}`);
            const formData = new FormData();
            formData.append("file", file);
            const result = await uploadPortfolioMedia(formData);

            if (!result.success || !result.item) {
                toast.error(result.message);
                continue;
            }

            setPortfolioItems((items) => [result.item as PortfolioItem, ...items]);
        }

        await mutatePortfolioItems();
        setUploadStatus("");
        setUploadingPortfolio(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        toast.success("Portfolio media updated.");
    };

    const handlePortfolioItemUpdate = async (item: PortfolioItem) => {
        const result = await updatePortfolioItem(item.id, {
            title: item.title || "",
            description: item.description || "",
            is_public: item.is_public,
        });

        if (!result.success) {
            toast.error(result.message);
            return;
        }

        toast.success(result.message);
        await mutatePortfolioItems();
    };

    const handlePortfolioItemDelete = async (itemId: string) => {
        const result = await deletePortfolioItem(itemId);
        if (!result.success) {
            toast.error(result.message);
            return;
        }

        setPortfolioItems((items) => items.filter((item) => item.id !== itemId));
        toast.success(result.message);
    };

    const missingProfileFields = [
        !city.trim() ? "City" : null,
        !role ? "Primary service" : null,
        !dayRate || Number(dayRate) <= 0 ? "Day rate" : null,
        !phone.trim() && !whatsappPhone.trim() ? "Phone/WhatsApp" : null,
        !availableForBooking ? "Available for booking" : null,
        !travelEnabled && parseCommaList(serviceCities).length === 0 ? "Service cities or travel enabled" : null,
    ].filter((item): item is string => Boolean(item));

    const profileCompletionTotal = 7;
    const profileCompletionPercent = Math.round(((profileCompletionTotal - missingProfileFields.length) / profileCompletionTotal) * 100);
    const unreadNotificationCount = notifications.filter((notification) => !notification.read).length;

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
                    badge={(requests.filter(r => r.status === 'New Request').length + opportunities.filter(canRespondToOpportunity).length).toString()}
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
                            {unreadNotificationCount > 0 && (
                                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                            )}
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
                                        <p className="text-stone-500">You have {opportunities.filter(canRespondToOpportunity).length} new booking opportunities to review.</p>
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

                                <OpportunitySection
                                    opportunities={opportunities}
                                    loading={opportunitiesLoading}
                                    onView={(projectId) => router.push(`/opportunities/${projectId}`)}
                                    onRespond={handleOpportunityResponse}
                                />

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
                                                                <div className="text-xs text-stone-500">{formatPaymentStatus(req.paymentStatus, req.status, req.selectedCreatorId)}</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-3 pt-4 border-t border-stone-100">
                                                        <button
                                                            onClick={() => router.push(`/opportunities/${req.id}`)}
                                                            className="flex-1 py-2.5 bg-white border border-stone-200 text-stone-700 font-bold rounded-xl hover:bg-stone-50 transition-colors text-sm"
                                                        >
                                                            View Details
                                                        </button>
                                                        {["funded", "confirmed"].includes(req.status) && (
                                                            <button
                                                                onClick={() => handleAcceptRequest(req.id)}
                                                                className="flex-1 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors text-sm"
                                                            >
                                                                Start Work
                                                            </button>
                                                        )}
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
                                                            {creatorType === 'studio_owner' ? 'Studio Services' : 'Primary Service'} <span className="text-rose-500 ml-0.5">*</span>
                                                        </label>
                                                        <select
                                                            value={role}
                                                            onChange={(e) => setRole(e.target.value)}
                                                            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-rose-500 transition-colors"
                                                        >
                                                            <option value="">Select service</option>
                                                            {creatorServiceOptions.map((option) => (
                                                                <option key={option.value} value={option.value}>{option.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-bold text-stone-700 mb-1">City <span className="text-rose-500 ml-0.5">*</span></label>
                                                        <input
                                                            type="text"
                                                            value={city}
                                                            onChange={(e) => setCity(e.target.value)}
                                                            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-rose-500 transition-colors placeholder-stone-400"
                                                            placeholder="e.g. Bilaspur"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-bold text-stone-700 mb-1">State</label>
                                                        <input
                                                            type="text"
                                                            value={stateName}
                                                            onChange={(e) => setStateName(e.target.value)}
                                                            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-rose-500 transition-colors placeholder-stone-400"
                                                            placeholder="e.g. Chhattisgarh"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-bold text-stone-700 mb-1">Phone <span className="text-rose-500 ml-0.5">*</span></label>
                                                        <input
                                                            type="tel"
                                                            value={phone}
                                                            onChange={(e) => setPhone(e.target.value)}
                                                            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-rose-500 transition-colors placeholder-stone-400"
                                                            placeholder="10 digit mobile number"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-bold text-stone-700 mb-1">WhatsApp Number</label>
                                                        <input
                                                            type="tel"
                                                            value={whatsappPhone}
                                                            onChange={(e) => setWhatsappPhone(e.target.value)}
                                                            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-rose-500 transition-colors placeholder-stone-400"
                                                            placeholder="Leave blank to use phone"
                                                        />
                                                    </div>
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
                                        {/* External Portfolio Link */}
                                        <div>
                                            <label className="block text-sm font-bold text-stone-700 mb-1">
                                                External portfolio link (optional)
                                            </label>
                                            <input
                                                type="url"
                                                value={portfolioUrl}
                                                onChange={(e) => setPortfolioUrl(e.target.value)}
                                                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-rose-500 transition-colors placeholder-stone-400"
                                                placeholder="https://yourportfolio.com or Behance/Dribbble/Instagram link"
                                            />
                                            <p className="text-xs text-stone-400 mt-1">Optional. Upload photos and videos below to build your public portfolio grid.</p>
                                        </div>

                                        <section className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm space-y-6">
                                            <div>
                                                <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2"><Search className="w-5 h-5 text-stone-400" /> Matching & Availability</h3>
                                                <p className="text-sm text-stone-500 mt-1">
                                                    {creatorType === "studio_owner"
                                                        ? "Studios should add service cities, equipment, and capacity so clients can find them for larger shoots."
                                                        : "Freelancers should add service city coverage and skills to receive relevant bookings."}
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <ProfileInput label={creatorType === "studio_owner" ? "Capacity per day" : "Booking capacity per day"}>
                                                    <input type="number" value={capacityPerDay} onChange={(e) => setCapacityPerDay(parseInt(e.target.value) || "")} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-rose-500 transition-colors placeholder-stone-400" placeholder="e.g. 2" />
                                                </ProfileInput>
                                                <ProfileInput label="Service radius km">
                                                    <input type="number" value={serviceRadiusKm} onChange={(e) => setServiceRadiusKm(parseInt(e.target.value) || 0)} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-rose-500 transition-colors placeholder-stone-400" placeholder="0" />
                                                </ProfileInput>
                                                <ProfileInput label="Service cities">
                                                    <input type="text" value={serviceCities} onChange={(e) => setServiceCities(e.target.value)} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-rose-500 transition-colors placeholder-stone-400" placeholder="Bilaspur, Raipur, Durg" />
                                                </ProfileInput>
                                                <ProfileInput label="Tags / skills">
                                                    <input type="text" value={tagsList} onChange={(e) => setTagsList(e.target.value)} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-rose-500 transition-colors placeholder-stone-400" placeholder="wedding, portrait, editing" />
                                                </ProfileInput>
                                                <div className="md:col-span-2">
                                                    <ProfileInput label="Equipment list">
                                                        <input type="text" value={equipmentList} onChange={(e) => setEquipmentList(e.target.value)} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-rose-500 transition-colors placeholder-stone-400" placeholder="Sony A7IV, lights, drone" />
                                                    </ProfileInput>
                                                </div>
                                            </div>

                                            <div className="grid sm:grid-cols-2 gap-3">
                                                <ProfileToggle label="Travel enabled" checked={travelEnabled} onChange={setTravelEnabled} />
                                                <ProfileToggle label="Available for booking" checked={availableForBooking} onChange={setAvailableForBooking} />
                                                <ProfileToggle label="Budget flexibility" checked={budgetFlexibility} onChange={setBudgetFlexibility} />
                                                <ProfileToggle label="WhatsApp opt-in" checked={whatsappOptIn} onChange={setWhatsappOptIn} />
                                            </div>
                                        </section>

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
                                                <div>
                                                    <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-stone-400" /> Portfolio Grid</h3>
                                                    <p className="text-sm text-stone-500 mt-1">Upload photos or videos to showcase your work.</p>
                                                </div>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    multiple
                                                    accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                                                    className="hidden"
                                                    onChange={(event) => handlePortfolioUpload(event.target.files)}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={uploadingPortfolio}
                                                    className="text-sm font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 disabled:opacity-50"
                                                >
                                                    <Plus className="w-4 h-4" /> {uploadingPortfolio ? "Uploading..." : "Upload Media"}
                                                </button>
                                            </div>

                                            {uploadStatus && (
                                                <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                                                    {uploadStatus}
                                                </div>
                                            )}

                                            {portfolioItems.length === 0 ? (
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="w-full rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50 px-6 py-12 text-center text-stone-500 hover:border-rose-300 hover:bg-rose-50 transition-colors"
                                                >
                                                    <ImageIcon className="w-10 h-10 mx-auto mb-3 text-stone-300" />
                                                    <span className="font-bold text-stone-700">Upload photos or videos to showcase your work</span>
                                                    <span className="block text-xs mt-2">Images up to 10MB. Videos up to 100MB.</span>
                                                </button>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {portfolioItems.map((item) => (
                                                        <div key={item.id} className="rounded-2xl border border-stone-100 bg-stone-50 overflow-hidden">
                                                            <div className="aspect-video bg-stone-100 relative">
                                                                {item.media_type === "video" ? (
                                                                    <video src={item.media_url} controls className="w-full h-full object-cover" />
                                                                ) : (
                                                                    // eslint-disable-next-line @next/next/no-img-element
                                                                    <img src={item.media_url} alt={item.title || "Portfolio media"} className="w-full h-full object-cover" />
                                                                )}
                                                            </div>
                                                            <div className="p-4 space-y-3">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <span className="rounded-full bg-white px-2 py-1 text-xs font-bold uppercase text-stone-500">{item.media_type}</span>
                                                                    <button type="button" onClick={() => handlePortfolioItemDelete(item.id)} className="text-xs font-bold text-red-600 hover:text-red-700">Delete</button>
                                                                </div>
                                                                <input
                                                                    value={item.title || ""}
                                                                    onChange={(event) => setPortfolioItems((items) => items.map((current) => current.id === item.id ? { ...current, title: event.target.value } : current))}
                                                                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-rose-500"
                                                                    placeholder="Title"
                                                                />
                                                                <textarea
                                                                    value={item.description || ""}
                                                                    onChange={(event) => setPortfolioItems((items) => items.map((current) => current.id === item.id ? { ...current, description: event.target.value } : current))}
                                                                    rows={2}
                                                                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-rose-500 resize-none"
                                                                    placeholder="Description"
                                                                />
                                                                <div className="flex items-center justify-between">
                                                                    <label className="flex items-center gap-2 text-xs font-semibold text-stone-600">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={item.is_public}
                                                                            onChange={(event) => setPortfolioItems((items) => items.map((current) => current.id === item.id ? { ...current, is_public: event.target.checked } : current))}
                                                                            className="accent-rose-600"
                                                                        />
                                                                        Public
                                                                    </label>
                                                                    <button type="button" onClick={() => handlePortfolioItemUpdate(item)} className="rounded-xl bg-stone-900 px-3 py-2 text-xs font-bold text-white hover:bg-stone-800">
                                                                        Save Item
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </section>
                                    </div>

                                    {/* Sidebar Tips */}
                                    <div className="space-y-6">
                                        <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100">
                                            <h4 className="font-bold text-orange-900 mb-2">Profile Completeness</h4>
                                            <p className="text-sm text-orange-800 leading-relaxed mb-4">Complete your profile to receive better booking invites.</p>
                                            <div className="h-1.5 w-full bg-orange-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${profileCompletionPercent}%` }}></div>
                                            </div>
                                            <p className="text-xs text-orange-700 mt-2 font-medium">Profile completeness: {profileCompletionPercent}%</p>
                                            {missingProfileFields.length > 0 && (
                                                <div className="mt-4 text-xs text-orange-800">
                                                    <div className="font-bold mb-1">Missing:</div>
                                                    <ul className="list-disc pl-4 space-y-1">
                                                        {missingProfileFields.map((field) => <li key={field}>{field}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                            {profile?.verified === false && (
                                                <p className="text-xs font-semibold text-stone-700 bg-white/70 rounded-xl p-3 mt-4">Your profile is under review. You will receive booking opportunities after verification.</p>
                                            )}
                                            {profile?.verified && !availableForBooking && (
                                                <p className="text-xs font-semibold text-rose-700 bg-white/70 rounded-xl p-3 mt-4">You are currently unavailable for new booking invites.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "requests" && (
                            <div className="space-y-8">
                                <OpportunitySection
                                    opportunities={opportunities}
                                    loading={opportunitiesLoading}
                                    onView={(projectId) => router.push(`/opportunities/${projectId}`)}
                                    onRespond={handleOpportunityResponse}
                                />
                                <section>
                                    <h2 className="text-xl font-bold text-stone-900 font-display mb-4">Assigned Booking Requests</h2>
                                    {loading ? (
                                        <div className="text-center py-12 bg-white rounded-2xl border border-stone-100">
                                            <div className="w-8 h-8 rounded-full border-4 border-rose-200 border-t-rose-600 animate-spin mx-auto mb-4"></div>
                                            <p className="text-stone-500 font-medium">Loading assigned bookings...</p>
                                        </div>
                                    ) : requests.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-stone-100 shadow-sm text-center">
                                            <Inbox className="w-16 h-16 text-rose-200 mb-4" />
                                            <h3 className="text-xl font-bold text-stone-900 mb-2">No assigned bookings yet</h3>
                                            <p className="text-stone-500 max-w-md">When a client selects you for a booking, it will appear here with project details and milestone updates.</p>
                                        </div>
                                    ) : (
                                        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm divide-y divide-stone-100 overflow-hidden">
                                            {requests.map((req) => (
                                                <div key={req.id} className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-stone-900 truncate">{req.type}</h3>
                                                        <p className="text-xs text-stone-500 mt-1 line-clamp-1">{req.role || "No description"}</p>
                                                    </div>
                                                    <div className="text-sm font-bold text-stone-700 capitalize">{req.status.replace(/_/g, " ")}</div>
                                                    <div className="text-sm text-stone-500">{formatPaymentStatus(req.paymentStatus, req.status, req.selectedCreatorId)}</div>
                                                    <button
                                                        onClick={() => router.push(`/opportunities/${req.id}`)}
                                                        className="px-4 py-2 rounded-xl border border-stone-200 text-sm font-bold text-stone-700 hover:bg-stone-50"
                                                    >
                                                        View Details
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
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
                                <p className="text-stone-500 max-w-md">Track confirmed payments, payout readiness, and future settlement details once vendor payout support is enabled.</p>
                            </div>
                        )}

                        {activeTab === "settings" && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-stone-900 mb-2">Creator Settings</h2>
                                    <p className="text-stone-500">Manage your creator profile, availability, services, and notifications.</p>
                                </div>
                                <RoleSettingsPanel role="creator" />
                            </div>
                        )}

                        {activeTab === "notifications" && (
                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-stone-900 mb-2">Notifications</h2>
                                    <p className="text-stone-500">Booking opportunities, selections, payment, and timeline updates.</p>
                                </div>
                                {notifications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-stone-100 shadow-sm text-center">
                                        <Bell className="w-16 h-16 text-rose-200 mb-4" />
                                        <p className="text-stone-500 max-w-md">You have no notifications yet.</p>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm divide-y divide-stone-100 overflow-hidden">
                                        {notifications.map((notification) => (
                                            <button
                                                key={notification.id}
                                                onClick={async () => {
                                                    if (!notification.read) {
                                                        await markNotificationRead(notification.id);
                                                        await mutateNotifications();
                                                    }
                                                    if (notification.cta_url) router.push(notification.cta_url);
                                                }}
                                                className={`w-full p-5 text-left transition-colors ${notification.read ? "hover:bg-stone-50" : "bg-rose-50/60 hover:bg-rose-50"}`}
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <h3 className="font-bold text-stone-900">{notification.title}</h3>
                                                        <p className="text-sm text-stone-600 mt-1">{notification.message}</p>
                                                    </div>
                                                    {!notification.read && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-rose-600" />}
                                                </div>
                                                <div className="text-xs text-stone-400 mt-3">{new Date(notification.created_at).toLocaleString()}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </main>

        </div>
    );
}

// Helper Components
function OpportunitySection({
    opportunities,
    loading,
    onView,
    onRespond,
}: {
    opportunities: CreatorOpportunity[];
    loading: boolean;
    onView: (projectId: string) => void;
    onRespond: (projectId: string, status: "interested" | "declined") => void;
}) {
    return (
        <section>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-stone-900 font-display">New Booking Opportunities</h2>
                    <p className="text-sm text-stone-500 mt-1">Broadcast bookings matched to your verified creator profile.</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-stone-100">
                    <div className="w-8 h-8 rounded-full border-4 border-rose-200 border-t-rose-600 animate-spin mx-auto mb-4"></div>
                    <p className="text-stone-500 font-medium">Fetching booking opportunities...</p>
                </div>
            ) : opportunities.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-stone-100 shadow-sm">
                    <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Inbox className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-stone-900 mb-2 font-display">No new opportunities</h3>
                    <p className="text-stone-500 max-w-sm mx-auto">When a broadcast booking matches your profile, it will appear here.</p>
                </div>
            ) : (
                <div className="grid lg:grid-cols-2 gap-4">
                    {opportunities.map((opportunity) => {
                        const canRespond = canRespondToOpportunity(opportunity);
                        return (
                            <div key={opportunity.invite_id} className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md hover:border-rose-200 transition-all flex flex-col">
                                <div className="flex justify-between items-start gap-4 mb-4">
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-stone-900 leading-tight truncate">{opportunity.title}</h3>
                                        <div className="text-xs font-medium text-stone-500 mt-1">
                                            {new Date(opportunity.created_at).toLocaleDateString()} · {getOpportunityDisplayStatus(opportunity)}
                                        </div>
                                    </div>
                                    <div className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${opportunity.invite_status === "interested" ? "text-green-700 bg-green-50" : opportunity.invite_status === "declined" || opportunity.invite_status === "inactive" || opportunity.project_status === "expired" ? "text-stone-600 bg-stone-100" : "text-rose-600 bg-rose-50"}`}>
                                        {getOpportunityDisplayStatus(opportunity)}
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6 flex-1">
                                    <div className="flex items-start gap-3">
                                        <Camera className="w-4 h-4 text-stone-400 mt-0.5 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold text-stone-900">{opportunity.booking_type?.replace(/_/g, " ") || "Booking"}</div>
                                            <div className="text-xs text-stone-500 break-words line-clamp-2">{opportunity.requirement_summary || opportunity.description || "No summary provided."}</div>
                                        </div>
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        <OpportunityMeta icon={<MapPin className="w-4 h-4" />} label="Location" value={opportunity.booking_location || "Not specified"} />
                                        <OpportunityMeta icon={<Calendar className="w-4 h-4" />} label="Event Date" value={opportunity.event_date ? new Date(opportunity.event_date).toLocaleDateString() : "Not specified"} />
                                        <OpportunityMeta icon={<ClockIcon />} label="Days" value={opportunity.estimated_days ? `${opportunity.estimated_days}` : "Not specified"} />
                                        <OpportunityMeta icon={<Wallet className="w-4 h-4" />} label="Budget" value={formatCurrency(opportunity.budget)} />
                                    </div>
                                    {opportunity.match_reason && (
                                        <div className="rounded-xl bg-stone-50 border border-stone-100 p-3 text-xs text-stone-600">
                                            <span className="font-bold text-stone-800">Match:</span> {opportunity.match_reason}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-stone-100">
                                    <button onClick={() => onView(opportunity.project_id)} className="flex-1 py-2.5 bg-white border border-stone-200 text-stone-700 font-bold rounded-xl hover:bg-stone-50 transition-colors text-sm">
                                        View Details
                                    </button>
                                    {canRespond ? (
                                        <>
                                            <button onClick={() => onRespond(opportunity.project_id, "declined")} className="flex-1 py-2.5 bg-stone-50 text-stone-700 font-bold rounded-xl hover:bg-stone-100 transition-colors text-sm">
                                                Decline
                                            </button>
                                            <button onClick={() => onRespond(opportunity.project_id, "interested")} className="flex-1 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors text-sm">
                                                Interested
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex-1 py-2.5 bg-stone-50 text-stone-600 font-bold rounded-xl text-sm text-center">
                                            {opportunity.project_status === "cancelled" ? "Cancelled" : opportunity.project_status === "expired" || opportunity.invite_status === "inactive" ? "Expired/Inactive" : opportunity.invite_status === "interested" ? "Interested submitted" : opportunity.invite_status === "declined" ? "Declined" : "Responses closed"}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

function OpportunityMeta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-2 text-xs">
            <span className="text-stone-400 mt-0.5">{icon}</span>
            <div className="min-w-0">
                <div className="font-semibold text-stone-500">{label}</div>
                <div className="font-bold text-stone-900 break-words">{value}</div>
            </div>
        </div>
    );
}

function ProfileInput({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-bold text-stone-700 mb-1">
                {label} {required && <span className="text-rose-500 ml-0.5">*</span>}
            </label>
            {children}
        </div>
    );
}

function ProfileToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
    return (
        <label className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold text-stone-700">
            <span>{label}</span>
            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-rose-600 focus:ring-rose-500"
            />
        </label>
    );
}

function ClockIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
        </svg>
    );
}

function NavItem({ icon, label, isActive, onClick, badge }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void, badge?: string }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${isActive ? 'bg-rose-50 text-rose-600 font-bold shadow-sm ring-1 ring-rose-500/10' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900 font-medium'}`}
        >
            <span className={`shrink-0 ${isActive ? 'text-rose-500' : 'text-stone-400'}`}>{icon}</span>
            <div className="min-w-0 flex-1">
                <span className="block truncate">{label}</span>
            </div>
            {badge && (
                <span className={`shrink-0 min-w-6 h-6 inline-flex items-center justify-center rounded-full text-xs font-bold ${isActive ? 'bg-rose-600 text-white' : 'bg-stone-200 text-stone-600'}`}>
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

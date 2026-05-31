"use client";

import { type FormEvent, useState, useEffect, useRef } from "react";
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
    MapPin,
    ChevronDown,
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
import { commaList, creatorServiceLabel, parseCommaList } from "@/lib/creators/services";
import {
    BOOKING_CREW_CATEGORIES,
    BOOKING_EVENT_CATEGORIES,
    EQUIPMENT_REQUIREMENT_CATEGORIES,
    POST_PRODUCTION_CATEGORIES,
    getSelectedCount,
    type BookingCategory,
} from "@/config/bookingOptions";
import { formatPaymentStatus } from "@/lib/projects/statusLabels";
import { RoleSettingsPanel } from "@/components/settings/RoleSettingsPanel";
import { deletePortfolioItem, listMyPortfolioItems, updatePortfolioItem, uploadPortfolioMedia, type PortfolioItem } from "../actions/portfolio";
import { listCreatorQuickBookings, respondToQuickBooking, type CreatorQuickBookingRequest } from "../actions/quickBookings";
import { createHybridVendorProfile } from "../actions/equipmentVendors";
import { EQUIPMENT_VENDOR_CATEGORIES } from "@/lib/equipment/vendors";

const closedProjectStatuses = new Set(["expired", "cancelled", "completed", "disputed"]);
const acceptedPortfolioTypes = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime", "video/webm"]);
const maxPortfolioImageSize = 10 * 1024 * 1024;
const maxPortfolioVideoSize = 100 * 1024 * 1024;
const specializationOptions = [
    "Luxury Weddings",
    "Cinematic Films",
    "Product Ads",
    "Social Media Content",
    "Corporate Shoots",
    "Fashion Campaigns",
    "Drone Cinematography",
    "Music Videos",
];
const styleOptions = [
    "Cinematic",
    "Documentary",
    "Luxury",
    "Minimal",
    "Creative",
    "Traditional",
    "Corporate",
    "Viral/Social Media",
    "Fashion Editorial",
    "Dark Moody",
    "Bright & Airy",
];
const budgetTierOptions = ["budget", "standard", "premium"];
const travelOptions = [
    { label: "Local Only", radius: 0 },
    { label: "Within 50km", radius: 50 },
    { label: "Within 200km", radius: 200 },
    { label: "Statewide", radius: 500 },
    { label: "Pan India", radius: 3000 },
];

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
            .select('bio, location, city, state, phone, whatsapp_phone, role, primary_service, service_tags, event_tags, equipment_tags, post_production_tags, specialization_tags, style_tags, travel_radius_km, travel_locations, budget_tiers, instant_booking_enabled, response_time, completed_shoots, response_rate, completion_rate, repeat_clients, day_rate, portfolio_url, verified, equipment, tags, capacity_per_day, service_cities, service_radius_km, travel_enabled, available_for_booking, budget_flexibility, whatsapp_opt_in')
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
            primary_service: "",
            service_tags: [],
            event_tags: [],
            equipment_tags: [],
            post_production_tags: [],
            specialization_tags: [],
            style_tags: [],
            travel_radius_km: 0,
            travel_locations: [],
            budget_tiers: [],
            instant_booking_enabled: false,
            response_time: "",
            completed_shoots: 0,
            response_rate: 0,
            completion_rate: 0,
            repeat_clients: 0,
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
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [selectedEventTags, setSelectedEventTags] = useState<string[]>([]);
    const [selectedEquipmentTags, setSelectedEquipmentTags] = useState<string[]>([]);
    const [selectedPostProductionTags, setSelectedPostProductionTags] = useState<string[]>([]);
    const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
    const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
    const [selectedBudgetTiers, setSelectedBudgetTiers] = useState<string[]>([]);
    const [travelRadiusKm, setTravelRadiusKm] = useState<number | string>(0);
    const [travelLocations, setTravelLocations] = useState("");
    const [instantBookingEnabled, setInstantBookingEnabled] = useState(false);
    const [availabilityDate, setAvailabilityDate] = useState("");
    const [availabilityStatus, setAvailabilityStatus] = useState("blocked");
    const [availabilityNotes, setAvailabilityNotes] = useState("");
    const [serviceSearch, setServiceSearch] = useState("");
    const [eventSearch, setEventSearch] = useState("");
    const [equipmentTagSearch, setEquipmentTagSearch] = useState("");
    const [postProductionTagSearch, setPostProductionTagSearch] = useState("");
    const [openServiceCategories, setOpenServiceCategories] = useState<Record<string, boolean>>({ photography: true });
    const [openEventCategories, setOpenEventCategories] = useState<Record<string, boolean>>({ weddings_personal: true });
    const [openEquipmentTagCategories, setOpenEquipmentTagCategories] = useState<Record<string, boolean>>({ camera: true });
    const [openPostProductionTagCategories, setOpenPostProductionTagCategories] = useState<Record<string, boolean>>({ post_production: true });
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
    const [hybridVendorProviderId, setHybridVendorProviderId] = useState<string | null>(null);
    const [checkingHybridVendor, setCheckingHybridVendor] = useState(true);
    const [hybridVendorSaving, setHybridVendorSaving] = useState(false);
    const [hybridVendorCategories, setHybridVendorCategories] = useState<string[]>([]);

    // SWR Hooks
    const { data: requests = [], isValidating: loading, mutate: mutateRequests } = useSWR(
        userId ? ['creator-requests', userId] : null,
        fetchRequests
    );

    const { data: opportunities = [], isValidating: opportunitiesLoading, mutate: mutateOpportunities } = useSWR(
        userId ? ['creator-opportunities', userId] : null,
        fetchOpportunities
    );
    const { data: quickBookings = [], isValidating: quickBookingsLoading, mutate: mutateQuickBookings } = useSWR<CreatorQuickBookingRequest[]>(
        userId ? ['creator-quick-bookings', userId] : null,
        () => listCreatorQuickBookings()
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
                const savedServices = Array.isArray(data.service_tags) ? data.service_tags.map(String) : [];
                const fallbackService = data.primary_service || data.role || "";
                const nextServices = savedServices.length > 0 ? savedServices : (fallbackService ? [fallbackService] : []);
                setSelectedServices(nextServices);
                setSelectedEventTags(Array.isArray(data.event_tags) ? data.event_tags.map(String) : []);
                setSelectedEquipmentTags(Array.isArray(data.equipment_tags) ? data.equipment_tags.map(String) : []);
                setSelectedPostProductionTags(Array.isArray(data.post_production_tags) ? data.post_production_tags.map(String) : []);
                setSelectedSpecializations(Array.isArray(data.specialization_tags) ? data.specialization_tags.map(String) : []);
                setSelectedStyles(Array.isArray(data.style_tags) ? data.style_tags.map(String) : []);
                setSelectedBudgetTiers(Array.isArray(data.budget_tiers) ? data.budget_tiers.map(String) : []);
                setTravelRadiusKm(data.travel_radius_km || 0);
                setTravelLocations(commaList(data.travel_locations));
                setInstantBookingEnabled(Boolean(data.instant_booking_enabled));
                setRole(fallbackService || nextServices[0] || "");
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
                if (user.user_metadata?.role) {
                    setSelectedServices((current) => current.length > 0 ? current : [String(user.user_metadata?.role)]);
                }
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
                const { data: vendorProvider } = await supabase
                    .from("provider_profiles")
                    .select("id")
                    .eq("user_id", user.id)
                    .eq("provider_type", "equipment_vendor")
                    .maybeSingle();
                setHybridVendorProviderId(vendorProvider?.id || null);
            } else {
                setUserEmail("Unknown User");
                router.push("/login");
            }
            setCheckingHybridVendor(false);
        };
        fetchUserData();
    }, [supabase, router]);

    const handleLogout = async () => {
        await logout();
    };

    const toggleHybridVendorCategory = (categoryId: string) => {
        setHybridVendorCategories((current) =>
            current.includes(categoryId)
                ? current.filter((id) => id !== categoryId)
                : [...current, categoryId]
        );
    };

    const handleHybridVendorSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (hybridVendorCategories.length === 0) {
            toast.error("Select at least one equipment category.");
            return;
        }

        setHybridVendorSaving(true);
        const formData = new FormData(event.currentTarget);
        formData.set("equipment_categories", hybridVendorCategories.join(","));
        const result = await createHybridVendorProfile(formData);
        setHybridVendorSaving(false);

        if (result.success) {
            toast.success(result.message);
            setHybridVendorProviderId("created");
            router.refresh();
        } else {
            toast.error(result.message);
        }
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

    const handleQuickBookingResponse = async (bookingId: string, status: "creator_accepted" | "creator_rejected" | "more_details_requested") => {
        const result = await respondToQuickBooking(bookingId, status);
        if (!result.success) {
            toast.error(result.message);
            return;
        }
        toast.success(result.message);
        mutateQuickBookings();
    };

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
        if (selectedServices.length === 0) {
            toast.error("Select at least one service offered.");
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
            const primaryService = selectedServices[0] || role;
            const numDayRate = typeof dayRate === 'string' ? parseInt(dayRate) || 0 : dayRate;
            const numCapacity = typeof capacityPerDay === 'string' ? parseInt(capacityPerDay) || null : capacityPerDay || null;
            const numRadius = typeof serviceRadiusKm === 'string' ? parseInt(serviceRadiusKm) || 0 : serviceRadiusKm || 0;
            const numTravelRadius = typeof travelRadiusKm === 'string' ? parseInt(travelRadiusKm) || 0 : travelRadiusKm || 0;
            const generatedSlug = (userEmail || `creator-${userId}`).split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + userId.slice(0, 8);
            const profilePayload = {
                id: userId,
                slug: generatedSlug,
                role: primaryService,
                primary_service: primaryService,
                service_tags: selectedServices,
                event_tags: selectedEventTags,
                equipment_tags: selectedEquipmentTags,
                post_production_tags: selectedPostProductionTags,
                specialization_tags: selectedSpecializations,
                style_tags: selectedStyles,
                travel_radius_km: numTravelRadius,
                travel_locations: parseCommaList(travelLocations),
                budget_tiers: selectedBudgetTiers,
                instant_booking_enabled: instantBookingEnabled,
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

    const handleSaveAvailability = async () => {
        if (!userId || !availabilityDate) {
            toast.error("Choose a date first.");
            return;
        }

        const { error } = await supabase.from("creator_availability").upsert({
            creator_id: userId,
            available_date: availabilityDate,
            is_available: availabilityStatus === "available",
            status: availabilityStatus,
            notes: availabilityNotes || null,
        }, { onConflict: "creator_id,available_date" });

        if (error) {
            console.error("Availability save error:", error);
            toast.error(error.message);
            return;
        }

        toast.success("Availability updated.");
        setAvailabilityDate("");
        setAvailabilityNotes("");
    };

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
            event_tags: item.event_tags || [],
            featured: item.featured,
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
        selectedServices.length === 0 ? "Services offered" : null,
        selectedEventTags.length === 0 ? "Event types served" : null,
        selectedSpecializations.length === 0 ? "Specialization" : null,
        portfolioItems.length === 0 ? "Portfolio media" : null,
        !dayRate || Number(dayRate) <= 0 ? "Day rate" : null,
        !phone.trim() && !whatsappPhone.trim() ? "Phone/WhatsApp" : null,
        !availableForBooking ? "Available for booking" : null,
        !travelEnabled && parseCommaList(serviceCities).length === 0 ? "Service cities or travel enabled" : null,
    ].filter((item): item is string => Boolean(item));

    const profileCompletionTotal = 10;
    const profileCompletionPercent = Math.round(((profileCompletionTotal - missingProfileFields.length) / profileCompletionTotal) * 100);
    const unreadNotificationCount = notifications.filter((notification) => !notification.read).length;
    const filterBookingCategories = (categories: BookingCategory[], queryValue: string) => {
        const query = queryValue.trim().toLowerCase();
        return categories
            .map((category) => ({
                ...category,
                options: category.options.filter((option) => {
                    return !query || option.label.toLowerCase().includes(query) || category.label.toLowerCase().includes(query);
                }),
            }))
            .filter((category) => category.options.length > 0);
    };

    const filteredServiceCategories = filterBookingCategories(BOOKING_CREW_CATEGORIES, serviceSearch);
    const filteredEventCategories = filterBookingCategories(BOOKING_EVENT_CATEGORIES, eventSearch);
    const filteredEquipmentTagCategories = filterBookingCategories(EQUIPMENT_REQUIREMENT_CATEGORIES, equipmentTagSearch);
    const filteredPostProductionTagCategories = filterBookingCategories(POST_PRODUCTION_CATEGORIES, postProductionTagSearch);

    const toggleService = (serviceValue: string) => {
        setSelectedServices((current) => {
            if (current.includes(serviceValue)) {
                const next = current.filter((service) => service !== serviceValue);
                setRole(next[0] || "");
                return next;
            }
            const next = [...current, serviceValue];
            setRole((existing) => existing || serviceValue);
            return next;
        });
    };

    const toggleTag = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
        setter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
    };

    const selectAllInCategory = (
        options: readonly { id: string; label: string }[],
        setter: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
        setter((current) => Array.from(new Set([...current, ...options.map((option) => option.id)])));
    };

    const clearCategory = (
        options: readonly { id: string; label: string }[],
        setter: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
        const categoryIds = new Set(options.map((option) => option.id));
        setter((current) => current.filter((item) => !categoryIds.has(item)));
    };

    const toggleAccordion = (
        setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
        categoryId: string,
        keepOpen = 2
    ) => {
        setter((current) => {
            const nextState = !current[categoryId];
            if (!nextState) return { ...current, [categoryId]: false };
            const openIds = Object.entries(current).filter(([, open]) => open).map(([id]) => id);
            const next = { ...current, [categoryId]: true };
            for (const id of openIds.slice(0, Math.max(0, openIds.length - keepOpen + 1))) {
                if (id !== categoryId) next[id] = false;
            }
            return next;
        });
    };

    const selectAllServicesInCategory = (services: readonly { id: string; label: string }[]) => {
        setSelectedServices((current) => {
            const merged = Array.from(new Set([...current, ...services.map((service) => service.id)]));
            setRole((existing) => existing || merged[0] || "");
            return merged;
        });
    };

    const toggleStringTag = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
        setter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
    };

    const renderTagChips = (options: string[], selected: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => (
        <div className="flex flex-wrap gap-2">
            {options.map((option) => {
                const active = selected.includes(option);
                return (
                    <button
                        key={option}
                        type="button"
                        onClick={() => toggleStringTag(option, setter)}
                        className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${active ? "border-orange-500 bg-orange-50 text-orange-700" : "border-stone-200 bg-white text-stone-700 hover:border-orange-300"}`}
                    >
                        {option}
                    </button>
                );
            })}
        </div>
    );

    const selectedRecord = (values: string[]) => Object.fromEntries(values.map((value) => [value, true]));

    const renderCategoryPicker = ({
        title,
        helper,
        categories,
        selected,
        search,
        setSearch,
        openState,
        setOpenState,
        onToggle,
        onSelectAll,
        onClear,
    }: {
        title: string;
        helper: string;
        categories: BookingCategory[];
        selected: string[];
        search: string;
        setSearch: (value: string) => void;
        openState: Record<string, boolean>;
        setOpenState: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
        onToggle: (value: string) => void;
        onSelectAll: (options: BookingCategory["options"]) => void;
        onClear: (options: BookingCategory["options"]) => void;
    }) => (
        <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <h4 className="text-sm font-black text-stone-900">{title}</h4>
                    <p className="text-xs text-stone-500 mt-1">{helper}</p>
                </div>
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="w-full md:w-64 px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                    placeholder={`Search ${title.toLowerCase()}`}
                />
            </div>
            {selected.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {selected.map((value) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => onToggle(value)}
                            className="rounded-full bg-orange-100 px-3 py-1.5 text-xs font-black text-orange-700 hover:bg-orange-200"
                        >
                            {creatorServiceLabel(value)} x
                        </button>
                    ))}
                </div>
            )}
            <div className="mt-4 space-y-3">
                {categories.map((category) => {
                    const isOpen = openState[category.id] ?? false;
                    const selectedCount = getSelectedCount(category, selectedRecord(selected));
                    const CategoryIcon = category.icon;
                    return (
                        <section key={category.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                            <button
                                type="button"
                                onClick={() => toggleAccordion(setOpenState, category.id)}
                                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                            >
                                <span className="flex items-center gap-2 text-sm font-black text-stone-800">
                                    <CategoryIcon className="h-4 w-4 text-orange-600" />
                                    {category.label}
                                </span>
                                <span className="flex items-center gap-2 text-xs font-bold text-stone-500">
                                    {selectedCount ? `${selectedCount} selected` : isOpen ? "Hide" : "Show"}
                                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                                </span>
                            </button>
                            {isOpen && (
                                <div className="border-t border-stone-100 p-4">
                                    <div className="mb-3 flex gap-3">
                                        <button type="button" onClick={() => onSelectAll(category.options)} className="text-xs font-bold text-orange-600 hover:text-orange-700">Select all</button>
                                        <button type="button" onClick={() => onClear(category.options)} className="text-xs font-bold text-stone-500 hover:text-stone-700">Clear</button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {category.options.map((option) => {
                                            const checked = selected.includes(option.id);
                                            return (
                                                <label
                                                    key={option.id}
                                                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors cursor-pointer ${checked ? "border-orange-500 bg-orange-50 text-orange-700" : "border-stone-200 bg-white text-stone-700 hover:border-orange-200"}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => onToggle(option.id)}
                                                        className="h-4 w-4 accent-orange-600"
                                                    />
                                                    {option.label}
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </section>
                    );
                })}
            </div>
        </div>
    );

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
                    badge={(requests.filter(r => r.status === 'New Request').length + opportunities.filter(canRespondToOpportunity).length + quickBookings.filter((booking) => booking.status === "pending_creator_acceptance").length).toString()}
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

                                <section className="rounded-[1.5rem] border border-orange-100 bg-white p-6 shadow-sm">
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-700">
                                                Equipment Rental
                                            </div>
                                            <h2 className="mt-3 text-2xl font-black text-stone-900 font-display">Rent out your equipment</h2>
                                            <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-stone-600">
                                                If you own cameras, lights, audio gear, drones, or production tools, add vendor access to the same account and manage rental inventory from the vendor dashboard.
                                            </p>
                                        </div>
                                        {hybridVendorProviderId ? (
                                            <button
                                                type="button"
                                                onClick={() => router.push("/vendor-dashboard")}
                                                className="rounded-xl bg-stone-900 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-stone-800"
                                            >
                                                Open Vendor Dashboard
                                            </button>
                                        ) : null}
                                    </div>

                                    {checkingHybridVendor ? (
                                        <p className="mt-5 text-sm font-semibold text-stone-500">Checking vendor access...</p>
                                    ) : hybridVendorProviderId ? (
                                        <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                                            Vendor profile is available on this account. Admin verification is still required before rental requests are sent to you.
                                        </p>
                                    ) : (
                                        <form onSubmit={handleHybridVendorSubmit} className="mt-6 grid gap-4">
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <label className="text-sm font-bold text-stone-700">
                                                    Business / display name
                                                    <input name="business_name" defaultValue={userEmail?.split("@")[0] || ""} required className="mt-2 w-full rounded-xl border border-stone-200 px-4 py-3 font-semibold outline-none focus:border-orange-500" />
                                                </label>
                                                <label className="text-sm font-bold text-stone-700">
                                                    Contact name
                                                    <input name="contact_name" defaultValue={userEmail?.split("@")[0] || ""} required className="mt-2 w-full rounded-xl border border-stone-200 px-4 py-3 font-semibold outline-none focus:border-orange-500" />
                                                </label>
                                                <label className="text-sm font-bold text-stone-700">
                                                    Phone
                                                    <input name="phone" defaultValue={phone} required className="mt-2 w-full rounded-xl border border-stone-200 px-4 py-3 font-semibold outline-none focus:border-orange-500" />
                                                </label>
                                                <label className="text-sm font-bold text-stone-700">
                                                    WhatsApp number
                                                    <input name="whatsapp_phone" defaultValue={whatsappPhone || phone} className="mt-2 w-full rounded-xl border border-stone-200 px-4 py-3 font-semibold outline-none focus:border-orange-500" />
                                                </label>
                                                <label className="text-sm font-bold text-stone-700">
                                                    City
                                                    <input name="city" defaultValue={city} required className="mt-2 w-full rounded-xl border border-stone-200 px-4 py-3 font-semibold outline-none focus:border-orange-500" />
                                                </label>
                                                <label className="text-sm font-bold text-stone-700">
                                                    State
                                                    <input name="state" defaultValue={stateName} className="mt-2 w-full rounded-xl border border-stone-200 px-4 py-3 font-semibold outline-none focus:border-orange-500" />
                                                </label>
                                            </div>
                                            <label className="text-sm font-bold text-stone-700">
                                                Warehouse / pickup address
                                                <input name="warehouse_address" defaultValue={location} required className="mt-2 w-full rounded-xl border border-stone-200 px-4 py-3 font-semibold outline-none focus:border-orange-500" />
                                            </label>

                                            <div>
                                                <div className="mb-3 text-sm font-bold text-stone-700">Equipment categories</div>
                                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                                    {EQUIPMENT_VENDOR_CATEGORIES.map((category) => {
                                                        const selected = hybridVendorCategories.includes(category.id);
                                                        return (
                                                            <button
                                                                key={category.id}
                                                                type="button"
                                                                onClick={() => toggleHybridVendorCategory(category.id)}
                                                                className={`rounded-xl border px-3 py-3 text-left text-sm font-bold transition-colors ${selected ? "border-orange-500 bg-orange-50 text-orange-700" : "border-stone-200 bg-white text-stone-700 hover:border-orange-300"}`}
                                                            >
                                                                {category.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-3">
                                                <label className="text-sm font-bold text-stone-700">
                                                    Delivery available
                                                    <select name="delivery_available" className="mt-2 w-full rounded-xl border border-stone-200 px-4 py-3 font-semibold outline-none focus:border-orange-500">
                                                        <option value="false">No</option>
                                                        <option value="true">Yes</option>
                                                    </select>
                                                </label>
                                                <label className="text-sm font-bold text-stone-700">
                                                    Delivery radius km
                                                    <input name="delivery_radius_km" type="number" min="0" defaultValue="0" className="mt-2 w-full rounded-xl border border-stone-200 px-4 py-3 font-semibold outline-none focus:border-orange-500" />
                                                </label>
                                                <label className="text-sm font-bold text-stone-700">
                                                    Operator support
                                                    <select name="operator_support_available" className="mt-2 w-full rounded-xl border border-stone-200 px-4 py-3 font-semibold outline-none focus:border-orange-500">
                                                        <option value="false">No</option>
                                                        <option value="true">Yes</option>
                                                    </select>
                                                </label>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={hybridVendorSaving}
                                                className="w-fit rounded-xl bg-orange-600 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-stone-300"
                                            >
                                                {hybridVendorSaving ? "Creating..." : "Add Equipment Vendor Profile"}
                                            </button>
                                        </form>
                                    )}
                                </section>

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
                                                    <div className="md:col-span-2 space-y-5">
                                                        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                                                            <p className="text-sm font-bold text-stone-800">Select the services, event types, equipment, and post-production support you can professionally provide.</p>
                                                            <p className="mt-1 text-xs font-semibold text-stone-600">These tags help ShotcutCrew match you with the right Quick Booking clients. More accurate tags = better matching.</p>
                                                        </div>
                                                        <ProfileInput label="Main Service">
                                                            <select
                                                                value={role}
                                                                onChange={(event) => setRole(event.target.value)}
                                                                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-rose-500 transition-colors"
                                                            >
                                                                <option value="">Optional headline service</option>
                                                                {BOOKING_CREW_CATEGORIES.flatMap((category) => category.options).map((option) => (
                                                                    <option key={option.id} value={option.id}>{option.label}</option>
                                                                ))}
                                                            </select>
                                                        </ProfileInput>
                                                        {renderCategoryPicker({
                                                            title: "Services Offered",
                                                            helper: `${selectedServices.length} selected. Used for crew/service matching.`,
                                                            categories: filteredServiceCategories,
                                                            selected: selectedServices,
                                                            search: serviceSearch,
                                                            setSearch: setServiceSearch,
                                                            openState: openServiceCategories,
                                                            setOpenState: setOpenServiceCategories,
                                                            onToggle: toggleService,
                                                            onSelectAll: selectAllServicesInCategory,
                                                            onClear: (options) => clearCategory(options, setSelectedServices),
                                                        })}
                                                        {renderCategoryPicker({
                                                            title: "Event Types Served",
                                                            helper: selectedEventTags.length ? `${selectedEventTags.length} selected.` : "Recommended: select the project types you can handle.",
                                                            categories: filteredEventCategories,
                                                            selected: selectedEventTags,
                                                            search: eventSearch,
                                                            setSearch: setEventSearch,
                                                            openState: openEventCategories,
                                                            setOpenState: setOpenEventCategories,
                                                            onToggle: (value) => toggleTag(value, setSelectedEventTags),
                                                            onSelectAll: (options) => selectAllInCategory(options, setSelectedEventTags),
                                                            onClear: (options) => clearCategory(options, setSelectedEventTags),
                                                        })}
                                                        {renderCategoryPicker({
                                                            title: "Equipment Available / Supported",
                                                            helper: "Optional. Select gear you own or can professionally support.",
                                                            categories: filteredEquipmentTagCategories,
                                                            selected: selectedEquipmentTags,
                                                            search: equipmentTagSearch,
                                                            setSearch: setEquipmentTagSearch,
                                                            openState: openEquipmentTagCategories,
                                                            setOpenState: setOpenEquipmentTagCategories,
                                                            onToggle: (value) => toggleTag(value, setSelectedEquipmentTags),
                                                            onSelectAll: (options) => selectAllInCategory(options, setSelectedEquipmentTags),
                                                            onClear: (options) => clearCategory(options, setSelectedEquipmentTags),
                                                        })}
                                                        {renderCategoryPicker({
                                                            title: "Post Production Services",
                                                            helper: "Optional. Select editing and finishing services you provide.",
                                                            categories: filteredPostProductionTagCategories,
                                                            selected: selectedPostProductionTags,
                                                            search: postProductionTagSearch,
                                                            setSearch: setPostProductionTagSearch,
                                                            openState: openPostProductionTagCategories,
                                                            setOpenState: setOpenPostProductionTagCategories,
                                                            onToggle: (value) => toggleTag(value, setSelectedPostProductionTags),
                                                            onSelectAll: (options) => selectAllInCategory(options, setSelectedPostProductionTags),
                                                            onClear: (options) => clearCategory(options, setSelectedPostProductionTags),
                                                        })}
                                                        <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4 space-y-4">
                                                            <div>
                                                                <h4 className="text-sm font-black text-stone-900">Best Known For</h4>
                                                                <p className="text-xs text-stone-500 mt-1">These badges help AI recommend you for the right jobs.</p>
                                                            </div>
                                                            {renderTagChips(specializationOptions, selectedSpecializations, setSelectedSpecializations)}
                                                        </div>
                                                        <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4 space-y-4">
                                                            <div>
                                                                <h4 className="text-sm font-black text-stone-900">Production Style</h4>
                                                                <p className="text-xs text-stone-500 mt-1">Emotional style tags improve portfolio-first matching.</p>
                                                            </div>
                                                            {renderTagChips(styleOptions, selectedStyles, setSelectedStyles)}
                                                        </div>
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
                                                <ProfileInput label="Travel availability">
                                                    <select value={travelRadiusKm} onChange={(e) => setTravelRadiusKm(parseInt(e.target.value) || 0)} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-rose-500 transition-colors">
                                                        {travelOptions.map((option) => <option key={option.radius} value={option.radius}>{option.label}</option>)}
                                                    </select>
                                                </ProfileInput>
                                                <ProfileInput label="Preferred travel cities">
                                                    <input type="text" value={travelLocations} onChange={(e) => setTravelLocations(e.target.value)} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-rose-500 transition-colors placeholder-stone-400" placeholder="Bilaspur, Raipur, Mumbai" />
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
                                                <ProfileToggle label="Instant booking eligible" checked={instantBookingEnabled} onChange={setInstantBookingEnabled} />
                                            </div>
                                            <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4 space-y-3">
                                                <h4 className="text-sm font-black text-stone-900">Preferred Project Tier</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {[...budgetTierOptions, "all"].map((tier) => (
                                                        <button
                                                            key={tier}
                                                            type="button"
                                                            onClick={() => {
                                                                if (tier === "all") {
                                                                    setSelectedBudgetTiers(budgetTierOptions);
                                                                    return;
                                                                }
                                                                toggleStringTag(tier, setSelectedBudgetTiers);
                                                            }}
                                                            className={`rounded-full border px-4 py-2 text-sm font-bold capitalize ${selectedBudgetTiers.includes(tier) || (tier === "all" && selectedBudgetTiers.length === budgetTierOptions.length) ? "border-orange-500 bg-orange-50 text-orange-700" : "border-stone-200 bg-white text-stone-700 hover:border-orange-300"}`}
                                                        >
                                                            {tier}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 space-y-3">
                                                <h4 className="text-sm font-black text-stone-900">Availability Calendar</h4>
                                                <div className="grid md:grid-cols-3 gap-3">
                                                    <input type="date" value={availabilityDate} onChange={(e) => setAvailabilityDate(e.target.value)} className="px-4 py-3 bg-white border border-orange-100 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-orange-500" />
                                                    <select value={availabilityStatus} onChange={(e) => setAvailabilityStatus(e.target.value)} className="px-4 py-3 bg-white border border-orange-100 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-orange-500">
                                                        <option value="available">Available</option>
                                                        <option value="blocked">Blocked</option>
                                                        <option value="unavailable">Unavailable</option>
                                                        <option value="vacation">Vacation</option>
                                                    </select>
                                                    <button type="button" onClick={handleSaveAvailability} className="rounded-xl bg-orange-600 px-4 py-3 text-sm font-black text-white hover:bg-orange-700">Save Date</button>
                                                </div>
                                                <input type="text" value={availabilityNotes} onChange={(e) => setAvailabilityNotes(e.target.value)} className="w-full px-4 py-3 bg-white border border-orange-100 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-orange-500" placeholder="Notes, e.g. outstation shoot or available after 4 PM" />
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
                                                                    <div className="flex flex-wrap gap-3">
                                                                        <label className="flex items-center gap-2 text-xs font-semibold text-stone-600">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={item.is_public}
                                                                                onChange={(event) => setPortfolioItems((items) => items.map((current) => current.id === item.id ? { ...current, is_public: event.target.checked } : current))}
                                                                                className="accent-rose-600"
                                                                            />
                                                                            Public
                                                                        </label>
                                                                        <label className="flex items-center gap-2 text-xs font-semibold text-stone-600">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={item.featured}
                                                                                onChange={(event) => setPortfolioItems((items) => items.map((current) => current.id === item.id ? { ...current, featured: event.target.checked } : event.target.checked ? { ...current, featured: false } : current))}
                                                                                className="accent-orange-600"
                                                                            />
                                                                            Featured Work
                                                                        </label>
                                                                    </div>
                                                                    <button type="button" onClick={() => handlePortfolioItemUpdate(item)} className="rounded-xl bg-stone-900 px-3 py-2 text-xs font-bold text-white hover:bg-stone-800">
                                                                        Save Item
                                                                    </button>
                                                                </div>
                                                                <input
                                                                    value={commaList(item.event_tags)}
                                                                    onChange={(event) => setPortfolioItems((items) => items.map((current) => current.id === item.id ? { ...current, event_tags: parseCommaList(event.target.value) } : current))}
                                                                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-rose-500"
                                                                    placeholder="Event tags: wedding, product shoot, music video"
                                                                />
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
                                        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                                            <h4 className="font-bold text-stone-900 mb-4">Trust & Marketplace Signals</h4>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div className="rounded-2xl bg-stone-50 p-3"><span className="block text-stone-500">Verification</span><b>{profile?.verified ? "Verified" : "Under review"}</b></div>
                                                <div className="rounded-2xl bg-stone-50 p-3"><span className="block text-stone-500">Completed shoots</span><b>{profile?.completed_shoots || 0}</b></div>
                                                <div className="rounded-2xl bg-stone-50 p-3"><span className="block text-stone-500">Response time</span><b>{profile?.response_time || "Not tracked"}</b></div>
                                                <div className="rounded-2xl bg-stone-50 p-3"><span className="block text-stone-500">Repeat clients</span><b>{profile?.repeat_clients || 0}</b></div>
                                                <div className="rounded-2xl bg-stone-50 p-3"><span className="block text-stone-500">Response rate</span><b>{Number(profile?.response_rate || 0)}%</b></div>
                                                <div className="rounded-2xl bg-stone-50 p-3"><span className="block text-stone-500">Completion rate</span><b>{Number(profile?.completion_rate || 0)}%</b></div>
                                            </div>
                                            <p className="mt-4 text-xs text-stone-500">These signals improve marketplace trust and AI recommendation quality as real booking history grows.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "requests" && (
                            <div className="space-y-8">
                                <section>
                                    <h2 className="text-xl font-bold text-stone-900 font-display mb-4">Quick Booking Requests</h2>
                                    {quickBookingsLoading ? (
                                        <div className="text-center py-10 bg-white rounded-2xl border border-stone-100">
                                            <div className="w-8 h-8 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin mx-auto mb-4"></div>
                                            <p className="text-stone-500 font-medium">Loading quick bookings...</p>
                                        </div>
                                    ) : quickBookings.length === 0 ? (
                                        <div className="bg-white rounded-2xl border border-stone-100 p-6 text-stone-500 font-medium">No quick booking requests yet.</div>
                                    ) : (
                                        <div className="grid lg:grid-cols-2 gap-4">
                                            {quickBookings.map((booking) => (
                                                <div key={booking.id} className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm hover:border-orange-200 transition-all">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <h3 className="font-black text-stone-900">{booking.event_type}</h3>
                                                            <p className="text-sm text-stone-500 mt-1">{booking.client_name} · {booking.city}</p>
                                                        </div>
                                                        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">{booking.status.replace(/_/g, " ")}</span>
                                                    </div>
                                                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                                        <div className="rounded-xl bg-stone-50 p-3"><span className="block text-stone-500">Date</span><b>{new Date(booking.shoot_date).toLocaleDateString()} {booking.shoot_time}</b></div>
                                                        <div className="rounded-xl bg-stone-50 p-3"><span className="block text-stone-500">Budget tier</span><b className="capitalize">{booking.budget_tier || "standard"}</b></div>
                                                    </div>
                                                    <p className="mt-4 text-sm text-stone-600">{booking.location_address}</p>
                                                    {booking.status === "pending_creator_acceptance" && (
                                                        <div className="mt-5 grid sm:grid-cols-3 gap-2">
                                                            <button onClick={() => handleQuickBookingResponse(booking.id, "creator_accepted")} className="rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white hover:bg-green-700">Accept</button>
                                                            <button onClick={() => handleQuickBookingResponse(booking.id, "more_details_requested")} className="rounded-xl border border-stone-200 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-50">More Details</button>
                                                            <button onClick={() => handleQuickBookingResponse(booking.id, "creator_rejected")} className="rounded-xl bg-rose-50 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100">Reject</button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
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

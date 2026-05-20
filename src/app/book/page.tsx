"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Zap, Settings, ArrowRight, ArrowLeft, CheckCircle, Plus, Minus, Trash2,
    CalendarDays, Package, FileText, Brain, Upload, Search, Info
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { createBooking, type CreateBookingInput } from "@/app/actions/bookings";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BrandLogo } from "@/components/BrandLogo";
import {
    CREW_CATEGORY_ICONS,
    CUSTOM_EVENT_TYPE_ID,
    EQUIPMENT_REQUIREMENT_OPTIONS,
    EVENT_TYPE_CATEGORIES,
    POST_PRODUCTION_REQUIREMENT_OPTIONS,
    PRODUCTION_CREW_ROLES,
    estimateCrewBudget,
    getCrewRequirementSummary,
    getEventTypeLabel,
} from "@/lib/bookings/productionOptions";
import {
    ALL_EQUIPMENT_ITEMS,
    EQUIPMENT_CATEGORIES,
    EQUIPMENT_PACKAGES,
    estimateEquipmentTotal,
    getEquipmentItemById,
    getRecommendedEquipment,
} from "@/lib/bookings/equipmentCatalog";
import type { ScriptAnalysisResult } from "@/lib/ai/scriptAnalysis";

type MatchedCreator = {
    id: string;
    role: string;
    location: string;
    day_rate: number;
    verified: boolean;
    slug?: string | null;
    bio?: string | null;
    profile_image_url?: string | null;
    users?: { full_name?: string | null } | { full_name?: string | null }[] | null;
};

export default function BookingFlow() {
    const [mode, setMode] = useState<"selection" | "quick" | "builder" | "equipment" | "script">("selection");
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bookingMatchCount, setBookingMatchCount] = useState(0);
    const matchedCreators: MatchedCreator[] = [];
    const router = useRouter();
    const supabase = createClient();

    // User State
    const [clientId, setClientId] = useState<string | null>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setClientId(user.id);
        };
        getUser();
    }, [supabase.auth]);


    // ====== BUILDER MODE STATE ======
    const [crew, setCrew] = useState<Array<{ id: string, name: string, rate: number, count: number }>>([]);
    const [days, setDays] = useState(1);

    const availableRoles = PRODUCTION_CREW_ROLES.map((role) => ({
        id: role.id,
        name: role.name,
        rate: Math.round((role.priceMin + role.priceMax) / 2),
    }));

    const handleAddRole = (role: { id: string, name: string, rate: number }) => {
        setCrew(prev => {
            const ext = prev.find(r => r.id === role.id);
            if (ext) return prev.map(r => r.id === role.id ? { ...r, count: r.count + 1 } : r);
            return [...prev, { ...role, count: 1 }];
        });
    };

    const handleRemoveRole = (id: string, entirely = false) => {
        setCrew(prev => {
            const ext = prev.find(r => r.id === id);
            if (ext && ext.count > 1 && !entirely) return prev.map(r => r.id === id ? { ...r, count: r.count - 1 } : r);
            return prev.filter(r => r.id !== id);
        });
    };

    const totalCost = crew.reduce((acc, curr) => acc + (curr.rate * curr.count), 0) * days;
    const platformFee = totalCost * 0.10;
    const grandTotal = totalCost + platformFee;


    // ====== EQUIPMENT MODE STATE ======
    const availableEquipment = ALL_EQUIPMENT_ITEMS.map((item) => ({
        id: item.id,
        name: item.name,
        rate: item.pricePerDay,
    }));

    const [equipment, setEquipment] = useState<Array<{ id: string, name: string, rate: number, count: number }>>([]);
    const [equipDays, setEquipDays] = useState(1);
    const [equipmentSearch, setEquipmentSearch] = useState("");
    const [activeEquipmentCategory, setActiveEquipmentCategory] = useState("all");
    const [openEquipmentCategories, setOpenEquipmentCategories] = useState<Record<string, boolean>>({
        camera_equipment: true,
        lighting_equipment: true,
    });

    const handleAddEquipment = (item: { id: string, name: string, rate: number }) => {
        setEquipment(prev => {
            const ext = prev.find(e => e.id === item.id);
            if (ext) return prev.map(e => e.id === item.id ? { ...e, count: e.count + 1 } : e);
            return [...prev, { ...item, count: 1 }];
        });
    };

    const handleRemoveEquipment = (id: string, entirely = false) => {
        setEquipment(prev => {
            const ext = prev.find(e => e.id === id);
            if (ext && ext.count > 1 && !entirely) return prev.map(e => e.id === id ? { ...e, count: e.count - 1 } : e);
            return prev.filter(e => e.id !== id);
        });
    };

    const equipmentTotal = estimateEquipmentTotal(equipment, equipDays);
    const equipPlatformFee = equipmentTotal * 0.10;
    const equipGrandTotal = equipmentTotal + equipPlatformFee;
    const filteredEquipmentCategories = useMemo(() => {
        const query = equipmentSearch.trim().toLowerCase();
        return EQUIPMENT_CATEGORIES
            .filter((category) => activeEquipmentCategory === "all" || category.id === activeEquipmentCategory)
            .map((category) => ({
                ...category,
                items: category.items.filter((item) => {
                    const searchText = `${item.name} ${item.description} ${item.subcategory}`.toLowerCase();
                    return !query || searchText.includes(query);
                }),
            }))
            .filter((category) => category.items.length > 0);
    }, [activeEquipmentCategory, equipmentSearch]);

    const selectEquipmentPackage = (packageId: string) => {
        const selectedPackage = EQUIPMENT_PACKAGES.find((kit) => kit.id === packageId);
        if (!selectedPackage) return;

        const packageItems = Object.entries(selectedPackage.items)
            .map(([id, count]) => {
                const catalogItem = getEquipmentItemById(id);
                if (!catalogItem || count <= 0) return null;
                return { id, name: catalogItem.name, rate: catalogItem.pricePerDay, count };
            })
            .filter((item): item is { id: string; name: string; rate: number; count: number } => Boolean(item));

        setEquipment(packageItems);
        toast.success(`${selectedPackage.name} added. You can customize quantities.`);
    };


    // ====== QUICK BOOKING STATE (4 reordered steps) ======
    // Step 1: Event Type
    const [selectedEventType, setSelectedEventType] = useState("");
    const [customEventType, setCustomEventType] = useState("");
    const [eventTypeSearch, setEventTypeSearch] = useState("");
    // Step 2: Crew count
    const [crewRequirements, setCrewRequirements] = useState<Record<string, number>>({
        photographer: 1,
        videographer: 1,
    });
    const [photoCount, setPhotoCount] = useState(1);
    const [videoCount, setVideoCount] = useState(1);
    const [equipmentRequirements, setEquipmentRequirements] = useState<Record<string, boolean>>({});
    const [postProductionRequirements, setPostProductionRequirements] = useState<Record<string, boolean>>({});
    // Step 3: Date
    const [bookingDate, setBookingDate] = useState("");
    const  [bookingLocation, setBookingLocation] = useState("");
     // Step 4: Budget slider
    const [budgetValue, setBudgetValue] = useState(50000);
    const [isFixedBudget, setIsFixedBudget] = useState(false);
    const [fixedBudgetAmount, setFixedBudgetAmount] = useState("");

    const selectedEventLabel = getEventTypeLabel(selectedEventType, customEventType);
    const crewSummary = getCrewRequirementSummary(crewRequirements);
    const quickEstimatedBudget = estimateCrewBudget(crewRequirements, 1);
    const recommendedEquipment = getRecommendedEquipment(selectedEventType);

    const filteredEventCategories = useMemo(() => {
        const query = eventTypeSearch.trim().toLowerCase();
        if (!query) return EVENT_TYPE_CATEGORIES;

        return EVENT_TYPE_CATEGORIES
            .map((category) => ({
                ...category,
                options: category.options.filter((option) => {
                    return option.label.toLowerCase().includes(query) || category.label.toLowerCase().includes(query);
                }),
            }))
            .filter((category) => category.options.length > 0);
    }, [eventTypeSearch]);

    const crewRolesByCategory = useMemo(() => {
        return PRODUCTION_CREW_ROLES.reduce<Record<string, typeof PRODUCTION_CREW_ROLES>>((groups, role) => {
            groups[role.category] = [...(groups[role.category] || []), role];
            return groups;
        }, {});
    }, []);

    const getQuickBookingType = (): CreateBookingInput["bookingType"] => {
        const hasCount = (id: string) => Number(crewRequirements[id] || 0) > 0;
        const selectedRoleIds = Object.entries(crewRequirements)
            .filter(([, count]) => Number(count) > 0)
            .map(([id]) => id);

        if (selectedRoleIds.length > 1) return "production_crew";
        if (hasCount("videographer") || hasCount("camera_operator") || hasCount("assistant_cameraman")) return "videographer";
        if (hasCount("video_editor") || hasCount("photo_editor") || hasCount("color_grading_artist")) return "editor";
        if (hasCount("drone_operator")) return "production_crew";
        return "photographer";
    };

    const updateCrewRequirement = (roleId: string, delta: number) => {
        setCrewRequirements((current) => {
            const nextCount = Math.max(0, Number(current[roleId] || 0) + delta);
            const next = { ...current, [roleId]: nextCount };
            if (nextCount === 0) delete next[roleId];
            return next;
        });
    };

    const toggleRequirement = (
        setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
        requirementId: string
    ) => {
        setter((current) => ({ ...current, [requirementId]: !current[requirementId] }));
    };

    useEffect(() => {
        try {
            const savedDraft = window.localStorage.getItem("shotcutcrew_quick_booking_draft");
            if (!savedDraft) return;

            const draft = JSON.parse(savedDraft) as {
                selectedEventType?: string;
                customEventType?: string;
                crewRequirements?: Record<string, number>;
                equipmentRequirements?: Record<string, boolean>;
                postProductionRequirements?: Record<string, boolean>;
                bookingDate?: string;
                bookingLocation?: string;
                budgetValue?: number;
                isFixedBudget?: boolean;
                fixedBudgetAmount?: string;
            };

            if (draft.selectedEventType) setSelectedEventType(draft.selectedEventType);
            if (draft.customEventType) setCustomEventType(draft.customEventType);
            if (draft.crewRequirements) setCrewRequirements(draft.crewRequirements);
            if (draft.equipmentRequirements) setEquipmentRequirements(draft.equipmentRequirements);
            if (draft.postProductionRequirements) setPostProductionRequirements(draft.postProductionRequirements);
            if (draft.bookingDate) setBookingDate(draft.bookingDate);
            if (draft.bookingLocation) setBookingLocation(draft.bookingLocation);
            if (typeof draft.budgetValue === "number") setBudgetValue(draft.budgetValue);
            if (typeof draft.isFixedBudget === "boolean") setIsFixedBudget(draft.isFixedBudget);
            if (draft.fixedBudgetAmount) setFixedBudgetAmount(draft.fixedBudgetAmount);
        } catch {
            window.localStorage.removeItem("shotcutcrew_quick_booking_draft");
        }
    }, []);

    useEffect(() => {
        const draft = {
            selectedEventType,
            customEventType,
            crewRequirements,
            equipmentRequirements,
            postProductionRequirements,
            bookingDate,
            bookingLocation,
            budgetValue,
            isFixedBudget,
            fixedBudgetAmount,
        };
        window.localStorage.setItem("shotcutcrew_quick_booking_draft", JSON.stringify(draft));
    }, [
        selectedEventType,
        customEventType,
        crewRequirements,
        equipmentRequirements,
        postProductionRequirements,
        bookingDate,
        bookingLocation,
        budgetValue,
        isFixedBudget,
        fixedBudgetAmount,
    ]);


    // ====== SCRIPT ANALYSIS STATE ======
    const [scriptText, setScriptText] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<ScriptAnalysisResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
            toast.error("PDF text extraction is not available locally yet. Please paste the PDF text or upload a .txt file.");
            return;
        }
        if (!file.name.endsWith('.txt') && file.type !== 'text/plain') {
            toast.error("Please upload a .txt file or paste your brief.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            setScriptText((ev.target?.result as string) || "");
        };
        reader.readAsText(file);
    };

    const handleAnalyzeScript = async () => {
        if (!scriptText.trim()) {
            toast.error("Please paste your script or upload a file first.");
            return;
        }
        setIsAnalyzing(true);
        try {
            const res = await fetch('/api/ai/script-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scriptText }),
            });
            if (!res.ok) {
                const errorBody = await res.json().catch(() => null);
                throw new Error(errorBody?.error || 'Analysis failed');
            }
            const data = await res.json();
            setAnalysisResult(data);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Analysis failed. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const applyScriptAnalysisToBooking = () => {
        if (!analysisResult) return;

        const crewFromAnalysis: Record<string, number> = {};
        for (const crewItem of analysisResult.recommended_crew) {
            const normalizedRole = crewItem.role.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
            const matchedRole = PRODUCTION_CREW_ROLES.find((role) => {
                return normalizedRole.includes(role.id) || role.name.toLowerCase() === crewItem.role.toLowerCase();
            });
            if (matchedRole) crewFromAnalysis[matchedRole.id] = Math.max(crewFromAnalysis[matchedRole.id] || 0, crewItem.quantity);
        }

        const equipmentFromAnalysis: Record<string, boolean> = {};
        for (const equipmentItem of analysisResult.suggested_equipment) {
            const normalizedName = equipmentItem.name.toLowerCase();
            const matchedEquipment = EQUIPMENT_REQUIREMENT_OPTIONS.find((item) => normalizedName.includes(item.label.toLowerCase().split(" ")[0]));
            if (matchedEquipment) equipmentFromAnalysis[matchedEquipment.id] = true;
        }

        setSelectedEventType(CUSTOM_EVENT_TYPE_ID);
        setCustomEventType(analysisResult.detected_project_type || "Custom Requirement");
        if (Object.keys(crewFromAnalysis).length > 0) setCrewRequirements(crewFromAnalysis);
        if (Object.keys(equipmentFromAnalysis).length > 0) setEquipmentRequirements(equipmentFromAnalysis);
        setMode("quick");
        setStep(2);
        toast.success("Recommendations applied to your booking draft.");
    };


    // ====== SUBMIT HANDLERS ======

    const handleBuilderBooking = async () => {
        if (!clientId) {
            toast.error("You must be logged in to request a crew.");
            router.push('/login');
            return;
        }
        setIsSubmitting(true);
        const description = `Custom Crew Build | Duration: ${days} days | Roles: ${crew.map(c => `${c.count}x ${c.name}`).join(', ')}`;
        const builderCrewRequirements = Object.fromEntries(crew.map((member) => [member.id, member.count]));
        try {
            const result = await createBooking({
                bookingType: "production_crew",
                title: "Custom Crew Request",
                description,
                requirementSummary: description,
                budget: grandTotal,
                estimatedDays: days,
                crewRequirements: builderCrewRequirements,
            });
            if (!result.success) {
                throw new Error(result.message);
            }
            toast.success(`${result.message} ${result.match_count || 0} creator(s) matched.`);
            router.push('/dashboard');
        } catch (error: unknown) {
            toast.error((error as Error).message || "Failed to submit request.");
            setIsSubmitting(false);
        }
    };

    const handleEquipmentBooking = async () => {
        if (!clientId) {
            toast.error("You must be logged in to book equipment.");
            router.push('/login');
            return;
        }
        setIsSubmitting(true);
        const description = `Equipment Booking | Duration: ${equipDays} days | Items: ${equipment.map(e => `${e.count}x ${e.name}`).join(', ')}`;
        const equipmentRequestCounts = Object.fromEntries(equipment.map((item) => [item.id, item.count]));
        try {
            const result = await createBooking({
                bookingType: "equipment",
                title: "Equipment Booking Request",
                description,
                requirementSummary: description,
                budget: equipGrandTotal,
                estimatedDays: equipDays,
                equipmentRequirements: equipmentRequestCounts,
            });
            if (!result.success) {
                throw new Error(result.message);
            }
            toast.success(`${result.message} ${result.match_count || 0} creator(s) matched.`);
            router.push('/dashboard');
        } catch (error: unknown) {
            toast.error((error as Error).message || "Failed to submit equipment request.");
            setIsSubmitting(false);
        }
    };

    const handleQuickBooking = async () => {
        if (!clientId) {
            toast.error("You must be logged in to book.");
            router.push('/login');
            return;
        }
        setIsSubmitting(true);
        const effectiveBudget = isFixedBudget ? (parseInt(fixedBudgetAmount) || budgetValue) : budgetValue;
        const selectedEquipment = EQUIPMENT_REQUIREMENT_OPTIONS
            .filter((item) => equipmentRequirements[item.id])
            .map((item) => item.label);
        const selectedPostProduction = POST_PRODUCTION_REQUIREMENT_OPTIONS
            .filter((item) => postProductionRequirements[item.id])
            .map((item) => item.label);
        const description = [
            `Quick Booking | Event: ${selectedEventLabel}`,
            crewSummary ? `Crew: ${crewSummary}` : null,
            selectedEquipment.length ? `Equipment: ${selectedEquipment.join(", ")}` : null,
            selectedPostProduction.length ? `Post Production: ${selectedPostProduction.join(", ")}` : null,
            `Date: ${bookingDate}`,
            `Location: ${bookingLocation}`,
        ].filter(Boolean).join(" | ");
        try {
            const result = await createBooking({
                bookingType: getQuickBookingType(),
                bookingLocation,
                eventDate: bookingDate,
                eventType: selectedEventType,
                customEventType: selectedEventType === CUSTOM_EVENT_TYPE_ID ? customEventType : null,
                crewRequirements,
                equipmentRequirements,
                postProductionRequirements,
                title: "Quick Booking Request",
                description,
                requirementSummary: description,
                budget: effectiveBudget,
                estimatedDays: 1,
            });
            if (!result.success) {
                throw new Error(result.message);
            }
            setBookingMatchCount(result.match_count || 0);
            window.localStorage.removeItem("shotcutcrew_quick_booking_draft");
            setStep(5); // Success step
        } catch (error: unknown) {
            toast.error((error as Error).message || "Failed to process quick booking.");
        } finally {
            setIsSubmitting(false);
        }
    };


    // ====== UI HELPERS ======

    const StepIndicator = ({ current, total }: { current: number, total: number }) => (
        <div className="flex items-center gap-2 mb-8">
            {Array.from({ length: total }).map((_, i) => (
                <div
                    key={i}
                    className={`h-2 flex-grow rounded-full transition-colors duration-300 ${i + 1 <= current ? 'bg-orange-500' : 'bg-stone-200'}`}
                />
            ))}
        </div>
    );

    const handleBackNavigation = () => {
        if (mode === "quick") {
            if (step > 1) {
                setStep(step - 1);
                return;
            }
            setMode("selection");
            setStep(1);
            return;
        }

        if (mode !== "selection") {
            setMode("selection");
            setStep(1);
            return;
        }

        router.back();
    };

    return (
        <main className="min-h-screen bg-[#fffcf8] selection:bg-orange-500/30 pt-24 pb-32 px-6 flex flex-col items-center">

            {/* Top Navigation */}
            <div className="w-full max-w-5xl mx-auto flex justify-between items-center mb-8 md:mb-12">
                <div className="flex items-center gap-3 md:gap-4">
                    <button
                        onClick={handleBackNavigation}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-stone-200 bg-white text-stone-700 hover:text-stone-900 hover:border-stone-300 transition-colors text-sm font-semibold"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>
                    <div onClick={() => router.push('/')} className="cursor-pointer">
                        <BrandLogo href="/" width={190} height={56} className="h-auto w-[150px] md:w-[190px]" priority />
                    </div>
                </div>
                {mode !== "selection" && (
                    <button onClick={() => { setMode("selection"); setStep(1); }} className="text-sm font-semibold text-stone-500 hover:text-stone-900 transition-colors">
                        Cancel Booking
                    </button>
                )}
            </div>

            <div className="w-full max-w-5xl mx-auto flex-grow flex flex-col justify-center">
                <AnimatePresence mode="wait">

                    {/* ====== MODE SELECTION ====== */}
                    {mode === "selection" && (
                        <motion.div
                            key="selection"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="text-center"
                        >
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-stone-900 mb-6 font-display">
                                How do you want to{" "}
                                <span className="bg-gradient-to-r from-orange-600 to-rose-500 bg-clip-text text-transparent">
                                    build your team?
                                </span>
                            </h1>
                            <p className="text-lg text-stone-600 mb-16 max-w-2xl mx-auto">
                                Choose the booking path that fits your project needs.
                            </p>

                            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto text-left">
                                {/* Quick Booking */}
                                <div
                                    onClick={() => { setMode("quick"); setStep(1); }}
                                    className="bg-white p-6 rounded-[2rem] border-2 border-transparent hover:border-orange-500 cursor-pointer group transition-all duration-300 shadow-xl shadow-stone-200/50 flex flex-col"
                                >
                                    <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-5">
                                        <Zap className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-black text-stone-900 mb-2 font-display">Quick Booking</h3>
                                    <p className="text-stone-600 font-medium mb-6 flex-grow text-sm">Hire a photographer, videographer, or editor instantly with AI matching.</p>
                                    <div className="flex items-center text-orange-600 font-bold gap-2 text-sm group-hover:gap-3 transition-all">
                                        Start <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>

                                {/* Builder Mode */}
                                <div
                                    onClick={() => setMode("builder")}
                                    className="bg-white p-6 rounded-[2rem] border-2 border-transparent hover:border-rose-500 cursor-pointer group transition-all duration-300 shadow-xl shadow-stone-200/50 flex flex-col"
                                >
                                    <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-5">
                                        <Settings className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-black text-stone-900 mb-2 font-display">Builder Mode</h3>
                                    <p className="text-stone-600 font-medium mb-6 flex-grow text-sm">Hand-pick specific roles for your full production crew with real-time budget estimates.</p>
                                    <div className="flex items-center text-rose-600 font-bold gap-2 text-sm group-hover:gap-3 transition-all">
                                        Start <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>

                                {/* Equipment Booking */}
                                <div
                                    onClick={() => setMode("equipment")}
                                    className="bg-white p-6 rounded-[2rem] border-2 border-transparent hover:border-violet-500 cursor-pointer group transition-all duration-300 shadow-xl shadow-stone-200/50 flex flex-col"
                                >
                                    <div className="w-12 h-12 bg-violet-100 text-violet-600 rounded-2xl flex items-center justify-center mb-5">
                                        <Package className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-black text-stone-900 mb-2 font-display">Book Equipment</h3>
                                    <p className="text-stone-600 font-medium mb-6 flex-grow text-sm">Rent cameras, lights, audio gear, gimbals, and accessories for your shoot.</p>
                                    <div className="flex items-center text-violet-600 font-bold gap-2 text-sm group-hover:gap-3 transition-all">
                                        Start <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>

                                {/* Script Analysis */}
                                <div
                                    onClick={() => setMode("script")}
                                    className="bg-white p-6 rounded-[2rem] border-2 border-transparent hover:border-emerald-500 cursor-pointer group transition-all duration-300 shadow-xl shadow-stone-200/50 flex flex-col"
                                >
                                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-5">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-black text-stone-900 mb-2 font-display">Analyze Script</h3>
                                    <p className="text-stone-600 font-medium mb-6 flex-grow text-sm">Upload or paste your script — AI recommends crew, gear, and production requirements.</p>
                                    <div className="flex items-center text-emerald-600 font-bold gap-2 text-sm group-hover:gap-3 transition-all">
                                        Start <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}


                    {/* ====== QUICK BOOKING FLOW (4 steps: Event → Crew Count → Date → Budget) ====== */}
                    {mode === "quick" && (
                        <motion.div
                            key="quick"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="max-w-5xl mx-auto w-full bg-white p-6 md:p-10 rounded-[2rem] shadow-xl shadow-stone-200/50 border border-stone-100"
                        >
                            {step < 5 && <StepIndicator current={step} total={4} />}

                            {/* Step 1: Event Type Selection */}
                            {step === 1 && (
                                <div className="space-y-8">
                                    <div>
                                        <h2 className="text-3xl font-black text-stone-900 mb-2 font-display">What&apos;s the event type?</h2>
                                        <p className="text-stone-500">Select a production category or search for the closest project type.</p>
                                    </div>
                                    <div className="relative">
                                        <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="search"
                                            value={eventTypeSearch}
                                            onChange={(event) => setEventTypeSearch(event.target.value)}
                                            placeholder="Search event or project type"
                                            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-stone-200 bg-stone-50 text-stone-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div className="space-y-7">
                                        {filteredEventCategories.map((category) => {
                                            const CategoryIcon = category.icon;
                                            return (
                                                <section key={category.id} aria-labelledby={`event-category-${category.id}`} className="space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <CategoryIcon className="w-4 h-4 text-orange-600" />
                                                        <h3 id={`event-category-${category.id}`} className="text-sm font-black uppercase tracking-wide text-stone-700">
                                                            {category.label}
                                                        </h3>
                                                    </div>
                                                    <div className="grid sm:grid-cols-2 gap-3">
                                                        {category.options.map((option) => {
                                                            const isSelected = selectedEventType === option.id;
                                                            return (
                                                                <button
                                                                    key={option.id}
                                                                    type="button"
                                                                    onClick={() => setSelectedEventType(option.id)}
                                                                    className={`text-left p-4 border-2 rounded-2xl font-bold transition-all active:scale-[0.98] text-sm ${isSelected ? "border-orange-500 bg-orange-50 text-orange-700 shadow-lg shadow-orange-100" : "border-stone-200 text-stone-700 hover:border-orange-300 hover:bg-orange-50/60"}`}
                                                                >
                                                                    {option.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </section>
                                            );
                                        })}
                                    </div>

                                    {selectedEventType === CUSTOM_EVENT_TYPE_ID && (
                                        <div>
                                            <label htmlFor="custom-event-type" className="block text-sm font-bold text-stone-700 mb-2">Custom requirement</label>
                                            <input
                                                id="custom-event-type"
                                                type="text"
                                                value={customEventType}
                                                onChange={(event) => setCustomEventType(event.target.value)}
                                                placeholder="Describe your shoot/project type"
                                                className="w-full p-4 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                            />
                                        </div>
                                    )}

                                    <div className="sticky bottom-4 z-10 rounded-2xl bg-white/95 p-3 shadow-xl shadow-stone-200/70 backdrop-blur md:static md:p-0 md:shadow-none">
                                        <button
                                            onClick={() => {
                                                if (!selectedEventType) { toast.error("Select an event or project type."); return; }
                                                if (selectedEventType === CUSTOM_EVENT_TYPE_ID && !customEventType.trim()) { toast.error("Describe your custom shoot or project type."); return; }
                                                setStep(2);
                                            }}
                                            className="w-full py-4 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors"
                                        >
                                            Continue to Crew
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Production crew, equipment, and post-production */}
                            {step === 2 && (
                                <div className="space-y-8">
                                    <div>
                                        <h2 className="text-3xl font-black text-stone-900 mb-2 font-display">Build your production crew</h2>
                                        <p className="text-stone-500">Add the crew roles, equipment, and post-production support you need.</p>
                                    </div>
                                    <div className="space-y-7">
                                        {Object.entries(crewRolesByCategory).map(([category, roles]) => {
                                            const CategoryIcon = CREW_CATEGORY_ICONS[category] || Info;
                                            return (
                                                <section key={category} className="space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <CategoryIcon className="w-4 h-4 text-orange-600" />
                                                        <h3 className="text-sm font-black uppercase tracking-wide text-stone-700">{category}</h3>
                                                    </div>
                                                    <div className="grid sm:grid-cols-2 gap-3">
                                                        {roles.map((role) => (
                                                            <div key={role.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4 transition-colors hover:border-orange-200 hover:bg-orange-50/50">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <h4 className="font-black text-stone-900">{role.name}</h4>
                                                                            <span title={role.info} aria-label={role.info} className="text-stone-400">
                                                                                <Info className="w-4 h-4" />
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-sm font-medium text-stone-500">Rs {role.priceMin.toLocaleString("en-IN")} - Rs {role.priceMax.toLocaleString("en-IN")}/day</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-2 py-1">
                                                                        <button aria-label={`Decrease ${role.name}`} title={`Decrease ${role.name}`} onClick={() => updateCrewRequirement(role.id, -1)} className="p-2 text-stone-500 hover:text-stone-900 disabled:opacity-40" disabled={!crewRequirements[role.id]}>
                                                                            <Minus className="w-4 h-4" />
                                                                        </button>
                                                                        <span className="w-6 text-center text-lg font-black text-stone-900">{crewRequirements[role.id] || 0}</span>
                                                                        <button aria-label={`Increase ${role.name}`} title={`Increase ${role.name}`} onClick={() => updateCrewRequirement(role.id, 1)} className="p-2 text-orange-600 hover:text-orange-700">
                                                                            <Plus className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </section>
                                            );
                                        })}
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-5">
                                            <h3 className="font-black text-stone-900 mb-3">Equipment Needed</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {EQUIPMENT_REQUIREMENT_OPTIONS.map((item) => (
                                                    <button key={item.id} type="button" onClick={() => toggleRequirement(setEquipmentRequirements, item.id)} className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${equipmentRequirements[item.id] ? "border-orange-500 bg-white text-orange-700" : "border-stone-200 bg-white/70 text-stone-600 hover:border-orange-300"}`}>
                                                        {item.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-5">
                                            <h3 className="font-black text-stone-900 mb-3">Post Production</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {POST_PRODUCTION_REQUIREMENT_OPTIONS.map((item) => (
                                                    <button key={item.id} type="button" onClick={() => toggleRequirement(setPostProductionRequirements, item.id)} className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${postProductionRequirements[item.id] ? "border-orange-500 bg-white text-orange-700" : "border-stone-200 bg-white/70 text-stone-600 hover:border-orange-300"}`}>
                                                        {item.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="rounded-2xl bg-stone-900 p-5 text-white">
                                        <p className="text-sm font-semibold text-stone-300">Estimated crew budget</p>
                                        <div className="mt-1 text-3xl font-black font-display">Rs {quickEstimatedBudget.toLocaleString("en-IN")}</div>
                                        <p className="mt-2 text-sm text-stone-300">Final pricing depends on city, creator profile, equipment, and delivery requirements.</p>
                                    </div>
                                    <div className="hidden">
                                        {/* Photographers */}
                                        <div className="flex items-center justify-between bg-stone-50 p-5 rounded-2xl border border-stone-200">
                                            <div>
                                                <div className="font-bold text-stone-900">Photographers</div>
                                                <div className="text-sm text-stone-500">₹5,000 – ₹15,000/day</div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <button aria-label="Decrease photographers" title="Decrease photographers" onClick={() => setPhotoCount(Math.max(0, photoCount - 1))} className="w-10 h-10 rounded-xl border border-stone-200 bg-white flex items-center justify-center text-stone-600 hover:bg-stone-100 active:scale-95">
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <span className="text-xl font-black text-stone-900 w-6 text-center">{photoCount}</span>
                                                <button aria-label="Increase photographers" title="Increase photographers" onClick={() => setPhotoCount(photoCount + 1)} className="w-10 h-10 rounded-xl border border-stone-200 bg-white flex items-center justify-center text-stone-600 hover:bg-stone-100 active:scale-95">
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        {/* Videographers */}
                                        <div className="flex items-center justify-between bg-stone-50 p-5 rounded-2xl border border-stone-200">
                                            <div>
                                                <div className="font-bold text-stone-900">Videographers</div>
                                                <div className="text-sm text-stone-500">₹8,000 – ₹20,000/day</div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <button aria-label="Decrease videographers" title="Decrease videographers" onClick={() => setVideoCount(Math.max(0, videoCount - 1))} className="w-10 h-10 rounded-xl border border-stone-200 bg-white flex items-center justify-center text-stone-600 hover:bg-stone-100 active:scale-95">
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <span className="text-xl font-black text-stone-900 w-6 text-center">{videoCount}</span>
                                                <button aria-label="Increase videographers" title="Increase videographers" onClick={() => setVideoCount(videoCount + 1)} className="w-10 h-10 rounded-xl border border-stone-200 bg-white flex items-center justify-center text-stone-600 hover:bg-stone-100 active:scale-95">
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="sticky bottom-4 z-10 flex gap-3 rounded-2xl bg-white/95 p-3 shadow-xl shadow-stone-200/70 backdrop-blur md:static md:p-0 md:shadow-none">
                                        <button onClick={() => setStep(1)} className="flex-1 py-4 bg-stone-100 text-stone-700 font-bold rounded-xl hover:bg-stone-200 transition-colors">Back</button>
                                        <button
                                            onClick={() => {
                                                if (!crewSummary) { toast.error("Select at least one crew role."); return; }
                                                setStep(3);
                                            }}
                                            className="flex-[2] py-4 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Date Selection */}
                            {step === 3 && (
                                <div className="space-y-8">
                                    <div>
                                        <h2 className="text-3xl font-black text-stone-900 mb-2 font-display">When is the shoot?</h2>
                                        <p className="text-stone-500">Pick your preferred shoot date to check availability.</p>
                                    </div>
                                    <div>
                                        <label htmlFor="quick-booking-date" className="block text-sm font-bold text-stone-700 mb-2">Shoot Date</label>
                                        <input
                                            id="quick-booking-date"
                                            aria-label="Shoot date"
                                            type="date"
                                            value={bookingDate}
                                            onChange={(e) => setBookingDate(e.target.value)}
                                            className="w-full p-4 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                        />
                                    </div>
                                     <div>
                                        <label htmlFor="quick-booking-location" className="block text-sm font-bold text-stone-700 mb-2">Shoot City / Location</label>
                                        <input
                                            id="quick-booking-location"
                                            aria-label="Shoot location"
                                            type="text"
                                            value={bookingLocation}
                                            onChange={(e) => setBookingLocation(e.target.value)}
                                            className="w-full p-4 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setStep(2)} className="flex-1 py-4 bg-stone-100 text-stone-700 font-bold rounded-xl hover:bg-stone-200 transition-colors">Back</button>
                                        <button
                                            onClick={() => {
                                                if (!bookingDate) { toast.error("Please select a date."); return; }
                                                if (!bookingLocation.trim()) { toast.error("Please enter the shoot city or location."); return; }
                                                setStep(4);
                                            }}
                                            className="flex-[2] py-4 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors"
                                        >
                                            Next
                                        </button>
                                    </div>
                                    
                                </div>
                            )}

                            {/* Step 4: Budget Slider */}
                            {step === 4 && (
                                <div className="space-y-8">
                                    <div>
                                        <h2 className="text-3xl font-black text-stone-900 mb-2 font-display">What&apos;s your budget?</h2>
                                        <p className="text-stone-500">Set your maximum budget for this project.</p>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5">
                                            <p className="text-sm font-bold text-stone-600">Estimated production total</p>
                                            <div className="mt-1 text-3xl font-black text-orange-600 font-display">
                                                Rs {quickEstimatedBudget.toLocaleString("en-IN")}
                                            </div>
                                            <p className="mt-2 text-sm text-stone-600">Use this as a guide. You can set a higher or fixed budget based on project quality, deliverables, and travel.</p>
                                        </div>
                                        {/* Fixed Budget toggle */}
                                        <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-xl border border-stone-200">
                                            <input
                                                type="checkbox"
                                                id="fixedBudget"
                                                checked={isFixedBudget}
                                                onChange={(e) => setIsFixedBudget(e.target.checked)}
                                                className="w-4 h-4 accent-orange-500"
                                            />
                                            <label htmlFor="fixedBudget" className="text-sm font-bold text-stone-700 cursor-pointer">
                                                Fixed Budget — enter an exact amount
                                            </label>
                                        </div>

                                        {isFixedBudget ? (
                                            <div>
                                                <label className="block text-sm font-bold text-stone-700 mb-2">Exact Budget (₹)</label>
                                                <input
                                                    type="number"
                                                    value={fixedBudgetAmount}
                                                    onChange={(e) => setFixedBudgetAmount(e.target.value)}
                                                    placeholder="e.g. 75000"
                                                    className="w-full p-4 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="text-sm font-medium text-stone-500">Budget Range</span>
                                                    <span className="text-xl font-black text-orange-600">
                                                        ₹{budgetValue.toLocaleString('en-IN')}{budgetValue >= 1000000 ? '+' : ''}
                                                    </span>
                                                </div>
                                                <input
                                                    id="quick-booking-budget-range"
                                                    aria-label="Budget range"
                                                    type="range"
                                                    min={10000}
                                                    max={1000000}
                                                    step={5000}
                                                    value={budgetValue}
                                                    onChange={(e) => setBudgetValue(Number(e.target.value))}
                                                    className="w-full h-2 rounded-full accent-orange-500 cursor-pointer"
                                                />
                                                <div className="flex justify-between text-xs text-stone-400 mt-2">
                                                    <span>₹10,000</span>
                                                    <span>₹10,00,000+</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setStep(3)} className="flex-1 py-4 bg-stone-100 text-stone-700 font-bold rounded-xl hover:bg-stone-200 transition-colors">Back</button>
                                        <button
                                            onClick={handleQuickBooking}
                                            disabled={isSubmitting}
                                            className="flex-[2] py-4 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isSubmitting ? "Processing..." : <>Find Matches <SparklesIcon className="w-5 h-5" /></>}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 5: Success */}
                            {step === 5 && (
                                <div className="space-y-8 pt-8">
                                    <div className="text-center">
                                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <CheckCircle className="w-10 h-10" />
                                        </div>
                                        <h2 className="text-3xl font-black text-stone-900 mb-2 font-display">Request Submitted!</h2>
                                        <p className="text-stone-500 max-w-lg mx-auto">
                                            Booking created successfully. We are notifying matched verified creators.
                                        </p>
                                    </div>

                                    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 text-center">
                                        <div className="text-3xl font-black text-orange-600 font-display">{bookingMatchCount}</div>
                                        <p className="text-sm text-stone-500 font-medium mt-1">verified creator(s) matched for notification</p>
                                    </div>

                                    {matchedCreators.length > 0 && (
                                        <div className="grid md:grid-cols-3 gap-4 mt-8">
                                            {matchedCreators.map((creator) => {
                                                const dbName = Array.isArray(creator.users) ? creator.users[0]?.full_name : creator.users?.full_name;
                                                const parsedName = creator.slug ? creator.slug.replace(/-\d+$/, '').split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ') : null;
                                                const name = dbName || parsedName || "Verified Creator";
                                                return (
                                                    <div key={creator.id} className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-left flex flex-col hover:border-orange-500 transition-colors shadow-sm">
                                                        <Image src={creator.profile_image_url || "/logo.jpg"} alt={name} width={64} height={64} className="w-16 h-16 rounded-full object-cover mb-4 shadow" />
                                                        <h3 className="font-bold text-stone-900 truncate">{name}</h3>
                                                        <p className="text-sm text-orange-600 font-bold mb-2">{creator.role}</p>
                                                        <p className="text-xs text-stone-500 mb-4 line-clamp-3">{creator.bio}</p>
                                                        
                                                        <div className="mt-auto pt-4 border-t border-stone-200">
                                                            <div className="flex justify-between items-center mb-3">
                                                                <span className="text-sm font-black text-stone-900">₹{creator.day_rate?.toLocaleString('en-IN')}/day</span>
                                                                <span className="text-xs font-semibold text-stone-500 bg-stone-200/50 px-2 py-1 rounded-md max-w-[50%] truncate text-right">{creator.location}</span>
                                                            </div>
                                                            <button onClick={() => router.push(`/creators/${creator.id}`)} className="w-full py-2.5 bg-white border border-stone-200 text-stone-900 font-bold rounded-xl hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-colors text-sm flex justify-center items-center gap-2 group">
                                                                View Full Profile <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}

                                    <button onClick={() => router.push('/dashboard')} className="w-full py-4 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 transition-colors mt-8">
                                        View Dashboard Requests
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}


                    {/* ====== BUILDER MODE FLOW ====== */}
                    {mode === "builder" && (
                        <motion.div
                            key="builder"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="w-full grid lg:grid-cols-3 gap-8"
                        >
                            {/* Left Column: Role Selection */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-stone-200/50 border border-stone-100">
                                    <div className="mb-8">
                                        <h2 className="text-3xl font-black text-stone-900 mb-2 font-display">Build Your Crew</h2>
                                        <p className="text-stone-500">Select the roles you need for your production.</p>
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {availableRoles.map(role => (
                                            <div key={role.id} className="p-4 border border-stone-200 rounded-2xl flex items-center justify-between hover:border-orange-200 hover:bg-orange-50/50 transition-colors group">
                                                <div>
                                                    <h4 className="font-bold text-stone-900 group-hover:text-orange-600 transition-colors">{role.name}</h4>
                                                    <p className="text-sm font-medium text-stone-500">₹{role.rate.toLocaleString('en-IN')}/day</p>
                                                </div>
                                                <button
                                                    aria-label={`Add ${role.name}`}
                                                    title={`Add ${role.name}`}
                                                    onClick={() => handleAddRole(role)}
                                                    className="w-10 h-10 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center hover:bg-orange-600 hover:text-white transition-all active:scale-95"
                                                >
                                                    <Plus className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Timeline Setting */}
                                <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-stone-200/50 border border-stone-100">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
                                            <CalendarDays className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-stone-900 font-display">Production Timeline</h3>
                                            <p className="text-sm text-stone-500">How many days will the crew be needed?</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button aria-label="Decrease production days" title="Decrease production days" onClick={() => setDays(Math.max(1, days - 1))} className="w-12 h-12 rounded-xl border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50 active:scale-95">
                                            <Minus className="w-5 h-5" />
                                        </button>
                                        <div className="flex-1 text-center py-3 bg-stone-50 rounded-xl border border-stone-200 font-bold text-stone-900 text-xl">
                                            {days} {days === 1 ? 'Day' : 'Days'}
                                        </div>
                                        <button aria-label="Increase production days" title="Increase production days" onClick={() => setDays(days + 1)} className="w-12 h-12 rounded-xl border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50 active:scale-95">
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Crew Cart */}
                            <div className="lg:col-span-1">
                                <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-stone-200/50 border border-stone-100 sticky top-24">
                                    <h3 className="text-xl font-black text-stone-900 mb-6 font-display">Crew Cart</h3>

                                    {crew.length === 0 ? (
                                        <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                                            <p className="text-stone-500 font-medium">Your crew list is empty.</p>
                                            <p className="text-xs text-stone-400 mt-1">Add roles from the left to see estimates.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 mb-8">
                                            {crew.map(member => (
                                                <div key={member.id} className="flex items-center justify-between pb-4 border-b border-stone-100 last:border-0 last:pb-0">
                                                    <div>
                                                        <div className="font-bold text-stone-900 text-sm">{member.name}</div>
                                                        <div className="text-xs text-stone-500">₹{member.rate.toLocaleString('en-IN')}/day</div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-2 bg-stone-50 px-2 py-1 rounded-lg border border-stone-200">
                                                            <button aria-label={`Decrease ${member.name}`} title={`Decrease ${member.name}`} onClick={() => handleRemoveRole(member.id)} className="text-stone-400 hover:text-stone-900 p-1"><Minus className="w-3 h-3" /></button>
                                                            <span className="text-xs font-bold text-stone-900 w-3 text-center">{member.count}</span>
                                                            <button aria-label={`Increase ${member.name}`} title={`Increase ${member.name}`} onClick={() => handleAddRole(member)} className="text-stone-400 hover:text-stone-900 p-1"><Plus className="w-3 h-3" /></button>
                                                        </div>
                                                        <button aria-label={`Remove ${member.name}`} title={`Remove ${member.name}`} onClick={() => handleRemoveRole(member.id, true)} className="text-rose-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-colors">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="bg-stone-50 p-6 rounded-2xl mb-6">
                                        <div className="flex justify-between text-sm mb-3">
                                            <span className="text-stone-500 font-medium">Crew Subtotal ({days} days)</span>
                                            <span className="font-bold text-stone-900">₹{totalCost.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between text-sm mb-4 pb-4 border-b border-stone-200">
                                            <span className="text-stone-500 font-medium">Platform Fee (10%)</span>
                                            <span className="font-bold text-stone-900">₹{platformFee.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-stone-900 font-black font-display">Est. Total</span>
                                            <span className="text-2xl font-black text-rose-600 font-display">₹{grandTotal.toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>

                                    <button
                                        disabled={crew.length === 0 || isSubmitting}
                                        onClick={handleBuilderBooking}
                                        className="w-full py-4 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 group"
                                    >
                                        {isSubmitting ? "Processing..." : <>Request Crew <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}


                    {/* ====== EQUIPMENT BOOKING FLOW ====== */}
                    {mode === "equipment" && (
                        <motion.div
                            key="equipment"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="w-full grid lg:grid-cols-3 gap-8"
                        >
                            {/* Left Column: Equipment Catalog */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-stone-200/50 border border-stone-100">
                                    <div className="mb-8">
                                        <h2 className="text-3xl font-black text-stone-900 mb-2 font-display">Book Equipment</h2>
                                        <p className="text-stone-500">Choose rental-grade camera, lighting, audio, broadcast, and post-production equipment.</p>
                                    </div>
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="font-black text-stone-900 mb-3">Production Packages</h3>
                                            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                                {EQUIPMENT_PACKAGES.map((kit) => (
                                                    <button key={kit.id} type="button" onClick={() => selectEquipmentPackage(kit.id)} className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-left transition-all hover:border-orange-300 hover:bg-orange-50">
                                                        <div className="font-black text-stone-900">{kit.name}</div>
                                                        <p className="mt-1 text-xs font-medium text-stone-500">{kit.description}</p>
                                                        <p className="mt-3 text-sm font-black text-orange-600">Rs {kit.estimatedPrice.toLocaleString("en-IN")} est.</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        {recommendedEquipment.length > 0 && (
                                            <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-5">
                                                <h3 className="font-black text-stone-900 mb-3">Recommended for {selectedEventLabel}</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {recommendedEquipment.map((item) => (
                                                        <button key={item.id} type="button" onClick={() => handleAddEquipment({ id: item.id, name: item.name, rate: item.pricePerDay })} className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-bold text-orange-700 hover:border-orange-500">
                                                            + {item.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div className="grid md:grid-cols-[1fr_auto] gap-3">
                                            <div className="relative">
                                                <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                                <input type="search" value={equipmentSearch} onChange={(event) => setEquipmentSearch(event.target.value)} placeholder="Search camera, lens, light, audio, drone..." className="w-full pl-12 pr-4 py-4 rounded-2xl border border-stone-200 bg-stone-50 text-stone-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500" />
                                            </div>
                                            <select value={activeEquipmentCategory} onChange={(event) => setActiveEquipmentCategory(event.target.value)} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm font-bold text-stone-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500">
                                                <option value="all">All categories</option>
                                                {EQUIPMENT_CATEGORIES.map((category) => (
                                                    <option key={category.id} value={category.id}>{category.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-4">
                                            {filteredEquipmentCategories.map((category) => {
                                                const CategoryIcon = category.icon;
                                                const isOpen = openEquipmentCategories[category.id] ?? true;
                                                return (
                                                    <section key={category.id} className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
                                                        <button type="button" onClick={() => setOpenEquipmentCategories((current) => ({ ...current, [category.id]: !isOpen }))} className="flex w-full items-center justify-between gap-3 bg-stone-50 px-5 py-4 text-left">
                                                            <span className="flex items-center gap-2 font-black text-stone-900"><CategoryIcon className="w-5 h-5 text-orange-600" />{category.name}</span>
                                                            <span className="text-sm font-bold text-stone-500">{isOpen ? "Hide" : "Show"}</span>
                                                        </button>
                                                        {isOpen && (
                                                            <div className="grid sm:grid-cols-2 gap-3 p-4">
                                                                {category.items.map((item) => {
                                                                    const selectedCount = equipment.find((entry) => entry.id === item.id)?.count || 0;
                                                                    return (
                                                                        <div key={item.id} className={`rounded-2xl border p-4 transition-all ${selectedCount ? "border-orange-500 bg-orange-50 shadow-lg shadow-orange-100" : "border-stone-200 bg-white hover:border-orange-200"}`}>
                                                                            <div className="flex items-start justify-between gap-3">
                                                                                <div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <h4 className="font-black text-stone-900">{item.name}</h4>
                                                                                        {selectedCount > 0 && <span className="rounded-full bg-orange-600 px-2 py-0.5 text-xs font-black text-white">{selectedCount}</span>}
                                                                                    </div>
                                                                                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-stone-400">{item.subcategory} - {item.availability}</p>
                                                                                    <p className="mt-2 text-sm text-stone-600">{item.description}</p>
                                                                                    <p className="mt-3 text-sm font-black text-orange-600">Rs {item.pricePerDay.toLocaleString("en-IN")}/day</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="mt-4 flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-2 py-1">
                                                                                <button aria-label={`Decrease ${item.name}`} title={`Decrease ${item.name}`} onClick={() => handleRemoveEquipment(item.id)} className="p-2 text-stone-500 hover:text-stone-900 disabled:opacity-40" disabled={!selectedCount}><Minus className="w-4 h-4" /></button>
                                                                                <span className="text-lg font-black text-stone-900">{selectedCount}</span>
                                                                                <button aria-label={`Increase ${item.name}`} title={`Increase ${item.name}`} onClick={() => handleAddEquipment({ id: item.id, name: item.name, rate: item.pricePerDay })} className="p-2 text-orange-600 hover:text-orange-700"><Plus className="w-4 h-4" /></button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </section>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="hidden">
                                        {availableEquipment.map(item => (
                                            <div key={item.id} className="p-4 border border-stone-200 rounded-2xl flex items-center justify-between hover:border-violet-200 hover:bg-violet-50/50 transition-colors group">
                                                <div>
                                                    <h4 className="font-bold text-stone-900 group-hover:text-violet-600 transition-colors">{item.name}</h4>
                                                    <p className="text-sm font-medium text-stone-500">₹{item.rate.toLocaleString('en-IN')}/day</p>
                                                </div>
                                                <button
                                                    aria-label={`Add ${item.name}`}
                                                    title={`Add ${item.name}`}
                                                    onClick={() => handleAddEquipment(item)}
                                                    className="w-10 h-10 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center hover:bg-violet-600 hover:text-white transition-all active:scale-95"
                                                >
                                                    <Plus className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Duration Setting */}
                                <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-stone-200/50 border border-stone-100">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-violet-100 text-violet-600 rounded-2xl flex items-center justify-center">
                                            <CalendarDays className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-stone-900 font-display">Rental Duration</h3>
                                            <p className="text-sm text-stone-500">How many days do you need the equipment?</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button aria-label="Decrease equipment rental days" title="Decrease equipment rental days" onClick={() => setEquipDays(Math.max(1, equipDays - 1))} className="w-12 h-12 rounded-xl border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50 active:scale-95">
                                            <Minus className="w-5 h-5" />
                                        </button>
                                        <div className="flex-1 text-center py-3 bg-stone-50 rounded-xl border border-stone-200 font-bold text-stone-900 text-xl">
                                            {equipDays} {equipDays === 1 ? 'Day' : 'Days'}
                                        </div>
                                        <button aria-label="Increase equipment rental days" title="Increase equipment rental days" onClick={() => setEquipDays(equipDays + 1)} className="w-12 h-12 rounded-xl border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50 active:scale-95">
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Equipment Cart */}
                            <div className="lg:col-span-1">
                                <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-stone-200/50 border border-stone-100 sticky top-24">
                                    <h3 className="text-xl font-black text-stone-900 mb-6 font-display">Equipment Cart</h3>

                                    {equipment.length === 0 ? (
                                        <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                                            <p className="text-stone-500 font-medium">Your cart is empty.</p>
                                            <p className="text-xs text-stone-400 mt-1">Add items from the catalog to see estimates.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 mb-8">
                                            {equipment.map(item => (
                                                <div key={item.id} className="flex items-center justify-between pb-4 border-b border-stone-100 last:border-0 last:pb-0">
                                                    <div>
                                                        <div className="font-bold text-stone-900 text-sm">{item.name}</div>
                                                        <div className="text-xs text-stone-500">₹{item.rate.toLocaleString('en-IN')}/day</div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-2 bg-stone-50 px-2 py-1 rounded-lg border border-stone-200">
                                                            <button aria-label={`Decrease ${item.name}`} title={`Decrease ${item.name}`} onClick={() => handleRemoveEquipment(item.id)} className="text-stone-400 hover:text-stone-900 p-1"><Minus className="w-3 h-3" /></button>
                                                            <span className="text-xs font-bold text-stone-900 w-3 text-center">{item.count}</span>
                                                            <button aria-label={`Increase ${item.name}`} title={`Increase ${item.name}`} onClick={() => handleAddEquipment(item)} className="text-stone-400 hover:text-stone-900 p-1"><Plus className="w-3 h-3" /></button>
                                                        </div>
                                                        <button aria-label={`Remove ${item.name}`} title={`Remove ${item.name}`} onClick={() => handleRemoveEquipment(item.id, true)} className="text-rose-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-colors">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="bg-stone-50 p-6 rounded-2xl mb-6">
                                        <div className="flex justify-between text-sm mb-3">
                                            <span className="text-stone-500 font-medium">Subtotal ({equipDays} days)</span>
                                            <span className="font-bold text-stone-900">₹{equipmentTotal.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between text-sm mb-4 pb-4 border-b border-stone-200">
                                            <span className="text-stone-500 font-medium">Platform Fee (10%)</span>
                                            <span className="font-bold text-stone-900">₹{equipPlatformFee.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-stone-900 font-black font-display">Est. Total</span>
                                            <span className="text-2xl font-black text-violet-600 font-display">₹{equipGrandTotal.toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>

                                    <button
                                        disabled={equipment.length === 0 || isSubmitting}
                                        onClick={handleEquipmentBooking}
                                        className="w-full py-4 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 group"
                                    >
                                        {isSubmitting ? "Processing..." : <>Request Equipment <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}


                    {/* ====== SCRIPT ANALYSIS FLOW ====== */}
                    {mode === "script" && (
                        <motion.div
                            key="script"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="max-w-3xl mx-auto w-full"
                        >
                            <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-xl shadow-stone-200/50 border border-stone-100">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                                        <FileText className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-stone-900 font-display">Script Analysis</h2>
                                        <p className="text-stone-500">AI-powered production breakdown from your brief or script.</p>
                                    </div>
                                </div>

                                {!analysisResult ? (
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-bold text-stone-700 mb-2">Paste Your Script / Brief</label>
                                            <textarea
                                                rows={10}
                                                value={scriptText}
                                                onChange={(e) => setScriptText(e.target.value)}
                                                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors resize-none placeholder-stone-400"
                                                placeholder="Paste your production brief, shooting script, or project description here..."
                                            />
                                        </div>
                                        <div className="flex items-center gap-4 flex-wrap">
                                            <span className="text-stone-400 text-sm font-medium">— or —</span>
                                            <button
                                                aria-label="Upload script text file"
                                                title="Upload script text file"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex items-center gap-2 px-5 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 font-bold text-sm hover:bg-stone-100 transition-colors"
                                            >
                                                <Upload className="w-4 h-4" />
                                                Upload .txt File
                                            </button>
                                            <input
                                                aria-label="Script text file upload"
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".txt,text/plain,.pdf,application/pdf"
                                                className="hidden"
                                                onChange={handleFileUpload}
                                            />
                                            {scriptText && (
                                                <span className="text-xs text-emerald-600 font-medium">{scriptText.length} characters loaded</span>
                                            )}
                                        </div>
                                        <button
                                            onClick={handleAnalyzeScript}
                                            disabled={isAnalyzing || !scriptText.trim()}
                                            className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isAnalyzing ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Analyzing...
                                                </>
                                            ) : (
                                                <>
                                                    <Brain className="w-5 h-5" />
                                                    Analyze with AI
                                                </>
                                            )}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 text-emerald-600">
                                            <CheckCircle className="w-5 h-5" />
                                            <span className="font-bold text-sm">Analysis complete</span>
                                        </div>
                                        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <h3 className="font-black text-stone-900">Project Summary</h3>
                                                    <p className="mt-2 text-sm text-stone-700">{analysisResult.project_summary}</p>
                                                </div>
                                                <div className="rounded-full bg-white px-4 py-2 text-sm font-black text-orange-700">AI confidence: {analysisResult.confidence}</div>
                                            </div>
                                            {analysisResult.missing_information.length > 0 && (
                                                <p className="mt-3 text-sm font-semibold text-orange-800">Missing: {analysisResult.missing_information.join(", ")}</p>
                                            )}
                                        </div>
                                        <div className="hidden">
                                        <div className="grid md:grid-cols-2 gap-5">
                                            <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100">
                                                <h4 className="font-bold text-orange-900 mb-3">👥 Recommended Crew</h4>
                                                <ul className="space-y-1.5">
                                                    {analysisResult.recommended_crew.map((crewItem, i) => (
                                                        <li key={i} className="text-sm text-orange-800 flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                                                            {crewItem.quantity}x {crewItem.role}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="bg-violet-50 p-5 rounded-2xl border border-violet-100">
                                                <h4 className="font-bold text-violet-900 mb-3">🎥 Suggested Equipment</h4>
                                                <ul className="space-y-1.5">
                                                    {analysisResult.suggested_equipment.map((item, i) => (
                                                        <li key={i} className="text-sm text-violet-800 flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                                                            {item.quantity}x {item.name}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                                                <h4 className="font-bold text-blue-900 mb-3">📅 Estimated Duration</h4>
                                                <p className="text-sm text-blue-800 font-medium">{analysisResult.estimated_duration}</p>
                                            </div>
                                            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                                                <h4 className="font-bold text-emerald-900 mb-3">⚙️ Key Requirements</h4>
                                                <ul className="space-y-1.5">
                                                    {analysisResult.production_checklist.map((req, i) => (
                                                        <li key={i} className="text-sm text-emerald-800 flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                                                            {req}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-5">
                                            <AnalysisList title="Recommended Crew" items={analysisResult.recommended_crew.map((item) => `${item.quantity}x ${item.role} - ${item.reason}`)} tone="orange" />
                                            <AnalysisList title="Suggested Equipment" items={analysisResult.suggested_equipment.map((item) => `${item.quantity}x ${item.name} - Rs ${item.estimated_price_per_day.toLocaleString("en-IN")}/day - ${item.reason}`)} tone="violet" />
                                            <AnalysisList title="Estimated Shoot Schedule" items={[analysisResult.estimated_duration, `Post: ${analysisResult.post_production_time}`]} tone="blue" />
                                            <AnalysisList title="Budget Estimate" items={[analysisResult.budget_range, `Complexity: ${analysisResult.complexity_level}`]} tone="emerald" />
                                            <AnalysisList title="Key Requirements" items={[...analysisResult.shot_requirements, ...analysisResult.audio_requirements, ...analysisResult.lighting_requirements]} tone="orange" />
                                            <AnalysisList title="Risk & Permissions" items={[...analysisResult.permissions, ...analysisResult.risks_or_challenges]} tone="violet" />
                                            <AnalysisList title="Art, Props & Locations" items={[...analysisResult.locations, ...analysisResult.props_art_direction]} tone="blue" />
                                            <AnalysisList title="Production Checklist" items={analysisResult.production_checklist} tone="emerald" />
                                        </div>
                                        <div className="flex gap-3 pt-2">
                                            <button
                                                onClick={() => { setAnalysisResult(null); setScriptText(""); }}
                                                className="flex-1 py-3 bg-stone-100 text-stone-700 font-bold rounded-xl hover:bg-stone-200 transition-colors text-sm"
                                            >
                                                Analyze Another
                                            </button>
                                            <button
                                                onClick={applyScriptAnalysisToBooking}
                                                className="flex-[2] py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors text-sm flex items-center justify-center gap-2"
                                            >
                                                Use these recommendations <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </main>
    );
}

// Sparkles icon helper
const SparklesIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        <path d="M20 3v4" /><path d="M22 5h-4" /><path d="M4 17v2" /><path d="M5 18H3" />
    </svg>
);

const analysisToneClasses = {
    orange: "bg-orange-50 border-orange-100 text-orange-900 marker:bg-orange-400",
    violet: "bg-violet-50 border-violet-100 text-violet-900 marker:bg-violet-400",
    blue: "bg-blue-50 border-blue-100 text-blue-900 marker:bg-blue-400",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-900 marker:bg-emerald-400",
};

function AnalysisList({
    title,
    items,
    tone,
}: {
    title: string;
    items: string[];
    tone: keyof typeof analysisToneClasses;
}) {
    const classes = analysisToneClasses[tone];
    return (
        <div className={`p-5 rounded-2xl border ${classes}`}>
            <h4 className="font-bold mb-3">{title}</h4>
            {items.length > 0 ? (
                <ul className="space-y-1.5">
                    {items.map((item, index) => (
                        <li key={`${title}-${index}`} className="text-sm flex items-start gap-2">
                            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 opacity-60" />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm opacity-75">No specific items detected.</p>
            )}
        </div>
    );
}

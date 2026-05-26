"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowRight, Mail, Lock, User, Briefcase, Building2, Eye, EyeOff, PackageCheck, Upload, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { signup } from "../actions/auth";
import { BrandLogo } from "@/components/BrandLogo";
import { commaList, creatorServiceLabel, creatorServiceOptions, parseCommaList } from "@/lib/creators/services";
import { validatePasswordStrength } from "@/utils/auth-security";
import { EQUIPMENT_VENDOR_CATEGORIES } from "@/lib/equipment/vendors";
import {
    BOOKING_CREW_CATEGORIES,
    BOOKING_EVENT_CATEGORIES,
    EQUIPMENT_REQUIREMENT_CATEGORIES,
    POST_PRODUCTION_CATEGORIES,
    type BookingCategory,
} from "@/config/bookingOptions";

const acceptedPortfolioTypes = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime", "video/webm"]);
const maxPortfolioImageSize = 10 * 1024 * 1024;
const maxPortfolioVideoSize = 100 * 1024 * 1024;

export default function SignupPage() {
    const [accountType, setAccountType] = useState<"client" | "creator" | "equipment_vendor" | null>(null);
    const [creatorType, setCreatorType] = useState<"studio_owner" | "freelancer" | null>(null);
    const [step, setStep] = useState(1); // 1=account type, 2=creator sub-type, 3=credentials
    const [formData, setFormData] = useState({ name: "", email: "", password: "", confirmPassword: "" });
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [creatorForm, setCreatorForm] = useState({
        phone: "",
        whatsappPhone: "",
        city: "",
        state: "",
        role: "",
        serviceTags: [] as string[],
        eventTags: [] as string[],
        equipmentTags: [] as string[],
        postProductionTags: [] as string[],
        dayRate: "",
        portfolioUrl: "",
        bio: "",
        location: "",
        serviceCities: "",
        serviceRadiusKm: "",
        capacityPerDay: "",
        whatsappOptIn: true,
        availableForBooking: true,
        travelEnabled: false,
        budgetFlexibility: false,
    });
    const [portfolioDrafts, setPortfolioDrafts] = useState<Array<{
        id: string;
        file: File;
        title: string;
        description: string;
        featured: boolean;
        isPublic: boolean;
    }>>([]);
    const [vendorForm, setVendorForm] = useState({
        contactName: "",
        phone: "",
        whatsappPhone: "",
        city: "",
        state: "",
        warehouseAddress: "",
        gstNumber: "",
        yearsInBusiness: "",
        deliveryAvailable: true,
        operatorSupportAvailable: false,
        equipmentCategories: [] as string[],
    });
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [signupComplete, setSignupComplete] = useState(false);
    
    // UI state
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleTypeSelection = (type: "client" | "creator" | "equipment_vendor") => {
        setAccountType(type);
        if (type === "client") {
            setStep(3);
        } else if (type === "creator") {
            setStep(2);
        } else {
            setStep(3);
        }
    };

    const toggleVendorCategory = (categoryId: string) => {
        setVendorForm((current) => ({
            ...current,
            equipmentCategories: current.equipmentCategories.includes(categoryId)
                ? current.equipmentCategories.filter((id) => id !== categoryId)
                : [...current.equipmentCategories, categoryId],
        }));
    };

    const creatorProgressSteps = [
        "Account",
        "Contact",
        "Services",
        "Availability",
        "Portfolio",
        "Review",
    ];

    const creatorStepIndex = Math.max(0, Math.min(creatorProgressSteps.length - 1, step - 3));
    const creatorStepTitle = creatorProgressSteps[creatorStepIndex] || "Account";
    const primaryService = creatorForm.role || creatorForm.serviceTags[0] || "";
    const selectedServiceNames = creatorForm.serviceTags.map(creatorServiceLabel);
    const selectedEventNames = creatorForm.eventTags.map(creatorServiceLabel);
    const selectedEquipmentNames = creatorForm.equipmentTags.map(creatorServiceLabel);
    const selectedPostProductionNames = creatorForm.postProductionTags.map(creatorServiceLabel);

    const creatorStepIsValid = (targetStep = step) => {
        if (targetStep === 3) {
            if (!formData.name.trim()) return "Please enter your name or studio name.";
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return "Please enter a valid email address.";
            const passwordError = validatePasswordStrength(formData.password);
            if (passwordError) return passwordError;
            if (formData.password !== formData.confirmPassword) return "Passwords do not match.";
            if (!termsAccepted) return "Please accept the Terms and Privacy Policy.";
        }
        if (targetStep === 4) {
            const cleanedPhone = creatorForm.phone.replace(/[^\d+]/g, "");
            if (cleanedPhone.length < 10) return "Please enter a valid phone number.";
            if (!creatorForm.city.trim()) return "Please enter your city.";
        }
        if (targetStep === 5) {
            if (!primaryService) return "Please select your main service.";
            if (creatorForm.serviceTags.length === 0) return "Please select at least one service offered.";
        }
        if (targetStep === 6) {
            if (creatorForm.dayRate && Number(creatorForm.dayRate) <= 0) return "Base day rate must be positive if provided.";
        }
        return "";
    };

    const goToNextCreatorStep = () => {
        const error = creatorStepIsValid();
        if (error) {
            setErrorMsg(error);
            return;
        }
        setErrorMsg("");
        setStep((current) => Math.min(8, current + 1));
    };

    const goToPreviousCreatorStep = () => {
        setErrorMsg("");
        if (step === 3) {
            setStep(2);
            return;
        }
        setStep((current) => Math.max(3, current - 1));
    };

    const toggleCreatorTag = (field: "serviceTags" | "eventTags" | "equipmentTags" | "postProductionTags", value: string) => {
        setCreatorForm((current) => {
            const selected = current[field].includes(value)
                ? current[field].filter((item) => item !== value)
                : [...current[field], value];
            return {
                ...current,
                [field]: selected,
                role: field === "serviceTags" && !current.role && selected.length > 0 ? selected[0] : current.role,
            };
        });
    };

    const selectAllCreatorTags = (field: "serviceTags" | "eventTags" | "equipmentTags" | "postProductionTags", options: Array<{ id: string }>) => {
        setCreatorForm((current) => {
            const ids = options.map((option) => option.id);
            const merged = Array.from(new Set([...current[field], ...ids]));
            return {
                ...current,
                [field]: merged,
                role: field === "serviceTags" && !current.role && merged.length > 0 ? merged[0] : current.role,
            };
        });
    };

    const clearCreatorTags = (field: "serviceTags" | "eventTags" | "equipmentTags" | "postProductionTags", options: Array<{ id: string }>) => {
        const ids = new Set(options.map((option) => option.id));
        setCreatorForm((current) => ({
            ...current,
            [field]: current[field].filter((item) => !ids.has(item)),
        }));
    };

    const validatePortfolioFile = (file: File) => {
        if (!acceptedPortfolioTypes.has(file.type)) return "Supported files: jpg, png, webp, mp4, mov, webm.";
        const isVideo = file.type.startsWith("video/");
        if (!isVideo && file.size > maxPortfolioImageSize) return "Images must be 10MB or smaller.";
        if (isVideo && file.size > maxPortfolioVideoSize) return "Videos must be 100MB or smaller.";
        return "";
    };

    const handlePortfolioFiles = (files: FileList | null) => {
        if (!files) return;
        const nextDrafts: typeof portfolioDrafts = [];
        for (const file of Array.from(files)) {
            const error = validatePortfolioFile(file);
            if (error) {
                setErrorMsg(`${file.name}: ${error}`);
                continue;
            }
            nextDrafts.push({
                id: crypto.randomUUID(),
                file,
                title: file.name.replace(/\.[^/.]+$/, ""),
                description: "",
                featured: portfolioDrafts.length === 0 && nextDrafts.length === 0,
                isPublic: true,
            });
        }
        if (nextDrafts.length > 0) {
            setErrorMsg("");
            setPortfolioDrafts((current) => [...current, ...nextDrafts]);
        }
    };

    const updatePortfolioDraft = (id: string, values: Partial<(typeof portfolioDrafts)[number]>) => {
        setPortfolioDrafts((current) => current.map((item) => {
            if (item.id !== id) {
                return values.featured ? { ...item, featured: false } : item;
            }
            return { ...item, ...values };
        }));
    };

    const removePortfolioDraft = (id: string) => {
        setPortfolioDrafts((current) => current.filter((item) => item.id !== id));
    };

    const creatorSummary = useMemo(() => ({
        mainService: creatorServiceLabel(primaryService),
        services: selectedServiceNames,
        events: selectedEventNames,
        equipment: selectedEquipmentNames,
        post: selectedPostProductionNames,
        serviceCities: parseCommaList(creatorForm.serviceCities),
    }), [primaryService, selectedServiceNames, selectedEventNames, selectedEquipmentNames, selectedPostProductionNames, creatorForm.serviceCities]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        // 1. Validate Email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setErrorMsg("Please enter a valid email address.");
            setLoading(false);
            return;
        }

        const passwordError = validatePasswordStrength(formData.password);
        if (passwordError) {
            setErrorMsg(passwordError);
            setLoading(false);
            return;
        }

        // 3. Confirm Password Match
        if (formData.password !== formData.confirmPassword) {
            setErrorMsg("Passwords do not match.");
            setLoading(false);
            return;
        }

        if (!termsAccepted) {
            setErrorMsg("Please accept ShotcutCrew platform policies to continue.");
            setLoading(false);
            return;
        }

        if (accountType === "creator") {
            if (!creatorType) {
                setErrorMsg("Please choose Freelancer or Studio Owner.");
                setLoading(false);
                return;
            }

            const creatorStepError = [3, 4, 5, 6].map((stepNumber) => creatorStepIsValid(stepNumber)).find(Boolean);
            if (creatorStepError) {
                setErrorMsg(creatorStepError);
                setLoading(false);
                return;
            }

            const cleanedPhone = creatorForm.phone.replace(/[^\d+]/g, "");
            if (cleanedPhone.length < 10) {
                setErrorMsg("Please enter a valid phone number.");
                setLoading(false);
                return;
            }

            if (!creatorForm.city.trim()) {
                setErrorMsg("Please enter your city.");
                setLoading(false);
                return;
            }

            if (!primaryService) {
                setErrorMsg("Please select your primary service.");
                setLoading(false);
                return;
            }

            if (creatorForm.dayRate && Number(creatorForm.dayRate) <= 0) {
                setErrorMsg("Base day rate must be positive if provided.");
                setLoading(false);
                return;
            }
        }

        if (accountType === "equipment_vendor") {
            const cleanedPhone = vendorForm.phone.replace(/[^\d+]/g, "");
            if (!vendorForm.contactName.trim()) {
                setErrorMsg("Please enter the owner/contact name.");
                setLoading(false);
                return;
            }
            if (cleanedPhone.length < 10) {
                setErrorMsg("Please enter a valid business phone number.");
                setLoading(false);
                return;
            }
            if (!vendorForm.city.trim()) {
                setErrorMsg("Please enter your vendor city.");
                setLoading(false);
                return;
            }
            if (!vendorForm.warehouseAddress.trim()) {
                setErrorMsg("Please enter your warehouse or store address.");
                setLoading(false);
                return;
            }
            if (vendorForm.equipmentCategories.length === 0) {
                setErrorMsg("Please select at least one equipment category.");
                setLoading(false);
                return;
            }
        }

        try {
            const data = new FormData();
            data.append("name", formData.name);
            data.append("email", formData.email);
            data.append("password", formData.password);
            data.append("accepted_platform_policies", String(termsAccepted));
            data.append("phone", creatorForm.phone);
            data.append("whatsapp_phone", creatorForm.whatsappPhone || (creatorForm.whatsappOptIn ? creatorForm.phone : ""));
            data.append("city", creatorForm.city);
            data.append("state", creatorForm.state);
            data.append("role", primaryService);
            data.append("bio", creatorForm.bio);
            data.append("location", creatorForm.location || creatorForm.city);
            data.append("service_tags", creatorForm.serviceTags.join(","));
            data.append("event_tags", creatorForm.eventTags.join(","));
            data.append("equipment_tags", creatorForm.equipmentTags.join(","));
            data.append("post_production_tags", creatorForm.postProductionTags.join(","));
            data.append("service_cities", creatorForm.serviceCities);
            data.append("service_radius_km", creatorForm.serviceRadiusKm);
            data.append("capacity_per_day", creatorForm.capacityPerDay);
            data.append("day_rate", creatorForm.dayRate);
            data.append("portfolio_url", creatorForm.portfolioUrl);
            data.append("whatsapp_opt_in", String(creatorForm.whatsappOptIn));
            data.append("available_for_booking", String(creatorForm.availableForBooking));
            data.append("travel_enabled", String(creatorForm.travelEnabled));
            data.append("budget_flexibility", String(creatorForm.budgetFlexibility));
            portfolioDrafts.forEach((item) => {
                data.append("portfolio_files", item.file);
                data.append("portfolio_titles", item.title);
                data.append("portfolio_descriptions", item.description);
                data.append("portfolio_featured", String(item.featured));
                data.append("portfolio_public", String(item.isPublic));
            });
            if (accountType === "equipment_vendor") {
                data.set("phone", vendorForm.phone);
                data.set("whatsapp_phone", vendorForm.whatsappPhone || vendorForm.phone);
                data.set("city", vendorForm.city);
                data.set("state", vendorForm.state);
                data.append("vendor_contact_name", vendorForm.contactName);
                data.append("vendor_warehouse_address", vendorForm.warehouseAddress);
                data.append("vendor_gst_number", vendorForm.gstNumber);
                data.append("vendor_years_in_business", vendorForm.yearsInBusiness);
                data.append("vendor_delivery_available", String(vendorForm.deliveryAvailable));
                data.append("vendor_operator_support_available", String(vendorForm.operatorSupportAvailable));
                data.append("vendor_equipment_categories", vendorForm.equipmentCategories.join(","));
            }

            const result = await signup(data, accountType || "client", creatorType || undefined);
            if (!result.success) {
                setErrorMsg(result.message);
                setLoading(false);
                return;
            }

            setSignupComplete(true);
            setLoading(false);
        } catch (error) {
            setErrorMsg(error instanceof Error ? error.message : "Failed to create account. Please try again.");
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-[#fffcf8] selection:bg-orange-500/30 px-6 py-24 relative overflow-hidden">

            {/* Subtle Warm Background Gradients */}
            <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-rose-200/40 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-amber-200/40 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-xl relative z-10">
                <div className="text-center mb-10">
                    <div className="inline-block mb-8">
                        <BrandLogo href="/" width={220} height={64} className="h-auto w-[180px] md:w-[220px]" priority />
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {signupComplete && (
                        <motion.div
                            key="signup-complete"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-white p-8 md:p-10 rounded-[2rem] shadow-2xl shadow-stone-200/50 border border-stone-100 text-center"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-5">
                                <Mail className="w-7 h-7" />
                            </div>
                            <h1 className="text-3xl font-black tracking-tight text-stone-900 mb-3 font-display">
                                Check your email
                            </h1>
                            <p className="text-stone-600 font-medium leading-relaxed">
                                Account created. Please check your email and verify your account before logging in.
                            </p>
                            <p className="text-sm text-stone-500 mt-3">
                                Didn&apos;t receive email? Check spam or try again from the login page.
                            </p>
                            <Link
                                href="/login"
                                className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-6 py-3 text-sm font-bold text-white hover:bg-stone-800 transition-colors"
                            >
                                Go to Login <ArrowRight className="w-4 h-4" />
                            </Link>
                        </motion.div>
                    )}

                    {/* STEP 1: Account Type Selection */}
                    {!signupComplete && step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-white p-8 md:p-10 rounded-[2rem] shadow-2xl shadow-stone-200/50 border border-stone-100"
                        >
                            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-stone-900 mb-2 font-display text-center">
                                Join the Platform
                            </h1>
                            <p className="text-stone-500 font-medium pb-8 text-center px-4">
                                Choose how you want to use ShotcutCrew.
                            </p>

                            <div className="grid md:grid-cols-3 gap-4">
                                {/* Client Option */}
                                <button
                                    type="button"
                                    onClick={() => handleTypeSelection("client")}
                                    className="p-6 border-2 border-transparent bg-stone-50 rounded-2xl hover:border-orange-500 hover:bg-orange-50 transition-all text-left group relative overflow-hidden"
                                >
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm text-orange-600 flex items-center justify-center mb-4">
                                        <Briefcase className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-stone-900 text-xl font-display mb-2 group-hover:text-orange-600 transition-colors">Client</h3>
                                    <p className="text-stone-500 text-sm">Hire creators, studios, and equipment providers.</p>
                                </button>

                                {/* Creative Professional Option */}
                                <button
                                    type="button"
                                    onClick={() => handleTypeSelection("creator")}
                                    className="p-6 border-2 border-transparent bg-stone-50 rounded-2xl hover:border-rose-500 hover:bg-rose-50 transition-all text-left group relative overflow-hidden"
                                >
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm text-rose-600 flex items-center justify-center mb-4">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-stone-900 text-xl font-display mb-2 group-hover:text-rose-600 transition-colors">Creative Professional</h3>
                                    <p className="text-stone-500 text-sm">Offer photography, video, editing, and production services.</p>
                                </button>

                                {/* Equipment Vendor Option */}
                                <button
                                    type="button"
                                    onClick={() => handleTypeSelection("equipment_vendor")}
                                    className="p-6 border-2 border-transparent bg-stone-50 rounded-2xl hover:border-violet-500 hover:bg-violet-50 transition-all text-left group relative overflow-hidden"
                                >
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm text-violet-600 flex items-center justify-center mb-4">
                                        <PackageCheck className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-stone-900 text-xl font-display mb-2 group-hover:text-violet-600 transition-colors">Equipment Vendor</h3>
                                    <p className="text-stone-500 text-sm">Rent cameras, lights, drones, audio gear, and production tools.</p>
                                </button>
                            </div>

                            <div className="mt-8 text-center pt-6 border-t border-stone-100">
                                <p className="text-stone-500 text-sm font-medium">
                                    Already have an account?{' '}
                                    <Link href="/login" className="text-orange-600 font-bold hover:text-orange-700 transition-colors">
                                        Sign in
                                    </Link>
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: Creator Sub-Type Selection */}
                    {!signupComplete && step === 2 && (
                        <motion.div
                            key="step2-subtype"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-white p-8 md:p-10 rounded-[2rem] shadow-2xl shadow-stone-200/50 border border-stone-100"
                        >
                            <button onClick={() => setStep(1)} className="text-stone-400 hover:text-stone-900 text-sm mb-6 transition-colors font-bold">
                                ← Back
                            </button>

                            <h1 className="text-3xl font-black tracking-tight text-stone-900 mb-2 font-display">
                                How do you work?
                            </h1>
                            <p className="text-stone-500 font-medium pb-8 text-sm">
                                What best describes your creative business?
                            </p>

                            <div className="grid md:grid-cols-2 gap-4">
                                {/* Studio Owner */}
                                <button
                                    onClick={() => { setCreatorType("studio_owner"); setStep(3); }}
                                    className="p-6 border-2 border-transparent bg-stone-50 rounded-2xl hover:border-rose-500 hover:bg-rose-50 transition-all text-left group"
                                >
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm text-rose-600 flex items-center justify-center mb-4">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-stone-900 text-xl font-display mb-2 group-hover:text-rose-600 transition-colors">Production Studio</h3>
                                    <p className="text-stone-500 text-sm">I run a production studio and offer professional crew services.</p>
                                </button>

                                {/* Freelancer */}
                                <button
                                    onClick={() => { setCreatorType("freelancer"); setStep(3); }}
                                    className="p-6 border-2 border-transparent bg-stone-50 rounded-2xl hover:border-orange-500 hover:bg-orange-50 transition-all text-left group"
                                >
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm text-orange-600 flex items-center justify-center mb-4">
                                        <User className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-stone-900 text-xl font-display mb-2 group-hover:text-orange-600 transition-colors">Freelancer</h3>
                                    <p className="text-stone-500 text-sm">I work independently as a photographer, videographer, or editor.</p>
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {!signupComplete && accountType === "creator" && step >= 3 && step <= 8 && (
                        <motion.div
                            key={`creator-step-${step}`}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white p-8 md:p-10 rounded-[2rem] shadow-2xl shadow-stone-200/50 border border-stone-100"
                        >
                            <button type="button" onClick={goToPreviousCreatorStep} className="text-stone-400 hover:text-stone-900 text-sm mb-6 transition-colors font-bold">
                                ← Back
                            </button>
                            <div className="mb-6">
                                <p className="text-xs font-black uppercase tracking-wide text-orange-600">Step {creatorStepIndex + 1} of {creatorProgressSteps.length}</p>
                                <h1 className="text-3xl font-black tracking-tight text-stone-900 mt-1 font-display">
                                    {creatorStepTitle === "Account" ? (creatorType === "studio_owner" ? "Create Studio Account" : "Create Freelancer Account") : creatorStepTitle}
                                </h1>
                                <div className="mt-4 h-2 rounded-full bg-stone-100">
                                    <div className="h-full rounded-full bg-orange-600 transition-all" style={{ width: `${((creatorStepIndex + 1) / creatorProgressSteps.length) * 100}%` }} />
                                </div>
                            </div>

                            {errorMsg && (
                                <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl font-medium border border-red-100">
                                    {errorMsg}
                                </div>
                            )}

                            <form
                                onSubmit={(event) => {
                                    if (step < 8) {
                                        event.preventDefault();
                                        goToNextCreatorStep();
                                        return;
                                    }
                                    handleSubmit(event);
                                }}
                                className="space-y-6"
                            >
                                {step === 3 && (
                                    <div className="space-y-5">
                                        <SignupInput icon={<User className="w-5 h-5" />} label={creatorType === "studio_owner" ? "Studio / Business Name" : "Full Name"} value={formData.name} onChange={(value) => setFormData({ ...formData, name: value })} placeholder={creatorType === "studio_owner" ? "Your studio name" : "Your full name"} required />
                                        <SignupInput icon={<Mail className="w-5 h-5" />} label="Email Address" type="email" value={formData.email} onChange={(value) => setFormData({ ...formData, email: value })} placeholder="hello@example.com" required />
                                        <PasswordInput label="Password" value={formData.password} onChange={(value) => setFormData({ ...formData, password: value })} show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                                        <PasswordInput label="Confirm Password" value={formData.confirmPassword} onChange={(value) => setFormData({ ...formData, confirmPassword: value })} show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-1 w-4 h-4 text-orange-600 rounded border-stone-300 focus:ring-orange-500" />
                                            <PolicyConsentText accountType={accountType} creatorType={creatorType} />
                                        </label>
                                    </div>
                                )}

                                {step === 4 && (
                                    <div className="space-y-5">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <PlainInput label="Phone Number" type="tel" value={creatorForm.phone} onChange={(value) => setCreatorForm({ ...creatorForm, phone: value })} placeholder="10 digit mobile number" required />
                                            <PlainInput label="WhatsApp Number" type="tel" value={creatorForm.whatsappPhone} onChange={(value) => setCreatorForm({ ...creatorForm, whatsappPhone: value })} placeholder="Leave blank to use phone" />
                                            <PlainInput label="City" value={creatorForm.city} onChange={(value) => setCreatorForm({ ...creatorForm, city: value })} placeholder="e.g. Bilaspur" required />
                                            <PlainInput label="State" value={creatorForm.state} onChange={(value) => setCreatorForm({ ...creatorForm, state: value })} placeholder="e.g. Chhattisgarh" />
                                        </div>
                                        <label className="block">
                                            <span className="block text-sm font-bold text-stone-700 mb-1.5">Bio / Introduction</span>
                                            <textarea value={creatorForm.bio} onChange={(event) => setCreatorForm({ ...creatorForm, bio: event.target.value })} rows={4} placeholder={creatorType === "studio_owner" ? "Describe your studio, team, and production strengths." : "Briefly describe your experience and creative style."} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-stone-900 transition-colors" />
                                        </label>
                                        <PlainInput label={creatorType === "studio_owner" ? "Studio Location / Address" : "Location / Address"} value={creatorForm.location} onChange={(value) => setCreatorForm({ ...creatorForm, location: value })} placeholder="Area, landmark, studio address, or service location" />
                                    </div>
                                )}

                                {step === 5 && (
                                    <div className="space-y-5">
                                        <label className="block">
                                            <span className="block text-sm font-bold text-stone-700 mb-1.5">Main Service</span>
                                            <select value={creatorForm.role} onChange={(e) => setCreatorForm({ ...creatorForm, role: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-stone-900 transition-colors">
                                                <option value="">Select headline service</option>
                                                {creatorServiceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                            </select>
                                        </label>
                                        <CategoryPicker title="Services Offered" helper={`${creatorForm.serviceTags.length} selected. Required for matching.`} categories={BOOKING_CREW_CATEGORIES} selected={creatorForm.serviceTags} onToggle={(value) => toggleCreatorTag("serviceTags", value)} onSelectAll={(options) => selectAllCreatorTags("serviceTags", options)} onClear={(options) => clearCreatorTags("serviceTags", options)} />
                                        <CategoryPicker title="Event Types Served" helper={`${creatorForm.eventTags.length} selected. Recommended for better booking matches.`} categories={BOOKING_EVENT_CATEGORIES} selected={creatorForm.eventTags} onToggle={(value) => toggleCreatorTag("eventTags", value)} onSelectAll={(options) => selectAllCreatorTags("eventTags", options)} onClear={(options) => clearCreatorTags("eventTags", options)} />
                                        <CategoryPicker title="Equipment Available / Supported" helper="Optional: select gear you own or can arrange professionally." categories={EQUIPMENT_REQUIREMENT_CATEGORIES} selected={creatorForm.equipmentTags} onToggle={(value) => toggleCreatorTag("equipmentTags", value)} onSelectAll={(options) => selectAllCreatorTags("equipmentTags", options)} onClear={(options) => clearCreatorTags("equipmentTags", options)} />
                                        <CategoryPicker title="Post Production Services" helper="Optional: select editing and finishing services you provide." categories={POST_PRODUCTION_CATEGORIES} selected={creatorForm.postProductionTags} onToggle={(value) => toggleCreatorTag("postProductionTags", value)} onSelectAll={(options) => selectAllCreatorTags("postProductionTags", options)} onClear={(options) => clearCreatorTags("postProductionTags", options)} />
                                    </div>
                                )}

                                {step === 6 && (
                                    <div className="space-y-5">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <PlainInput label="Base Day Rate" type="number" value={creatorForm.dayRate} onChange={(value) => setCreatorForm({ ...creatorForm, dayRate: value })} placeholder="Format: 15000" />
                                            <PlainInput label="Capacity Per Day" type="number" value={creatorForm.capacityPerDay} onChange={(value) => setCreatorForm({ ...creatorForm, capacityPerDay: value })} placeholder="e.g. 2 shoots/day" />
                                            <PlainInput label="Service Cities" value={creatorForm.serviceCities} onChange={(value) => setCreatorForm({ ...creatorForm, serviceCities: value })} placeholder="Bilaspur, Raipur, Durg" />
                                            <PlainInput label="Service Radius km" type="number" value={creatorForm.serviceRadiusKm} onChange={(value) => setCreatorForm({ ...creatorForm, serviceRadiusKm: value })} placeholder="0" />
                                        </div>
                                        <div className="grid sm:grid-cols-2 gap-3">
                                            <ToggleLabel label="WhatsApp opt-in" checked={creatorForm.whatsappOptIn} onChange={(checked) => setCreatorForm({ ...creatorForm, whatsappOptIn: checked })} />
                                            <ToggleLabel label="Available for booking" checked={creatorForm.availableForBooking} onChange={(checked) => setCreatorForm({ ...creatorForm, availableForBooking: checked })} />
                                            <ToggleLabel label="Travel enabled" checked={creatorForm.travelEnabled} onChange={(checked) => setCreatorForm({ ...creatorForm, travelEnabled: checked })} />
                                            <ToggleLabel label="Budget flexibility" checked={creatorForm.budgetFlexibility} onChange={(checked) => setCreatorForm({ ...creatorForm, budgetFlexibility: checked })} />
                                        </div>
                                    </div>
                                )}

                                {step === 7 && (
                                    <div className="space-y-5">
                                        <PlainInput label={creatorType === "studio_owner" ? "Studio Portfolio URL" : "Portfolio URL"} type="url" value={creatorForm.portfolioUrl} onChange={(value) => setCreatorForm({ ...creatorForm, portfolioUrl: value })} placeholder="https://yourportfolio.com" />
                                        <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/50 p-5">
                                            <input id="creator-portfolio-upload" type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" onChange={(event) => handlePortfolioFiles(event.target.files)} className="hidden" />
                                            <label htmlFor="creator-portfolio-upload" className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl bg-white p-6 text-center shadow-sm">
                                                <Upload className="w-8 h-8 text-orange-600" />
                                                <span className="font-black text-stone-900">Upload Photos / Videos</span>
                                                <span className="text-xs font-semibold text-stone-500">Images up to 10MB, videos up to 100MB. Optional during signup.</span>
                                            </label>
                                        </div>
                                        {portfolioDrafts.length > 0 && (
                                            <div className="space-y-3">
                                                {portfolioDrafts.map((item) => (
                                                    <div key={item.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <p className="font-black text-stone-900">{item.file.name}</p>
                                                                <p className="text-xs font-semibold text-stone-500">{item.file.type.startsWith("video/") ? "Video" : "Image"} · {(item.file.size / (1024 * 1024)).toFixed(1)}MB</p>
                                                            </div>
                                                            <button type="button" onClick={() => removePortfolioDraft(item.id)} className="rounded-full bg-white p-2 text-red-600"><X className="w-4 h-4" /></button>
                                                        </div>
                                                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                                                            <PlainInput label="Title" value={item.title} onChange={(value) => updatePortfolioDraft(item.id, { title: value })} placeholder="Project title" />
                                                            <PlainInput label="Description" value={item.description} onChange={(value) => updatePortfolioDraft(item.id, { description: value })} placeholder="Short description" />
                                                        </div>
                                                        <div className="mt-3 grid sm:grid-cols-2 gap-3">
                                                            <ToggleLabel label="Public" checked={item.isPublic} onChange={(checked) => updatePortfolioDraft(item.id, { isPublic: checked })} />
                                                            <ToggleLabel label="Featured Work" checked={item.featured} onChange={(checked) => updatePortfolioDraft(item.id, { featured: checked })} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {step === 8 && (
                                    <CreatorSignupReview
                                        creatorType={creatorType}
                                        formData={formData}
                                        creatorForm={creatorForm}
                                        summary={creatorSummary}
                                        portfolioCount={portfolioDrafts.length}
                                    />
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={goToPreviousCreatorStep} className="flex-1 py-4 bg-stone-100 text-stone-700 font-bold rounded-xl hover:bg-stone-200 transition-colors">Back</button>
                                    {step < 8 ? (
                                        <button type="button" onClick={goToNextCreatorStep} className="flex-[2] py-4 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors">Continue</button>
                                    ) : (
                                        <button type="submit" disabled={loading} className="flex-[2] py-4 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-70">
                                            {loading ? "Creating Account..." : "Complete Signup"}
                                        </button>
                                    )}
                                </div>
                            </form>
                        </motion.div>
                    )}

                    {/* STEP 3: Credentials Form */}
                    {!signupComplete && step === 3 && isNonCreatorSignup(accountType) && (
                        <motion.div
                            key="step3-credentials"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white p-8 md:p-10 rounded-[2rem] shadow-2xl shadow-stone-200/50 border border-stone-100"
                        >
                            <button onClick={() => accountType === "creator" ? setStep(2) : setStep(1)} className="text-stone-400 hover:text-stone-900 text-sm mb-6 transition-colors font-bold">
                                ← Back
                            </button>

                            <h1 className="text-3xl font-black tracking-tight text-stone-900 mb-2 font-display">
                                {accountType === "client" ? "Create Client Account" : accountType === "equipment_vendor" ? "Create Equipment Vendor Profile" : creatorType === "studio_owner" ? "Create Studio Profile" : "Create Freelancer Profile"}
                            </h1>
                            <p className="text-stone-500 font-medium pb-6 border-b border-stone-100 mb-6">
                                {accountType === "client"
                                    ? "Start hiring top-tier talent in minutes."
                                    : accountType === "equipment_vendor"
                                        ? "List your rental business and receive equipment availability requests."
                                        : "Build your portfolio to start receiving briefs."}
                            </p>

                            {errorMsg && (
                                <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl font-medium border border-red-100">
                                    {errorMsg}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-stone-700 mb-1.5">Full Name</label>
                                    <div className="relative">
                                        <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder={accountType === "client" ? "Your full name" : accountType === "equipment_vendor" ? "Business / rental house name" : creatorType === "studio_owner" ? "Your studio name" : "Your full name"}
                                            required
                                            className="w-full pl-12 pr-4 py-4 rounded-xl border border-stone-200 bg-stone-50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-stone-900 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-stone-700 mb-1.5">Email Address</label>
                                    <div className="relative">
                                        <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="hello@example.com"
                                            required
                                            className="w-full pl-12 pr-4 py-4 rounded-xl border border-stone-200 bg-stone-50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-stone-900 transition-colors"
                                        />
                                    </div>
                                </div>

                                {accountType === "creator" && (
                                    <div className="space-y-5 rounded-2xl border border-stone-100 bg-stone-50/70 p-5">
                                        <div>
                                            <h2 className="text-sm font-black uppercase tracking-wide text-stone-700">
                                                {creatorType === "studio_owner" ? "Studio matching details" : "Freelancer matching details"}
                                            </h2>
                                            <p className="text-xs text-stone-500 mt-1">
                                                These details help ShotcutCrew send you relevant booking opportunities.
                                            </p>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-stone-700 mb-1.5">Phone Number</label>
                                                <input
                                                    type="tel"
                                                    value={creatorForm.phone}
                                                    onChange={(e) => setCreatorForm({ ...creatorForm, phone: e.target.value })}
                                                    placeholder="10 digit mobile number"
                                                    required
                                                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-stone-900 transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-stone-700 mb-1.5">WhatsApp Number</label>
                                                <input
                                                    type="tel"
                                                    value={creatorForm.whatsappPhone}
                                                    onChange={(e) => setCreatorForm({ ...creatorForm, whatsappPhone: e.target.value })}
                                                    placeholder="Leave blank to use phone"
                                                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-stone-900 transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-stone-700 mb-1.5">City</label>
                                                <input
                                                    type="text"
                                                    value={creatorForm.city}
                                                    onChange={(e) => setCreatorForm({ ...creatorForm, city: e.target.value })}
                                                    placeholder="e.g. Bilaspur"
                                                    required
                                                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-stone-900 transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-stone-700 mb-1.5">State</label>
                                                <input
                                                    type="text"
                                                    value={creatorForm.state}
                                                    onChange={(e) => setCreatorForm({ ...creatorForm, state: e.target.value })}
                                                    placeholder="e.g. Chhattisgarh"
                                                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-stone-900 transition-colors"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-stone-700 mb-1.5">
                                                {creatorType === "studio_owner" ? "Studio Services" : "Primary Service"}
                                            </label>
                                            <select
                                                value={creatorForm.role}
                                                onChange={(e) => setCreatorForm({ ...creatorForm, role: e.target.value })}
                                                required
                                                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-stone-900 transition-colors"
                                            >
                                                <option value="">Select primary service</option>
                                                {creatorServiceOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-stone-700 mb-1.5">Base Day Rate</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={creatorForm.dayRate}
                                                    onChange={(e) => setCreatorForm({ ...creatorForm, dayRate: e.target.value })}
                                                    placeholder="Format: 15000"
                                                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-stone-900 transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-stone-700 mb-1.5">
                                                    {creatorType === "studio_owner" ? "Studio Portfolio URL" : "Portfolio URL"}
                                                </label>
                                                <input
                                                    type="url"
                                                    value={creatorForm.portfolioUrl}
                                                    onChange={(e) => setCreatorForm({ ...creatorForm, portfolioUrl: e.target.value })}
                                                    placeholder="https://yourportfolio.com"
                                                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-stone-900 transition-colors"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-3">
                                            <ToggleLabel label="WhatsApp opt-in" checked={creatorForm.whatsappOptIn} onChange={(checked) => setCreatorForm({ ...creatorForm, whatsappOptIn: checked })} />
                                            <ToggleLabel label="Available for booking" checked={creatorForm.availableForBooking} onChange={(checked) => setCreatorForm({ ...creatorForm, availableForBooking: checked })} />
                                            <ToggleLabel label="Travel enabled" checked={creatorForm.travelEnabled} onChange={(checked) => setCreatorForm({ ...creatorForm, travelEnabled: checked })} />
                                            <ToggleLabel label="Budget flexibility" checked={creatorForm.budgetFlexibility} onChange={(checked) => setCreatorForm({ ...creatorForm, budgetFlexibility: checked })} />
                                        </div>
                                    </div>
                                )}

                                {accountType === "equipment_vendor" && (
                                    <div className="space-y-5 rounded-2xl border border-violet-100 bg-violet-50/50 p-5">
                                        <div>
                                            <h2 className="text-sm font-black uppercase tracking-wide text-stone-700">
                                                Equipment rental business details
                                            </h2>
                                            <p className="text-xs text-stone-500 mt-1">
                                                These details help ShotcutCrew match rental requests to your inventory and service area.
                                            </p>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <VendorInput label="Owner / Contact Name" value={vendorForm.contactName} onChange={(value) => setVendorForm({ ...vendorForm, contactName: value })} placeholder="Primary contact person" required />
                                            <VendorInput label="Phone Number" type="tel" value={vendorForm.phone} onChange={(value) => setVendorForm({ ...vendorForm, phone: value })} placeholder="10 digit business number" required />
                                            <VendorInput label="WhatsApp Number" type="tel" value={vendorForm.whatsappPhone} onChange={(value) => setVendorForm({ ...vendorForm, whatsappPhone: value })} placeholder="Leave blank to use phone" />
                                            <VendorInput label="Years in Business" type="number" value={vendorForm.yearsInBusiness} onChange={(value) => setVendorForm({ ...vendorForm, yearsInBusiness: value })} placeholder="e.g. 3" />
                                            <VendorInput label="City" value={vendorForm.city} onChange={(value) => setVendorForm({ ...vendorForm, city: value })} placeholder="e.g. Bilaspur" required />
                                            <VendorInput label="State" value={vendorForm.state} onChange={(value) => setVendorForm({ ...vendorForm, state: value })} placeholder="e.g. Chhattisgarh" />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-stone-700 mb-1.5">Warehouse / Store Address</label>
                                            <textarea
                                                value={vendorForm.warehouseAddress}
                                                onChange={(event) => setVendorForm({ ...vendorForm, warehouseAddress: event.target.value })}
                                                rows={3}
                                                placeholder="Rental pickup or warehouse address"
                                                required
                                                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 text-stone-900 transition-colors"
                                            />
                                        </div>

                                        <VendorInput label="GST Number optional" value={vendorForm.gstNumber} onChange={(value) => setVendorForm({ ...vendorForm, gstNumber: value })} placeholder="GSTIN if available" />

                                        <div>
                                            <div className="flex items-center justify-between gap-3 mb-3">
                                                <label className="block text-sm font-bold text-stone-700">Equipment Categories</label>
                                                <span className="text-xs font-bold text-violet-700">{vendorForm.equipmentCategories.length} selected</span>
                                            </div>
                                            <div className="grid sm:grid-cols-2 gap-2">
                                                {EQUIPMENT_VENDOR_CATEGORIES.map((category) => {
                                                    const selected = vendorForm.equipmentCategories.includes(category.id);
                                                    return (
                                                        <button
                                                            type="button"
                                                            key={category.id}
                                                            onClick={() => toggleVendorCategory(category.id)}
                                                            className={`rounded-xl border px-3 py-3 text-left transition-all ${selected ? "border-violet-500 bg-white text-violet-700 shadow-sm" : "border-stone-200 bg-white text-stone-700 hover:border-violet-200"}`}
                                                        >
                                                            <span className="block text-sm font-black">{category.label}</span>
                                                            <span className="mt-1 block text-xs text-stone-500">{category.description}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-3">
                                            <ToggleLabel label="Delivery available" checked={vendorForm.deliveryAvailable} onChange={(checked) => setVendorForm({ ...vendorForm, deliveryAvailable: checked })} />
                                            <ToggleLabel label="Operator support available" checked={vendorForm.operatorSupportAvailable} onChange={(checked) => setVendorForm({ ...vendorForm, operatorSupportAvailable: checked })} />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-bold text-stone-700 mb-1.5">Password</label>
                                    <div className="relative">
                                        <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            placeholder="Min. 10 chars, uppercase, lowercase, number"
                                            required
                                            minLength={10}
                                            className="w-full pl-12 pr-12 py-4 rounded-xl border border-stone-200 bg-stone-50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-stone-900 transition-colors"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors p-1"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-stone-700 mb-1.5">Confirm Password</label>
                                    <div className="relative">
                                        <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            placeholder="Re-enter password"
                                            required
                                            minLength={10}
                                            className="w-full pl-12 pr-12 py-4 rounded-xl border border-stone-200 bg-stone-50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-stone-900 transition-colors"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors p-1"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Terms Acceptance */}
                                <label className="flex items-start gap-3 mt-4 cursor-pointer">
                                    <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} required className="mt-1 w-4 h-4 text-orange-600 rounded border-stone-300 focus:ring-orange-500" />
                                    <PolicyConsentText accountType={accountType} creatorType={creatorType} />
                                </label>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 mt-6 shadow-lg shadow-stone-900/10 active:scale-95 group disabled:opacity-70 disabled:pointer-events-none"
                                >
                                    {loading ? "Creating Account..." : (
                                        <>Complete Signup <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}

function isNonCreatorSignup(accountType: "client" | "creator" | "equipment_vendor" | null): boolean {
    return accountType !== "creator";
}

function PolicyConsentText({
    accountType,
    creatorType,
}: {
    accountType: "client" | "creator" | "equipment_vendor" | null;
    creatorType: "studio_owner" | "freelancer" | null;
}) {
    const roleNote = accountType === "equipment_vendor"
        ? "This includes equipment rental, deposit, damage, delivery, logistics, and operator responsibilities."
        : accountType === "creator"
            ? `This includes the ${creatorType === "studio_owner" ? "studio/provider" : "creator/provider"} agreement, marketplace conduct, commission, and payout policies.`
            : "This includes booking, refund, payment, and AI-assisted platform policies.";

    return (
        <span className="text-sm text-stone-600 select-none leading-relaxed">
            I agree to ShotcutCrew&apos;s{" "}
            <Link href="/terms" className="font-bold text-orange-600 hover:underline">Terms of Service</Link>,{" "}
            <Link href="/privacy" className="font-bold text-orange-600 hover:underline">Privacy Policy</Link>, and applicable platform policies.{" "}
            <span className="block mt-1 text-xs text-stone-500">
                {roleNote} See{" "}
                <Link href="/refund-policy" className="font-bold text-orange-600 hover:underline">Refund Policy</Link>,{" "}
                <Link href="/creator-agreement" className="font-bold text-orange-600 hover:underline">Creator Agreement</Link>,{" "}
                <Link href="/equipment-rental-terms" className="font-bold text-orange-600 hover:underline">Equipment Rental Terms</Link>, and{" "}
                <Link href="/ai-disclaimer" className="font-bold text-orange-600 hover:underline">AI Disclaimer</Link>.
            </span>
        </span>
    );
}

function SignupInput({
    label,
    value,
    onChange,
    placeholder,
    icon,
    type = "text",
    required = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    icon: ReactNode;
    type?: string;
    required?: boolean;
}) {
    return (
        <div>
            <label className="block text-sm font-bold text-stone-700 mb-1.5">{label}</label>
            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">{icon}</span>
                <input
                    type={type}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder={placeholder}
                    required={required}
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-stone-200 bg-stone-50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-stone-900 transition-colors"
                />
            </div>
        </div>
    );
}

function PasswordInput({
    label,
    value,
    onChange,
    show,
    onToggle,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    show: boolean;
    onToggle: () => void;
}) {
    return (
        <div>
            <label className="block text-sm font-bold text-stone-700 mb-1.5">{label}</label>
            <div className="relative">
                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder="Min. 10 chars, uppercase, lowercase, number"
                    minLength={10}
                    required
                    className="w-full pl-12 pr-12 py-4 rounded-xl border border-stone-200 bg-stone-50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-stone-900 transition-colors"
                />
                <button type="button" onClick={onToggle} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors p-1">
                    {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
            </div>
        </div>
    );
}

function PlainInput({
    label,
    value,
    onChange,
    placeholder,
    type = "text",
    required = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    type?: string;
    required?: boolean;
}) {
    return (
        <label className="block">
            <span className="block text-sm font-bold text-stone-700 mb-1.5">{label}</span>
            <input
                type={type}
                min={type === "number" ? 0 : undefined}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                required={required}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-stone-900 transition-colors"
            />
        </label>
    );
}

function CategoryPicker({
    title,
    helper,
    categories,
    selected,
    onToggle,
    onSelectAll,
    onClear,
}: {
    title: string;
    helper: string;
    categories: BookingCategory[];
    selected: string[];
    onToggle: (value: string) => void;
    onSelectAll: (options: Array<{ id: string }>) => void;
    onClear: (options: Array<{ id: string }>) => void;
}) {
    const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({ [categories[0]?.id || ""]: true });
    return (
        <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
            <div className="mb-3">
                <h3 className="text-sm font-black text-stone-900">{title}</h3>
                <p className="text-xs font-semibold text-stone-500 mt-1">{helper}</p>
            </div>
            <div className="space-y-3">
                {categories.map((category) => {
                    const isOpen = openCategories[category.id] ?? false;
                    const selectedCount = category.options.filter((option) => selected.includes(option.id)).length;
                    return (
                        <section key={category.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                            <button
                                type="button"
                                onClick={() => setOpenCategories((current) => ({ ...current, [category.id]: !isOpen }))}
                                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                            >
                                <span className="font-black text-sm text-stone-800">{category.label}</span>
                                <span className="text-xs font-bold text-stone-500">{selectedCount ? `${selectedCount} selected` : isOpen ? "Hide" : "Show"}</span>
                            </button>
                            {isOpen && (
                                <div className="space-y-3 p-4 pt-0">
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => onSelectAll(category.options)} className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700">Select all</button>
                                        <button type="button" onClick={() => onClear(category.options)} className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-bold text-stone-600">Clear</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {category.options.map((option) => {
                                            const isSelected = selected.includes(option.id);
                                            return (
                                                <button
                                                    key={option.id}
                                                    type="button"
                                                    onClick={() => onToggle(option.id)}
                                                    className={`rounded-full border px-3 py-2 text-xs font-bold transition-colors ${isSelected ? "border-orange-500 bg-orange-50 text-orange-700" : "border-stone-200 bg-white text-stone-600 hover:border-orange-300"}`}
                                                >
                                                    {option.label}
                                                </button>
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
}

function CreatorSignupReview({
    creatorType,
    formData,
    creatorForm,
    summary,
    portfolioCount,
}: {
    creatorType: "studio_owner" | "freelancer" | null;
    formData: { name: string; email: string };
    creatorForm: {
        phone: string;
        whatsappPhone: string;
        city: string;
        state: string;
        dayRate: string;
        portfolioUrl: string;
        serviceCities: string;
    };
    summary: {
        mainService: string;
        services: string[];
        events: string[];
        equipment: string[];
        post: string[];
        serviceCities: string[];
    };
    portfolioCount: number;
}) {
    const rows = [
        ["Profile", `${formData.name} · ${creatorType === "studio_owner" ? "Production Studio" : "Freelancer"}`],
        ["Email", formData.email],
        ["Location", [creatorForm.city, creatorForm.state].filter(Boolean).join(", ") || "Not set"],
        ["Phone", creatorForm.whatsappPhone || creatorForm.phone || "Not set"],
        ["Main service", summary.mainService || "Not set"],
        ["Services", summary.services.slice(0, 5).join(", ") || "Not set"],
        ["Events", summary.events.slice(0, 5).join(", ") || "Not selected"],
        ["Equipment", summary.equipment.slice(0, 5).join(", ") || "Not selected"],
        ["Post", summary.post.slice(0, 5).join(", ") || "Not selected"],
        ["Service cities", commaList(summary.serviceCities) || creatorForm.serviceCities || "Not set"],
        ["Day rate", creatorForm.dayRate ? `Rs ${Number(creatorForm.dayRate).toLocaleString("en-IN")}` : "Not set"],
        ["Portfolio", `${creatorForm.portfolioUrl ? "Link added" : "No link"} · ${portfolioCount} media file(s)`],
    ];
    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                <h2 className="font-black text-stone-900">Review your creator profile</h2>
                <p className="mt-1 text-sm font-semibold text-stone-600">You can edit all of this later from Creator Dashboard.</p>
            </div>
            <div className="grid gap-3">
                {rows.map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-stone-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-stone-400">{label}</p>
                        <p className="mt-1 text-sm font-bold text-stone-900">{value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ToggleLabel({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
    return (
        <label className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700">
            <span>{label}</span>
            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-orange-600 focus:ring-orange-500"
            />
        </label>
    );
}

function VendorInput({
    label,
    value,
    onChange,
    placeholder,
    type = "text",
    required = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    type?: string;
    required?: boolean;
}) {
    return (
        <div>
            <label className="block text-sm font-bold text-stone-700 mb-1.5">{label}</label>
            <input
                type={type}
                value={value}
                min={type === "number" ? 0 : undefined}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                required={required}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 text-stone-900 transition-colors"
            />
        </div>
    );
}

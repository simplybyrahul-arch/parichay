"use client";

import { useState } from "react";
import { ArrowRight, Mail, Lock, User, Briefcase, Building2, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { signup } from "../actions/auth";
import { BrandLogo } from "@/components/BrandLogo";
import { creatorServiceOptions } from "@/lib/creators/services";
import { validatePasswordStrength } from "@/utils/auth-security";

export default function SignupPage() {
    const [accountType, setAccountType] = useState<"client" | "creator" | null>(null);
    const [creatorType, setCreatorType] = useState<"studio_owner" | "freelancer" | null>(null);
    const [step, setStep] = useState(1); // 1=account type, 2=creator sub-type, 3=credentials
    const [formData, setFormData] = useState({ name: "", email: "", password: "", confirmPassword: "" });
    const [creatorForm, setCreatorForm] = useState({
        phone: "",
        whatsappPhone: "",
        city: "",
        state: "",
        role: "",
        dayRate: "",
        portfolioUrl: "",
        whatsappOptIn: true,
        availableForBooking: true,
        travelEnabled: false,
        budgetFlexibility: false,
    });
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [signupComplete, setSignupComplete] = useState(false);
    
    // UI state
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleTypeSelection = (type: "client" | "creator") => {
        setAccountType(type);
        if (type === "client") {
            setStep(3);
        } else {
            setStep(2);
        }
    };

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

        if (accountType === "creator") {
            if (!creatorType) {
                setErrorMsg("Please choose Freelancer or Studio Owner.");
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

            if (!creatorForm.role) {
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

        try {
            const data = new FormData();
            data.append("name", formData.name);
            data.append("email", formData.email);
            data.append("password", formData.password);
            data.append("phone", creatorForm.phone);
            data.append("whatsapp_phone", creatorForm.whatsappPhone || (creatorForm.whatsappOptIn ? creatorForm.phone : ""));
            data.append("city", creatorForm.city);
            data.append("state", creatorForm.state);
            data.append("role", creatorForm.role);
            data.append("day_rate", creatorForm.dayRate);
            data.append("portfolio_url", creatorForm.portfolioUrl);
            data.append("whatsapp_opt_in", String(creatorForm.whatsappOptIn));
            data.append("available_for_booking", String(creatorForm.availableForBooking));
            data.append("travel_enabled", String(creatorForm.travelEnabled));
            data.append("budget_flexibility", String(creatorForm.budgetFlexibility));

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
                                Are you looking to hire a crew, or offer your creative services?
                            </p>

                            <div className="grid md:grid-cols-2 gap-4">
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
                                    <p className="text-stone-500 text-sm">I want to hire verified production crews and talent.</p>
                                </button>

                                {/* Studio Owner / Freelancer Option */}
                                <button
                                    type="button"
                                    onClick={() => handleTypeSelection("creator")}
                                    className="p-6 border-2 border-transparent bg-stone-50 rounded-2xl hover:border-rose-500 hover:bg-rose-50 transition-all text-left group relative overflow-hidden"
                                >
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm text-rose-600 flex items-center justify-center mb-4">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-stone-900 text-xl font-display mb-2 group-hover:text-rose-600 transition-colors">Studio Owner / Freelancer</h3>
                                    <p className="text-stone-500 text-sm">I want to offer creative services and accept booking requests.</p>
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
                                Select the option that best describes your setup.
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
                                    <h3 className="font-bold text-stone-900 text-xl font-display mb-2 group-hover:text-rose-600 transition-colors">Studio Owner</h3>
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

                    {/* STEP 3: Credentials Form */}
                    {!signupComplete && step === 3 && (
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
                                {accountType === "client" ? "Create Client Account" : creatorType === "studio_owner" ? "Create Studio Profile" : "Create Freelancer Profile"}
                            </h1>
                            <p className="text-stone-500 font-medium pb-6 border-b border-stone-100 mb-6">
                                {accountType === "client"
                                    ? "Start hiring top-tier talent in minutes."
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
                                            placeholder={accountType === "client" ? "Your full name" : creatorType === "studio_owner" ? "Your studio name" : "Your full name"}
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
                                    <input type="checkbox" required className="mt-1 w-4 h-4 text-orange-600 rounded border-stone-300 focus:ring-orange-500" />
                                    <span className="text-sm text-stone-600 select-none">
                                        I agree to the ShotcutCrew <Link href="/terms" className="font-bold text-orange-600 hover:underline">Terms of Service</Link> and <Link href="/privacy" className="font-bold text-orange-600 hover:underline">Privacy Policy</Link>.
                                    </span>
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

"use client";

import { useState } from "react";
import { ArrowRight, Mail, Lock, User, Briefcase, Camera, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { signup } from "../actions/auth";

export default function SignupPage() {
    const [accountType, setAccountType] = useState<"client" | "creator" | null>(null);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({ name: "", email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const handleTypeSelection = (type: "client" | "creator") => {
        setAccountType(type);
        setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        try {
            const data = new FormData();
            data.append("name", formData.name);
            data.append("email", formData.email);
            data.append("password", formData.password);

            await signup(data, accountType || "client");
        } catch (error) {
            setErrorMsg("Failed to create account. Please try again.");
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
                    <Link href="/" className="inline-block mb-8">
                        <div className="font-display font-black text-3xl tracking-tight text-stone-900">PARICHAY.</div>
                    </Link>
                </div>

                <AnimatePresence mode="wait">
                    {/* ... Step 1 code identical ... */}
                    {step === 1 && (
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
                                Are you looking to hire a crew, or are you a creative professional?
                            </p>

                            <div className="grid md:grid-cols-2 gap-4">
                                {/* Client Option */}
                                <button
                                    onClick={() => handleTypeSelection("client")}
                                    className="p-6 border-2 border-transparent bg-stone-50 rounded-2xl hover:border-orange-500 hover:bg-orange-50 transition-all text-left group relative overflow-hidden"
                                >
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm text-orange-600 flex items-center justify-center mb-4">
                                        <Briefcase className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-stone-900 text-xl font-display mb-2 group-hover:text-orange-600 transition-colors">Client</h3>
                                    <p className="text-stone-500 text-sm">I want to hire verified production crews and talent.</p>
                                </button>

                                {/* Creator Option */}
                                <button
                                    onClick={() => handleTypeSelection("creator")}
                                    className="p-6 border-2 border-transparent bg-stone-50 rounded-2xl hover:border-rose-500 hover:bg-rose-50 transition-all text-left group relative overflow-hidden"
                                >
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm text-rose-600 flex items-center justify-center mb-4">
                                        <Camera className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-stone-900 text-xl font-display mb-2 group-hover:text-rose-600 transition-colors">Creator</h3>
                                    <p className="text-stone-500 text-sm">I want to build my profile and accept booking requests.</p>
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

                    {/* STEP 2: Credentials Form */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white p-8 md:p-10 rounded-[2rem] shadow-2xl shadow-stone-200/50 border border-stone-100"
                        >
                            <button onClick={() => setStep(1)} className="text-stone-400 hover:text-stone-900 text-sm mb-6 transition-colors">
                                ← Back
                            </button>

                            <h1 className="text-3xl font-black tracking-tight text-stone-900 mb-2 font-display">
                                Create {accountType === "client" ? "Client" : "Creator"} Account
                            </h1>
                            <p className="text-stone-500 font-medium pb-8 border-b border-stone-100 mb-8">
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
                                            placeholder="Nitin Studio"
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

                                <div>
                                    <label className="block text-sm font-bold text-stone-700 mb-1.5">Password</label>
                                    <div className="relative">
                                        <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            placeholder="••••••••"
                                            required
                                            className="w-full pl-12 pr-4 py-4 rounded-xl border border-stone-200 bg-stone-50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-stone-900 transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* Terms Acceptance */}
                                <label className="flex items-start gap-3 mt-4 cursor-pointer">
                                    <input type="checkbox" required className="mt-1 w-4 h-4 text-orange-600 rounded border-stone-300 focus:ring-orange-500" />
                                    <span className="text-sm text-stone-600 select-none">
                                        I agree to the Parichay <span className="font-bold text-orange-600 hover:underline">Terms of Service</span> and <span className="font-bold text-orange-600 hover:underline">Privacy Policy</span>.
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

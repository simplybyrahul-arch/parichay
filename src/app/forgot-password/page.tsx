"use client";

import { useState } from "react";
import { ArrowRight, Mail, CheckCircle2, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { requestPasswordReset } from "../actions/auth";
import { BrandLogo } from "@/components/BrandLogo";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        try {
            const data = new FormData();
            data.append("email", email);

            const result = await requestPasswordReset(data);
            
            if (result?.error) {
                setErrorMsg(result.error);
                setLoading(false);
            } else {
                setSuccess(true);
                setLoading(false);
            }
        } catch (error) {
            setErrorMsg("An unexpected error occurred. Please try again.");
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-[#fffcf8] selection:bg-orange-500/30 px-6 py-24 relative overflow-hidden">

            {/* Subtle Warm Background Gradients */}
            <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-rose-200/40 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-amber-200/40 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-10">
                    <div className="inline-block mb-8">
                        <BrandLogo href="/" width={220} height={64} className="h-auto w-[180px] md:w-[220px]" priority />
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {!success ? (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-white p-8 md:p-10 rounded-[2rem] shadow-2xl shadow-stone-200/50 border border-stone-100"
                        >
                            <Link href="/login" className="text-stone-400 hover:text-stone-900 text-sm font-bold flex items-center gap-1 mb-8 transition-colors">
                                <ArrowLeft className="w-4 h-4" /> Back to Login
                            </Link>

                            <div className="mb-8">
                                <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-stone-900 mb-2 font-display">
                                    Reset password
                                </h1>
                                <p className="text-stone-500 font-medium pb-2 text-sm">
                                    Enter your email address and we'll send you a link to reset your password.
                                </p>
                            </div>

                            {errorMsg && (
                                <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl font-medium border border-red-100">
                                    {errorMsg}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-stone-700 mb-1.5">Email Address</label>
                                    <div className="relative">
                                        <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="hello@example.com"
                                            required
                                            className="w-full pl-12 pr-4 py-4 rounded-xl border border-stone-200 bg-stone-50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-stone-900 transition-colors"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !email}
                                    className="w-full py-4 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 mt-6 shadow-lg shadow-orange-500/20 active:scale-95 group disabled:opacity-70 disabled:pointer-events-none"
                                >
                                    {loading ? "Sending..." : (
                                        <>Send Reset Link <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white p-8 md:p-10 rounded-[2rem] shadow-2xl shadow-stone-200/50 border border-stone-100 text-center"
                        >
                            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-stone-900 mb-4 font-display">
                                Check your email
                            </h1>
                            <p className="text-stone-500 font-medium text-sm mb-8 mx-auto">
                                We've sent a password reset link to <span className="text-stone-900 font-bold">{email}</span>. Please check your inbox and spam folder.
                            </p>
                            
                            <button
                                onClick={() => setSuccess(false)}
                                className="text-orange-600 text-sm font-bold hover:text-orange-700 transition-colors"
                            >
                                Didn't receive it? Try again
                            </button>

                            <div className="mt-8 pt-6 border-t border-stone-100">
                                <Link href="/login" className="inline-flex items-center gap-2 py-3 px-6 bg-stone-50 border border-stone-200 text-stone-700 font-bold rounded-xl hover:bg-white hover:border-stone-300 transition-colors text-sm">
                                    <ArrowLeft className="w-4 h-4" /> Back to Sign In
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}

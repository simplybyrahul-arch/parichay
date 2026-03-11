"use client";

import { useState } from "react";
import { ArrowRight, Mail, Lock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { login } from "../actions/auth";
import { BrandLogo } from "@/components/BrandLogo";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        try {
            const data = new FormData();
            data.append("email", email);
            data.append("password", password);

            await login(data);
        } catch (error) {
            setErrorMsg("Invalid email or password. Please try again.");
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-[#fffcf8] selection:bg-orange-500/30 px-6 py-24 relative overflow-hidden">

            {/* Subtle Warm Background Gradients */}
            <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-rose-200/40 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-amber-200/40 blur-[120px] rounded-full pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white p-8 md:p-10 rounded-[2rem] shadow-2xl shadow-stone-200/50 border border-stone-100 relative z-10"
            >
                <div className="text-center mb-10">
                    <div className="inline-block mb-8">
                        <BrandLogo href="/" width={220} height={64} className="h-auto w-[180px] md:w-[220px]" priority />
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-stone-900 mb-2 font-display">
                        Welcome back
                    </h1>
                    <p className="text-stone-500 font-medium pb-2">Sign in to manage your productions.</p>
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

                    <div>
                        <label className="block text-sm font-bold text-stone-700 mb-1.5 flex justify-between">
                            Password
                            <a href="#" className="text-orange-600 font-semibold hover:text-orange-700 text-xs">Forgot?</a>
                        </label>
                        <div className="relative">
                            <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full pl-12 pr-4 py-4 rounded-xl border border-stone-200 bg-stone-50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-stone-900 transition-colors"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 mt-6 shadow-lg shadow-orange-500/20 active:scale-95 group disabled:opacity-70 disabled:pointer-events-none"
                    >
                        {loading ? "Signing in..." : (
                            <>Sign In <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-stone-500 text-sm font-medium">
                        Don&apos;t have an account?{' '}
                        <Link href="/signup" className="text-orange-600 font-bold hover:text-orange-700 transition-colors">
                            Create one
                        </Link>
                    </p>
                </div>
            </motion.div>
        </main>
    );
}

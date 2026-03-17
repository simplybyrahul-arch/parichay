"use client";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export const Hero = () => {
    return (
        <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-16 bg-gradient-to-br from-amber-50/90 via-orange-100/70 to-rose-100/80">

            {/* Base color wash to avoid a flat white-paper look */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,146,60,0.28),transparent_42%),radial-gradient(circle_at_80%_18%,rgba(244,114,182,0.2),transparent_38%),radial-gradient(circle_at_50%_85%,rgba(56,189,248,0.16),transparent_45%)]" />

            {/* Background Animated Orbs / Gradients (Warm) */}
            <div className="absolute inset-0 z-0 overflow-hidden mix-blend-multiply">
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-orange-300/40 blur-[120px]"
                />
                <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute top-[20%] -right-[10%] w-[40vw] h-[40vw] rounded-full bg-rose-400/30 blur-[100px]"
                />
                <motion.div
                    animate={{ y: [0, -15, 0], opacity: [0.18, 0.28, 0.18] }}
                    transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                    className="absolute -bottom-[18%] left-[22%] w-[42vw] h-[42vw] rounded-full bg-sky-300/30 blur-[130px]"
                />
            </div>

            {/* Grid Pattern overlay (Light) */}
            <div className="absolute inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
            <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

            {/* Content layer */}
            <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center">

                {/* Live Status Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-orange-500/20 bg-white/40 backdrop-blur-md shadow-sm"
                >
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                    </span>
                    <span className="text-sm font-semibold text-stone-800">145+ Crews Available Now</span>
                </motion.div>

                {/* Typed-style Header animation */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-stone-900 mb-6 leading-[1.1] font-display"
                >
                    The Future of <br className="hidden md:block" />
                    <span className="text-gradient from-orange-600 to-rose-500">Creative Production</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-lg md:text-2xl text-stone-700 mb-12 max-w-3xl mx-auto font-medium leading-relaxed drop-shadow-sm"
                >
                    Connect with verified photographers, videographers, and full production crews through a transparent, AI-enabled booking ecosystem.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto"
                >
                    <Link
                        href="/book"
                        className="w-full sm:w-auto px-8 py-4 bg-orange-600 text-white font-bold text-lg rounded-full hover:bg-orange-700 transition-all flex items-center justify-center gap-2 group hover:scale-105 active:scale-95 shadow-xl shadow-orange-500/20"
                    >
                        <Sparkles className="w-5 h-5 text-orange-200" />
                        Book a Crew
                    </Link>
                    <Link
                        href="/signup"
                        className="w-full sm:w-auto px-8 py-4 bg-white/60 backdrop-blur-md border border-stone-200 text-stone-900 font-bold text-lg rounded-full hover:bg-white hover:border-stone-300 transition-all flex items-center justify-center gap-2 group hover:scale-105 active:scale-95 shadow-lg"
                    >
                        Join
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </motion.div>
            </div>
        </section>
    );
};

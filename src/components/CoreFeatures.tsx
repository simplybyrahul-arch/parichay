"use client";
import { Zap, Users, BrainCircuit, Image as ImageIcon, PiggyBank, ShieldCheck, CreditCard, LayoutDashboard, Crown, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

const features = [
    // Row 1: The Core Booking Engine (Focus)
    {
        icon: <Zap className="w-8 h-8 text-orange-500 group-hover:scale-110 transition-transform" />,
        title: "1. Quick Booking Mode",
        description: "Instantly book verified photographers, videographers, or complete teams for specific events with transparent pricing.",
        className: "md:col-span-2 bg-gradient-to-br from-white to-orange-50 border-orange-200",
        hasPattern: true,
    },
    {
        icon: <Users className="w-8 h-8 text-stone-600 group-hover:scale-110 transition-transform" />,
        title: "2. Builder Mode",
        description: "Custom configuration system to build your crew (DOP, drone op, editor) with real-time cost estimates.",
        className: "md:col-span-1 bg-white border-stone-200",
        hasPattern: false,
    },
    {
        icon: <ShieldCheck className="w-8 h-8 text-amber-500 group-hover:scale-110 transition-transform" />,
        title: "3. Verified Creators",
        description: "Structured profiles with portfolios, tags, reliable availability, and verified client trust scores.",
        className: "md:col-span-1 bg-white border-stone-200",
        hasPattern: false,
    },
    // Row 2: AI & Smart Match
    {
        icon: <BrainCircuit className="w-8 h-8 text-rose-500 group-hover:scale-110 transition-transform" />,
        title: "4. AI Recommendations",
        description: "Smart matching of clients with creators based on event type, style preference, budget, and past performance.",
        className: "md:col-span-1 bg-white border-stone-200",
        hasPattern: false,
    },
    {
        icon: <ImageIcon className="w-8 h-8 text-purple-500 group-hover:scale-110 transition-transform" />,
        title: "5. Style Matching System",
        description: "Upload reference images or videos; our AI analyzes style elements and suggests similar professional creators.",
        className: "md:col-span-1 bg-white border-stone-200",
        hasPattern: false,
    },
    {
        icon: <PiggyBank className="w-8 h-8 text-emerald-500 group-hover:scale-110 transition-transform" />,
        title: "6. Budget Optimization",
        description: "AI assistant helps you adjust crew size and packages to stay perfectly within your defined budget.",
        className: "md:col-span-1 bg-white border-stone-200",
        hasPattern: false,
    },
    // Row 3: Trust & Platform Value
    {
        icon: <CreditCard className="w-8 h-8 text-indigo-500 group-hover:scale-110 transition-transform" />,
        title: "7. Secure Escrow",
        description: "Centralized payment gateway utilizing milestone-based releases for absolute transparency.",
        className: "md:col-span-2 bg-gradient-to-tl from-stone-50 to-white border-stone-200",
        hasPattern: true,
    },
    // Row 4: Management & Pro Features
    {
        icon: <LayoutDashboard className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform" />,
        title: "8. Unified PM Dashboard",
        description: "Manage bookings, track deliverables, schedule shoots, and monitor all payments centrally.",
        className: "md:col-span-2 bg-gradient-to-tr from-white to-blue-50/50 border-stone-200",
        hasPattern: true,
    },
    {
        icon: <Crown className="w-8 h-8 text-yellow-500 group-hover:scale-110 transition-transform" />,
        title: "9. Featured Subscriptions",
        description: "Studios can unlock premium placement, higher visibility, and exclusive AI market insights.",
        className: "md:col-span-1 bg-white border-stone-200",
        hasPattern: false,
    },
];

export const CoreFeatures = () => {
    return (
        <section className="py-32 px-6 bg-[#fdfbfb] relative border-y border-stone-200">
            <div className="max-w-6xl mx-auto">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-20"
                >
                    <div className="inline-flex items-center px-4 py-2 rounded-full border border-orange-200 bg-orange-50 text-orange-600 text-sm font-bold mb-6 tracking-wide uppercase shadow-sm">
                        Phase 1 Platform Ecosystem
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight text-stone-900 mb-6 font-display">
                        A Complete Tech-Driven <br className="hidden md:block" />
                        <span className="text-stone-400">Production Engine</span>
                    </h2>
                    <p className="text-xl text-stone-600 max-w-2xl mx-auto font-medium mb-6">
                        From intelligent matchmaking to secure milestone payments, explore the features redefining the creative market.
                    </p>
                    <Link
                        href="/search"
                        className="mx-auto flex items-center gap-2 px-6 py-3 bg-white border border-stone-200 text-orange-600 font-bold rounded-full hover:border-orange-200 hover:bg-orange-50 transition-colors shadow-sm group/link"
                    >
                        View Example Profile <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                    </Link>
                </motion.div>

                {/* 9-Feature Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(260px,auto)]">
                    {features.map((feature, index) => (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.05 }}
                            key={index}
                            className={`group p-8 rounded-[2rem] border relative overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:border-orange-300 ${feature.className}`}
                        >
                            {/* Optional Background Pattern */}
                            {feature.hasPattern && (
                                <div className="absolute top-0 right-0 w-48 h-48 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] mix-blend-multiply pointer-events-none rounded-full mask-radial" />
                            )}

                            <div className="relative z-10 flex-grow">
                                <div className="w-14 h-14 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 border border-stone-100 shadow-sm">
                                    {feature.icon}
                                </div>
                                <h3 className="text-2xl font-bold text-stone-900 mb-3 tracking-tight font-display">
                                    {feature.title}
                                </h3>
                                <p className="text-stone-600 text-base leading-relaxed font-medium mb-8 flex-grow">
                                    {feature.description}
                                </p>
                                <Link
                                    href="/book"
                                    className="w-full mt-auto py-4 bg-orange-600 text-white font-bold rounded-2xl hover:bg-orange-700 transition-all flex items-center justify-center gap-2 group/btn shadow-lg shadow-orange-500/20 active:scale-95"
                                >
                                    Try Quick Booking
                                    <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

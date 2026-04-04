"use client";
import { Zap, Construction, BrainCircuit, Video, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

const modules = [
    {
        icon: <Zap className="w-8 h-8 text-orange-500 group-hover:scale-110 transition-transform" />,
        title: "01  QUICK BOOKING MODE",
        description: "For standard projects and events. Specify your requirements and the platform auto-assigns a verified, available crew instantly.",
        linkText: "Try Quick Booking →",
        linkHref: "/book",
        className: "bg-white border-orange-200 shadow-sm",
        hasPattern: false,
    },
    {
        icon: <Construction className="w-8 h-8 text-rose-500 group-hover:scale-110 transition-transform" />,
        title: "02  BUILDER MODE",
        description: "For complex productions. Fully customise every role, equipment, scale and timeline — and get a real-time cost estimate before you commit.",
        linkText: "Build Your Crew →",
        linkHref: "/book",
        className: "bg-gradient-to-br from-white to-rose-50 border-rose-200",
        hasPattern: true,
    },
    {
        icon: <BrainCircuit className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform" />,
        title: "03  AI SCRIPT ANALYSIS",
        description: "Upload your script or brief. Our AI estimates crew size, equipment list, budget and production timeline — saving hours of planning.",
        linkText: "Try AI Planning →",
        linkHref: "/search",
        className: "bg-gradient-to-br from-blue-50 to-white border-blue-200",
        hasPattern: true,
    },
    {
        icon: <Video className="w-8 h-8 text-stone-500 group-hover:scale-110 transition-transform" />,
        title: "04  EQUIPMENT RENTAL",
        description: "Rent cameras, lighting rigs, drones and audio gear from verified providers. All tracked, verified and available in one place.",
        linkText: "Browse Equipment →",
        linkHref: "/search",
        className: "bg-white border-stone-200 shadow-sm",
        hasPattern: false,
    }
];

export const CoreFeatures = () => {
    return (
        <section className="py-32 px-6 relative bg-stone-50">
            <div className="max-w-5xl mx-auto">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-20"
                >
                    <div className="inline-flex items-center px-4 py-2 rounded-full border border-orange-200 bg-white text-orange-600 text-sm font-bold mb-6 tracking-wide uppercase shadow-sm">
                        PLATFORM &middot; 4 CORE MODULES
                    </div>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-stone-900 mb-6 font-display">
                        Everything your production needs.<br className="hidden md:block"/>
                        <span className="text-stone-400">Nothing it doesn&apos;t.</span>
                    </h2>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                    {modules.map((mod, index) => (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            key={index}
                            className={`group p-10 md:p-12 rounded-[2rem] border relative overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-2 ${mod.className}`}
                        >
                            {/* Optional Background Pattern */}
                            {mod.hasPattern && (
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] mix-blend-multiply pointer-events-none" />
                            )}

                            <div className="relative z-10 flex-grow flex flex-col h-full">
                                <div className="w-16 h-16 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-8 border border-stone-100 shadow-sm">
                                    {mod.icon}
                                </div>
                                <h3 className="text-2xl font-bold text-stone-900 mb-4 tracking-tight font-display">
                                    {mod.title}
                                </h3>
                                <p className="text-stone-600 text-lg leading-relaxed font-medium mb-10 flex-grow">
                                    {mod.description}
                                </p>
                                <Link
                                    href={mod.linkHref}
                                    className="inline-flex items-center gap-2 text-stone-900 font-bold hover:text-orange-600 transition-colors group/link mt-auto w-fit"
                                >
                                    {mod.linkText}
                                </Link>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

"use client";
import { Search, IndianRupee, Users, AlertTriangle, Lock, Smartphone, Network, Layers, Globe } from "lucide-react";
import { motion } from "framer-motion";

const problems = [
    {
        icon: <Search className="w-6 h-6 text-stone-500" />,
        title: "No verified talent directory",
        desc: "Discovery depends entirely on referrals. There's no reliable way to find and verify photographers, videographers or studios."
    },
    {
        icon: <IndianRupee className="w-6 h-6 text-stone-500" />,
        title: "Zero price transparency",
        desc: "No standard pricing benchmarks. Clients overpay. Creators underprice. Every booking is a gamble."
    },
    {
        icon: <Users className="w-6 h-6 text-stone-500" />,
        title: "Team assembly nightmare",
        desc: "Multiple vendors, zero coordination, constant friction. Building a crew takes days of back-and-forth."
    },
    {
        icon: <AlertTriangle className="w-6 h-6 text-stone-500" />,
        title: "Credential fraud",
        desc: "Anyone can claim expertise. Clients have no way to verify identity, portfolio authenticity or past work."
    },
    {
        icon: <Lock className="w-6 h-6 text-stone-500" />,
        title: "No payment protection",
        desc: "Payments over cash or UPI offer no platform record. Clients risk losing money. Creators risk not getting paid."
    },
    {
        icon: <Smartphone className="w-6 h-6 text-stone-500" />,
        title: "Workflow chaos",
        desc: "Shoot coordination, contracts, timelines — all happening over WhatsApp with no structure or accountability."
    }
];

const pillars = [
    {
        icon: <Network className="w-8 h-8 text-orange-500" />,
        title: "CONNECT",
        desc: "Verified photographers, videographers, editors, studios and equipment providers — all in one trusted marketplace."
    },
    {
        icon: <Layers className="w-8 h-8 text-rose-500" />,
        title: "STRUCTURE",
        desc: "Secure payments, quality governance, AI planning and reputation tracking at every step of the shoot."
    },
    {
        icon: <Globe className="w-8 h-8 text-blue-500" />,
        title: "SCALE",
        desc: "Built to become India's infrastructure layer for creative production — from Bilaspur to every city."
    }
];

export const ProblemSolution = () => {
    return (
        <section className="py-24 relative overflow-hidden bg-stone-50">
            {/* THE PROBLEM */}
            <div className="max-w-7xl mx-auto px-6 mb-32 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center px-4 py-2 rounded-full border border-stone-200 bg-white text-stone-600 text-sm font-bold mb-6 tracking-wide uppercase shadow-sm">
                        The Problem
                    </div>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-stone-900 mb-6 font-display">
                        India&apos;s <span className="text-orange-600">₹90,000 Cr</span> production<br className="hidden md:block" />
                        industry is completely broken.
                    </h2>
                    <p className="text-xl text-stone-600 max-w-3xl mx-auto font-medium leading-relaxed">
                        Every shoot starts with the same chaos. WhatsApp messages at midnight. Referrals from referrals. Cash payments with no protection.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {problems.map((problem, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white p-8 rounded-[2rem] border border-stone-200 shadow-sm flex flex-col hover:shadow-md hover:border-stone-300 transition-all"
                        >
                            <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center mb-6">
                                {problem.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-stone-900 tracking-tight font-display">{problem.title}</h3>
                            <p className="text-stone-600 text-base leading-relaxed flex-grow">{problem.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* THE SOLUTION */}
            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center px-4 py-2 rounded-full border border-orange-200 bg-orange-50 text-orange-600 text-sm font-bold mb-6 tracking-wide uppercase shadow-sm">
                        The Solution
                    </div>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-stone-900 mb-6 font-display">
                        One platform.<br className="hidden md:block"/>
                        Every production need.
                    </h2>
                    <p className="text-xl text-stone-600 max-w-3xl mx-auto font-medium leading-relaxed">
                        Shotcutcrew transforms an unorganised industry into a structured, reliable, on-demand production ecosystem.
                    </p>
                </motion.div>

                <div className="grid lg:grid-cols-3 gap-8 items-stretch">
                    {pillars.map((pillar, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white p-10 md:p-12 rounded-[2rem] border border-orange-200 shadow-xl shadow-orange-900/5 group hover:-translate-y-2 transition-transform duration-300 relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-rose-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative z-10 h-full flex flex-col">
                                <div className="mb-8">
                                    {pillar.icon}
                                </div>
                                <h3 className="text-2xl font-bold mb-4 text-stone-900 tracking-tight font-display">{pillar.title}</h3>
                                <p className="text-stone-600 text-lg leading-relaxed flex-grow">
                                    {pillar.desc}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

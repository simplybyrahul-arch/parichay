"use client";
import { XCircle, CheckCircle, ChevronRight, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export const ProblemSolution = () => {
    return (
        <section className="py-32 px-6 bg-[#fffcf8] relative overflow-hidden">

            {/* Background decorations (Warm) */}
            <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-rose-200/40 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-amber-200/40 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-6xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    className="text-center mb-20"
                >
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-stone-900 mb-6 font-display">
                        A New Standard for <span className="text-gradient from-orange-600 to-rose-500">Production</span>
                    </h2>
                    <p className="text-xl text-stone-600 max-w-2xl mx-auto font-medium">
                        Say goodbye to the chaos of disorganized hiring and hello to seamless, intelligent collaboration.
                    </p>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-stretch">

                    {/* The Old Way */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="bg-stone-100/80 backdrop-blur-sm p-8 md:p-12 rounded-[2rem] border border-stone-200 flex flex-col h-full grayscale hover:grayscale-0 transition-all duration-500"
                    >
                        <div className="w-16 h-16 bg-stone-200 text-stone-500 rounded-2xl flex items-center justify-center mb-8 border border-stone-300 shadow-inner">
                            <XCircle className="w-8 h-8" strokeWidth={2} />
                        </div>
                        <h3 className="text-3xl font-bold mb-8 text-stone-700 tracking-tight font-display">The Old Way</h3>
                        <ul className="space-y-6 flex-grow">
                            {[
                                "Highly fragmented talent discovery",
                                "Manual, tedious negotiation processes",
                                "Inconsistent income for creators",
                                "Lack of standardized quality assurance"
                            ].map((item, index) => (
                                <li key={index} className="flex items-start gap-4 text-stone-500 text-lg">
                                    <span className="min-w-2 h-2 rounded-full bg-stone-400 mt-2.5 flex-shrink-0" />
                                    <span className="font-medium">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* The ShotcutCrew Way */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="bg-white p-8 md:p-12 rounded-[2rem] border border-orange-200 flex flex-col h-full relative group overflow-hidden shadow-2xl shadow-orange-900/5 hover:shadow-orange-500/10 transition-shadow duration-500"
                    >
                        {/* Subtle Warm Glow on Hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-rose-50 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                        <div className="relative z-10">
                            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-8 border border-orange-200 shadow-sm">
                                <CheckCircle className="w-8 h-8" strokeWidth={2} />
                            </div>
                            <h3 className="text-3xl font-bold mb-8 text-stone-900 tracking-tight font-display">The ShotcutCrew Way</h3>
                            <ul className="space-y-6 flex-grow">
                                {[
                                    "Quick Booking Mode for instant staffing",
                                    "Professional Builder Mode for custom teams",
                                    "Verified portfolios matching your aesthetic",
                                    "Secure, milestone-based escrow payments"
                                ].map((item, index) => (
                                    <li key={index} className="flex items-start gap-4 text-stone-700 text-lg md:text-xl group/item cursor-default">
                                        <CheckCircle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
                                        <span className="font-medium group-hover/item:text-orange-900 transition-colors">{item}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-12 pt-8 border-t border-stone-100">
                                <Link
                                    href="/book"
                                    className="flex items-center gap-2 text-orange-600 font-semibold hover:text-orange-500 transition-colors group/btn"
                                >
                                    Find your crew <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
};

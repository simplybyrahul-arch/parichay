"use client";
import { Search, Construction, CreditCard } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
    {
        icon: <Search className="w-6 h-6 text-blue-400" />,
        title: "1. Discover & Match",
        description: "Our AI engine analyzes your requirements and moodboard to instantly match you with verified creators.",
    },
    {
        icon: <Construction className="w-6 h-6 text-purple-400" />,
        title: "2. Build Your Crew",
        description: "Review portfolios, compare rates, and assemble your entire production team in one structured workspace.",
    },
    {
        icon: <CreditCard className="w-6 h-6 text-emerald-400" />,
        title: "3. Shoot & Pay Securely",
        description: "Manage milestones and release payments only when deliverables meet the standardized quality checks.",
    }
];

export const HowItWorks = () => {
    return (
        <section className="py-32 px-6 bg-white relative">
            <div className="max-w-6xl mx-auto">

                <div className="text-center mb-20 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center px-4 py-2 rounded-full border border-orange-200 bg-orange-50 text-orange-600 text-sm font-bold mb-6 tracking-wide uppercase"
                    >
                        The Process
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl font-black tracking-tight text-stone-900 font-display mb-6"
                    >
                        From concept to wrap <br className="hidden md:block" />
                        <span className="text-stone-400">in three simple steps.</span>
                    </motion.h2>
                </div>

                <div className="relative">
                    {/* Connecting line for desktop */}
                    <div className="hidden md:block absolute top-[4rem] left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-stone-200 to-transparent z-0" />

                    <div className="grid md:grid-cols-3 gap-12 lg:gap-8 relative z-10">
                        {steps.map((step, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.2 }}
                                className="relative group"
                            >
                                {/* Node */}
                                <div className="w-16 h-16 mx-auto bg-stone-50 border-2 border-stone-200 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-stone-200/50 group-hover:-translate-y-2 transition-transform duration-300 relative z-10">
                                    {step.icon}
                                    {/* Glow effect */}
                                    <div className="absolute inset-0 bg-orange-100 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                                </div>

                                {/* Content */}
                                <div className="text-center">
                                    <h3 className="text-2xl font-bold text-stone-800 tracking-tight mb-4 font-display">
                                        {step.title}
                                    </h3>
                                    <p className="text-stone-600 font-medium leading-relaxed">
                                        {step.description}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

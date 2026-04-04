"use client";
import { Search, Construction, CreditCard } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
    {
        icon: <Search className="w-6 h-6 text-blue-400" />,
        title: "01  DISCOVER & MATCH",
        description: "Describe your shoot. Our AI analyses your requirements, style and budget — and instantly matches you with verified, available creators.",
    },
    {
        icon: <Construction className="w-6 h-6 text-purple-400" />,
        title: "02  BUILD YOUR CREW",
        description: "Browse verified portfolios, compare rates and assemble your complete production team in one structured workspace — no WhatsApp needed.",
    },
    {
        icon: <CreditCard className="w-6 h-6 text-emerald-400" />,
        title: "03  SHOOT & PAY SECURELY",
        description: "Funds are held in smart contract escrow and released only when deliverables are confirmed. Your money is protected at every milestone.",
    }
];

export const HowItWorks = () => {
    return (
        <section id="how-it-works" className="py-32 px-6 relative overflow-hidden bg-white">
            <div className="max-w-6xl mx-auto relative z-10">

                <div className="text-center mb-20 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center px-4 py-2 rounded-full border border-orange-200 bg-orange-50 text-orange-600 text-sm font-bold mb-6 tracking-wide uppercase"
                    >
                        THE PROCESS
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-stone-900 font-display mb-6"
                    >
                        From brief to shoot<br className="hidden md:block" />
                        <span className="text-stone-400">in three steps.</span>
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

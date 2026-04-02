"use client";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";

export const TrustSection = () => {
    return (
        <section className="py-24 px-6 relative overflow-hidden bg-transparent">
            <div className="max-w-5xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    className="bg-white p-8 md:p-16 rounded-[2rem] border border-orange-200 relative group overflow-hidden shadow-2xl shadow-orange-900/5 hover:shadow-orange-500/10 transition-shadow duration-500 text-center flex flex-col items-center"
                >
                    {/* Subtle Warm Glow on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-rose-50 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-8 border border-orange-200 shadow-sm">
                            <Shield className="w-8 h-8" strokeWidth={2} />
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold mb-6 text-stone-900 tracking-tight font-display">
                            Why Shotcutcrew is Different
                        </h2>
                        <p className="text-lg md:text-2xl text-stone-600 leading-relaxed max-w-3xl font-medium">
                            Every creator is blockchain-verified. Every payment is smart-contract protected. Every rating is permanently on-chain. No fake reviews. No payment fraud. No WhatsApp chaos.
                        </p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

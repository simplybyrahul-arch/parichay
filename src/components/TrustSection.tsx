"use client";
import { motion } from "framer-motion";
import { Shield, Lock, Star, Cpu } from "lucide-react";

const pillars = [
    {
        icon: <Shield className="w-6 h-6 text-orange-500" />,
        title: "BLOCKCHAIN-VERIFIED IDENTITY",
        desc: "Every creator undergoes KYC and portfolio verification. Credentials are issued as Decentralised Identifiers (DIDs) on the blockchain — tamper-proof and permanently verifiable."
    },
    {
        icon: <Lock className="w-6 h-6 text-rose-500" />,
        title: "SMART CONTRACT ESCROW",
        desc: "All bookings are governed by smart contracts. Client funds are locked in escrow and released only upon verified delivery. Both sides are protected on every shoot."
    },
    {
        icon: <Star className="w-6 h-6 text-amber-500" />,
        title: "IMMUTABLE REPUTATION LEDGER",
        desc: "Every completed shoot, client rating and delivery timestamp is written permanently on-chain. Ratings cannot be manipulated, deleted or faked. Ever."
    },
    {
        icon: <Cpu className="w-6 h-6 text-blue-500" />,
        title: "AI-ANCHORED PLANNING",
        desc: "AI production planning outputs are anchored on-chain for audit and accountability. Every estimate is transparent and traceable."
    }
];

export const TrustSection = () => {
    return (
        <section className="py-32 px-6 relative overflow-hidden bg-stone-900 text-stone-50">
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_80%,rgba(251,146,60,0.1),transparent_42%),radial-gradient(circle_at_80%_20%,rgba(244,114,182,0.05),transparent_38%)]" />

            <div className="max-w-6xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    className="mb-16 md:mb-24 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-8"
                >
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center px-4 py-2 rounded-full border border-stone-700 bg-stone-800 text-stone-300 text-sm font-bold mb-6 tracking-wide uppercase">
                            Why Shotcutcrew is Different
                        </div>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6 font-display text-white">
                            Trust isn&apos;t a feature here.<br />
                            <span className="text-orange-500">It&apos;s the foundation.</span>
                        </h2>
                    </div>
                    <p className="text-lg md:text-xl text-stone-400 max-w-md font-medium leading-relaxed pb-2">
                        Shotcutcrew is powered by Hyperledger Fabric — India&apos;s first blockchain-secured creative production platform.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                    {pillars.map((pillar, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-stone-800/50 backdrop-blur-md p-8 md:p-10 rounded-[2rem] border border-stone-700 hover:border-orange-500/50 transition-colors"
                        >
                            <div className="w-14 h-14 bg-stone-900 rounded-2xl flex items-center justify-center mb-6 border border-stone-700">
                                {pillar.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-4 text-stone-100 tracking-wide font-display">{pillar.title}</h3>
                            <p className="text-stone-400 text-lg leading-relaxed">{pillar.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

"use client";
import { motion } from "framer-motion";
import { BadgeCheck, ClipboardCheck, CreditCard, Network, ShieldCheck, Users } from "lucide-react";

const pillars = [
    {
        icon: <BadgeCheck className="w-6 h-6 text-orange-500" />,
        title: "Verified Creative Professionals",
        desc: "Every creator, studio, and service provider is reviewed before they can receive client bookings."
    },
    {
        icon: <ShieldCheck className="w-6 h-6 text-rose-500" />,
        title: "Parichay Shoot Assurance",
        desc: "For selected shoots, a ShotcutCrew coordinator helps manage communication, verification, and onsite coordination."
    },
    {
        icon: <Users className="w-6 h-6 text-amber-500" />,
        title: "Transparent Booking Flow",
        desc: "Clients can compare interested creators, review profiles, shortlist options, and choose the right professional before confirmation."
    },
    {
        icon: <CreditCard className="w-6 h-6 text-blue-500" />,
        title: "Secure Payment Tracking",
        desc: "Payments are tracked project-wise with proof, verification, and admin visibility for better trust and accountability."
    },
    {
        icon: <Network className="w-6 h-6 text-emerald-500" />,
        title: "Local Production Network",
        desc: "Find photographers, videographers, editors, studios, equipment providers, and production crew based on location and service needs."
    },
    {
        icon: <ClipboardCheck className="w-6 h-6 text-violet-500" />,
        title: "Admin-Monitored Workflow",
        desc: "Bookings, creator responses, payment status, disputes, and coordinator assignments can be monitored by the ShotcutCrew team."
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
                            Why ShotcutCrew is Different
                        </div>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6 font-display text-white">
                            Built for trust from<br />
                            <span className="text-orange-500">booking to delivery.</span>
                        </h2>
                    </div>
                    <p className="text-lg md:text-xl text-stone-400 max-w-md font-medium leading-relaxed pb-2">
                        ShotcutCrew helps clients book verified creative professionals with clear responses, coordinator support, and payment visibility.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {pillars.map((pillar, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ delay: index * 0.08 }}
                            className="bg-stone-800/50 backdrop-blur-md p-8 rounded-[2rem] border border-stone-700 hover:border-orange-500/50 transition-colors"
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

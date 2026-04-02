"use client";
import { CheckCircle, Diamond, Navigation, Users, Building, Video } from "lucide-react";
import { motion } from "framer-motion";

const tiers = [
    {
        icon: <CheckCircle className="w-6 h-6 text-orange-500" />,
        name: "VERIFIED",
        desc: "Identity confirmed. Portfolio authenticated. KYC complete. Ready to book."
    },
    {
        icon: <Diamond className="w-6 h-6 text-rose-500" />,
        name: "PRO",
        desc: "Proven track record. Consistent delivery scores. Priority placement in search results."
    },
    {
        icon: <Navigation className="w-6 h-6 text-purple-500" />,
        name: "ELITE",
        desc: "Top-rated creators. Premium shoots. Maximum visibility and exclusive platform perks."
    }
];

const clients = [
    "Wedding & Event Planners",
    "Brands & SMEs",
    "Advertising Agencies",
    "Influencers & Content Creators",
    "Corporate & Institutions",
    "Production Houses"
];

const creators = [
    "Freelance Photographers",
    "Videographers & DOPs",
    "Editors & Post-production Artists",
    "Studios & Production Companies",
    "Equipment Rental Providers",
    "Specialized Technical Crew"
];

export const CreatorTiersAndAudience = () => {
    return (
        <section className="py-32 px-6 relative overflow-hidden bg-white">
            <div className="max-w-6xl mx-auto relative z-10">

                {/* Creator Tiers Section */}
                <div className="mb-32">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight text-stone-900 mb-6 font-display">
                            A platform built to <span className="text-orange-600">reward quality.</span>
                        </h2>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {tiers.map((tier, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-stone-50 border border-stone-200 p-8 rounded-[2rem] hover:shadow-lg hover:border-orange-200 transition-all flex flex-col items-center text-center"
                            >
                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-stone-100 flex items-center justify-center mb-6">
                                    {tier.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-stone-900 tracking-wide">{tier.name}</h3>
                                <p className="text-stone-600 font-medium leading-relaxed">{tier.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Who It's For Section */}
                <div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight text-stone-900 mb-6 font-display">
                            Built for both sides of production.
                        </h2>
                    </motion.div>

                    <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                        {/* Clients Column */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            className="bg-white p-8 md:p-12 rounded-[2rem] border border-orange-100 shadow-xl shadow-orange-900/5 relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Building className="w-32 h-32 text-orange-600" strokeWidth={1} />
                            </div>
                            <h3 className="text-xl font-bold mb-8 text-stone-400 tracking-wider uppercase font-display relative z-10">For Clients</h3>
                            <ul className="space-y-4 relative z-10">
                                {clients.map((client, i) => (
                                    <li key={i} className="flex items-center gap-3 text-lg font-bold text-stone-800">
                                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                                        {client}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>

                        {/* Creators Column */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            className="bg-stone-900 p-8 md:p-12 rounded-[2rem] border border-stone-800 shadow-xl relative overflow-hidden group text-stone-50"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Video className="w-32 h-32 text-stone-400" strokeWidth={1} />
                            </div>
                            <h3 className="text-xl font-bold mb-8 text-stone-500 tracking-wider uppercase font-display relative z-10">For Creators</h3>
                            <ul className="space-y-4 relative z-10">
                                {creators.map((creator, i) => (
                                    <li key={i} className="flex items-center gap-3 text-lg font-bold text-stone-100">
                                        <div className="w-2 h-2 rounded-full bg-stone-500" />
                                        {creator}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    </div>
                </div>

            </div>
        </section>
    );
};

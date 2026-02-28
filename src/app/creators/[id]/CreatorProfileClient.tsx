"use client";

import { Star, MapPin, CheckCircle, Video, Play, Award, Zap, Shield } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

export default function CreatorProfileClient({ creator }: { creator: Record<string, any> }) {
    return (
        <main className="min-h-screen bg-[#fffcf8] selection:bg-orange-500/30">
            {/* Cover Image */}
            <div className="relative h-[40vh] md:h-[50vh] w-full overflow-hidden">
                <div className="absolute inset-0 bg-stone-900/30 z-10" />
                <Image
                    src={creator.coverImage}
                    alt="Cover"
                    fill
                    className="object-cover"
                    priority
                />
                {/* Navigation Bar integration area (transparent) */}
                <div className="absolute top-0 w-full p-6 z-20 flex justify-between items-center text-white">
                    {/* Logo placeholder */}
                    <div className="font-display font-black text-2xl tracking-tight">PARICHAY.</div>
                    <button
                        onClick={() => window.location.href = '/dashboard'}
                        className="px-5 py-2 backdrop-blur-md bg-white/20 hover:bg-white/30 rounded-full font-medium transition-colors text-sm border border-white/30 hidden sm:block"
                    >
                        Back to Search
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 relative z-20 -mt-24 sm:-mt-32 pb-32">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                    {/* LEFT COLUMN: Profile Info & Booking panel */}
                    <div className="lg:col-span-1 space-y-8">
                        {/* Main Info Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-3xl p-8 border border-stone-100 shadow-xl shadow-stone-200/50 relative overflow-hidden"
                        >
                            {/* Avatar */}
                            <div className="relative w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden mb-6 bg-stone-100">
                                <Image src={creator.avatar} alt={creator.name} fill className="object-cover" />
                            </div>

                            {/* Name & Badge */}
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-black text-stone-900 font-display tracking-tight">{creator.name}</h1>
                                {creator.verified && (
                                    <div className="bg-green-100 text-green-700 p-1 rounded-full" title="Verified Creator">
                                        <CheckCircle className="w-5 h-5" />
                                    </div>
                                )}
                            </div>

                            {/* Role & Location */}
                            <p className="text-lg text-stone-600 font-medium mb-4">{creator.role}</p>
                            <div className="flex items-center gap-2 text-stone-500 text-sm mb-6">
                                <MapPin className="w-4 h-4" />
                                {creator.location}
                            </div>

                            {/* Trust Stats */}
                            <div className="flex items-center gap-6 pb-6 border-b border-stone-100 mb-6">
                                <div className="flex items-center gap-1.5 text-stone-800 font-bold">
                                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                                    <span>{creator.rating}</span>
                                    <span className="text-stone-400 font-normal">({creator.reviews})</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-stone-800 font-bold">
                                    <Award className="w-5 h-5 text-orange-500" />
                                    <span>Top 5%</span>
                                </div>
                            </div>

                            <p className="text-stone-600 leading-relaxed text-sm mb-8">
                                {creator.bio}
                            </p>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2 mb-8">
                                {creator.tags.map((tag: string, i: number) => (
                                    <span key={i} className="px-3 py-1 bg-stone-50 border border-stone-200 text-stone-600 text-xs font-semibold rounded-full">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            {/* Booking CTA (Sticky conceptually on mobile) */}
                            <button
                                onClick={() => window.location.href = '/book'}
                                className="w-full py-4 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95"
                            >
                                <Zap className="w-5 h-5" />
                                Request to Book
                            </button>
                            <div className="mt-4 flex items-center justify-center gap-2 text-stone-400 text-xs font-medium">
                                <Shield className="w-4 h-4" />
                                Payments protected by Parichay Escrow
                            </div>
                        </motion.div>

                        {/* Micro Stats Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-3xl p-6 border border-stone-100 flex justify-between text-center"
                        >
                            <div>
                                <div className="text-xs text-stone-400 font-semibold uppercase tracking-wider mb-1">Jobs</div>
                                <div className="text-xl font-bold text-stone-900">{creator.stats.jobsCompleted}</div>
                            </div>
                            <div className="w-px bg-stone-100" />
                            <div>
                                <div className="text-xs text-stone-400 font-semibold uppercase tracking-wider mb-1">Repeat</div>
                                <div className="text-xl font-bold text-stone-900">{creator.stats.repeatClients}</div>
                            </div>
                            <div className="w-px bg-stone-100" />
                            <div>
                                <div className="text-xs text-stone-400 font-semibold uppercase tracking-wider mb-1">Response</div>
                                <div className="text-lg font-bold text-stone-900 pt-0.5">{creator.stats.responseTime}</div>
                            </div>
                        </motion.div>
                    </div>

                    {/* RIGHT COLUMN: Portfolio & Services */}
                    <div className="lg:col-span-2 space-y-12 sm:mt-32">

                        {/* Portfolio Grid */}
                        <section>
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-black text-stone-900 font-display tracking-tight">Featured Work</h3>
                                <button className="text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors">View All</button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {creator.portfolio.map((item: Record<string, any>, index: number) => (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.1 * index }}
                                        key={item.id}
                                        className={`group relative rounded-2xl overflow-hidden bg-stone-100 cursor-pointer ${index === 0 ? 'sm:col-span-2 sm:h-[400px]' : 'h-[250px]'}`}
                                    >
                                        <Image src={item.url} alt={item.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-6 text-center">
                                            {item.type === 'video' ? <Play className="w-12 h-12 text-white/80 mb-3" /> : <div className="w-12 h-12 mb-3" />}
                                            <h4 className="text-white font-bold text-lg leading-tight translate-y-4 group-hover:translate-y-0 transition-transform duration-300">{item.title}</h4>
                                        </div>

                                        {/* Type Indicator */}
                                        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 text-white text-xs font-semibold">
                                            {item.type === 'video' ? <Video className="w-3.5 h-3.5" /> : <div className="w-3 h-3 rounded-sm bg-white/80" />}
                                            {item.type === 'video' ? 'Video' : 'Image'}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </section>

                        {/* Services & Pricing Tab */}
                        <section>
                            <h3 className="text-2xl font-black text-stone-900 font-display tracking-tight mb-8">Services & Rates</h3>
                            <div className="space-y-4">
                                {creator.services.map((service: Record<string, any>, index: number) => (
                                    <div key={index} className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-orange-200 transition-colors cursor-pointer group">
                                        <div>
                                            <h4 className="font-bold text-stone-900 text-lg mb-1 group-hover:text-orange-600 transition-colors">{service.name}</h4>
                                            <p className="text-stone-500 text-sm">Estimated format: {service.time}</p>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <div className="font-black text-2xl text-stone-900 tracking-tight font-display">{service.price}</div>
                                            <div className="text-xs text-stone-400 font-medium">Starting rate</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                    </div>

                </div>
            </div>
        </main>
    );
}

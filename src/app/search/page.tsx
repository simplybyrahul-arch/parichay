"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Search, MapPin, Star, SlidersHorizontal, ChevronDown, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { createClient } from "@/utils/supabase/client";

const roles = ["All Roles", "Director", "Director of Photography", "Camera Operator", "Video Editor", "Drone Operator", "Production Assistant"];

type Creator = {
    id: string;
    name: string;
    role: string;
    location: string;
    rating: number;
    reviews: number;
    rate: number;
    verified: boolean;
    image: string;
    tags: string[];
};

export default function SearchPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRole, setSelectedRole] = useState("All Roles");
    const [maxRate, setMaxRate] = useState(50000);
    const [showFilters, setShowFilters] = useState(false);
    const supabase = createClient();

    // SWR Data Fetcher
    const fetchCreators = async (): Promise<Creator[]> => {
        // Fetch creators and join with users to get full_name
        const { data, error } = await supabase
            .from('creators')
            .select(`
                id,
                role,
                location,
                day_rate,
                verified,
                tags,
                profile_image_url,
                users ( full_name )
            `);

        if (error) throw error;

        if (data && data.length > 0) {
            // Map Supabase data to component structure
            return data.map((c: Record<string, unknown>) => ({
                id: c.id as string,
                name: (c.users as { full_name?: string })?.full_name || "Unknown Creator",
                role: c.role as string,
                location: c.location as string,
                rating: 0,
                reviews: 0,
                rate: Number(c.day_rate) || 0,
                verified: Boolean(c.verified),
                image: (c.profile_image_url as string) || "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80",
                tags: (c.tags as string[]) || []
            }));
        }

        return [];
    };

    const { data: creators = [], isValidating: loading } = useSWR(
        'search-creators',
        fetchCreators,
        {
            fallbackData: []
        }
    );

    // Filter Logic
    const filteredCreators = creators.filter((creator: Creator) => {
        const matchesQuery = creator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (creator.tags && creator.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase())));
        const matchesRole = selectedRole === "All Roles" || creator.role === selectedRole;
        const matchesRate = creator.rate <= maxRate;

        return matchesQuery && matchesRole && matchesRate;
    });

    return (
        <main className="min-h-screen bg-[#fdfbfb] selection:bg-orange-500/30">
            <Header />

            {/* Page Header */}
            <div className="pt-32 pb-12 px-6 bg-white border-b border-stone-200">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-black text-stone-900 font-display tracking-tight mb-4">
                        Find the perfect <span className="text-orange-600">Creator.</span>
                    </h1>
                    <p className="text-lg text-stone-600 max-w-2xl">
                        Search thousands of verified professionals by role, location, or specialized skills to assemble your next production crew.
                    </p>

                    {/* Main Search Bar */}
                    <div className="mt-8 flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-grow max-w-2xl">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                            <input
                                type="text"
                                placeholder="Search 'Commercial DOP' or 'Color Grading'..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-6 py-4 rounded-2xl border border-stone-200 bg-stone-50 text-stone-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-shadow shadow-sm"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`px-6 py-4 rounded-2xl border font-bold flex items-center gap-2 transition-colors ${showFilters ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'}`}
                        >
                            <SlidersHorizontal className="w-5 h-5" />
                            Filters
                        </button>
                    </div>

                    {/* Expandable Filters Area */}
                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                    {/* Role Filter */}
                                    <div>
                                        <label className="block text-sm font-bold text-stone-700 mb-2">Role</label>
                                        <div className="relative">
                                            <select
                                                aria-label="Role"
                                                title="Role"
                                                value={selectedRole}
                                                onChange={(e) => setSelectedRole(e.target.value)}
                                                className="w-full p-3 rounded-xl border border-stone-200 bg-white text-stone-900 appearance-none focus:border-orange-500 focus:outline-none"
                                            >
                                                {roles.map(role => <option key={role} value={role}>{role}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Rate Filter */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-sm font-bold text-stone-700">Max Day Rate</label>
                                            <span className="text-sm font-semibold text-orange-600">₹{maxRate.toLocaleString()}</span>
                                        </div>
                                        <input
                                            aria-label="Maximum day rate"
                                            title="Maximum day rate"
                                            type="range"
                                            min="5000"
                                            max="100000"
                                            step="5000"
                                            value={maxRate}
                                            onChange={(e) => setMaxRate(Number(e.target.value))}
                                            className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                                        />
                                        <div className="flex justify-between text-xs text-stone-400 mt-2">
                                            <span>₹5k</span>
                                            <span>₹100k+</span>
                                        </div>
                                    </div>

                                    {/* Location Filter */}
                                    <div>
                                        <label className="block text-sm font-bold text-stone-700 mb-2">Location</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                                            <select aria-label="Location" title="Location" className="w-full pl-9 pr-3 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 appearance-none focus:border-orange-500 focus:outline-none">
                                                <option>Any Location (India)</option>
                                                <option>Mumbai</option>
                                                <option>Delhi NCR</option>
                                                <option>Bengaluru</option>
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>
            </div>

            {/* Results Grid */}
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-xl font-bold text-stone-900 font-display">
                        {loading ? "Loading..." : `${filteredCreators.length} ${filteredCreators.length === 1 ? 'Creator' : 'Creators'} Found`}
                    </h2>
                    <div className="text-sm font-medium text-stone-500 flex items-center gap-2">
                        Sort by: <span className="text-stone-900 font-bold cursor-pointer">Relevance</span> <ChevronDown className="w-4 h-4" />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                    </div>
                ) : filteredCreators.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-stone-200 border-dashed">
                        <Search className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-stone-900 mb-2 font-display">No creators found</h3>
                        <p className="text-stone-500">Try adjusting your filters or search terms.</p>
                        <button
                            onClick={() => { setSearchQuery(""); setSelectedRole("All Roles"); setMaxRate(50000); }}
                            className="mt-6 px-6 py-2 bg-orange-100 text-orange-600 font-bold rounded-full hover:bg-orange-200 transition-colors"
                        >
                            Clear all filters
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                        {filteredCreators.map((creator: Creator) => (
                            <Link
                                key={creator.id}
                                href={`/creators/${creator.id}`}
                                className="block"
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="bg-white rounded-[2rem] border border-stone-200 overflow-hidden hover:border-orange-300 hover:shadow-xl hover:shadow-orange-500/10 transition-all cursor-pointer group flex flex-col"
                                >
                                {/* Img Header */}
                                <div className="h-48 relative overflow-hidden bg-stone-100 flex-shrink-0">
                                    <Image src={creator.image} alt={creator.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                    {creator.verified && (
                                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-green-700 flex items-center gap-1 shadow-sm">
                                            <CheckCircle className="w-3.5 h-3.5" /> Verified
                                        </div>
                                    )}
                                </div>

                                {/* Card Body */}
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-bold text-xl text-stone-900 font-display group-hover:text-orange-600 transition-colors line-clamp-1">{creator.name}</h3>
                                            <p className="text-sm font-medium text-stone-500">{creator.role}</p>
                                        </div>
                                        <div className="flex items-center gap-1 bg-stone-50 px-2 py-1 rounded-lg border border-stone-100">
                                            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                                            <span className="text-sm font-bold text-stone-700">{creator.rating}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-stone-400 text-xs mb-6">
                                        <MapPin className="w-3.5 h-3.5" /> {creator.location}
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {creator.tags && creator.tags.map((tag: string, i: number) => (
                                            <span key={i} className="px-2.5 py-1 bg-stone-50 text-stone-600 rounded-lg text-xs font-medium border border-stone-100">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Footer */}
                                    <div className="mt-auto pt-4 border-t border-stone-100 flex items-center justify-between">
                                        <div>
                                            <div className="text-xs text-stone-400 font-medium">Day Rate</div>
                                            <div className="font-bold text-stone-900">₹{creator.rate.toLocaleString()}</div>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                        </div>
                                    </div>
                                </div>
                                </motion.div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

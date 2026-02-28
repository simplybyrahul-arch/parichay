"use client";
import { Sparkles, Trophy, Star, CheckCircle, Flame, Shield, Heart } from "lucide-react";

// Assuming these are the brands we want to show based on the previous generic strings
// Updated to objects to match the component map logic while safely displaying an icon
const brands = [
    { name: "Verified Parichay Creators", icon: <CheckCircle className="w-5 h-5 text-green-500" /> },
    { name: "Leading Design Agencies", icon: <Star className="w-5 h-5 text-yellow-500" /> },
    { name: "Top-Tier Production Houses", icon: <Trophy className="w-5 h-5 text-orange-500" /> },
    { name: "Award Winning DOPs", icon: <Flame className="w-5 h-5 text-orange-500" /> },
    { name: "Trusted Global Brands", icon: <Shield className="w-5 h-5 text-blue-500" /> },
    { name: "1M+ Happy Clients", icon: <Heart className="w-5 h-5 text-rose-500" /> },
];

export const SocialProof = () => {
    return (
        <section className="py-20 border-y border-stone-100 bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">
                <p className="text-center text-sm font-semibold text-stone-400 uppercase tracking-widest mb-10 font-display">
                    Trusted by leading creative agencies & brands
                </p>

                {/* Marquee Container with light gradient masks */}
                <div className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
                    <div className="flex w-max animate-marquee items-center gap-16 md:gap-24 shrink-0 py-4">
                        {[...brands, ...brands, ...brands, ...brands].map((brand, index) => (
                            <div
                                key={index}
                                className="text-stone-400 hover:text-stone-800 transition-colors duration-300 flex items-center gap-3 cursor-pointer grayscale hover:grayscale-0 shrink-0"
                            >
                                {brand.icon}
                                <span className="text-xl md:text-2xl font-bold tracking-tight font-display whitespace-nowrap">{brand.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

"use client";

import { ShieldCheck } from "lucide-react";

export const SocialProof = () => {
    return (
        <section className="py-8 bg-white border-y border-stone-200">
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-center">
                <div className="flex items-center gap-3 text-stone-600 font-medium text-sm md:text-base">
                    <ShieldCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="tracking-wide">
                        145+ Verified Creators &middot; Bilaspur, Chhattisgarh &middot; Powered by Parichay Production
                    </span>
                </div>
            </div>
        </section>
    );
};

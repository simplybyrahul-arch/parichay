"use client";

import { ShieldCheck } from "lucide-react";

export const SocialProof = () => {
    return (
        <section className="py-8 bg-white border-y border-stone-200">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center gap-4 text-center md:text-left">
                <span className="text-stone-500 font-bold uppercase tracking-wider text-sm">
                    Trusted by clients across:
                </span>
                <div className="flex flex-wrap justify-center items-center gap-3 text-stone-600 font-medium text-sm md:text-base">
                    <span>Weddings & Events</span>
                    <span className="text-stone-300">&middot;</span>
                    <span>Corporate Shoots</span>
                    <span className="text-stone-300">&middot;</span>
                    <span>Brand Films</span>
                    <span className="text-stone-300">&middot;</span>
                    <span>Equipment Rentals</span>
                    <span className="text-stone-300">&middot;</span>
                    <span>Product Photography</span>
                </div>
            </div>
        </section>
    );
};

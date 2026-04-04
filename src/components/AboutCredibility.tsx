"use client";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";

export const AboutCredibility = () => {
    return (
        <section id="about" className="py-32 px-6 relative overflow-hidden bg-stone-50">
            <div className="max-w-5xl mx-auto relative z-10 flex flex-col md:flex-row items-stretch gap-12 lg:gap-20">
                
                {/* Left side text */}
                <div className="flex-1">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                    >
                        <div className="inline-flex items-center px-4 py-2 rounded-full border border-stone-200 bg-white text-stone-600 text-sm font-bold mb-6 tracking-wide uppercase shadow-sm">
                            OUR STORY
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight text-stone-900 mb-8 font-display">
                            Built by people who&apos;ve lived this problem firsthand.
                        </h2>
                        
                        <div className="space-y-6 text-lg text-stone-600 font-medium leading-relaxed">
                            <p>
                                Shotcutcrew was born out of Parichay Production Pvt Ltd — a production company that has been executing real shoots across Bilaspur, Chhattisgarh for over <strong className="text-stone-900 font-bold">8 years</strong>.
                            </p>
                            <p>
                                Weddings. Corporate shoots. Brand films. Equipment rentals. We&apos;ve coordinated every kind of production — and experienced every pain point that comes with it.
                            </p>
                            <p className="text-2xl text-stone-900 font-bold font-display mt-8 mb-8 border-l-4 border-orange-500 pl-6 py-2">
                                &quot;We didn&apos;t research this problem.<br />
                                We lived it. That&apos;s why we built Shotcutcrew.&quot;
                            </p>
                        </div>
                    </motion.div>
                </div>

                {/* Right side founder card */}
                <motion.div
                    initial={{ opacity: 0, x: 20, rotate: 2 }}
                    whileInView={{ opacity: 1, x: 0, rotate: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    className="flex-1 md:max-w-sm flex shrink-0"
                >
                    <div className="bg-white p-10 rounded-[2rem] border border-orange-100 shadow-xl shadow-orange-900/5 relative overflow-hidden group w-full flex flex-col justify-center">
                        <div className="absolute -top-6 -right-6 text-orange-50 opacity-50 group-hover:scale-110 transition-transform duration-500">
                            <Quote size={120} className="fill-orange-50 text-transparent" />
                        </div>
                        
                        <div className="relative z-10 flex flex-col items-center text-center">
                            {/* Founder Avatar placeholder, optional */}
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-200 to-rose-200 mb-6 flex items-center justify-center border-4 border-white shadow-sm overflow-hidden">
                                <span className="text-2xl font-bold font-display text-orange-700">RT</span>
                            </div>
                            
                            <h3 className="text-2xl font-black text-stone-900 tracking-tight font-display mb-2">Rahul Raj Tiwari</h3>
                            <p className="text-orange-600 font-bold tracking-wide uppercase text-sm mb-6">Founder & CEO</p>
                            
                            <div className="w-full h-px bg-stone-100 mb-6" />
                            
                            <p className="text-stone-500 font-medium text-sm flex flex-col gap-1">
                                <span>8+ years in media production</span>
                                <span>Bilaspur, Chhattisgarh</span>
                            </p>
                        </div>
                    </div>
                </motion.div>
                
            </div>
        </section>
    );
};

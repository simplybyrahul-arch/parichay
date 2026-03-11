"use client";
import { ArrowRight, Twitter, Instagram, Linkedin, Globe } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import Link from "next/link";

export const Footer = () => {
    return (
        <footer className="bg-stone-50 pt-24 pb-12 px-6 border-t border-stone-200">
            <div className="max-w-7xl mx-auto">

                {/* Pre-Footer CTA (Light Glassmorphism) */}
                <div className="bg-white rounded-3xl p-10 md:p-16 mb-20 relative overflow-hidden text-center border border-orange-100 shadow-xl shadow-orange-900/5">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-rose-50/50 pointer-events-none" />

                    <div className="relative z-10 max-w-2xl mx-auto">
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight text-stone-900 mb-6 font-display">
                            Ready to redefine your <br />
                            <span className="text-gradient from-orange-600 to-rose-500">production process?</span>
                        </h2>
                        <p className="text-stone-600 text-lg mb-8 font-medium">
                            Join thousands of verified creators and agencies building the future of media production on ShotcutCrew.
                        </p>

                        <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto relative group">
                            <input
                                suppressHydrationWarning
                                type="email"
                                placeholder="Enter your email"
                                className="flex-grow px-6 py-4 rounded-full bg-stone-50 border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-all shadow-sm"
                                required
                            />
                            <button
                                suppressHydrationWarning
                                type="submit"
                                className="px-8 py-4 bg-stone-900 text-white font-bold rounded-full hover:bg-stone-800 transition-all flex items-center justify-center gap-2"
                            >
                                Get Started
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>

                {/* Main Footer Links */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 mb-16">
                    <div className="col-span-2 lg:col-span-2">
                        <div className="mb-6">
                            <BrandLogo href="/" width={220} height={62} className="h-auto w-[180px] md:w-[220px]" />
                        </div>
                        <p className="text-stone-500 leading-relaxed max-w-xs mb-8">
                            The AI-enabled marketplace connecting visionary brands with world-class creative talent.
                        </p>
                        <div className="flex items-center gap-4">
                            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" title="Twitter" aria-label="Twitter" className="hover:text-orange-500 transition-colors"><Twitter className="w-5 h-5" /></a>
                            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" title="Instagram" aria-label="Instagram" className="hover:text-orange-500 transition-colors"><Instagram className="w-5 h-5" /></a>
                            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" title="LinkedIn" aria-label="LinkedIn" className="hover:text-orange-500 transition-colors"><Linkedin className="w-5 h-5" /></a>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold text-stone-900 mb-4 tracking-wide font-display">Platform</h4>
                        <ul className="space-y-3">
                            <li><Link href="/book" className="text-stone-500 hover:text-orange-600 transition-colors">Quick Booking</Link></li>
                            <li><Link href="/book" className="text-stone-500 hover:text-orange-600 transition-colors">Builder Mode</Link></li>
                            <li><Link href="/search" className="text-stone-500 hover:text-orange-600 transition-colors">AI Matchmaking</Link></li>
                            <li><Link href="/pricing" className="text-stone-500 hover:text-orange-600 transition-colors">Pricing</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-stone-900 mb-4 tracking-wide font-display">Company</h4>
                        <ul className="space-y-3">
                            <li><Link href="/about" className="text-stone-500 hover:text-orange-600 transition-colors">About Us</Link></li>
                            <li><Link href="/careers" className="text-stone-500 hover:text-orange-600 transition-colors">Careers</Link></li>
                            <li><Link href="/blog" className="text-stone-500 hover:text-orange-600 transition-colors">Blog</Link></li>
                            <li><Link href="/contact" className="text-stone-500 hover:text-orange-600 transition-colors">Contact</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-stone-900 mb-4 tracking-wide font-display">Legal</h4>
                        <ul className="space-y-3">
                            <li><Link href="/terms" className="text-stone-500 hover:text-orange-600 transition-colors">Terms of Service</Link></li>
                            <li><Link href="/privacy" className="text-stone-500 hover:text-orange-600 transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/cookies" className="text-stone-500 hover:text-orange-600 transition-colors">Cookie Policy</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Copyright */}
                <div className="pt-8 border-t border-stone-200 flex flex-col md:flex-row items-center justify-between text-stone-400 text-sm gap-4">
                    <p>© {new Date().getFullYear()} ShotcutCrew. All rights reserved.</p>
                    <div className="flex gap-6">
                        <span className="flex items-center gap-1.5 hover:text-stone-700 cursor-pointer transition-colors">
                            <Globe className="w-4 h-4" />
                            English (US)
                        </span>
                    </div>
                </div>

            </div>
        </footer>
    );
};

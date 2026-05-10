"use client";
import { ArrowRight, Twitter, Instagram, Linkedin, Globe } from "lucide-react";
import Link from "next/link";

export const Footer = () => {
    return (
        <footer className="bg-stone-50 pt-24 pb-12 px-6 border-t border-stone-200">
            <div className="max-w-7xl mx-auto">

                {/* Pre-Footer Final CTA */}
                <div className="bg-white rounded-3xl p-10 md:p-16 mb-20 relative overflow-hidden text-center border border-orange-100 shadow-xl shadow-orange-900/5">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-rose-50/50 pointer-events-none" />

                    <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight text-stone-900 mb-6 font-display">
                            Ready to build your <br className="hidden md:block" />
                            <span className="text-gradient from-orange-600 to-rose-500">production?</span>
                        </h2>
                        <p className="text-stone-600 text-lg md:text-xl font-medium mb-10 leading-relaxed">
                            Join India&apos;s first verified, blockchain-powered<br className="hidden md:block" />
                            creative production marketplace.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 mb-8">
                            <Link
                                href="/book"
                                className="px-8 py-4 bg-orange-600 text-white font-bold rounded-full hover:bg-orange-700 transition-all flex items-center justify-center gap-2 group shadow-md shadow-orange-500/20 active:scale-95"
                            >
                                Book a Crew
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                href="/signup"
                                className="px-8 py-4 bg-stone-900 text-white font-bold rounded-full hover:bg-stone-800 transition-all flex items-center justify-center gap-2 group active:scale-95"
                            >
                                Join as Creator
                            </Link>
                        </div>
                        <p className="text-sm font-semibold text-stone-500 tracking-wide">
                            Verified creators &middot; Secure payments &middot; AI-powered planning
                        </p>
                    </div>
                </div>

                {/* Main Footer Links */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 mb-16">
                    <div className="col-span-2 lg:col-span-2">
                        <div className="mb-6 font-black text-2xl tracking-tighter text-stone-900">
                            SHOTCUTCREW™
                        </div>
                        <p className="text-stone-500 leading-relaxed max-w-sm mb-4">
                            The AI-enabled marketplace connecting clients with India&apos;s verified creative production professionals.
                        </p>
                        <p className="text-stone-600 text-sm font-medium mb-8">
                            A brand of Parichay Production Pvt Ltd &middot; Bilaspur, Chhattisgarh
                        </p>
                        <div className="space-y-2 mb-8">
                            <p className="flex items-center gap-2 text-stone-500 hover:text-stone-800 font-medium transition-colors">
                                📧 <a href="mailto:rahul@shotcutcrew.com">rahul@shotcutcrew.com</a>
                            </p>
                            <p className="flex items-center gap-2 text-stone-500 hover:text-stone-800 font-medium transition-colors">
                                📞 <a href="tel:+919691912205">+91 9691912205</a>
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" title="Twitter" aria-label="Twitter" className="text-stone-400 hover:text-orange-500 transition-colors"><Twitter className="w-5 h-5" /></a>
                            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" title="Instagram" aria-label="Instagram" className="text-stone-400 hover:text-orange-500 transition-colors"><Instagram className="w-5 h-5" /></a>
                            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" title="LinkedIn" aria-label="LinkedIn" className="text-stone-400 hover:text-orange-500 transition-colors"><Linkedin className="w-5 h-5" /></a>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold text-stone-900 mb-4 tracking-wide font-display">Platform</h4>
                        <ul className="space-y-3">
                            <li><Link href="/book" className="text-stone-500 hover:text-orange-600 transition-colors">Quick Booking</Link></li>
                            <li><Link href="/book" className="text-stone-500 hover:text-orange-600 transition-colors">Builder Mode</Link></li>
                            <li><Link href="/search" className="text-stone-500 hover:text-orange-600 transition-colors">AI Script Analysis</Link></li>
                            <li><Link href="/search" className="text-stone-500 hover:text-orange-600 transition-colors">Equipment Rental</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-stone-900 mb-4 tracking-wide font-display">Company</h4>
                        <ul className="space-y-3">
                            <li><Link href="#about" className="text-stone-500 hover:text-orange-600 transition-colors">About Us</Link></li>
                            <li><Link href="/careers" className="text-stone-500 hover:text-orange-600 transition-colors">Careers</Link></li>
                            <li><Link href="/blog" className="text-stone-500 hover:text-orange-600 transition-colors">Blog</Link></li>
                            <li><Link href="/contact" className="text-stone-500 hover:text-orange-600 transition-colors">Contact Us</Link></li>
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
                    <p>© 2025 Shotcutcrew &middot; Parichay Production Pvt Ltd &middot; All rights reserved.</p>
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

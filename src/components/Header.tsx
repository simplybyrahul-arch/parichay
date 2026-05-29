"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export const Header = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [dashboardUrl, setDashboardUrl] = useState("/dashboard");

    useEffect(() => {
        const checkUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setIsLoggedIn(true);
                const accountType = user.user_metadata?.account_type;
                setDashboardUrl(
                    accountType === 'creator'
                        ? '/creator-dashboard'
                        : accountType === 'equipment_vendor'
                            ? '/vendor-dashboard'
                            : accountType === 'admin'
                                ? '/admin'
                                : '/dashboard'
                );
            }
        };
        checkUser();
    }, []);

    return (
        <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between bg-white/40 backdrop-blur-md border-b border-stone-200/50">
            <Link href="/" className="text-xl md:text-2xl font-black tracking-tight text-stone-900 hover:text-orange-600 transition-colors">
                ShotcutCrew
            </Link>
            <div className="hidden md:flex items-center gap-8 mx-6 text-sm font-bold text-stone-600">
                <Link href="/book" className="hover:text-orange-600 transition-colors">Find Creators</Link>
                <Link href="/equipment" className="hover:text-orange-600 transition-colors">Find Equipment</Link>
                <Link href="#how-it-works" className="hover:text-orange-600 transition-colors">How It Works</Link>
                <Link href="/signup" className="hover:text-orange-600 transition-colors">For Creators</Link>
                <Link href="#about" className="hover:text-orange-600 transition-colors">About</Link>
            </div>
            
            <div className="flex items-center gap-4">
                {isLoggedIn ? (
                    <Link href={dashboardUrl} className="text-sm font-bold bg-stone-900 text-white px-5 py-2.5 rounded-full hover:bg-stone-800 transition-colors shadow-sm">
                        Go to Dashboard
                    </Link>
                ) : (
                    <>
                        <Link href="/login" className="hidden sm:block text-sm font-bold text-stone-700 hover:text-stone-900 transition-colors">
                            Login
                        </Link>
                        <Link href="/book" className="text-sm font-bold bg-orange-600 text-white px-5 py-2.5 rounded-full hover:bg-orange-700 transition-colors shadow-sm flex items-center gap-1.5 group">
                            Book a Crew <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                        </Link>
                    </>
                )}
            </div>
        </header>
    );
};

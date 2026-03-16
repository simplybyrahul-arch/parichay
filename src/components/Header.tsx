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
                setDashboardUrl(user.user_metadata?.account_type === 'creator' ? '/creator-dashboard' : '/dashboard');
            }
        };
        checkUser();
    }, []);

    return (
        <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between bg-white/40 backdrop-blur-md border-b border-stone-200/50">
            <Link href="/" className="text-xl md:text-2xl font-black tracking-tight text-stone-900 hover:text-orange-600 transition-colors">
                ShotcutCrew
            </Link>
            <div className="flex items-center gap-4">
                <Link href="/search" className="text-stone-500 hover:text-orange-500 transition-colors hidden sm:flex items-center gap-2 text-sm font-bold bg-stone-50 px-4 py-2 rounded-full border border-stone-200 hover:border-orange-200">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    Find Creators
                </Link>
                {isLoggedIn ? (
                    <Link href={dashboardUrl} className="text-sm font-bold bg-stone-900 text-white px-5 py-2.5 rounded-full hover:bg-stone-800 transition-colors shadow-sm">
                        Go to Dashboard
                    </Link>
                ) : (
                    <>
                        <Link href="/login" className="text-sm font-bold text-stone-700 hover:text-stone-900 transition-colors">
                            Login
                        </Link>
                        <Link href="/signup" className="text-sm font-bold bg-stone-900 text-white px-5 py-2.5 rounded-full hover:bg-stone-800 transition-colors shadow-sm">
                            Sign Up
                        </Link>
                    </>
                )}
            </div>
        </header>
    );
};

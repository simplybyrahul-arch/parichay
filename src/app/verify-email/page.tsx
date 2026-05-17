"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";
import { resendVerificationEmail } from "@/app/actions/auth";
import { BrandLogo } from "@/components/BrandLogo";

export default function VerifyEmailPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const resend = async () => {
        setMessage("");
        setError("");
        setLoading(true);

        const data = new FormData();
        data.append("email", email);
        const result = await resendVerificationEmail(data);
        setLoading(false);

        if (result.success) {
            setMessage(result.message);
        } else {
            setError(result.message);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-[#fffcf8] px-6 py-24">
            <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-[2rem] shadow-2xl shadow-stone-200/50 border border-stone-100 text-center">
                <BrandLogo href="/" width={200} height={58} className="h-auto w-[180px] mx-auto mb-8" priority />
                <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-5">
                    <Mail className="w-7 h-7" />
                </div>
                <h1 className="text-3xl font-black tracking-tight text-stone-900 mb-3 font-display">Check your email</h1>
                <p className="text-stone-600 font-medium leading-relaxed">
                    Verify your account before logging in or using your dashboard.
                </p>

                <div className="mt-6 space-y-3">
                    <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="hello@example.com"
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-stone-900"
                    />
                    <button
                        type="button"
                        onClick={resend}
                        disabled={loading || !email.trim()}
                        className="w-full rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60"
                    >
                        {loading ? "Sending..." : "Resend verification email"}
                    </button>
                </div>

                {message && <div className="mt-4 rounded-xl bg-green-50 border border-green-100 p-3 text-sm font-semibold text-green-700">{message}</div>}
                {error && <div className="mt-4 rounded-xl bg-red-50 border border-red-100 p-3 text-sm font-semibold text-red-600">{error}</div>}

                <Link href="/login" className="mt-8 inline-flex items-center justify-center gap-2 text-sm font-bold text-orange-600 hover:text-orange-700">
                    Go to Login <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </main>
    );
}

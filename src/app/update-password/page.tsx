"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Lock } from "lucide-react";
import { updatePassword } from "../actions/auth";
import { BrandLogo } from "@/components/BrandLogo";
import { validatePasswordStrength } from "@/utils/auth-security";

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setErrorMsg("");
        setSuccessMsg("");

        if (password !== confirmPassword) {
            setErrorMsg("Passwords do not match.");
            return;
        }

        const passwordError = validatePasswordStrength(password);
        if (passwordError) {
            setErrorMsg(passwordError);
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append("password", password);
        formData.append("confirmPassword", confirmPassword);
        const result = await updatePassword(formData);
        setLoading(false);

        if (!result.success) {
            setErrorMsg(result.message);
            return;
        }

        setPassword("");
        setConfirmPassword("");
        setSuccessMsg(result.message);
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-[#fffcf8] px-6 py-24">
            <section className="w-full max-w-md rounded-[2rem] border border-stone-100 bg-white p-8 shadow-2xl shadow-stone-200/50">
                <div className="mb-8 text-center">
                    <BrandLogo href="/" width={220} height={64} className="mx-auto h-auto w-[180px] md:w-[220px]" priority />
                    <h1 className="mt-8 text-2xl font-black tracking-tight text-stone-900 font-display">Set a new password</h1>
                    <p className="mt-2 text-sm font-medium text-stone-500">Use a strong password you do not use elsewhere.</p>
                </div>

                {errorMsg && (
                    <div className="mb-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-600">
                        {errorMsg}
                    </div>
                )}

                {successMsg && (
                    <div className="mb-5 rounded-xl border border-green-100 bg-green-50 p-4 text-sm font-medium text-green-700">
                        <CheckCircle2 className="mr-2 inline h-4 w-4" />
                        {successMsg}
                    </div>
                )}

                {!successMsg ? (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <PasswordField
                            label="New password"
                            value={password}
                            showPassword={showPassword}
                            onToggle={() => setShowPassword((value) => !value)}
                            onChange={setPassword}
                        />
                        <PasswordField
                            label="Confirm new password"
                            value={confirmPassword}
                            showPassword={showPassword}
                            onToggle={() => setShowPassword((value) => !value)}
                            onChange={setConfirmPassword}
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-4 font-bold text-white shadow-lg shadow-orange-500/20 transition-colors hover:bg-orange-700 disabled:pointer-events-none disabled:opacity-70"
                        >
                            {loading ? "Updating..." : <>Update Password <ArrowRight className="h-5 w-5" /></>}
                        </button>
                    </form>
                ) : (
                    <Link href="/login" className="flex w-full items-center justify-center rounded-xl bg-stone-900 px-6 py-4 text-sm font-bold text-white transition-colors hover:bg-stone-800">
                        Go to Login
                    </Link>
                )}
            </section>
        </main>
    );
}

function PasswordField({
    label,
    value,
    showPassword,
    onToggle,
    onChange,
}: {
    label: string;
    value: string;
    showPassword: boolean;
    onToggle: () => void;
    onChange: (value: string) => void;
}) {
    return (
        <div>
            <label className="mb-1.5 block text-sm font-bold text-stone-700">{label}</label>
            <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                <input
                    type={showPassword ? "text" : "password"}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    minLength={10}
                    required
                    placeholder="Min. 10 chars, uppercase, lowercase, number"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 py-4 pl-12 pr-12 text-stone-900 transition-colors focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                <button
                    type="button"
                    onClick={onToggle}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-stone-400 transition-colors hover:text-stone-600"
                >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
            </div>
        </div>
    );
}

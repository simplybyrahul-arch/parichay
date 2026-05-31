"use client";

import { useEffect, useMemo, useState } from "react";

type LaunchCountdownProps = {
    launchAt: string | null;
    isConfigured: boolean;
};

type TimeLeft = {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
};

function getTimeLeft(targetMs: number | null): TimeLeft {
    if (!targetMs) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const remainingMs = Math.max(0, targetMs - Date.now());
    const totalSeconds = Math.floor(remainingMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { days, hours, minutes, seconds };
}

export function LaunchCountdown({ launchAt, isConfigured }: LaunchCountdownProps) {
    const targetMs = useMemo(() => {
        if (!launchAt) return null;
        const parsed = Date.parse(launchAt);
        return Number.isFinite(parsed) ? parsed : null;
    }, [launchAt]);
    const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => getTimeLeft(targetMs));

    useEffect(() => {
        const interval = window.setInterval(() => setTimeLeft(getTimeLeft(targetMs)), 1000);
        return () => window.clearInterval(interval);
    }, [targetMs]);

    const timerItems = [
        { label: "Days", value: timeLeft.days },
        { label: "Hours", value: timeLeft.hours },
        { label: "Minutes", value: timeLeft.minutes },
        { label: "Seconds", value: timeLeft.seconds },
    ];

    return (
        <main className="min-h-screen overflow-hidden bg-[#fffcf8] text-stone-950 selection:bg-orange-500/30">
            <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(255,244,230,0.96)_0%,rgba(255,250,244,0.92)_44%,rgba(255,247,240,0.98)_100%)]" />
            <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(251,146,60,0.18),transparent_28%),radial-gradient(circle_at_84%_16%,rgba(244,114,182,0.11),transparent_26%),radial-gradient(circle_at_50%_90%,rgba(251,191,36,0.12),transparent_30%)]" />
            <div className="launch-3d-stage pointer-events-none fixed inset-0 overflow-hidden">
                <div className="launch-3d-grid absolute left-1/2 top-[58%] h-[34rem] w-[68rem] -translate-x-1/2 rounded-[4rem] border border-orange-200/45 bg-[linear-gradient(90deg,rgba(251,146,60,0.12)_1px,transparent_1px),linear-gradient(0deg,rgba(251,146,60,0.12)_1px,transparent_1px)] bg-[size:4rem_4rem] shadow-[0_90px_180px_rgba(124,45,18,0.18)]" />
                <div className="launch-3d-ring absolute left-[8%] top-[18%] h-44 w-44 rounded-full border-[18px] border-orange-300/25 shadow-[0_30px_80px_rgba(234,88,12,0.18)]" />
                <div className="launch-3d-ring launch-3d-ring-slow absolute right-[8%] top-[16%] h-56 w-56 rounded-full border-[22px] border-stone-900/10 shadow-[0_36px_90px_rgba(41,37,36,0.18)]" />
                <div className="launch-3d-panel absolute left-[7%] bottom-[16%] h-32 w-52 rounded-[1.75rem] border border-white/70 bg-white/35 shadow-[0_40px_90px_rgba(124,45,18,0.18)] backdrop-blur-md" />
                <div className="launch-3d-panel launch-3d-panel-alt absolute right-[10%] bottom-[18%] h-40 w-64 rounded-[2rem] border border-orange-200/60 bg-orange-100/35 shadow-[0_45px_100px_rgba(194,65,12,0.2)] backdrop-blur-md" />
                <div className="launch-3d-chip absolute left-[18%] top-[54%] h-16 w-16 rounded-2xl bg-stone-950/85 shadow-[0_28px_70px_rgba(41,37,36,0.3)]" />
                <div className="launch-3d-chip launch-3d-chip-alt absolute right-[22%] top-[56%] h-20 w-20 rounded-3xl bg-orange-500/85 shadow-[0_28px_70px_rgba(234,88,12,0.35)]" />
            </div>

            <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-6 py-12 text-center">
                <div className="mb-8 inline-flex items-center rounded-full border border-orange-200 bg-white/80 px-5 py-2 text-sm font-black uppercase tracking-[0.22em] text-orange-600 shadow-sm backdrop-blur-md">
                    ShotcutCrew
                </div>

                <h1 className="max-w-4xl text-5xl font-black tracking-tight text-stone-950 sm:text-6xl lg:text-7xl font-display">
                    ShotcutCrew launches soon
                </h1>
                <p className="mt-6 max-w-2xl text-lg font-semibold leading-relaxed text-stone-600 sm:text-xl">
                    India&apos;s creative production marketplace is getting ready.
                </p>

                <div className="mt-12 grid w-full max-w-4xl grid-cols-2 gap-4 [perspective:1200px] sm:grid-cols-4">
                    {timerItems.map((item) => (
                        <div
                            key={item.label}
                            className="launch-countdown-card rounded-[1.5rem] border border-white/70 bg-white/75 p-6 shadow-[0_30px_80px_rgba(124,45,18,0.15)] backdrop-blur-xl"
                        >
                            <div className="text-4xl font-black tabular-nums tracking-tight text-stone-950 sm:text-5xl">
                                {String(item.value).padStart(2, "0")}
                            </div>
                            <div className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-orange-600">
                                {item.label}
                            </div>
                        </div>
                    ))}
                </div>

                {!isConfigured && (
                    <p className="mt-8 max-w-xl rounded-2xl border border-orange-100 bg-white/80 px-5 py-4 text-sm font-semibold text-stone-600">
                        Launch timing is being finalized. Please check back soon.
                    </p>
                )}

                <p className="mt-12 text-xl font-black tracking-tight text-stone-900 sm:text-2xl">
                    Plan. Assemble. Execute. On Demand.
                </p>
            </section>
        </main>
    );
}

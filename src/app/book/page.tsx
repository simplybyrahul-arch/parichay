"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Settings, ArrowRight, UserPlus, FileText, CheckCircle, Plus, Minus, Trash2, CalendarDays } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function BookingFlow() {
    const [mode, setMode] = useState<"selection" | "quick" | "builder" | "checkout">("selection");
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    // User State
    const [clientId, setClientId] = useState<string | null>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setClientId(user.id);
        };
        getUser();
    }, [supabase.auth]);


    // Builder Mode State
    const [crew, setCrew] = useState<Array<{ id: string, name: string, rate: number, count: number }>>([]);
    const [days, setDays] = useState(1);

    const availableRoles = [
        { id: "dir", name: "Director", rate: 25000 },
        { id: "dop", name: "Director of Photography", rate: 20000 },
        { id: "cam", name: "Camera Operator", rate: 12000 },
        { id: "edit", name: "Video Editor", rate: 15000 },
        { id: "drone", name: "Drone Operator", rate: 18000 },
        { id: "pa", name: "Production Assistant", rate: 5000 },
        { id: "audio", name: "Sound Mixer", rate: 10000 }
    ];

    const handleAddRole = (role: { id: string, name: string, rate: number }) => {
        setCrew(prev => {
            const ext = prev.find(r => r.id === role.id);
            if (ext) return prev.map(r => r.id === role.id ? { ...r, count: r.count + 1 } : r);
            return [...prev, { ...role, count: 1 }];
        });
    };

    const handleRemoveRole = (id: string, entirely = false) => {
        setCrew(prev => {
            const ext = prev.find(r => r.id === id);
            if (ext && ext.count > 1 && !entirely) return prev.map(r => r.id === id ? { ...r, count: r.count - 1 } : r);
            return prev.filter(r => r.id !== id);
        });
    };

    const totalCost = crew.reduce((acc, curr) => acc + (curr.rate * curr.count), 0) * days;
    const platformFee = totalCost * 0.10; // 10% platform fee
    const grandTotal = totalCost + platformFee;

    // Supabase Booking Execution
    const handleBuilderBooking = async () => {
        if (!clientId) {
            toast.error("You must be logged in to request a crew.");
            router.push('/login');
            return;
        }

        setIsSubmitting(true);
        const description = `Custom Crew Build | Duration: ${days} days | Roles: ${crew.map(c => `${c.count}x ${c.name}`).join(', ')}`;

        try {
            const { error } = await supabase.from('projects').insert({
                client_id: clientId,
                title: "Custom Crew Request",
                description: description,
                budget: grandTotal,
                status: "pending"
            });

            if (error) throw error;
            toast.success("Crew request submitted successfully!");
            router.push('/dashboard');
        } catch (error: unknown) {
            toast.error((error as Error).message || "Failed to submit request.");
            setIsSubmitting(false);
        }
    };

    const handleQuickBooking = async () => {
        if (!clientId) {
            toast.error("You must be logged in to book.");
            router.push('/login');
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('projects').insert({
                client_id: clientId,
                title: "Quick Booking Request",
                description: "AI Match Request for solo professional.",
                budget: 25000, // Safe default mock budget for quick
                status: "pending"
            });

            if (error) throw error;
            setStep(3); // Move to success step visually
        } catch (error: unknown) {
            toast.error((error as Error).message || "Failed to process quick booking.");
        } finally {
            setIsSubmitting(false);
        }
    };


    // Reusable Step Indicator Component
    const StepIndicator = ({ current, total }: { current: number, total: number }) => (
        <div className="flex items-center gap-2 mb-8">
            {Array.from({ length: total }).map((_, i) => (
                <div
                    key={i}
                    className={`h-2 flex-grow rounded-full transition-colors duration-300 ${i + 1 <= current ? 'bg-orange-500' : 'bg-stone-200'}`}
                />
            ))}
        </div>
    );

    return (
        <main className="min-h-screen bg-[#fffcf8] selection:bg-orange-500/30 pt-24 pb-32 px-6 flex flex-col items-center">

            {/* Top Navigation / Breadcrumb area */}
            <div className="w-full max-w-5xl mx-auto flex justify-between items-center mb-8 md:mb-12">
                <div onClick={() => router.push('/')} className="font-display font-black text-2xl tracking-tight text-stone-900 cursor-pointer">PARICHAY.</div>
                {mode !== "selection" && (
                    <button onClick={() => { setMode("selection"); setStep(1); }} className="text-sm font-semibold text-stone-500 hover:text-stone-900 transition-colors">
                        Cancel Booking
                    </button>
                )}
            </div>

            <div className="w-full max-w-5xl mx-auto flex-grow flex flex-col justify-center">
                <AnimatePresence mode="wait">

                    {/* ====== MODE SELECTION ====== */}
                    {mode === "selection" && (
                        <motion.div
                            key="selection"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="text-center"
                        >
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-stone-900 mb-6 font-display">
                                How do you want to <span className="text-gradient from-orange-600 to-rose-500">build your team?</span>
                            </h1>
                            <p className="text-lg text-stone-600 mb-16 max-w-2xl mx-auto">
                                Choose the booking path that fits your project needs. Hire a single expert instantly, or hand-pick a custom verified crew.
                            </p>

                            <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-3xl mx-auto text-left">
                                {/* Quick Booking Option */}
                                <div
                                    onClick={() => setMode("quick")}
                                    className="bg-white p-8 rounded-[2rem] border-2 border-transparent hover:border-orange-500 cursor-pointer group transition-all duration-300 shadow-xl shadow-stone-200/50 relative overflow-hidden flex flex-col h-full"
                                >
                                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <Zap className="w-32 h-32" />
                                    </div>
                                    <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-6">
                                        <Zap className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-2xl font-black text-stone-900 mb-3 font-display">Quick Booking</h3>
                                    <p className="text-stone-600 font-medium mb-8 flex-grow">
                                        Need a single photographer, videographer, or editor instantly? Get AI-matched options in seconds.
                                    </p>
                                    <div className="flex items-center text-orange-600 font-bold gap-2 group-hover:gap-3 transition-all">
                                        Start Quick Booking <ArrowRight className="w-5 h-5" />
                                    </div>
                                </div>

                                {/* Builder Mode Option */}
                                <div
                                    onClick={() => setMode("builder")}
                                    className="bg-white p-8 rounded-[2rem] border-2 border-transparent hover:border-rose-500 cursor-pointer group transition-all duration-300 shadow-xl shadow-stone-200/50 relative overflow-hidden flex flex-col h-full"
                                >
                                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <Settings className="w-32 h-32" />
                                    </div>
                                    <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
                                        <Settings className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-2xl font-black text-stone-900 mb-3 font-display">Builder Mode</h3>
                                    <p className="text-stone-600 font-medium mb-8 flex-grow">
                                        Building a full production crew? Add specific roles to your roster with real-time budget estimations.
                                    </p>
                                    <div className="flex items-center text-rose-600 font-bold gap-2 group-hover:gap-3 transition-all">
                                        Start Builder Mode <ArrowRight className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ====== QUICK BOOKING FLOW ====== */}
                    {mode === "quick" && (
                        <motion.div
                            key="quick"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="max-w-2xl mx-auto w-full bg-white p-8 md:p-12 rounded-[2rem] shadow-xl shadow-stone-200/50 border border-stone-100"
                        >
                            <StepIndicator current={step} total={3} />

                            {step === 1 && (
                                <div className="space-y-8">
                                    <div>
                                        <h2 className="text-3xl font-black text-stone-900 mb-2 font-display">What role do you need?</h2>
                                        <p className="text-stone-500">Select the primary creative professional required for your project.</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {["Photographer", "Videographer", "Drone Operator", "Video Editor"].map((role) => (
                                            <div key={role} onClick={() => setStep(2)} className="p-4 border border-stone-200 rounded-xl text-center font-bold text-stone-700 hover:border-orange-500 hover:bg-orange-50 cursor-pointer transition-colors active:scale-95">
                                                {role}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-8">
                                    <div>
                                        <h2 className="text-3xl font-black text-stone-900 mb-2 font-display">Project Details</h2>
                                        <p className="text-stone-500">Help our AI match you with the perfect professional.</p>
                                    </div>
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-bold text-stone-700 mb-1.5">Project Type</label>
                                            <select defaultValue="" className="w-full p-4 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500">
                                                <option value="" disabled hidden>Select project type...</option>
                                                <option value="Commercial Ad" className="text-stone-900">Commercial Ad</option>
                                                <option value="Corporate Event" className="text-stone-900">Corporate Event</option>
                                                <option value="Documentary" className="text-stone-900">Documentary</option>
                                                <option value="Music Video" className="text-stone-900">Music Video</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-stone-700 mb-1.5">Date</label>
                                                <input type="date" className="w-full p-4 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:border-orange-500 focus:outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-stone-700 mb-1.5">Budget (₹)</label>
                                                <select defaultValue="" className="w-full p-4 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:border-orange-500 focus:outline-none">
                                                    <option value="" disabled hidden>Select budget...</option>
                                                    <option value="10k - 25k" className="text-stone-900">10k - 25k</option>
                                                    <option value="25k - 50k" className="text-stone-900">25k - 50k</option>
                                                    <option value="50k - 1L" className="text-stone-900">50k - 1L</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleQuickBooking}
                                        disabled={isSubmitting}
                                        className="w-full py-4 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isSubmitting ? "Processing..." : "Find Matches"} <SparklesIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-8 text-center pt-8">
                                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle className="w-10 h-10" />
                                    </div>
                                    <h2 className="text-3xl font-black text-stone-900 mb-2 font-display">Request Submitted!</h2>
                                    <p className="text-stone-500 max-w-sm mx-auto">
                                        Our AI is scanning verified profiles. We will notify you with the top 3 matches within the next hour.
                                    </p>
                                    <button onClick={() => router.push('/dashboard')} className="w-full py-4 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 transition-colors mt-8">
                                        View Dashboard
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ====== BUILDER MODE FLOW ====== */}
                    {mode === "builder" && (
                        <motion.div
                            key="builder"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="w-full grid lg:grid-cols-3 gap-8"
                        >
                            {/* Left Column: Role Selection */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-stone-200/50 border border-stone-100">
                                    <div className="flex justify-between items-end mb-8">
                                        <div>
                                            <h2 className="text-3xl font-black text-stone-900 mb-2 font-display">Build Your Crew</h2>
                                            <p className="text-stone-500">Select the roles you need for your production.</p>
                                        </div>
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {availableRoles.map(role => (
                                            <div key={role.id} className="p-4 border border-stone-200 rounded-2xl flex items-center justify-between hover:border-orange-200 hover:bg-orange-50/50 transition-colors group">
                                                <div>
                                                    <h4 className="font-bold text-stone-900 group-hover:text-orange-600 transition-colors">{role.name}</h4>
                                                    <p className="text-sm font-medium text-stone-500">₹{role.rate.toLocaleString()}/day</p>
                                                </div>
                                                <button
                                                    onClick={() => handleAddRole(role)}
                                                    className="w-10 h-10 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center hover:bg-orange-600 hover:text-white transition-all active:scale-95"
                                                >
                                                    <Plus className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Timeline Setting */}
                                <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-stone-200/50 border border-stone-100">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
                                            <CalendarDays className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-stone-900 font-display">Production Timeline</h3>
                                            <p className="text-sm text-stone-500">How many days will the crew be needed?</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setDays(Math.max(1, days - 1))} className="w-12 h-12 rounded-xl border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50 active:scale-95">
                                            <Minus className="w-5 h-5" />
                                        </button>
                                        <div className="flex-1 text-center py-3 bg-stone-50 rounded-xl border border-stone-200 font-bold text-stone-900 text-xl">
                                            {days} {days === 1 ? 'Day' : 'Days'}
                                        </div>
                                        <button onClick={() => setDays(days + 1)} className="w-12 h-12 rounded-xl border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50 active:scale-95">
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Dynamic Cost Estimator */}
                            <div className="lg:col-span-1">
                                <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-stone-200/50 border border-stone-100 sticky top-24">
                                    <h3 className="text-xl font-black text-stone-900 mb-6 font-display">Crew Cart</h3>

                                    {crew.length === 0 ? (
                                        <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                                            <p className="text-stone-500 font-medium">Your crew list is empty.</p>
                                            <p className="text-xs text-stone-400 mt-1">Add roles from the left to see estimates.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 mb-8">
                                            {crew.map(member => (
                                                <div key={member.id} className="flex items-center justify-between pb-4 border-b border-stone-100 last:border-0 last:pb-0">
                                                    <div>
                                                        <div className="font-bold text-stone-900 text-sm">{member.name}</div>
                                                        <div className="text-xs text-stone-500">₹{member.rate.toLocaleString()}/day</div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-2 bg-stone-50 px-2 py-1 rounded-lg border border-stone-200">
                                                            <button onClick={() => handleRemoveRole(member.id)} className="text-stone-400 hover:text-stone-900 p-1"><Minus className="w-3 h-3" /></button>
                                                            <span className="text-xs font-bold text-stone-900 w-3 text-center">{member.count}</span>
                                                            <button onClick={() => handleAddRole(member)} className="text-stone-400 hover:text-stone-900 p-1"><Plus className="w-3 h-3" /></button>
                                                        </div>
                                                        <button onClick={() => handleRemoveRole(member.id, true)} className="text-rose-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-colors">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Cost Breakdown */}
                                    <div className="bg-stone-50 p-6 rounded-2xl mb-6">
                                        <div className="flex justify-between text-sm mb-3">
                                            <span className="text-stone-500 font-medium">Crew Subtotal ({days} days)</span>
                                            <span className="font-bold text-stone-900">₹{totalCost.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm mb-4 pb-4 border-b border-stone-200">
                                            <span className="text-stone-500 font-medium">Platform Fee (10%)</span>
                                            <span className="font-bold text-stone-900">₹{platformFee.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-stone-900 font-black font-display">Est. Total</span>
                                            <span className="text-2xl font-black text-rose-600 font-display">₹{grandTotal.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <button
                                        disabled={crew.length === 0 || isSubmitting}
                                        onClick={handleBuilderBooking}
                                        className="w-full py-4 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 group"
                                    >
                                        {isSubmitting ? "Processing..." : "Request Crew"} {!isSubmitting && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </main>
    );
}

// Helper icon component since Sparkles is used heavily in AI contexts
const SparklesIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

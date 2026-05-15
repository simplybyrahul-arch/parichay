"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
    {
        question: "How are creators verified on Shotcutcrew?",
        answer: "Every creator goes through profile, portfolio, and service review before being listed for client bookings.",
    },
    {
        question: "How does advance payment work?",
        answer: "After you select a creator, payment is collected securely through Razorpay test or live mode depending on your environment. Automated settlement, refunds and smart-contract release are future platform workflows.",
    },
    {
        question: "Can I book a full production crew at once?",
        answer: "Yes. Use Builder Mode to assemble a complete crew, including DOP, photographer, editor and equipment, and get a real-time cost estimate before you confirm.",
    },
    {
        question: "How does AI Script Analysis work?",
        answer: "Upload your script or production brief. Our AI reads the requirements and outputs an estimated crew size, equipment list, timeline and budget in seconds.",
    },
    {
        question: "Is Shotcutcrew available outside Bilaspur?",
        answer: "We're launching in Bilaspur, Chhattisgarh first, then scaling to major metros and nationally. Sign up to be notified when we launch in your city.",
    },
    {
        question: "I'm a creator. How do I join?",
        answer: "Click \"Join as Creator\", complete your profile and verification, and you'll be live on the platform. Top-rated creators get priority placement and premium shoot opportunities.",
    }
];

export const FAQ = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section className="py-32 px-6 relative overflow-hidden">
            <div className="max-w-4xl mx-auto relative z-10">

                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight text-stone-900 mb-4 font-display">
                        Frequently Asked Questions
                    </h2>
                    <p className="text-lg text-stone-600 font-medium">
                        Everything you need to know about production on ShotcutCrew.
                    </p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => {
                        const isOpen = openIndex === index;

                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className={`border rounded-2xl overflow-hidden transition-colors duration-300 shadow-sm ${isOpen ? "bg-white/90 border-orange-200" : "bg-white/65 border-stone-200 hover:border-orange-300"
                                    }`}
                            >
                                <button
                                    suppressHydrationWarning
                                    onClick={() => setOpenIndex(isOpen ? null : index)}
                                    className="w-full px-6 py-6 flex items-center justify-between text-left gap-4"
                                >
                                    <span className={`text-lg font-bold transition-colors duration-300 font-display tracking-wide ${isOpen ? "text-stone-900" : "text-stone-700"}`}>
                                        {faq.question}
                                    </span>
                                    <motion.div
                                        animate={{ rotate: isOpen ? 180 : 0 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isOpen ? "bg-orange-100 text-orange-600" : "bg-stone-200 text-stone-500"}`}
                                    >
                                        <ChevronDown className="w-5 h-5" />
                                    </motion.div>
                                </button>

                                <AnimatePresence initial={false}>
                                    {isOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                        >
                                            <div className="px-6 pb-6 pt-2 text-stone-600 leading-relaxed font-medium border-t border-stone-100 mt-2">
                                                {faq.answer}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>

            </div>
        </section>
    );
};

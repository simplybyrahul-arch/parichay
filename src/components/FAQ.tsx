"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
    {
        question: "How are creators vetted on ShotcutCrew?",
        answer: "Every creator goes through a 3-step verification process focusing on portfolio quality, client references, and professional reliability before they are listed on our marketplace.",
    },
    {
        question: "Does ShotcutCrew handle the payments?",
        answer: "Yes. Payments are held securely in escrow and released upon completion of agreed-upon milestones, protecting both the client and the creator.",
    },
    {
        question: "How does the Style-Matching AI work?",
        answer: "When you upload a moodboard or visual references, our engine analyzes coloring, composition, and thematic elements to surface creators whose past work aligns perfectly with your vision.",
    },
    {
        question: "Can I book a full crew at once?",
        answer: "Absolutely. Our Builder Mode allows you to select a Director, DOP, Gaffers, and Editors, then coordinates their availability to streamline the entire hiring process.",
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

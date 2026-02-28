"use client";

import { motion } from "framer-motion";

export const DynamicBackground = () => {
    return (
        <motion.div
            className="fixed inset-0 z-0 w-full min-h-screen pointer-events-none"
            style={{ willChange: "background" }}
            animate={{
                background: [
                    "linear-gradient(to bottom, #ffecd2 0%, #fcb69f 100%)",    // Dawn (Soft Peach/Pink)
                    "linear-gradient(to bottom, #fdfbfb 0%, #ebedee 100%)",    // Morning (Bright/Crisp)
                    "linear-gradient(to bottom, #ff9a44 0%, #fc6076 100%)",    // Sunset (Vibrant Orange/Red)
                    "linear-gradient(to bottom, #ffd194 0%, #70e1f5 100%)",    // Golden Hour (Gold to Blue)
                    "linear-gradient(to bottom, #ffecd2 0%, #fcb69f 100%)",    // Dawn (loop back smoothly)
                ],
            }}
            transition={{
                duration: 30, // Slow, smooth transition
                ease: "linear",
                repeat: Infinity,
            }}
        />
    );
};

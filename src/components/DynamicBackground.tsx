"use client";

import { motion } from "framer-motion";

export const DynamicBackground = () => {
    return (
        <motion.div
            className="fixed inset-0 z-0 w-full min-h-screen pointer-events-none"
            style={{ willChange: "background" }}
            animate={{
                background: [
                    "linear-gradient(to bottom, #ffecd2 0%, #fcb69f 100%)",
                    "linear-gradient(to bottom, #fdfbfb 0%, #ebedee 100%)",
                    "linear-gradient(to bottom, #ff9a44 0%, #fc6076 100%)",
                    "linear-gradient(to bottom, #ffd194 0%, #70e1f5 100%)",
                    "linear-gradient(to bottom, #ffecd2 0%, #fcb69f 100%)",
                ],
            }}
            transition={{
                duration: 30,
                ease: "linear",
                repeat: Infinity,
            }}
        />
    );
};

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  angle: (i / 20) * 360,
  distance: 60 + Math.random() * 60,
  color: ["#f472b6", "#a78bfa", "#fb923c", "#34d399", "#60a5fa", "#fbbf24"][
    i % 6
  ],
}));

export default function FireworksEffect({ visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
        >
          {/* Center burst */}
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute w-16 h-16 rounded-full bg-pink-300"
          />
          {/* Particles */}
          {PARTICLES.map((p) => {
            const rad = (p.angle * Math.PI) / 180;
            const x = Math.cos(rad) * p.distance;
            const y = Math.sin(rad) * p.distance;
            return (
              <motion.div
                key={p.id}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x, y, opacity: 0, scale: 0.3 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute w-3 h-3 rounded-full"
                style={{ backgroundColor: p.color }}
              />
            );
          })}
          {/* Big emoji */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.4, ease: "backOut" }}
            className="text-5xl"
          >
            ✨
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

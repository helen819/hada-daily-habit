import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CharmReveal({ charm, onSave, onClose }) {
  if (!charm) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 15, stiffness: 200 }}
          className="bg-white rounded-3xl w-80 p-8 shadow-2xl text-center relative"
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-300 hover:text-gray-500">
            <X className="w-5 h-5" />
          </button>

          {/* Particles */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              animate={{
                opacity: 0,
                x: (Math.random() - 0.5) * 200,
                y: (Math.random() - 0.5) * 200,
                scale: 0,
              }}
              transition={{ duration: 1.5, delay: i * 0.05 }}
              className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-yellow-400"
            />
          ))}

          <div className="mb-4">
            <motion.div
              animate={{ rotate: [0, -5, 5, -5, 0] }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-6xl mb-4"
            >
              {charm.emoji}
            </motion.div>
            <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2">오늘의 부적</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{charm.name}</h2>
            <p className="text-sm text-purple-600 font-medium mb-1">{charm.effect}</p>
            <p className="text-xs text-gray-400">{charm.source}</p>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-5">
            <p className="text-xs text-amber-700 leading-relaxed">
              이 물건을 오늘 하루 가까이 두거나, 눈에 잘 띄는 곳에 놓아보세요.
            </p>
          </div>

          <Button
            onClick={onSave}
            className="w-full rounded-xl h-12 bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-semibold border-0"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            내 보관함에 저장
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
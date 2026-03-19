import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CharmReveal({ charm, onSave, onClose }) {
  // 뒤 배경 스크롤 막기
  useEffect(() => {
    if (charm) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [charm]);

  if (!charm) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 15, stiffness: 200 }}
          className="bg-white dark:bg-[#2E3447] rounded-3xl w-80 border border-transparent dark:border-[#424B63] relative flex flex-col shadow-2xl"
          style={{
            maxHeight: "80vh",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 text-gray-300 dark:text-slate-400 hover:text-gray-500 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* 파티클 */}
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

          {/* 스크롤 가능한 내용 영역 */}
          <div className="overflow-y-auto flex-1 p-8 text-center">
            {/* 행운 내용 */}
            <div className="mb-4">
              <motion.div
                animate={{ rotate: [0, -5, 5, -5, 0] }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-6xl mb-4"
              >
                {charm.emoji}
              </motion.div>
              <p className="text-xs font-bold text-purple-400 dark:text-purple-300 uppercase tracking-widest mb-2">
                오늘의 행운
              </p>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {charm.name}
              </h2>
              <p className="text-sm text-purple-600 dark:text-purple-300 font-medium mb-1">
                {charm.effect}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-400">
                {charm.source}
              </p>
            </div>

            {/* 안내 박스 */}
            <div className="bg-amber-50 dark:bg-amber-800/25 border border-amber-100 dark:border-amber-600/40 rounded-2xl p-4 mb-5">
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                이 물건을 오늘 하루 가까이 두거나, 눈에 잘 띄는 곳에 놓아보세요.
              </p>
            </div>
          </div>
          {/* 저장 버튼 — 하단 고정 */}
          <div className="p-6 pt-0 shrink-0">
            <Button
              onClick={onSave}
              className="w-full rounded-xl h-12 bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-semibold border-0 hover:from-purple-600 hover:to-pink-600"
            >
              <Sparkles className="w-4 h-4 mr-2" />내 보관함에 저장
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

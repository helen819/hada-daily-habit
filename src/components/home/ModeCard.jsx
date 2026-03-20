import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Leaf } from "lucide-react";

export default function ModeCard({ data, onDismiss, onSelect }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  if (!visible || !data) return null;

  const handleDismiss = () => {
    onDismiss?.();
    setVisible(false);
  };
  const handleSelectMode = (mode) => {
    onSelect?.(mode);
    handleDismiss();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleDismiss();
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white dark:bg-[#2E3447] rounded-[32px] w-full max-w-[320px] p-8 relative border border-white/20 dark:border-[#4A5270] shqadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 닫기 버튼 */}
            <button
              onClick={handleDismiss}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 dark:bg-[#1A1F2E] text-gray-400 dark:text-slate-400 active:scale-90 transition-transform"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 아이콘 + 라벨 */}
            <div className="flex items-center gap-2 mb-4">
              {data.suggested_mode === "action" ? (
                <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-700/50 flex items-center justify-center mb-4">
                  <Zap className="w-7 h-7 text-purple-600 dark:text-purple-200 fill-purple-600 dark:fill-purple-200" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-700/50 flex items-center justify-center mb-4">
                  <Leaf className="w-7 h-7 text-green-600 dark:text-green-200 fill-green-600 dark:fill-green-200" />
                </div>
              )}
              <p className="text-sm font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                모드 추천
              </p>
            </div>

            {/* 제목 */}
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-3 leading-tight break-keep">
              {data.card_title}
            </h2>

            {/* 본문 */}
            <p className="text-sm text-gray-500 dark:text-slate-300 leading-relaxed break-keep font-medium mb-10">
              {data.card_body}{" "}
              <span
                className={`font-bold ${
                  data.suggested_mode === "action"
                    ? "text-purple-500 dark:text-purple-300"
                    : "text-green-500 dark:text-green-300"
                }`}
              >
                {data.suggested_mode === "action"
                  ? "'활동 모드'"
                  : "'회복 모드'"}
              </span>
              를 추천합니다.
            </p>

            {/* 선택 버튼 */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleSelectMode("action")}
                className="w-full h-14 rounded-2xl bg-purple-50 dark:bg-purple-700/40 text-purple-600 dark:text-purple-200 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-purple-100 dark:hover:bg-purple-700/60 border border-transparent dark:border-purple-600/40"
              >
                <Zap className="w-4 h-4 fill-purple-600 dark:fill-purple-200" />
                활동 모드
              </button>

              <button
                onClick={() => handleSelectMode("restore")}
                className="w-full h-14 rounded-2xl bg-green-50 dark:bg-green-700/40 text-green-600 dark:text-green-200 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-green-100 dark:hover:bg-green-700/60 border border-transparent dark:border-green-600/40"
              >
                <Leaf className="w-4 h-4 fill-green-600 dark:fill-green-200" />
                회복 모드
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

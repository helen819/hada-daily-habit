import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdModal({
  visible,
  onClose,
  closeLabel = "닫고 행운 받기 ✨",
}) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!visible) return;
    setCountdown(5);
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          className="bg-white dark:bg-[#2E3447] rounded-3xl w-72 overflow-hidden border border-transparent dark:border-[#424B63] shadow-2xl"
        >
          {/* 광고 영역 */}
          <div className="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-800/30 dark:to-purple-800/30 h-40 flex items-center justify-center border-b border-transparent dark:border-[#424B63]">
            <div className="text-center">
              <p className="text-4xl mb-2">📱</p>
              <p className="text-sm text-gray-500 dark:text-slate-300 font-medium">
                광고
              </p>
            </div>
          </div>

          {/* 하단 영역 */}
          <div className="p-5 text-center">
            {countdown > 0 ? (
              <>
                <p className="text-sm text-gray-500 dark:text-slate-300 mb-2">
                  잠시 후 닫을 수 있어요
                </p>
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-700/50 flex items-center justify-center mx-auto">
                  <span className="text-xl font-bold text-purple-600 dark:text-purple-200">
                    {countdown}
                  </span>
                </div>
              </>
            ) : (
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-purple-500 dark:bg-purple-600 text-white font-semibold text-sm hover:bg-purple-600 dark:hover:bg-purple-500 transition-colors"
              >
                {closeLabel}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

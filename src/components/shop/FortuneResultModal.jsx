import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap } from "lucide-react";

export default function FortuneResultModal({ result, category, onClose }) {
  if (!result) return null;

  const energy = result.energyLevel || 70;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-5"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
        >
          {/* 헤더 */}
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 px-6 pt-6 pb-8 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            <p className="text-xs font-bold opacity-70 uppercase tracking-widest mb-1">{category?.title}</p>
            <h2 className="text-xl font-black leading-snug mb-2">{result.summary}</h2>
            {result.fortuneSource && (
              <p className="text-xs opacity-60">{result.fortuneSource}</p>
            )}
          </div>

          {/* 에너지 레벨 */}
          <div className="px-6 -mt-4 mb-4">
            <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-gray-600">오늘의 에너지</span>
                </div>
                <span
                  className="text-sm font-black"
                  style={{ color: result.luckyColor || "#8B5CF6" }}
                >
                  {energy}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${energy}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: result.luckyColor || "#8B5CF6" }}
                />
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 space-y-4">
            {/* 상세 해석 */}
            {result.detailed && (
              <p className="text-sm text-gray-600 leading-relaxed">{result.detailed}</p>
            )}

            {/* 행동 팁 */}
            {result.actionTips?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">오늘의 행동 팁</p>
                {result.actionTips.map((tip, i) => (
                  <div key={i} className="flex items-center gap-2 bg-purple-50 rounded-xl px-3 py-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: result.luckyColor || "#8B5CF6" }}
                    />
                    <p className="text-xs text-gray-700 font-medium">{tip}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 행운 색상 */}
            {result.luckyColor && (
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                <div
                  className="w-6 h-6 rounded-full shadow-sm flex-shrink-0"
                  style={{ backgroundColor: result.luckyColor }}
                />
                <p className="text-xs text-gray-500 font-medium">오늘의 행운 색상</p>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-purple-500 text-white font-bold text-sm"
            >
              확인
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
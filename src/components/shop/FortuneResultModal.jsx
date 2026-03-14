import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap } from "lucide-react";

export default function FortuneResultModal({ result, category, onClose }) {
  useEffect(() => {
    if (result) {
      document.body.style.overflow = "hidden";
      document.body.classList.add("modal-open");
    }
    return () => {
      document.body.style.overflow = "unset";
      document.body.classList.remove("modal-open");
    };
  }, [result]);

  if (!result) return null;

  const energy = result.energyLevel || 70;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-5">
        {/* 배경 */}
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          key="modal"
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-white dark:bg-[#2E3447] rounded-[32px] overflow-hidden w-full max-w-sm flex flex-col max-h-[85vh] border border-white/20 dark:border-[#424B63] shadow-2xl"
        >
          {/* 헤더 - luckyColor 배경 유지 */}
          <div
            className="px-6 pt-8 pb-8 text-white relative shrink-0"
            style={{ backgroundColor: result.luckyColor || "#8B5CF6" }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center active:scale-90"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            <p className="text-xs font-bold opacity-70 uppercase tracking-widest mb-1">
              {category?.title}
            </p>
            <h2 className="text-xl font-black leading-snug mb-2">
              {result.summary}
            </h2>
            {result.fortuneSource && (
              <p className="text-[10px] opacity-60 leading-tight">
                {result.fortuneSource}
              </p>
            )}
          </div>

          {/* 스크롤 영역 */}
          <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-[#262B3D] overscroll-contain">
            {/* 에너지 레벨 */}
            <div className="px-6 pt-6 mb-6">
              <div className="bg-white dark:bg-[#1A1F2E] rounded-2xl p-4 border border-gray-100 dark:border-[#424B63] shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-bold text-gray-600 dark:text-slate-200">
                      오늘의 에너지
                    </span>
                  </div>
                  <span
                    className="text-sm font-black"
                    style={{ color: result.luckyColor || "#8B5CF6" }}
                  >
                    {energy}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 dark:bg-[#2E3447] rounded-full overflow-hidden">
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

            <div className="px-6 pb-4 space-y-5">
              {/* 상세 해석 */}
              {result.detailed && (
                <p className="text-[14px] text-gray-600 dark:text-slate-300 leading-relaxed break-keep">
                  {result.detailed}
                </p>
              )}

              {/* 행동 팁 */}
              {result.actionTips?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider ml-1">
                    오늘의 행동 팁
                  </p>
                  <div className="space-y-2">
                    {result.actionTips.map((tip, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 bg-purple-50/50 dark:bg-purple-800/25 rounded-xl px-3 py-2.5 border border-transparent dark:border-purple-700/30"
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                          style={{
                            backgroundColor: result.luckyColor || "#8B5CF6",
                          }}
                        />
                        <p className="text-xs text-gray-700 dark:text-slate-200 font-medium leading-snug">
                          {tip}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 행운 색상 */}
              {result.luckyColor && (
                <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#1A1F2E] rounded-2xl px-4 py-3 border border-gray-100/50 dark:border-[#424B63]">
                  <div
                    className="w-8 h-8 rounded-xl flex-shrink-0 border-2 border-white dark:border-[#424B63]"
                    style={{ backgroundColor: result.luckyColor }}
                  />
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase">
                      Lucky Color
                    </p>
                    <p className="text-xs text-gray-600 dark:text-slate-200 font-bold">
                      오늘의 행운 색상
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 푸터 */}
          <div className="p-6 shrink-0 bg-white dark:bg-[#2E3447] border-t border-gray-50 dark:border-[#424B63]">
            <button
              onClick={onClose}
              className="w-full py-4 rounded-2xl text-white font-bold text-sm shadow-lg active:scale-[0.98] transition-transform"
              style={{ backgroundColor: result.luckyColor || "#8B5CF6" }}
            >
              확인
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

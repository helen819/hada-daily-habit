import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap } from "lucide-react";

// 다크모드 실시간 감지 훅
function useIsDark() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

const HEADER_COLORS = {
  daily: { light: "#FAAA98", dark: "#F08D83" },
  summary: { light: "#C5B7FA", dark: "#A087F2" },
  love: { light: "#F5A9B8", dark: "#EF84A4" },
  wealth: { light: "#F0CE65", dark: "#F0B135" },
  career: { light: "#A0C6FF", dark: "#6EA3F1" },
  health: { light: "#AAE1CA", dark: "#5ABFA8" },
};

// 카테고리별 에너지 레이블
const ENERGY_LABELS = {
  daily: "오늘의 에너지",
  love: "애정 에너지",
  wealth: "재물 에너지",
  career: "취업 에너지",
  health: "건강 에너지",
};

// summary 주간/월간/연간 섹션 컴포넌트
function SummaryPeriodSection({ title, emoji, data, headerColor }) {
  if (!data) return null;
  return (
    <div className="bg-white dark:bg-[#1A1F2E] rounded-2xl p-4 border border-gray-100 dark:border-[#424B63] shadow-sm space-y-2">
      <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
        {emoji} {title}
      </p>
      <p className="text-sm text-gray-700 dark:text-slate-200 leading-relaxed">
        {data.summary}
      </p>
      {data.actionTips?.length > 0 && (
        <div className="space-y-1 pt-1">
          {data.actionTips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                style={{ backgroundColor: headerColor }}
              />
              <p className="text-xs text-gray-600 dark:text-slate-300 leading-snug">
                {tip}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FortuneResultModal({ result, category, onClose }) {
  const isDark = useIsDark();

  const headerColor = category?.id
    ? isDark
      ? HEADER_COLORS[category.id]?.dark
      : HEADER_COLORS[category.id]?.light
    : "#8B5CF6";

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

  const isSummary = category?.id === "summary";
  const energy = result.energyLevel || 70;
  const energyLabel = ENERGY_LABELS[category?.id] || "오늘의 에너지";

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
          {/* 헤더 */}
          <div
            className="px-6 pt-8 pb-8 text-white relative shrink-0"
            style={{ backgroundColor: headerColor }}
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
            <p className="text-[10px] opacity-60 leading-tight">
              HADA 분석 데이터
            </p>
          </div>

          {/* 스크롤 영역 */}
          <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-[#262B3D] overscroll-contain">
            {/* summary: 주간/월간/연간 섹션 */}
            {isSummary ? (
              <div className="px-6 py-6 space-y-4">
                {result.detailed && (
                  <p className="text-[14px] text-gray-600 dark:text-slate-300 leading-relaxed break-keep">
                    {result.detailed}
                  </p>
                )}
                <SummaryPeriodSection
                  title="주간 운세"
                  emoji="📅"
                  data={result.weekly}
                  headerColor={headerColor}
                />
                <SummaryPeriodSection
                  title="월간 운세"
                  emoji="🗓️"
                  data={result.monthly}
                  headerColor={headerColor}
                />
                <SummaryPeriodSection
                  title="연간 운세"
                  emoji="🌟"
                  data={result.yearly}
                  headerColor={headerColor}
                />
              </div>
            ) : (
              <>
                {/* 에너지 레벨 (summary 제외한 모든 카테고리) */}
                <div className="px-6 pt-6 mb-6">
                  <div className="bg-white dark:bg-[#1A1F2E] rounded-2xl p-4 border border-gray-100 dark:border-[#424B63] shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-bold text-gray-600 dark:text-slate-200">
                          {energyLabel}
                        </span>
                      </div>
                      <span
                        className="text-sm font-black"
                        style={{ color: headerColor }}
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
                        style={{ backgroundColor: headerColor }}
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
                            className="flex items-start gap-2 bg-gray-100 dark:bg-[#2E3447] rounded-xl px-3 py-2.5 border border-transparent dark:border-purple-700/30"
                          >
                            <div
                              className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                              style={{ backgroundColor: headerColor }}
                            />
                            <p className="text-xs text-gray-700 dark:text-slate-200 font-medium leading-snug">
                              {tip}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 행운 색상 (daily 전용) */}
                  {category?.id === "daily" && result.aiLuckyColor && (
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#1A1F2E] rounded-2xl px-4 py-3 border border-gray-100/50 dark:border-[#424B63]">
                      <div
                        className="w-8 h-8 rounded-xl flex-shrink-0 border-2 border-white dark:border-[#424B63]"
                        style={{ backgroundColor: result.aiLuckyColor }}
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
              </>
            )}
          </div>

          {/* 푸터 */}
          <div className="p-6 shrink-0 bg-white dark:bg-[#2E3447] border-t border-gray-50 dark:border-[#424B63]">
            <button
              onClick={onClose}
              className="w-full py-4 rounded-2xl text-white font-bold text-sm shadow-lg active:scale-[0.98] transition-transform"
              style={{ backgroundColor: headerColor }}
            >
              확인
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

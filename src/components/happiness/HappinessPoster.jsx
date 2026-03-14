import React, { useRef, useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

// 라이트/다크 파스텔 색상 쌍
const PASTEL_COLORS = [
  {
    light: { bg: "#E8D5F2", border: "#D4A5E8", text: "#6B4C7A" },
    dark: { bg: "#3D2260", border: "#7C3AED", text: "#E9D5FF" },
  },
  {
    light: { bg: "#FFD1E8", border: "#FF9FD9", text: "#8B3A62" },
    dark: { bg: "#4A1030", border: "#DB2777", text: "#FBCFE8" },
  },
  {
    light: { bg: "#C5E9FF", border: "#90D9FF", text: "#2C5282" },
    dark: { bg: "#0C2A4A", border: "#3B82F6", text: "#BFDBFE" },
  },
  {
    light: { bg: "#FFF4D1", border: "#FFE699", text: "#8B6F47" },
    dark: { bg: "#3D2C00", border: "#D97706", text: "#FDE68A" },
  },
  {
    light: { bg: "#D1F0E8", border: "#8FE5D4", text: "#2D7362" },
    dark: { bg: "#0A2E22", border: "#10B981", text: "#A7F3D0" },
  },
];

// 다크모드 감지 훅
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

function MaskingTape({ isDark }) {
  return (
    <div
      className="absolute -top-1 left-4 right-4 h-3 opacity-70 z-20"
      style={{
        background: isDark
          ? "linear-gradient(90deg, #6D5A2C 0%, #7D6A3C 100%)"
          : "linear-gradient(90deg, #FFFACD 0%, #FFFACD 100%)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
        transform: "rotate(-1deg)",
      }}
    />
  );
}

function PosterCard({ record, index, colorPair, isDark }) {
  const color = isDark ? colorPair.dark : colorPair.light;
  const rotation = index % 2 === 0 ? -2 : 2;
  const textLength = record.text?.length || 0;

  const getFontSize = () => {
    if (textLength < 25) return "11px";
    if (textLength < 45) return "9.5px";
    if (textLength < 65) return "8.5px";
    if (textLength < 85) return "7.5px";
    return "7px";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1, rotate: rotation }}
      className="relative w-full aspect-[4/5] max-w-[160px]"
    >
      <div
        className="rounded-xl p-3 h-full flex flex-col relative overflow-hidden"
        style={{
          background: color.bg,
          border: `1px solid ${color.border}`,
          boxShadow: isDark
            ? "0 4px 10px rgba(0,0,0,0.3)"
            : "0 4px 10px rgba(0,0,0,0.05)",
        }}
      >
        <MaskingTape isDark={isDark} />
        <div className="relative z-10 flex flex-col h-full justify-between py-1">
          <p
            className="text-[7px] font-bold text-right opacity-40 mb-1"
            style={{ color: color.text }}
          >
            {record.date?.slice(5)}
          </p>
          <div className="flex flex-col items-center gap-1 flex-1 justify-center min-h-0">
            <span className="text-lg mb-0.5">{record.emoji || "✨"}</span>
            <p
              className="font-bold leading-[1.3] text-center"
              style={{
                color: color.text,
                fontSize: getFontSize(),
                wordBreak: "break-all",
                overflowWrap: "anywhere",
              }}
            >
              {record.text}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function HappinessPoster({ records, onClose }) {
  const isDark = useIsDark();
  const posterRef = useRef(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const filteredRecords = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = String(selectedMonth.getMonth() + 1).padStart(2, "0");
    return records.filter((r) => r.date?.startsWith(`${year}-${month}`));
  }, [records, selectedMonth]);

  const monthLabel = `${selectedMonth.getFullYear()}년 ${
    selectedMonth.getMonth() + 1
  }월`;

  const handlePrevMonth = () => {
    setSelectedMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    );
  };
  const handleNextMonth = () => {
    setSelectedMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    );
  };

  // 포스터 본체 다크 스타일 — 더 풍부한 색감
  const posterBg = isDark ? "#1A1040" : "#FAF8F3"; // 순검정 → 딥 퍼플
  const posterDotColor = isDark ? "#2D1B6B" : "#E5E7EB"; // 점선 패턴 보라색
  const posterTitleColor = isDark ? "#F1F5F9" : "#1F2937";
  const posterSubColor = isDark ? "#C4B5FD" : "#9CA3AF"; // 보라 계열
  const posterAccentColor = isDark ? "#C084FC" : "#D97706"; // 밝은 보라
  const posterFooterColor = isDark ? "#7C3AED" : "#9CA3AF";
  const emptyTextColor = isDark ? "#4C1D95" : "#D1D5DB";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col bg-white dark:bg-slate-950"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* 헤더 */}
      <div className="flex items-center px-4 py-3 border-b border-gray-50 dark:border-[#2D1B6B] bg-white dark:bg-[#120B30]">
        <div className="w-10" />
        <div className="flex-1 flex items-center justify-center gap-4">
          <button
            onClick={handlePrevMonth}
            className="p-1 text-gray-400 dark:text-purple-400 hover:text-gray-900 dark:hover:text-purple-200 active:scale-75 transition-transform"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-black text-gray-800 dark:text-purple-200 min-w-[80px] text-center">
            {monthLabel}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 text-gray-400 dark:text-purple-400 hover:text-gray-900 dark:hover:text-purple-200 active:scale-75 transition-transform"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="w-10 flex justify-start">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-gray-100 dark:bg-[#2D1B6B] active:scale-90 transition-transform"
          >
            <X size={18} className="text-gray-600 dark:text-purple-300" />
          </button>
        </div>
      </div>

      {/* 포스터 프리뷰 */}
      <div
        className="flex-1 overflow-y-auto p-6 flex flex-col items-center"
        style={{
          background: isDark
            ? "linear-gradient(160deg, #0F0A2E 0%, #1A0A30 50%, #0A1A2E 100%)"
            : "#F9FAFB",
        }}
      >
        <div
          ref={posterRef}
          className="w-full max-w-[340px] h-auto rounded-[40px] p-8 pb-12 flex flex-col relative transition-all duration-500 mb-10"
          style={{
            backgroundColor: posterBg,
            backgroundImage: `radial-gradient(${posterDotColor} 0.5px, transparent 0.5px)`,
            backgroundSize: "20px 20px",
            boxShadow: isDark
              ? "0 0 60px rgba(124,58,237,0.3), 0 20px 40px rgba(0,0,0,0.5)"
              : "0 20px 40px rgba(0,0,0,0.1)",
          }}
        >
          {/* 포스터 헤더 */}
          <div className="text-center mb-8 pt-4">
            <p
              className="text-[10px] font-black tracking-[0.3em] uppercase mb-2"
              style={{ color: posterAccentColor }}
            >
              My Happiness
            </p>
            <h1
              className="text-2xl font-black leading-tight"
              style={{ color: posterTitleColor }}
            >
              {selectedMonth.getMonth() + 1}월의
              <br />
              소중한 조각들
            </h1>
            <div className="flex justify-center gap-1 mt-4">
              {[...Array(3)].map((_, i) => (
                <span
                  key={i}
                  className="text-xs animate-pulse"
                  style={{ color: posterAccentColor }}
                >
                  ✦
                </span>
              ))}
            </div>
          </div>

          {/* 카드 그리드 */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 mb-16">
            {filteredRecords.map((record, i) => (
              <PosterCard
                key={record.id}
                record={record}
                index={i}
                colorPair={PASTEL_COLORS[i % PASTEL_COLORS.length]}
                isDark={isDark}
              />
            ))}
            {filteredRecords.length === 0 && (
              <div
                className="col-span-2 py-20 text-center text-xs font-bold"
                style={{ color: emptyTextColor }}
              >
                기록된 행복이 없어요
              </div>
            )}
          </div>

          {/* 포스터 푸터 */}
          <div className="text-center mt-auto pt-4">
            <div
              className="h-px w-12 mx-auto mb-4 opacity-50"
              style={{ backgroundColor: posterAccentColor }}
            />
            <p
              className="text-[9px] font-bold tracking-widest uppercase"
              style={{ color: posterFooterColor }}
            >
              HADA DIGITAL ARCHIVE
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

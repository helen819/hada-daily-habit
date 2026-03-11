import React, { useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

const PASTEL_COLORS = [
  { bg: "#E8D5F2", border: "#D4A5E8", text: "#6B4C7A" },
  { bg: "#FFD1E8", border: "#FF9FD9", text: "#8B3A62" },
  { bg: "#C5E9FF", border: "#90D9FF", text: "#2C5282" },
  { bg: "#FFF4D1", border: "#FFE699", text: "#8B6F47" },
  { bg: "#D1F0E8", border: "#8FE5D4", text: "#2D7362" },
];

const STAR = "✦";

function MaskingTape() {
  return (
    <div
      className="absolute -top-1 left-4 right-4 h-3 opacity-60 z-20"
      style={{
        background: "linear-gradient(90deg, #FFFACD 0%, #FFFACD 100%)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        transform: "rotate(-1deg)",
      }}
    />
  );
}

function PosterCard({ record, index, color }) {
  const rotation = index % 2 === 0 ? -2 : 2;
  const textLength = record.text?.length || 0;

  // 🔥 글자 수에 따른 동적 폰트 크기 계산 (최소 7px ~ 최대 11px)
  const getFontSize = () => {
    if (textLength < 25) return "11px";
    if (textLength < 45) return "9.5px";
    if (textLength < 65) return "8.5px";
    if (textLength < 85) return "7.5px";
    return "7px"; // 100자에 가까울 때
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1, rotate: rotation }}
      className="relative w-full aspect-[4/5] max-w-[160px]"
    >
      <div
        className="rounded-xl p-3 h-full flex flex-col relative overflow-hidden border border-white/50"
        style={{
          background: color.bg,
          boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
        }}
      >
        <MaskingTape />

        <div className="relative z-10 flex flex-col h-full justify-between py-1">
          {/* 상단 날짜 (공간 절약을 위해 더 작게) */}
          <p
            className="text-[7px] font-bold text-right opacity-40 mb-1"
            style={{ color: color.text }}
          >
            {record.date?.slice(5)}
          </p>

          {/* 중앙: 이모지 + 텍스트 */}
          <div className="flex flex-col items-center gap-1 flex-1 justify-center min-h-0">
            <span className="text-lg mb-0.5">{record.emoji || "✨"}</span>
            <p
              className="font-bold leading-[1.3] text-center"
              style={{
                color: color.text,
                fontSize: getFontSize(), // 🔥 동적 폰트 크기 적용
                wordBreak: "break-all", // 영문/숫자 긴 단어 방지
                overflowWrap: "anywhere", // 모든 상황에서 줄바꿈 강제
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
  const posterRef = useRef(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // 🔥 1. 필터링 로직 수정 (현지 시간 기준 yyyy-MM 추출)
  const filteredRecords = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = String(selectedMonth.getMonth() + 1).padStart(2, "0");
    const monthStr = `${year}-${month}`; // 예: "2024-03"

    return records.filter((r) => r.date?.startsWith(monthStr));
  }, [records, selectedMonth]);

  const monthLabel = `${selectedMonth.getFullYear()}년 ${
    selectedMonth.getMonth() + 1
  }월`;

  // 🔥 2. 월 이동 로직 수정 (불변성 유지 및 1일 고정)
  const handlePrevMonth = () => {
    setSelectedMonth((prev) => {
      // 새로운 Date 객체를 만들고 날짜를 1일로 고정하여 롤오버 방지
      return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
    });
  };

  const handleNextMonth = () => {
    setSelectedMonth((prev) => {
      return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col bg-white"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex items-center px-4 py-3 border-b border-gray-50 bg-white">
        {/* 1. 왼쪽 구역 (균형을 맞추기 위한 빈 공간)*/}
        <div className="w-10"></div>

        {/* 2. 가운데 구역 (월 선택) - flex-1을 주어 남은 공간을 다 차지하고 내부를 중앙 정렬합니다 */}
        <div className="flex-1 flex items-center justify-center gap-4">
          <button
            onClick={handlePrevMonth}
            className="p-1 text-gray-400 hover:text-gray-900 active:scale-75 transition-transform"
          >
            <ChevronLeft size={20} />
          </button>

          <span className="text-sm font-black text-gray-800 min-w-[80px] text-center">
            {monthLabel}
          </span>

          <button
            onClick={handleNextMonth}
            className="p-1 text-gray-400 hover:text-gray-900 active:scale-75 transition-transform"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* 3. 닫기 버튼 */}
        <div className="w-10 flex justify-start">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-gray-100 active:scale-90 transition-transform"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 포스터 프리뷰 영역 */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-6 flex flex-col items-center">
        <div
          ref={posterRef}
          className="w-full max-w-[340px] h-auto bg-[#FAF8F3] rounded-[40px] shadow-xl p-8 pb-12 flex flex-col relative transition-all duration-500 mb-10"
          style={{
            backgroundImage:
              "radial-gradient(#E5E7EB 0.5px, transparent 0.5px)",
            backgroundSize: "20px 20px",
          }}
        >
          {/* 포스터 헤더 */}
          <div className="text-center mb-8 pt-4">
            <p className="text-[10px] font-black text-amber-600 tracking-[0.3em] uppercase mb-2">
              My Happiness
            </p>
            <h1 className="text-2xl font-black text-gray-800 leading-tight">
              {selectedMonth.getMonth() + 1}월의
              <br />
              소중한 조각들
            </h1>
            <div className="flex justify-center gap-1 mt-4">
              {[...Array(3)].map((_, i) => (
                <span key={i} className="text-amber-300 text-xs animate-pulse">
                  ✦
                </span>
              ))}
            </div>
          </div>

          {/* 🔥 카드 그리드: flex-1을 제거하여 콘텐츠 길이에 따라 부모(흰색 영역)를 늘림 */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 mb-16">
            {filteredRecords.map((record, i) => (
              <PosterCard
                key={record.id}
                record={record}
                index={i}
                color={PASTEL_COLORS[i % PASTEL_COLORS.length]}
              />
            ))}
            {filteredRecords.length === 0 && (
              <div className="col-span-2 py-20 text-center text-gray-300 text-xs font-bold">
                기록된 행복이 없어요
              </div>
            )}
          </div>

          {/* 포스터 푸터: mt-auto를 사용해 항상 맨 아래 위치하도록 함 */}
          <div className="text-center mt-auto pt-4">
            <div className="h-px w-12 bg-amber-200 mx-auto mb-4 opacity-50" />
            <p className="text-[9px] font-bold text-gray-400 tracking-widest uppercase">
              HADA DIGITAL ARCHIVE
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

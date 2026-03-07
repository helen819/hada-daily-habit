import React, { useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Loader2 } from "lucide-react";

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
      className="absolute -top-1 left-0 right-0 h-3 opacity-60"
      style={{
        background: "linear-gradient(90deg, #FFFACD 0%, #FFFACD 100%)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
        transform: "skewY(-1deg)",
      }}
    />
  );
}

function PosterCard({ record, index, color }) {
  const rotation = (Math.sin(index * 7.3) * 5);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, rotate: rotation }}
      animate={{ opacity: 1, scale: 1, rotate: rotation }}
      transition={{ delay: index * 0.08, type: "spring", damping: 18 }}
      className="relative"
      style={{
        width: "140px",
        minHeight: "160px",
      }}
    >
      <div
        className="rounded-2xl p-4 h-full flex flex-col justify-between relative overflow-hidden"
        style={{
          background: color.bg,
          boxShadow: "0 4px 12px rgba(0,0,0,0.08), inset 0 1px 2px rgba(255,255,255,0.8)",
        }}
      >
        <MaskingTape />
        
        {/* 종이 질감 */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.1) 1px, rgba(0,0,0,0.1) 2px),
              repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(0,0,0,0.1) 1px, rgba(0,0,0,0.1) 2px)
            `
          }}
        />

        <div className="relative z-10 flex flex-col flex-1 justify-between">
          {/* 상단: 날짜 */}
          <div className="text-right">
            <p 
              className="text-[10px] font-semibold"
              style={{ color: color.text, opacity: 0.6 }}
            >
              {record.date}
            </p>
          </div>

          {/* 중앙: 이모지 + 텍스트 */}
          <div className="flex flex-col items-center gap-2 flex-1 justify-center">
            <span className="text-2xl">{record.emoji}</span>
            <p 
              className="text-[11px] leading-tight text-center font-medium"
              style={{ color: color.text, wordBreak: "keep-all" }}
            >
              {record.text}
            </p>
          </div>

          {/* 하단: 공간 (균형) */}
          <div className="h-2" />
        </div>
      </div>
    </motion.div>
  );
}

export default function HappinessPoster({ records, onClose }) {
  const posterRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // 월별로 필터링된 기록
  const filteredRecords = useMemo(() => {
    const monthStr = selectedMonth.toISOString().split("T")[0].slice(0, 7);
    const filtered = records.filter(r => r.date?.startsWith(monthStr));
    
    // 랜덤 5개 추출 (5개 미만이면 모두)
    if (filtered.length <= 5) {
      return filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
  }, [records, selectedMonth]);

  const monthStr = selectedMonth.toLocaleDateString("ko-KR", { 
    year: "numeric", 
    month: "numeric" 
  }).replace(/\s/g, "");

  const handleSave = async () => {
    setSaving(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const element = posterRef.current;
      
      const canvas = await html2canvas(element, {
        backgroundColor: "#FAF8F3",
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const link = document.createElement("a");
      link.download = `행복보관함_${selectedMonth.toISOString().split("T")[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Error saving:", e);
    }
    setSaving(false);
  };

  const handlePrevMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-amber-50 via-orange-50 to-pink-50"
    >
      {/* 헤더 (저장 모드에서 숨김) */}
      <div className="relative flex items-center justify-between px-5 pt-6 pb-4 bg-white/30 backdrop-blur-sm border-b border-amber-100 sticky top-0">
        <div className="flex-1">
          <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest mb-0.5">HADA</p>
          <h2 className="text-lg font-bold text-gray-900">행복 보관함</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* 월 선택 */}
          <div className="flex items-center gap-1 px-3 py-2 bg-white/50 rounded-xl">
            <button
              onClick={handlePrevMonth}
              className="px-2 py-1 text-xs font-semibold text-amber-600 hover:bg-amber-50 rounded transition-colors"
            >
              ◀
            </button>
            <span className="text-xs font-semibold text-gray-700 min-w-[60px] text-center">
              {monthStr}
            </span>
            <button
              onClick={handleNextMonth}
              className="px-2 py-1 text-xs font-semibold text-amber-600 hover:bg-amber-50 rounded transition-colors"
            >
              ▶
            </button>
          </div>

          {/* 저장 버튼 */}
          <button
            onClick={handleSave}
            disabled={saving || filteredRecords.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-900 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {saving ? "저장 중..." : "이미지 저장"}
          </button>

          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-amber-100 hover:bg-amber-200 transition-colors"
          >
            <X className="w-4 h-4 text-amber-700" />
          </button>
        </div>
      </div>

      {/* 포스터 영역 (저장용) */}
      <div className="flex-1 overflow-y-auto flex items-start justify-center py-8 px-4">
        <div
          ref={posterRef}
          className="relative"
          style={{
            width: "420px",
            aspectRatio: "1 / 1.414",
            background: "#fcf6f7ff",
            padding: "40px 30px",
            borderRadius: "8px",
          }}
        >
          {/* 상단 영역 */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <p 
                className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-2"
                style={{ color: "#A0826D", letterSpacing: "0.15em" }}
              >
                HADA
              </p>
              <h1 
                className="text-2xl font-bold mb-2"
                style={{ color: "#4A3728", letterSpacing: "-0.02em" }}
              >
                {selectedMonth.getFullYear()}년 {selectedMonth.getMonth() + 1}월의
                <br />
                작은 행복들
              </h1>
              
              {/* 별 반짝임 */}
              <div className="flex items-center justify-center gap-1.5 mt-3">
                <span 
                  className="text-xs opacity-40 animate-pulse"
                  style={{ animation: "pulse 2s ease-in-out infinite" }}
                >
                  {STAR}
                </span>
                <span 
                  className="text-xs opacity-60 animate-pulse"
                  style={{ animation: "pulse 2.5s ease-in-out infinite 0.3s" }}
                >
                  {STAR}
                </span>
                <span 
                  className="text-xs opacity-40 animate-pulse"
                  style={{ animation: "pulse 2s ease-in-out infinite 0.6s" }}
                >
                  {STAR}
                </span>
              </div>
            </motion.div>
          </div>

          {/* 중앙 영역: 카드 배치 */}
          {filteredRecords.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "8px",
                justifyItems: "center",
                alignItems: "start",
                minHeight: "280px",
                marginBottom: "30px",
              }}
            >
              {filteredRecords.map((record, i) => (
                <PosterCard
                  key={record.id}
                  record={record}
                  index={i}
                  color={PASTEL_COLORS[i % PASTEL_COLORS.length]}
                />
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p 
                className="text-sm"
                style={{ color: "#A0826D" }}
              >
                이 달의 기록이 없습니다.
              </p>
            </div>
          )}

          {/* 하단 영역 */}
          <div className="text-center absolute bottom-8 left-0 right-0">
            <p 
              className="text-xs font-semibold uppercase tracking-[0.1em]"
              style={{ color: "#A0826D", letterSpacing: "0.1em" }}
            >
              HADA  –  행복을 기록하다
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </motion.div>
  );
}
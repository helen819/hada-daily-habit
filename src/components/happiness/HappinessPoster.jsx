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
  // 모바일에서 더 자연스럽게 보이도록 회전각 조절
  const rotation = index % 2 === 0 ? -2 : 2;

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
          <p
            className="text-[8px] font-bold text-right opacity-50"
            style={{ color: color.text }}
          >
            {record.date?.slice(5)}
          </p>

          <div className="flex flex-col items-center gap-1.5 flex-1 justify-center">
            <span className="text-xl">{record.emoji || "✨"}</span>
            <p
              className="text-[10px] leading-tight text-center font-bold break-keep"
              style={{ color: color.text }}
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
  const [saving, setSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const filteredRecords = useMemo(() => {
    const monthStr = selectedMonth.toISOString().split("T")[0].slice(0, 7);
    const filtered = records.filter((r) => r.date?.startsWith(monthStr));
    return filtered.slice(0, 6); // 모바일에서는 6개가 적당함 (2열 3행)
  }, [records, selectedMonth]);

  const monthLabel = `${selectedMonth.getFullYear()}년 ${
    selectedMonth.getMonth() + 1
  }월`;

  const handleSave = async () => {
    setSaving(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(posterRef.current, {
        backgroundColor: "#FAF8F3",
        scale: 3, // 저장 화질 개선
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `HADA_행복포스터_${monthLabel}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Save error:", e);
    }
    setSaving(false);
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
      {/* 상단 컨트롤 바 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <button onClick={onClose} className="p-2 rounded-full bg-gray-100">
          <X size={18} />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setSelectedMonth(
                new Date(selectedMonth.setMonth(selectedMonth.getMonth() - 1)),
              )
            }
            className="p-1"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-black">{monthLabel}</span>
          <button
            onClick={() =>
              setSelectedMonth(
                new Date(selectedMonth.setMonth(selectedMonth.getMonth() + 1)),
              )
            }
            className="p-1"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="p-2 rounded-full bg-pink-500 text-white shadow-lg shadow-pink-100"
        >
          {saving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Download size={18} />
          )}
        </button>
      </div>

      {/* 포스터 프리뷰 영역 */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-6 flex flex-col items-center">
        <div
          ref={posterRef}
          className="w-full max-w-[340px] aspect-[1/1.414] bg-[#FAF8F3] rounded-[40px] shadow-xl p-8 flex flex-col relative"
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

          {/* 카드 그리드: 모바일 환경에 맞춰 2열로 배치 */}
          <div className="grid grid-cols-2 gap-4 flex-1 content-start">
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

          {/* 포스터 푸터 */}
          <div className="text-center pb-4">
            <p className="text-[9px] font-bold text-gray-400 tracking-widest">
              HADA DIGITAL ARCHIVE
            </p>
          </div>
        </div>

        <p className="mt-6 text-[11px] text-gray-400 font-medium">
          이미지 저장을 눌러 갤러리에 보관하세요 ✨
        </p>
      </div>
    </motion.div>
  );
}

import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

const PASTEL_COLORS = [
  { bg: "#E8D5F2", border: "#D4A5E8", text: "#6B4C7A" },
  { bg: "#FFD1E8", border: "#FF9FD9", text: "#8B3A62" },
  { bg: "#C5E9FF", border: "#90D9FF", text: "#2C5282" },
  { bg: "#FFF4D1", border: "#FFE699", text: "#8B6F47" },
  { bg: "#D1F0E8", border: "#8FE5D4", text: "#2D7362" },
];

const QUILT_SIZES = [
  { w: "w-full", h: "h-64" },
  { w: "w-full", h: "h-80" },
  { w: "w-full", h: "h-96" },
  { w: "w-full", h: "h-72" },
  { w: "w-full", h: "h-56" },
];

const seededRandom = (seed) => {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
};

function QuiltCard({ record, index }) {
  const colorIndex = index % PASTEL_COLORS.length;
  const sizeIndex = index % QUILT_SIZES.length;
  const color = PASTEL_COLORS[colorIndex];
  const size = QUILT_SIZES[sizeIndex];
  const rotation = (seededRandom(index * 13) * 6) - 3;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, type: "spring", damping: 16 }}
      whileHover={{ translateY: -8, transition: { duration: 0.2 } }}
      className={`${size.w} ${size.h} rounded-4xl overflow-hidden cursor-pointer group relative`}
      style={{
        background: color.bg,
        border: `2px dashed ${color.border}`,
        transform: `rotate(${rotation}deg)`,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.5)",
      }}
    >
      {/* Fabric texture overlay */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0,0,0,0.03) 2px,
              rgba(0,0,0,0.03) 4px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              rgba(0,0,0,0.03) 2px,
              rgba(0,0,0,0.03) 4px
            )
          `
        }}
      />

      {/* Stitch animation */}
      <div className="absolute inset-0 pointer-events-none group-hover:opacity-100 opacity-0 transition-opacity">
        <div 
          className="absolute inset-0"
          style={{
            borderRadius: "16px",
            border: `2px dashed ${color.border}`,
            animation: "stitch-shimmer 2s ease-in-out infinite",
          }}
        />
      </div>

      {/* Content */}
      <div className="h-full flex flex-col justify-between p-5 relative z-10">
        <div className="flex-1 flex flex-col justify-center">
          <p
            className="text-center font-bold leading-relaxed"
            style={{
             fontFamily: "'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
              fontSize: "clamp(18px, 5vw, 24px)", // 가독성을 위해 폰트 사이즈 살짝 조정
              color: color.text,
              wordBreak: "keep-all",
              lineHeight: 1.5,
              letterSpacing: "-0.02em",
            }}
          >
            {record.text}
          </p>
        </div>
        <div className="text-center mt-4 pt-3 border-t" style={{ borderColor: `${color.border}40` }}>
          <p
            style={{
              fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
              fontSize: "13px",
              color: color.text,
              opacity: 0.7,
            }}
          >
            {record.emoji} {record.date}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function RollingPaper({ records, onClose }) {
  const containerRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: "#FFF9F0",
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `행복보관함_${new Date().toISOString().split("T")[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setShowDeleteConfirm(true);
    } catch (e) {
      console.error("Error saving:", e);
    }
    setSaving(false);
  };

  const handleDeleteRecords = async () => {
    setDeleting(true);
    try {
      for (const record of records) {
        await base44.entities.HappinessRecord.delete(record.id);
      }
      setShowDeleteConfirm(false);
      onClose();
    } catch (e) {
      console.error("Error deleting records:", e);
    }
    setDeleting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-pink-50 via-orange-50 to-yellow-50 overflow-hidden">
      <style>{`
        @keyframes stitch-shimmer {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        
        .quilt-scroll {
          scroll-behavior: smooth;
          scroll-timeline: view();
        }
      `}</style>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-xs mx-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">기록 삭제</h3>
              </div>
              <p className="text-sm text-gray-600 mb-1">이미지로 저장한 행복 기록이</p>
              <p className="text-sm text-gray-600 mb-6">영구적으로 삭제됩니다.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteRecords}
                  disabled={deleting}
                  className="flex-1 py-2 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {deleting ? "삭제 중..." : "삭제 수락"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 bg-white/40 backdrop-blur-sm border-b border-orange-100">
        <div>
          <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">행복 조각보</p>
          <h2 className="text-xl font-bold text-gray-900">나의 행복 보관함</h2>
          <p className="text-xs text-gray-500 mt-1">{records.length}개의 행복 조각</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-200 hover:bg-orange-300 text-orange-800 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {saving ? "저장 중..." : "이미지로 간직하기"}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-orange-100 hover:bg-orange-200 transition-colors"
          >
            <X className="w-4 h-4 text-orange-700" />
          </button>
        </div>
      </div>

      {/* Quilt Grid */}
      <div className="flex-1 overflow-y-auto quilt-scroll px-4 py-6">
        <div 
          ref={containerRef}
          className="max-w-2xl mx-auto grid grid-cols-1 gap-4"
        >
          <div className="text-center mb-4">
            <p 
              className="text-2xl font-bold text-gray-800"
              style={{ fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
              letterSpacing: "-0.03em"}}
            >
              나의 행복 보관함 ✨
            </p>
          </div>

          {records.map((record, index) => (
            <QuiltCard key={record.id} record={record} index={index} />
          ))}

          <div className="h-12" />
        </div>
      </div>
    </div>
  );
}
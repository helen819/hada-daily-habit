import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Moon, Leaf } from "lucide-react";

export default function ModeCard({ data, onDismiss, onSelect }) {
  const [visible, setVisible] = useState(true);

  // 팝업이 열릴 때 뒷배경 스크롤 방지 (선택 사항)
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

  // 🔥 모드 선택 핸들러
  const handleSelectMode = (mode) => {
    onSelect?.(mode); // 부모 컴포넌트에 선택된 모드 전달
    handleDismiss(); // 선택 후 팝업 닫기
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          // 🔥 items-end를 items-center로 수정하여 모든 화면에서 중앙 정렬
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-6"
          onClick={(e) => {
            // 🔥 정확히 '배경'을 터치했을 때만 닫히도록 제한
            if (e.target === e.currentTarget) {
              handleDismiss();
            }
          }}
        >
          <motion.div
            // 🔥 중앙에서 나타날 때 더 자연스럽도록 scale 효과 추가
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-[32px] shadow-2xl w-full max-w-[320px] p-8 relative border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleDismiss}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 active:scale-90 transition-transform"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              {data.suggested_mode === "action" ? (
                <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mb-4">
                  <Zap className="w-7 h-7 text-purple-600 fill-purple-600" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mb-4">
                  <Leaf className="w-7 h-7 text-green-600 fill-green-600" />
                </div>
              )}
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                모드 추천
              </p>
            </div>

            <h2 className="text-xl font-black text-gray-900 mb-3 leading-tight break-keep">
              {data.card_title}
            </h2>

            <p className="text-sm text-gray-500 leading-relaxed break-keep font-medium mb-10">
              {data.card_body}
            </p>

            {/* 🔥 하단 선택 버튼 섹션 */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleSelectMode("action")}
                className="w-full h-14 rounded-2xl bg-purple-50 text-purple-600 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Zap className="w-4 h-4 fill-purple-600" />
                활동 모드
              </button>

              <button
                onClick={() => handleSelectMode("restore")}
                className="w-full h-14 rounded-2xl bg-green-50 text-green-600 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Leaf className="w-4 h-4 fill-green-600" />
                회복 모드
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

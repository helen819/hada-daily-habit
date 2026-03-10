import React, { useMemo, useEffect } from "react"; // 🔥 useEffect 추가
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, X, Trash2 } from "lucide-react"; // 🔥 Trash2 추가

const CATEGORY_COLORS = {
  work: "bg-blue-100 text-blue-700",
  health: "bg-green-100 text-green-700",
  personal: "bg-purple-100 text-purple-700",
  social: "bg-pink-100 text-pink-700",
};
const CATEGORY_LABELS = {
  work: "업무",
  health: "건강",
  personal: "개인",
  social: "사교",
};

const BADGE_INFO = {
  heart: {
    icon: "🩷",
    label: "행복 기록",
    desc: "이 날 행복 일기를 작성했어요",
  },
  fire: {
    icon: "🔥",
    label: "할일 완료",
    desc: "할 일을 70% 이상 완료한 날이에요",
  },
  rest: {
    icon: "💤",
    label: "쉬었던 날",
    desc: "할 일이 있었지만 거의 못 한 날이에요",
  },
  star: { icon: "⭐", label: "바쁜 날", desc: "일정이 3개 이상 있는 날이에요" },
};

export default function SchedulePopup({
  date,
  schedules,
  badges,
  onClose,
  onToggle,
  onMicroAction,
  onDelete, // 🔥 onDelete 추가
}) {
  // 🔥 1. 팝업이 열릴 때 뒷배경(Body) 스크롤을 완전히 막습니다.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const hasSchedules = schedules && schedules.length > 0;
  const hasBadges = badges && badges.length > 0;

  // 🔥 1. 우선 전체 목록을 시간순으로 정렬합니다. (24시간제이므로 단순 비교 가능)
  const sortedSchedules = useMemo(() => {
    if (!hasSchedules) return [];

    return [...schedules].sort((a, b) => {
      // 시간 데이터가 없으면 '00:00'으로 처리하거나 '23:59'로 처리해서 순서를 정함
      const timeA = a.time || "00:00";
      const timeB = b.time || "00:00";

      return timeA.localeCompare(timeB); // "04:00" < "09:00" < "20:00" 순서로 정렬됨
    });
  }, [schedules]);

  if (!hasSchedules && !hasBadges) return null;

  // 🔥 2. [중요] 정렬된 리스트(sortedSchedules)를 사용하여 미완료/완료를 나눕니다.
  const pending = sortedSchedules.filter((s) => !s.completed);
  const done = sortedSchedules.filter((s) => s.completed);

  // 날짜 포맷
  const [y, m, d] = date.split("-");
  const dateLabel = `${parseInt(m)}월 ${parseInt(d)}일`;

  return (
    <AnimatePresence>
      {/* 최상위 컨테이너: pointer-events-none 제거하고 직접 관리 */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-5">
        {/* 1. 배경 어둡게 처리 (전체 화면 클릭 시 닫기) */}
        <motion.div
          key="popup-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
          onClick={onClose}
        />
        <motion.div
          key="popup"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 400 }}
          // touch-none을 제거하고, 내부에서만 스크롤이 일어나도록 제어
          className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-[340px] flex flex-col max-h-[70vh] border border-white/20 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* [고정] Header: shrink-0으로 고정 */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50 shrink-0 bg-white">
            <div className="flex items-center gap-2">
              <p className="text-base font-black text-gray-900">{dateLabel}</p>
              {hasBadges && (
                <div className="flex gap-1">
                  {badges.map((b) => (
                    <span key={b} className="text-base leading-none">
                      {BADGE_INFO[b]?.icon}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* [스크롤] Scrollable Content: flex-1과 overflow-y-auto 적용 */}
          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1 touch-auto custom-scrollbar bg-white overscroll-contain">
            {/* 뱃지 설명 */}
            {hasBadges && (
              <div className="flex flex-col gap-1.5 pb-2 border-b border-gray-50">
                {badges.map((b) => {
                  const info = BADGE_INFO[b];
                  if (!info) return null;
                  return (
                    <div
                      key={b}
                      className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-xl"
                    >
                      <span className="text-lg leading-none">{info.icon}</span>
                      <div>
                        <p className="text-xs font-bold text-gray-700">
                          {info.label}
                        </p>
                        <p className="text-[11px] text-gray-400">{info.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 일정 목록 */}
            {pending.map((s) => (
              <div
                key={s.id}
                className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-xl"
              >
                <button
                  onClick={() => onToggle(s, true)}
                  className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-purple-400 transition-colors flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 break-all">
                      {s.title}
                    </p>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                        CATEGORY_COLORS[s.category] ||
                        "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {CATEGORY_LABELS[s.category] || s.category}
                    </span>
                  </div>
                  {s.time && (
                    <p className="text-xs text-gray-400 mt-0.5">{s.time}</p>
                  )}
                  {s.micro_action && (
                    <p className="text-xs text-purple-600 mt-1.5 bg-purple-50 rounded-lg px-2 py-1.5 leading-relaxed">
                      ✨ {s.micro_action.split("\n")[0]}
                    </p>
                  )}
                </div>

                {/* 🔥 버튼 그룹 (삭제 + 마이크로액션) */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onDelete(s.id)}
                    className="p-2 rounded-xl hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onMicroAction(s)}
                    className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-500"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {done.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl opacity-50"
              >
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-green-600" />
                </div>
                <p className="text-sm text-gray-500 line-through">{s.title}</p>
              </div>
            ))}

            {!hasSchedules && (
              <p className="text-xs text-gray-400 text-center py-2">
                일정이 없어요
              </p>
            )}
          </div>

          {/* [고정] Footer: shrink-0으로 고정 */}
          <div className="p-6 bg-white border-t border-gray-50 shrink-0">
            <button
              onClick={onClose}
              className="w-full py-4 rounded-2xl bg-gray-100 text-gray-600 text-sm font-black active:scale-[0.98] transition-all"
            >
              닫기
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

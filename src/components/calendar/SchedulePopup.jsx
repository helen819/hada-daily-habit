import React, { useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, X, Trash2 } from "lucide-react";

const CATEGORY_COLORS = {
  work: "bg-blue-100 text-blue-700 dark:bg-blue-800/50 dark:text-blue-200",
  health:
    "bg-green-100 text-green-700 dark:bg-green-800/50 dark:text-green-200",
  personal:
    "bg-purple-100 text-purple-700 dark:bg-purple-800/50 dark:text-purple-200",
  social: "bg-pink-100 text-pink-700 dark:bg-pink-800/50 dark:text-pink-200",
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
  onDelete,
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const hasSchedules = schedules && schedules.length > 0;
  const hasBadges = badges && badges.length > 0;

  const sortedSchedules = useMemo(() => {
    if (!hasSchedules) return [];
    return [...schedules].sort((a, b) =>
      (a.time || "00:00").localeCompare(b.time || "00:00"),
    );
  }, [schedules]);

  if (!hasSchedules && !hasBadges) return null;

  const pending = sortedSchedules.filter((s) => !s.completed);
  const done = sortedSchedules.filter((s) => s.completed);
  const [y, m, d] = date.split("-");
  const dateLabel = `${parseInt(m)}월 ${parseInt(d)}일`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-5">
        {/* 배경 */}
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
          className="relative bg-white dark:bg-[#2E3447] rounded-[32px] w-full max-w-[340px] flex flex-col max-h-[70vh] border border-white/20 dark:border-[#424B63] overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50 dark:border-[#424B63] shrink-0 bg-white dark:bg-[#2E3447]">
            <div className="flex items-center gap-2">
              <p className="text-base font-black text-gray-900 dark:text-white">
                {dateLabel}
              </p>
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
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#363D54] transition-colors"
            >
              <X className="w-4 h-4 text-gray-400 dark:text-slate-400" />
            </button>
          </div>

          {/* 스크롤 영역 */}
          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1 touch-auto bg-white dark:bg-[#2E3447] overscroll-contain">
            {/* 뱃지 설명 */}
            {hasBadges && (
              <div className="flex flex-col gap-1.5 pb-2 border-b border-gray-50 dark:border-[#424B63]">
                {badges.map((b) => {
                  const info = BADGE_INFO[b];
                  if (!info) return null;
                  return (
                    <div
                      key={b}
                      className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-[#1A1F2E] rounded-xl"
                    >
                      <span className="text-lg leading-none">{info.icon}</span>
                      <div>
                        <p className="text-xs font-bold text-gray-700 dark:text-slate-200">
                          {info.label}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-slate-400">
                          {info.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 미완료 일정 */}
            {pending.map((s) => (
              <div
                key={s.id}
                className="flex items-start gap-2.5 p-3 bg-gray-50 dark:bg-[#1A1F2E] rounded-xl"
              >
                <button
                  onClick={() => onToggle(s, true)}
                  className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-300 dark:border-[#4A5270] hover:border-purple-400 dark:hover:border-purple-400 transition-colors flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-200 break-all">
                      {s.title}
                    </p>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                        CATEGORY_COLORS[s.category] ||
                        "bg-gray-100 dark:bg-[#363D54] text-gray-500 dark:text-slate-300"
                      }`}
                    >
                      {CATEGORY_LABELS[s.category] || s.category}
                    </span>
                  </div>
                  {s.time && (
                    <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">
                      {s.time}
                    </p>
                  )}
                  {s.micro_action && (
                    <p className="text-xs text-purple-600 dark:text-purple-300 mt-1.5 bg-purple-50 dark:bg-purple-800/30 rounded-lg px-2 py-1.5 leading-relaxed">
                      ✨ {s.micro_action.split("\n")[0]}
                    </p>
                  )}
                </div>

                {/* 버튼 그룹 */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onDelete(s.id)}
                    className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-300 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {/* <button className="p-2 rounded-xl bg-purple-50 dark:bg-purple-800/40 hover:bg-purple-100 dark:hover:bg-purple-700/50 text-purple-500 dark:text-purple-300 transition-colors">
                    <Sparkles className="w-4 h-4" />
                  </button> */}
                </div>
              </div>
            ))}

            {/* 완료 일정 */}
            {done.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2.5 p-3 bg-gray-50 dark:bg-[#1A1F2E] rounded-xl opacity-50"
              >
                <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-800/50 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-green-600 dark:text-green-300" />
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-300 line-through">
                  {s.title}
                </p>
              </div>
            ))}

            {!hasSchedules && (
              <p className="text-xs text-gray-400 dark:text-slate-400 text-center py-2">
                일정이 없어요
              </p>
            )}
          </div>

          {/* 푸터 */}
          <div className="p-6 bg-white dark:bg-[#2E3447] border-t border-gray-50 dark:border-[#424B63] shrink-0">
            <button
              onClick={onClose}
              className="w-full py-4 rounded-2xl bg-gray-100 dark:bg-[#1A1F2E] text-gray-600 dark:text-slate-300 text-sm font-black active:scale-[0.98] transition-all hover:bg-gray-200 dark:hover:bg-[#262B3D]"
            >
              닫기
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, X } from "lucide-react";

const CATEGORY_COLORS = {
  work: "bg-blue-100 text-blue-700",
  health: "bg-green-100 text-green-700",
  personal: "bg-purple-100 text-purple-700",
  social: "bg-pink-100 text-pink-700",
};
const CATEGORY_LABELS = {
  work: "업무", health: "건강", personal: "개인", social: "사교",
};

const BADGE_INFO = {
  heart: { icon: "🩷", label: "행복 기록", desc: "이 날 행복 일기를 작성했어요" },
  fire:  { icon: "🔥", label: "할일 완료", desc: "할 일을 70% 이상 완료한 날이에요" },
  rest:  { icon: "💤", label: "쉬었던 날", desc: "할 일이 있었지만 거의 못 한 날이에요" },
  star:  { icon: "⭐", label: "바쁜 날",   desc: "일정이 3개 이상 있는 날이에요" },
};

export default function SchedulePopup({ date, schedules, badges, onClose, onToggle, onMicroAction }) {
  const hasSchedules = schedules && schedules.length > 0;
  const hasBadges = badges && badges.length > 0;

  if (!hasSchedules && !hasBadges) return null;

  const pending = hasSchedules ? schedules.filter((s) => !s.completed) : [];
  const done = hasSchedules ? schedules.filter((s) => s.completed) : [];

  // 날짜 포맷
  const [y, m, d] = date.split("-");
  const dateLabel = `${parseInt(m)}월 ${parseInt(d)}일`;

  return (
    <AnimatePresence>
      <motion.div
        key="popup-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />
      <motion.div
        key="popup"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.97 }}
        transition={{ type: "spring", damping: 22, stiffness: 300 }}
        className="fixed left-1/2 -translate-x-1/2 z-50 w-[calc(100%-40px)] max-w-md"
        style={{ bottom: "88px" }}
      >
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-gray-800">{dateLabel}</p>
              {hasBadges && (
                <div className="flex gap-1">
                  {badges.map((b) => (
                    <span key={b} className="text-base leading-none">{BADGE_INFO[b]?.icon}</span>
                  ))}
                </div>
              )}
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <div className="px-4 py-3 space-y-2 max-h-80 overflow-y-auto">
            {/* 뱃지 설명 */}
            {hasBadges && (
              <div className="flex flex-col gap-1.5 pb-2 border-b border-gray-50">
                {badges.map((b) => {
                  const info = BADGE_INFO[b];
                  if (!info) return null;
                  return (
                    <div key={b} className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-xl">
                      <span className="text-lg leading-none">{info.icon}</span>
                      <div>
                        <p className="text-xs font-bold text-gray-700">{info.label}</p>
                        <p className="text-[11px] text-gray-400">{info.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 일정 목록 */}
            {pending.map((s) => (
              <div key={s.id} className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-xl">
                <button
                  onClick={() => onToggle(s, true)}
                  className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-purple-400 transition-colors flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 break-all">{s.title}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${CATEGORY_COLORS[s.category] || "bg-gray-100 text-gray-500"}`}>
                      {CATEGORY_LABELS[s.category] || s.category}
                    </span>
                  </div>
                  {s.time && <p className="text-xs text-gray-400 mt-0.5">{s.time}</p>}
                  {s.micro_action && (
                    <p className="text-xs text-purple-600 mt-1.5 bg-purple-50 rounded-lg px-2 py-1.5 leading-relaxed">
                      ✨ {s.micro_action.split("\n")[0]}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onMicroAction(s)}
                  className="p-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors flex-shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                </button>
              </div>
            ))}

            {done.map((s) => (
              <div key={s.id} className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl opacity-50">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-green-600" />
                </div>
                <p className="text-sm text-gray-500 line-through">{s.title}</p>
              </div>
            ))}

            {!hasSchedules && (
              <p className="text-xs text-gray-400 text-center py-2">일정이 없어요</p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
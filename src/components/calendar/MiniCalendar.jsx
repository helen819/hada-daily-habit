import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

const BADGE_ICONS = {
  heart: "🩷",
  fire: "🔥",
  rest: "💤",
  star: "⭐",
};

export default function MiniCalendar({
  year,
  month,
  selectedDate,
  markedDates,
  dateKeywords,
  categoryColors,
  dateBadges,
  onDateSelect,
  onMonthChange,
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = new Date();
  const isToday = (d) =>
    d === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  const dateKey = (d) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(
      2,
      "0",
    )}`;
  const isSelected = (d) => dateKey(d) === selectedDate;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-[#424B63] p-4 shadow-md dark:shadow-[0_2px_12px_rgba(0,0,0,0.4)]">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => onMonthChange(-1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#363D54] transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-500 dark:text-slate-300" />
        </button>
        <p className="text-sm font-bold text-gray-800 dark:text-white">
          {year}년 {month + 1}월
        </p>
        <button
          onClick={() => onMonthChange(1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#363D54] transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-500 dark:text-slate-300" />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-semibold text-gray-400 dark:text-slate-400 py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 셀 */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((d, i) => {
          if (!d) return <div key={`empty-${i}`} />;
          const key = dateKey(d);
          const hasEvent = markedDates?.includes(key);
          return (
            <button
              key={key}
              onClick={() => onDateSelect(key)}
              className={`flex flex-col items-center justify-center aspect-square rounded-xl transition-all text-xs font-semibold
                ${
                  isSelected(d)
                    ? "bg-purple-500 text-white"
                    : isToday(d)
                    ? "bg-blue-100 dark:bg-blue-700/50 text-blue-600 dark:text-blue-200"
                    : "text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-[#363D54]"
                }`}
            >
              {d}
              {dateBadges?.[key]?.length > 0 ? (
                <div className="flex gap-0.5 mt-0.5 justify-center leading-none">
                  {dateBadges[key].slice(0, 2).map((badge, idx) => (
                    <span key={idx} style={{ fontSize: 7, lineHeight: 1 }}>
                      {BADGE_ICONS[badge]}
                    </span>
                  ))}
                </div>
              ) : hasEvent ? (
                <div
                  className={`w-1 h-1 rounded-full mt-0.5 ${
                    isSelected(d)
                      ? "bg-white/70"
                      : "bg-blue-400 dark:bg-blue-400"
                  }`}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

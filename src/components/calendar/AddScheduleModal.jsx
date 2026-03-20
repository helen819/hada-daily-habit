import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  setYear,
  setMonth as setDateMonth,
} from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  {
    value: "work",
    label: "업무",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-800/50 dark:text-blue-200",
  },
  {
    value: "personal",
    label: "개인",
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-800/50 dark:text-purple-200",
  },
  {
    value: "hobby",
    label: "취미",
    color:
      "bg-green-100 text-green-700 dark:bg-green-800/50 dark:text-green-200",
  },
  {
    value: "other",
    label: "기타",
    color: "bg-gray-100 text-gray-700 dark:bg-slate-600 dark:text-slate-200",
  },
];

const minutes = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0"),
);

export default function AddScheduleModal({
  visible,
  defaultDate,
  onClose,
  onAdd,
}) {
  const [title, setTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    defaultDate ? new Date(defaultDate) : new Date(),
  );
  const [currentMonth, setCurrentMonth] = useState(selectedDate);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [timeState, setTimeState] = useState({
    ampm: "오전",
    hour: "09",
    minute: "00",
  });
  const [category, setCategory] = useState("work");

  useEffect(() => {
    if (visible && defaultDate) {
      setSelectedDate(new Date(defaultDate));
      setCurrentMonth(new Date(defaultDate));
    }
  }, [visible, defaultDate]);

  const handleSubmit = () => {
    if (!title.trim()) return;
    let h = parseInt(timeState.hour);
    if (timeState.ampm === "오후" && h < 12) h += 12;
    if (timeState.ampm === "오전" && h === 12) h = 0;
    const formattedDate = format(selectedDate, "yyyy-MM-dd");
    const formattedTime = `${String(h).padStart(2, "0")}:${timeState.minute}`;
    onAdd({
      title: title.trim(),
      date: formattedDate,
      time: formattedTime,
      category,
      completed: false,
    });
    setTitle("");
    onClose();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          {/* 날짜 선택 캘린더 모달 */}
          <AnimatePresence>
            {isCalendarOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="w-full max-w-[260px] bg-white dark:bg-[#2E3447] rounded-[32px] p-5 pointer-events-auto border border-transparent dark:border-[#424B63] shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setCurrentMonth(subMonths(currentMonth, 1))
                      }
                    >
                      <ChevronLeft
                        size={20}
                        className="text-purple-500 dark:text-purple-300"
                      />
                    </Button>
                    <div className="flex gap-1">
                      <select
                        value={currentMonth.getFullYear()}
                        onChange={(e) =>
                          setCurrentMonth(
                            setYear(currentMonth, parseInt(e.target.value)),
                          )
                        }
                        className="bg-purple-50 dark:bg-purple-800/50 text-purple-700 dark:text-purple-200 font-bold text-xs rounded-lg px-1 py-0.5 border-none"
                      >
                        {Array.from(
                          { length: 11 },
                          (_, i) => new Date().getFullYear() + 5 - i,
                        ).map((y) => (
                          <option key={y} value={y}>
                            {y}년
                          </option>
                        ))}
                      </select>
                      <select
                        value={currentMonth.getMonth()}
                        onChange={(e) =>
                          setCurrentMonth(
                            setDateMonth(
                              currentMonth,
                              parseInt(e.target.value),
                            ),
                          )
                        }
                        className="bg-purple-50 dark:bg-purple-800/50 text-purple-700 dark:text-purple-200 font-bold text-xs rounded-lg px-1 py-0.5 border-none"
                      >
                        {Array.from({ length: 12 }, (_, i) => i).map((m) => (
                          <option key={m} value={m}>
                            {m + 1}월
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setCurrentMonth(addMonths(currentMonth, 1))
                      }
                    >
                      <ChevronRight
                        size={20}
                        className="text-purple-500 dark:text-purple-300"
                      />
                    </Button>
                  </div>

                  <style>{`
                    .rdp-caption { display: none !important; }
                    .rdp-table { width: 100% !important; }
                    .rdp-day { width: 38px !important; height: 38px !important; display: flex !important; align-items: center !important; justify-content: center !important; margin: auto !important; font-weight: 600 !important; font-size: 13px !important; }
                    .rdp-day_selected { background-color: #a855f7 !important; color: white !important; border-radius: 12px !important; }
                    .dark .rdp-day { color: #cbd5e1; }
                    .dark .rdp-day:hover { background-color: rgba(100,116,139,0.4) !important; border-radius: 12px !important; }
                    .dark .rdp-head_cell { color: #94a3b8; }
                  `}</style>

                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => d && setSelectedDate(d)}
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                    locale={ko}
                    disableNavigation
                    className="p-0 border-none"
                    classNames={{
                      caption_label: "hidden",
                      caption: "flex justify-center relative items-center h-0",
                    }}
                  />

                  <Button
                    onClick={() => setIsCalendarOpen(false)}
                    className="w-full h-12 mt-5 bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500 text-white font-bold rounded-2xl shadow-lg"
                  >
                    선택 완료
                  </Button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* 메인 모달 */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#2E3447] rounded-3xl w-full max-w-md p-6 border border-transparent dark:border-[#424B63] shadow-2xl"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                일정 추가
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#363D54] transition-colors"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* 제목 입력 */}
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="일정 작성하기"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#424B63] bg-white dark:bg-[#1A1F2E] text-sm font-medium text-gray-900 dark:text-slate-200 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-300 dark:focus:ring-purple-600"
              />

              <div className="grid grid-cols-2 gap-2">
                {/* 날짜 선택 */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase ml-1">
                    날짜
                  </p>
                  <button
                    onClick={() => setIsCalendarOpen(true)}
                    className="w-full flex items-center gap-2 bg-gray-50 dark:bg-[#1A1F2E] rounded-2xl px-3 py-3 border border-transparent dark:border-[#424B63] hover:border-purple-100 dark:hover:border-purple-600 transition-all text-left"
                  >
                    <CalendarIcon className="w-3.5 h-3.5 text-purple-500 dark:text-purple-300 shrink-0" />
                    <span className="text-[11px] text-gray-800 dark:text-slate-200 font-black truncate">
                      {format(selectedDate, "yyyy년 MM월 dd일", { locale: ko })}
                    </span>
                  </button>
                </div>

                {/* 시간 선택 */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase ml-1">
                    시간
                  </p>
                  <div className="flex gap-1">
                    {[
                      {
                        key: "ampm",
                        options: ["오전", "오후"].map((v) => ({
                          value: v,
                          label: v,
                        })),
                      },
                      {
                        key: "hour",
                        options: Array.from({ length: 12 }, (_, i) =>
                          String(i + 1).padStart(2, "0"),
                        ).map((h) => ({ value: h, label: `${h}시` })),
                      },
                      {
                        key: "minute",
                        options: minutes.map((m) => ({
                          value: m,
                          label: `${m}분`,
                        })),
                      },
                    ].map(({ key, options }) => (
                      <select
                        key={key}
                        value={timeState[key]}
                        onChange={(e) =>
                          setTimeState((p) => ({ ...p, [key]: e.target.value }))
                        }
                        className="flex-1 h-10 bg-gray-50 dark:bg-[#1A1F2E] text-gray-800 dark:text-slate-200 rounded-xl text-[10px] font-bold text-center border border-transparent dark:border-[#424B63] focus:ring-1 focus:ring-purple-200 dark:focus:ring-purple-600 appearance-none"
                      >
                        {options.map(({ value, label }) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    ))}
                  </div>
                </div>
              </div>

              {/* 카테고리 */}
              <div className="flex gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                      category === c.value
                        ? c.color +
                          " ring-2 ring-offset-1 ring-purple-300 dark:ring-purple-500 dark:ring-offset-[#2E3447]"
                        : "bg-gray-100 dark:bg-[#1A1F2E] text-gray-500 dark:text-slate-400"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* 추가 버튼 */}
              <button
                onClick={handleSubmit}
                disabled={!title.trim()}
                className="w-full py-3 rounded-xl bg-purple-500 dark:bg-purple-600 hover:bg-purple-600 dark:hover:bg-purple-500 text-white font-bold text-sm disabled:opacity-40 transition-colors"
              >
                추가하기
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

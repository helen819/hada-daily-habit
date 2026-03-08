import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  Check,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  { value: "work", label: "업무", color: "bg-blue-100 text-blue-700" },
  { value: "personal", label: "개인", color: "bg-purple-100 text-purple-700" },
  { value: "hobby", label: "취미", color: "bg-green-100 text-green-700" },
  { value: "other", label: "기타", color: "bg-gray-100 text-gray-700" },
];

// 5분 단위로 변경 (00, 05, 10, ..., 55)
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
  // 날짜 상태 (초기값: 오늘 또는 전달받은 날짜)
  const [selectedDate, setSelectedDate] = useState(
    defaultDate ? new Date(defaultDate) : new Date(),
  );
  const [currentMonth, setCurrentMonth] = useState(selectedDate);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false); // 🔥 팝오버 대신 상태로 관리

  // 시간 상태
  const [timeState, setTimeState] = useState({
    ampm: "오전",
    hour: "09",
    minute: "00",
  });
  const [category, setCategory] = useState("work");

  // 모달이 다시 열릴 때 날짜 초기화 로직 (선택 사항)
  useEffect(() => {
    if (visible && defaultDate) {
      setSelectedDate(new Date(defaultDate));
      setCurrentMonth(new Date(defaultDate));
    }
  }, [visible, defaultDate]);

  const handleSubmit = () => {
    if (!title.trim()) return;

    // 데이터 가공
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
          {/* 🔥 1. 중앙 정렬 날짜 선택 모달 (Portal 역할) */}
          <AnimatePresence>
            {isCalendarOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="w-full max-w-[260px] bg-white rounded-[32px] shadow-2xl p-5 pointer-events-auto"
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
                      <ChevronLeft size={20} className="text-purple-500" />
                    </Button>
                    <div className="flex gap-1">
                      <select
                        value={currentMonth.getFullYear()}
                        onChange={(e) =>
                          setCurrentMonth(
                            setYear(currentMonth, parseInt(e.target.value)),
                          )
                        }
                        className="bg-purple-50 text-purple-700 font-bold text-xs rounded-lg px-1 py-0.5 border-none"
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
                        className="bg-purple-50 text-purple-700 font-bold text-xs rounded-lg px-1 py-0.5 border-none"
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
                      <ChevronRight size={20} className="text-purple-500" />
                    </Button>
                  </div>

                  <style>{`
                    .rdp-caption { display: none !important; }
                    .rdp-table { width: 100% !important; }
                    .rdp-day { width: 38px !important; height: 38px !important; display: flex !important; align-items: center !important; justify-content: center !important; margin: auto !important; font-weight: 600 !important; font-size: 13px !important; }
                    .rdp-day_selected { background-color: #a855f7 !important; color: white !important; border-radius: 12px !important; }
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
                      caption: "flex justify-center relative items-center h-0", // 높이를 0으로 만들어 공간 제거
                    }}
                  />

                  <Button
                    onClick={() => setIsCalendarOpen(false)}
                    className="w-full h-12 mt-5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-lg"
                  >
                    선택 완료
                  </Button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900">일정 추가</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-gray-100"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="일정 작성하기"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-300"
              />

              {/* 🔥 날짜 및 시간 - 한 줄 배치 (Grid 2열) */}
              <div className="grid grid-cols-2 gap-2">
                {/* 날짜 선택 버튼 */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                    날짜
                  </p>
                  <button
                    onClick={() => setIsCalendarOpen(true)}
                    className="w-full flex items-center gap-2 bg-gray-50 rounded-2xl px-3 py-3 border border-transparent hover:border-purple-100 transition-all text-left"
                  >
                    <CalendarIcon className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span className="text-[11px] text-gray-800 font-black truncate">
                      {format(selectedDate, "yyyy년 MM월 dd일", { locale: ko })}
                    </span>
                  </button>
                </div>

                {/* 2. 시간 선택 (3열 가득 찬 스타일) */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                    시간
                  </p>
                  <div className="flex gap-1">
                    {/* 오전/오후 선택 */}
                    <select
                      value={timeState.ampm}
                      onChange={(e) =>
                        setTimeState((p) => ({ ...p, ampm: e.target.value }))
                      }
                      className="flex-1 h-10 bg-gray-50 rounded-xl text-[10px] font-bold text-center border-none focus:ring-1 focus:ring-purple-200 appearance-none"
                    >
                      <option>오전</option>
                      <option>오후</option>
                    </select>

                    {/* 시(Hour) 선택 */}
                    <select
                      value={timeState.hour}
                      onChange={(e) =>
                        setTimeState((p) => ({ ...p, hour: e.target.value }))
                      }
                      className="flex-1 h-10 bg-gray-50 rounded-xl text-[10px] font-bold text-center border-none focus:ring-1 focus:ring-purple-200 appearance-none"
                    >
                      {Array.from({ length: 12 }, (_, i) =>
                        String(i + 1).padStart(2, "0"),
                      ).map((h) => (
                        <option key={h} value={h}>
                          {h}시
                        </option>
                      ))}
                    </select>

                    {/* 분(Minute) 선택 - 🔥 1분 단위로 변경됨 */}
                    <select
                      value={timeState.minute}
                      onChange={(e) =>
                        setTimeState((p) => ({ ...p, minute: e.target.value }))
                      }
                      className="flex-1 h-10 bg-gray-50 rounded-xl text-[10px] font-bold text-center border-none focus:ring-1 focus:ring-purple-200 appearance-none"
                    >
                      {minutes.map((m) => (
                        <option key={m} value={m}>
                          {m}분
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                      category === c.value
                        ? c.color + " ring-2 ring-offset-1 ring-purple-300"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleSubmit}
                disabled={!title.trim()}
                className="w-full py-3 rounded-xl bg-purple-500 text-white font-bold text-sm disabled:opacity-40"
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

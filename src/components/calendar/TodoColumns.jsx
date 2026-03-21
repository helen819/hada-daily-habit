import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

const CATEGORY_LABELS = {
  work: {
    label: "업무",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-800/50 dark:text-blue-200",
  },
  personal: {
    label: "개인",
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-800/50 dark:text-purple-200",
  },
  hobby: {
    label: "취미",
    color:
      "bg-green-100 text-green-700 dark:bg-green-800/50 dark:text-green-200",
  },

  other: {
    label: "기타",
    color: "bg-gray-100 text-gray-700 dark:bg-slate-600 dark:text-slate-200",
  },
};

function TodoCard({ todo, onToggle }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-[#363D54] rounded-xl border border-gray-100 dark:border-[#4A5270] p-3 shadow-sm transition-opacity ${
        todo.completed ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggle(todo)}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            todo.completed
              ? "border-green-400 bg-green-50 dark:bg-green-800/40"
              : "border-gray-300 dark:border-[#4A5270] hover:border-green-400 dark:hover:border-green-400"
          }`}
        >
          {todo.completed && (
            <Check className="w-3 h-3 text-green-500 dark:text-green-300" />
          )}
        </button>
        <p
          className="text-sm text-gray-800 dark:text-slate-200 flex-1 cursor-pointer"
          onClick={() => setExpanded((v) => !v)}
        >
          {todo.title}
        </p>
        {todo.micro_step && (
          <button onClick={() => setExpanded((v) => !v)}>
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-gray-300 dark:text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-gray-300 dark:text-slate-400" />
            )}
          </button>
        )}
      </div>
      <AnimatePresence>
        {expanded && todo.micro_step && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-xs text-purple-500 dark:text-purple-300 mt-2 pl-7 leading-relaxed"
          >
            💡 {todo.micro_step}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ScheduleCard({ schedule, onToggle }) {
  const cat = CATEGORY_LABELS[schedule.category] || CATEGORY_LABELS.personal;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-[#363D54] rounded-xl border border-blue-100 dark:border-blue-800/40 p-3 shadow-sm`}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggle(schedule)}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            schedule.completed
              ? "border-blue-400 bg-blue-50 dark:bg-blue-800/40"
              : "border-blue-300 dark:border-blue-500 hover:border-blue-500 dark:hover:border-blue-300"
          }`}
        >
          {schedule.completed && (
            <Check className="w-3 h-3 text-blue-500 dark:text-blue-300" />
          )}
        </button>
        <p className={`text-sm flex-1 "text-gray-800 dark:text-slate-200"`}>
          {schedule.title}
        </p>
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ${cat.color}`}
        >
          {cat.label}
        </span>
      </div>
      {schedule.time && (
        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 pl-7">
          🕐 {schedule.time}
        </p>
      )}
    </motion.div>
  );
}

export default function TodoColumns({
  todos,
  schedules = [],
  onToggle,
  onToggleSchedule,
}) {
  const [activeTab, setActiveTab] = useState("active");

  const activeTodos = (todos || []).filter((t) => !t.completed);
  const doneTodos = (todos || []).filter((t) => t.completed);
  const activeSchedules = (schedules || [])
    .filter((s) => !s.completed)
    .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
  const doneSchedules = (schedules || [])
    .filter((s) => s.completed)
    .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));

  const activeCount = activeTodos.length + activeSchedules.length;
  const doneCount = doneTodos.length + doneSchedules.length;

  const isEmpty =
    activeTab === "active"
      ? activeTodos.length === 0 && activeSchedules.length === 0
      : doneTodos.length === 0 && doneSchedules.length === 0;

  return (
    <div>
      {/* 탭 스위처 */}
      <div className="flex gap-1 mb-3 bg-gray-100 dark:bg-[#1A1F2E] rounded-xl p-1">
        <button
          onClick={() => setActiveTab("active")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "active"
              ? "bg-white dark:bg-[#2E3447] text-gray-800 dark:text-white shadow-sm"
              : "text-gray-400 dark:text-slate-400"
          }`}
        >
          진행 중{" "}
          {activeCount > 0 && (
            <span className="ml-1 text-purple-400 dark:text-purple-300">
              {activeCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("done")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "done"
              ? "bg-white dark:bg-[#2E3447] text-gray-800 dark:text-white shadow-sm"
              : "text-gray-400 dark:text-slate-400"
          }`}
        >
          완료{" "}
          {doneCount > 0 && (
            <span className="ml-1 text-green-400 dark:text-green-300">
              {doneCount}
            </span>
          )}
        </button>
      </div>

      {/* 목록 */}
      <div className="space-y-2">
        {isEmpty ? (
          <p className="text-xs text-gray-300 dark:text-slate-500 text-center py-4">
            {activeTab === "active"
              ? "진행 중인 할 일이 없어요"
              : "완료한 할 일이 없어요"}
          </p>
        ) : (
          <>
            {/* Todo 항목 */}
            <AnimatePresence>
              {(activeTab === "active" ? activeTodos : doneTodos).map((t) => (
                <TodoCard key={`todo-${t.id}`} todo={t} onToggle={onToggle} />
              ))}
            </AnimatePresence>

            {/* 일정 구분 레이블 */}
            {(activeTab === "active" ? activeSchedules : doneSchedules).length >
              0 && (
              <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest pt-1 pb-0.5 px-1">
                일정
              </p>
            )}

            {/* Schedule 항목 */}
            <AnimatePresence>
              {(activeTab === "active" ? activeSchedules : doneSchedules).map(
                (s) => (
                  <ScheduleCard
                    key={`schedule-${s.id}`}
                    schedule={s}
                    onToggle={onToggleSchedule}
                  />
                ),
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}

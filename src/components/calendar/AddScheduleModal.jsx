import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock } from "lucide-react";

const CATEGORIES = [
  { value: "work", label: "업무", color: "bg-blue-100 text-blue-700" },
  { value: "personal", label: "개인", color: "bg-purple-100 text-purple-700" },
  { value: "hobby", label: "취미", color: "bg-green-100 text-green-700" },
  { value: "other", label: "기타", color: "bg-gray-100 text-gray-700" },
];

export default function AddScheduleModal({ visible, defaultDate, onClose, onAdd }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("09:00");
  const [category, setCategory] = useState("work");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({ title: title.trim(), date, time, category, completed: false });
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
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900">일정 추가</h2>
              <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100">
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

              <div className="flex gap-3">
                <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200">
                  <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="text-sm text-gray-700 font-medium focus:outline-none w-full"
                  />
                </div>
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200">
                  <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="text-sm text-gray-700 font-medium focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                      category === c.value ? c.color + " ring-2 ring-offset-1 ring-purple-300" : "bg-gray-100 text-gray-500"
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
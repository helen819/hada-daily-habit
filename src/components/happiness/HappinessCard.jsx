import React, { useState } from "react";
import { motion } from "framer-motion";

const PASTEL_COLORS = [
  {
    bg: "bg-pink-50 dark:bg-pink-900/30",
    border: "border-pink-200 dark:border-pink-700/60",
    text: "text-pink-600 dark:text-pink-300",
  },
  {
    bg: "bg-rose-50 dark:bg-rose-900/30",
    border: "border-rose-200 dark:border-rose-700/60",
    text: "text-rose-600 dark:text-rose-300",
  },
  {
    bg: "bg-orange-50 dark:bg-orange-900/30",
    border: "border-orange-200 dark:border-orange-700/60",
    text: "text-orange-600 dark:text-orange-300",
  },
  {
    bg: "bg-purple-50 dark:bg-purple-900/30",
    border: "border-purple-200 dark:border-purple-700/60",
    text: "text-purple-600 dark:text-purple-300",
  },
  {
    bg: "bg-sky-50 dark:bg-sky-900/30",
    border: "border-sky-200 dark:border-sky-700/60",
    text: "text-sky-600 dark:text-sky-300",
  },
];

export default function HappinessCard({ record, index }) {
  const color = PASTEL_COLORS[index % PASTEL_COLORS.length];
  const [bouncing, setBouncing] = useState(false);

  const handleEmojiClick = () => {
    setBouncing(true);
    setTimeout(() => setBouncing(false), 600);
  };

  return (
    <div
      className={`w-full rounded-2xl border ${color.bg} ${color.border} px-4 py-3`}
    >
      <div className="flex items-start gap-2">
        <motion.span
          className="text-2xl mt-0.5 cursor-pointer select-none"
          onClick={handleEmojiClick}
          animate={bouncing ? { y: [0, -10, 0, -6, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          {record.emoji || "🙂"}
        </motion.span>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold ${color.text} mb-1`}>
            {record.date ||
              new Date(record.created_date).toLocaleDateString("ko-KR")}
          </p>
          <p className="text-sm text-gray-700 dark:text-slate-200 leading-relaxed break-words">
            {record.text}
          </p>
        </div>
      </div>
    </div>
  );
}

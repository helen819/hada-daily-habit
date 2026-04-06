import React, { useState } from "react";
import { motion } from "framer-motion";

const PASTEL_COLORS = [
  {
    bg: "bg-pink-50 dark:bg-pink-950/50",
    border: "border-pink-200 dark:border-pink-900/60",
    text: "text-pink-500 dark:text-pink-400",
  },
  {
    bg: "bg-violet-50 dark:bg-violet-950/50",
    border: "border-violet-200 dark:border-violet-900/60",
    text: "text-violet-500 dark:text-violet-400",
  },
  {
    bg: "bg-sky-50 dark:bg-sky-950/50",
    border: "border-sky-200 dark:border-sky-900/60",
    text: "text-sky-500 dark:text-sky-400",
  },
  {
    bg: "bg-purple-50 dark:bg-purple-950/50",
    border: "border-purple-200 dark:border-purple-900/60",
    text: "text-purple-500 dark:text-purple-400",
  },
  {
    bg: "bg-rose-50 dark:bg-rose-950/50",
    border: "border-rose-200 dark:border-rose-900/60",
    text: "text-rose-500 dark:text-rose-400",
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
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed break-words">
            {record.text}
          </p>
        </div>
      </div>
    </div>
  );
}

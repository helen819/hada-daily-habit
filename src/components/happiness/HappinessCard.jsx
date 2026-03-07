import React, { useState } from "react";
import { motion } from "framer-motion";

const PASTEL_COLORS = [
  { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-600" },
  { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-600" },
  { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-600" },
  { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-600" },
  { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-600" },
];

export default function HappinessCard({ record, index }) {
  const color = PASTEL_COLORS[index % PASTEL_COLORS.length];
  const [bouncing, setBouncing] = useState(false);

  const handleEmojiClick = () => {
    setBouncing(true);
    setTimeout(() => setBouncing(false), 600);
  };

  return (
    <div className={`w-full rounded-2xl border ${color.bg} ${color.border} px-4 py-3`}>
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
            {record.date || new Date(record.created_date).toLocaleDateString("ko-KR")}
          </p>
          <p className="text-sm text-gray-700 leading-relaxed break-words">{record.text}</p>
        </div>
      </div>
    </div>
  );
}
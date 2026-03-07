import React from "react";
import { motion } from "framer-motion";

export default function ModeToggle({ mode, onToggle }) {
  const isAction = mode === "action";

  return (
    <div className="relative w-full rounded-3xl p-1 bg-gray-100 flex">
      <motion.div
        className="absolute top-1 bottom-1 rounded-2xl"
        style={{ width: "calc(50% - 4px)" }}
        animate={{
          x: isAction ? 0 : "100%",
          backgroundColor: isAction ? "#A855F7" : "#3B82F6",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
      <button
        onClick={() => !isAction && onToggle()}
        className="relative z-10 flex-1 flex items-center justify-center gap-2 py-2"
      >
        <span className="text-lg">🔥</span>
        <span className={`text-xs font-semibold ${isAction ? "text-white" : "text-gray-400"}`}>
          활동
        </span>
      </button>
      <button
        onClick={() => isAction && onToggle()}
        className="relative z-10 flex-1 flex items-center justify-center gap-2 py-2"
      >
        <span className="text-lg">💧</span>
        <span className={`text-xs font-semibold ${!isAction ? "text-white" : "text-gray-400"}`}>
          휴식
        </span>
      </button>
    </div>
  );
}
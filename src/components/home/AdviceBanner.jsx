import React from "react";
import { motion } from "framer-motion";

export default function AdviceBanner({ title, body, mode }) {
  const isAction = mode === "action";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-5 ${
        isAction
          ? "bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100"
          : "bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100"
      }`}
    >
      <p className={`text-[11px] font-bold tracking-wider uppercase mb-2 ${
        isAction ? "text-purple-500" : "text-indigo-500"
      }`}>
        {title}
      </p>
      <p className="text-xs text-gray-700 leading-relaxed">{body}</p>
    </motion.div>
  );
}
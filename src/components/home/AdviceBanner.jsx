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
          ? "bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 dark:from-purple-800/30 dark:to-indigo-800/30 dark:border-purple-600/50"
          : "bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 dark:from-indigo-800/30 dark:to-blue-800/30 dark:border-indigo-600/50"
      }`}
    >
      <p
        className={`text-[11px] font-bold tracking-wider uppercase mb-2 ${
          isAction
            ? "text-purple-500 dark:text-purple-300"
            : "text-indigo-500 dark:text-indigo-300"
        }`}
      >
        {title}
      </p>
      <p className="text-xs text-gray-700 dark:text-slate-200 leading-relaxed">
        {body}
      </p>
    </motion.div>
  );
}

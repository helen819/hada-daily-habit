import React from "react";
import { motion } from "framer-motion";

const categoryColor = {
  strengths: "bg-green-500",
  weakness: "bg-orange-500",
  potentials: "bg-blue-500",
};

const categoryLabel = {
  strengths: "강점",
  weakness: "약점",
  potentials: "가능성",
};

export default function FortuneStats({ fortuneStats, level, onStatGain }) {
  if (!fortuneStats) return null;

  const allStats = [
    ...Object.entries(fortuneStats.strengths || {}).map(([name, value]) => ({
      name,
      value,
      category: "strengths",
    })),
    ...Object.entries(fortuneStats.weakness || {}).map(([name, value]) => ({
      name,
      value,
      category: "weakness",
    })),
    ...Object.entries(fortuneStats.potentials || {}).map(([name, value]) => ({
      name,
      value,
      category: "potentials",
    })),
  ];

  if (allStats.length === 0) return null;

  return (
    <div className="bg-white dark:bg-[#2E3447] rounded-3xl border border-gray-100 dark:border-[#424B63] p-4 space-y-3 shadow-md dark:shadow-[0_2px_12px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
          운명 스탯
        </h3>
        <span className="text-[10px] text-purple-400 dark:text-purple-300 font-semibold">
          Lv.{level || 1}
        </span>
      </div>

      {allStats.map(({ name, value, category }, i) => (
        <motion.div
          key={name}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3"
        >
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${categoryColor[category]}`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-gray-700 dark:text-slate-200 truncate">
                {name}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-slate-400 ml-2 flex-shrink-0">
                {categoryLabel[category]} · {value}
              </span>
            </div>
            {/* 트랙을 카드보다 어둡게 — 바가 선명하게 돋보임 */}
            <div className="h-1.5 bg-gray-100 dark:bg-[#1A1F2E] rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  value > 70
                    ? "bg-green-400"
                    : value > 50
                    ? "bg-yellow-400"
                    : "bg-orange-400"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
              />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

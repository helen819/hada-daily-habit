import React from "react";
import { motion } from "framer-motion";
import { Zap, Palette, Users, Target, Star } from "lucide-react";

const LineIcon = ({ icon: Icon, className }) => (
  <Icon className={className} strokeWidth={1.5} />
);

const STAT_CONFIG = {
  work_efficiency: {
    label: "업무효율",
    icon: Zap,
    iconBg: "bg-purple-100 dark:bg-purple-800/60", // /40 → /60 더 진하게
    iconColor: "text-purple-600 dark:text-purple-300", // 400 → 300 더 밝게
    barClass: "bg-gradient-to-r from-purple-400 to-violet-500",
    valueColor: "text-purple-600 dark:text-purple-300",
  },
  creativity: {
    label: "창의력",
    icon: Palette,
    iconBg: "bg-fuchsia-100 dark:bg-fuchsia-800/60",
    iconColor: "text-fuchsia-600 dark:text-fuchsia-300",
    barClass: "bg-gradient-to-r from-fuchsia-400 to-purple-500",
    valueColor: "text-fuchsia-600 dark:text-fuchsia-300",
  },
  communication: {
    label: "소통력",
    icon: Users,
    iconBg: "bg-pink-100 dark:bg-pink-800/60",
    iconColor: "text-pink-600 dark:text-pink-300",
    barClass: "bg-gradient-to-r from-pink-400 to-rose-500",
    valueColor: "text-pink-600 dark:text-pink-300",
  },
  focus: {
    label: "집중력",
    icon: Target,
    iconBg: "bg-blue-100 dark:bg-blue-800/60",
    iconColor: "text-blue-600 dark:text-blue-300",
    barClass: "bg-gradient-to-r from-blue-400 to-sky-500",
    valueColor: "text-blue-600 dark:text-blue-300",
  },
  fortune: {
    label: "행운",
    icon: Star,
    iconBg: "bg-amber-100 dark:bg-amber-800/60",
    iconColor: "text-amber-600 dark:text-amber-300",
    barClass: "bg-gradient-to-r from-amber-400 to-yellow-500",
    valueColor: "text-amber-600 dark:text-amber-300",
  },
};

export default function EnergyStats({ stats }) {
  if (!stats) return null;

  const entries = Object.entries(STAT_CONFIG).filter(
    ([key]) => stats[key] != null,
  );
  const totalEnergy =
    entries.length > 0
      ? Math.round(
          entries.reduce((sum, [key]) => sum + (stats[key] || 0), 0) /
            entries.length,
        )
      : 0;

  return (
    // 카드 배경을 bg-card보다 한 단계 밝게 — 배경(#121212)에서 확실히 떠 보임
    <div className="bg-white dark:bg-[#2E3447] rounded-3xl border border-gray-100 dark:border-[#424B63] p-5 shadow-md dark:shadow-[0_2px_12px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-800 dark:text-white">
          오늘의 에너지
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-400 dark:text-slate-400 font-medium">
            총 에너지
          </span>
          <span className="text-lg font-black text-purple-600 dark:text-purple-300">
            {totalEnergy}
          </span>
        </div>
      </div>
      <div className="space-y-4">
        {entries.map(([key, cfg], i) => {
          const value = Math.round(stats[key]);
          const Icon = cfg.icon;
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              className="flex items-center gap-3"
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`}
              >
                <LineIcon icon={Icon} className={`w-4 h-4 ${cfg.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-700 dark:text-slate-200">
                    {cfg.label}
                  </span>
                  <span className={`text-xs font-bold ${cfg.valueColor}`}>
                    {value}%
                  </span>
                </div>
                {/* 트랙을 카드보다 어둡게 — 진행된 부분이 확실히 보임 */}
                <div className="h-2.5 bg-gray-100 dark:bg-[#1A1F2E] rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${cfg.barClass}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 0.7, delay: i * 0.07 }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

import React from "react";
import { motion } from "framer-motion";
import { Zap, Palette, Users, Target, Star } from "lucide-react";

// Line-art icon wrapper - applies strokeWidth 1.5 for consistent look
const LineIcon = ({ icon: Icon, className }) => <Icon className={className} strokeWidth={1.5} />;

const STAT_CONFIG = {
  work_efficiency: {
    label: "업무효율",
    icon: Zap,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    barClass: "bg-gradient-to-r from-purple-400 to-violet-500",
    valueColor: "text-purple-600",
  },
  creativity: {
    label: "창의력",
    icon: Palette,
    iconBg: "bg-fuchsia-100",
    iconColor: "text-fuchsia-600",
    barClass: "bg-gradient-to-r from-fuchsia-400 to-purple-500",
    valueColor: "text-fuchsia-600",
  },
  communication: {
    label: "소통력",
    icon: Users,
    iconBg: "bg-pink-100",
    iconColor: "text-pink-600",
    barClass: "bg-gradient-to-r from-pink-400 to-rose-500",
    valueColor: "text-pink-600",
  },
  focus: {
    label: "집중력",
    icon: Target,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    barClass: "bg-gradient-to-r from-blue-400 to-sky-500",
    valueColor: "text-blue-600",
  },
  fortune: {
    label: "행운",
    icon: Star,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    barClass: "bg-gradient-to-r from-amber-400 to-yellow-500",
    valueColor: "text-amber-600",
  },
};

export default function EnergyStats({ stats }) {
  if (!stats) return null;

  const entries = Object.entries(STAT_CONFIG).filter(([key]) => stats[key] != null);
  const totalEnergy = entries.length > 0
    ? Math.round(entries.reduce((sum, [key]) => sum + (stats[key] || 0), 0) / entries.length)
    : 0;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-800">오늘의 에너지</h3>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-400 font-medium">총 에너지</span>
          <span className="text-lg font-black text-purple-600">{totalEnergy}</span>
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
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`}>
                <LineIcon icon={Icon} className={`w-4 h-4 ${cfg.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                   <span className="text-xs font-semibold text-gray-700">{cfg.label}</span>
                   <span className={`text-xs font-bold ${cfg.valueColor}`}>{value}%</span>
                 </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
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
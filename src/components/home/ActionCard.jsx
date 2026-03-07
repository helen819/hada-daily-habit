import React from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, Palette, MessageCircle, Target, Clover } from "lucide-react";

const statIcons = {
  work_efficiency: Target,
  creativity: Palette,
  communication: MessageCircle,
  focus: Sparkles,
  fortune: Clover,
};

const statColors = {
  work_efficiency: "from-orange-100 to-amber-50 border-orange-200",
  creativity: "from-pink-100 to-rose-50 border-pink-200",
  communication: "from-blue-100 to-sky-50 border-blue-200",
  focus: "from-purple-100 to-violet-50 border-purple-200",
  fortune: "from-emerald-100 to-green-50 border-emerald-200",
};

const statIconColors = {
  work_efficiency: "text-orange-500",
  creativity: "text-pink-500",
  communication: "text-blue-500",
  focus: "text-purple-500",
  fortune: "text-emerald-500",
};

export default function ActionCard({ action, index, onComplete }) {
  const Icon = statIcons[action.stat_focus] || Sparkles;
  const colors = statColors[action.stat_focus] || "from-gray-100 to-gray-50 border-gray-200";
  const iconColor = statIconColors[action.stat_focus] || "text-gray-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => !action.completed && onComplete(action)}
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${colors} p-4 cursor-pointer transition-all ${
        action.completed ? "opacity-60" : "hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-xl bg-white/70 ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium break-words ${action.completed ? "text-gray-400" : "text-gray-800"}`}>
            {action.micro_action}
          </p>
        </div>
        {action.completed ? (
          <div className="p-1.5 rounded-full bg-green-100">
            <Check className="w-3.5 h-3.5 text-green-600" />
          </div>
        ) : (
          <div className="p-1.5 rounded-full border-2 border-gray-300 bg-white" />
        )}
      </div>
    </motion.div>
  );
}
import React, { useState } from "react";
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
  work_efficiency: "from-purple-400 to-violet-500",
  creativity: "from-fuchsia-400 to-purple-500",
  communication: "from-pink-400 to-rose-500",
  focus: "from-blue-400 to-sky-500",
  fortune: "from-amber-400 to-yellow-500",
};

const cardFrontColors = {
  work_efficiency: "from-purple-100 to-violet-50 border-purple-200",
  creativity: "from-fuchsia-100 to-purple-50 border-fuchsia-200",
  communication: "from-pink-100 to-rose-50 border-pink-200",
  focus: "from-blue-100 to-sky-50 border-blue-200",
  fortune: "from-amber-100 to-yellow-50 border-amber-200",
};

const statIconColors = {
  work_efficiency: "text-purple-600",
  creativity: "text-fuchsia-600",
  communication: "text-pink-600",
  focus: "text-blue-600",
  fortune: "text-amber-600",
};

export default function TarotActionCard({ action, index, onComplete }) {
  const [flipped, setFlipped] = useState(false);
  const Icon = statIcons[action.stat_focus] || Sparkles;
  const backGradient = statColors[action.stat_focus] || "from-purple-400 to-indigo-500";
  const frontColors = cardFrontColors[action.stat_focus] || "from-gray-100 to-gray-50 border-gray-200";
  const iconColor = statIconColors[action.stat_focus] || "text-gray-500";

  const handleFlip = () => {
    if (!flipped) setFlipped(true);
  };

  const handleComplete = (e) => {
    e.stopPropagation();
    if (!action.completed) onComplete(action);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="relative"
      style={{ perspective: "1000px", height: "120px" }}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d", position: "relative", width: "100%", height: "100%" }}
      >
        {/* Back face (shown before flip) */}
        <div
          onClick={handleFlip}
          className="absolute inset-0 cursor-pointer rounded-2xl overflow-hidden"
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
        >
          <div className={`w-full h-full bg-gradient-to-br ${backGradient} flex flex-col items-center justify-center gap-2`}>
            <div className="text-white/40 text-3xl font-serif select-none">✦</div>
            <p className="text-white/80 text-xs font-semibold tracking-widest uppercase">눌러서 열기</p>
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-1 h-1 rounded-full bg-white/30" />
              ))}
            </div>
          </div>
        </div>

        {/* Front face (shown after flip) */}
        <div
          className={`absolute inset-0 rounded-2xl border bg-gradient-to-br ${frontColors} ${action.completed ? "opacity-50" : ""}`}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="flex items-start gap-3 p-4 h-full">
            <div className={`p-2 rounded-xl bg-white/70 ${iconColor} flex-shrink-0`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                {action.keyword}
              </p>
              <p className="text-sm font-medium leading-relaxed text-gray-800">
                {action.micro_action}
              </p>
            </div>
            {flipped && (
              <button
                onClick={handleComplete}
                className={`p-1.5 rounded-full flex-shrink-0 transition-all ${
                  action.completed
                    ? "bg-green-100"
                    : "border-2 border-gray-300 bg-white hover:border-green-400"
                }`}
              >
                {action.completed
                  ? <Check className="w-3.5 h-3.5 text-green-600" />
                  : <div className="w-3.5 h-3.5" />
                }
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
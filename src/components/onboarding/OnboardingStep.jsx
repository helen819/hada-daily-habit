import React from "react";
import { motion } from "framer-motion";

export default function OnboardingStep({ step, totalSteps, title, subtitle, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col min-h-screen"
    >
      {/* Progress */}
      <div className="px-6 pt-8 pb-4">
        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                i <= step ? "bg-purple-400" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3 tracking-wide">{step + 1} / {totalSteps}</p>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mb-8">{subtitle}</p>}
        {children}
      </div>
    </motion.div>
  );
}
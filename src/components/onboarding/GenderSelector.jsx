import React from "react";
import { motion } from "framer-motion";

const genders = [
  { value: "male", label: "남성", icon: "👨" },
  { value: "female", label: "여성", icon: "👩" },
  { value: "other", label: "기타", icon: "🌈" },
];

export default function GenderSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {genders.map((g) => (
        <motion.button
          key={g.value}
          whileTap={{ scale: 0.95 }}
          onClick={() => onChange(g.value)}
          className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${
            value === g.value
              ? "border-purple-400 bg-purple-50 shadow-sm"
              : "border-gray-100 bg-white hover:border-gray-200"
          }`}
        >
          <span className="text-3xl">{g.icon}</span>
          <span className={`text-sm font-medium ${value === g.value ? "text-purple-600" : "text-gray-600"}`}>
            {g.label}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
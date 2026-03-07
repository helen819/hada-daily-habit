import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart } from "lucide-react";

const moods = [
  { score: 1, emoji: "😔" },
  { score: 2, emoji: "😐" },
  { score: 3, emoji: "🙂" },
  { score: 4, emoji: "😊" },
  { score: 5, emoji: "🥰" },
];

export default function HappinessInput({ onSubmit, isSubmitting }) {
  const [text, setText] = useState("");
  const [moodScore, setMoodScore] = useState(3);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit({
      text: text.trim(),
      mood_score: moodScore,
      emoji: moods.find((m) => m.score === moodScore)?.emoji || "🙂",
      date: new Date().toISOString().split("T")[0],
    });
    setText("");
    setMoodScore(3);
  };

  return (
    <div className="rounded-3xl bg-white shadow-md p-5 border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
          <Heart className="w-4 h-4 text-pink-500" />
        </div>
        <p className="text-sm font-semibold text-gray-800">오늘의 행복 기록</p>
      </div>

      <div className="flex justify-center gap-3 mb-4">
        {moods.map((m) => (
          <motion.button
            key={m.score}
            whileTap={{ scale: 0.85 }}
            onClick={() => setMoodScore(m.score)}
            className={`text-2xl p-2 rounded-xl transition-all ${
              moodScore === m.score ? "bg-pink-100 shadow-md scale-110" : "opacity-50 hover:opacity-70"
            }`}
          >
            {m.emoji}
          </motion.button>
        ))}
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="오늘의 행복 기록하기..."
        className="bg-gray-50 border border-gray-200 rounded-2xl mb-3 resize-none text-sm focus:bg-white"
        rows={3}
      />
      <Button
        onClick={handleSubmit}
        disabled={!text.trim() || isSubmitting}
        className="w-full rounded-2xl h-11 bg-gradient-to-r from-pink-400 to-orange-400 hover:from-pink-500 hover:to-orange-500 text-white text-sm font-semibold"
      >
        기록하기
      </Button>
    </div>
  );
}
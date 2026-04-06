import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart } from "lucide-react";
import { Keyboard } from "@capacitor/keyboard";
import { getKSTDateString } from "@/utils/date";

const MAX_LENGTH = 100;

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
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const isOverLimit = text.length > MAX_LENGTH;

  useEffect(() => {
    const hideListener = Keyboard.addListener("keyboardWillHide", () => {
      if (inputRef.current) inputRef.current.blur();
      handleInputBlur();
    });
    return () => hideListener.remove();
  }, []);

  const handleInputFocus = () => {
    const container = document.querySelector(".min-h-screen") || document.body;
    container.style.paddingBottom = "60vh";
    setTimeout(() => {
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
  };

  const handleInputBlur = () => {
    const container = document.querySelector(".min-h-screen") || document.body;
    setTimeout(() => {
      container.style.paddingBottom = "";
    }, 300);
  };

  const handleSubmit = () => {
    if (!text.trim() || isOverLimit) return;
    onSubmit({
      text: text.trim(),
      mood_score: moodScore,
      emoji: moods.find((m) => m.score === moodScore)?.emoji || "🙂",
      date: getKSTDateString(),
    });
    setText("");
    setMoodScore(3);
    inputRef.current?.blur();
  };

  return (
    <div
      ref={listRef}
      className="rounded-3xl bg-white dark:bg-gray-900 p-5 border border-pink-100 dark:border-gray-800 shadow-sm"
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-950/50 flex items-center justify-center">
          <Heart className="w-4 h-4 text-pink-400 dark:text-pink-400" />
        </div>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          오늘의 행복 기록
        </p>
      </div>

      {/* 무드 선택 */}
      <div className="flex justify-center gap-3 mb-4">
        {moods.map((m) => (
          <motion.button
            key={m.score}
            whileTap={{ scale: 0.85 }}
            onClick={() => setMoodScore(m.score)}
            className={`text-2xl p-2 rounded-xl transition-all ${
              moodScore === m.score
                ? "bg-pink-50 dark:bg-pink-950/50 shadow-sm scale-110"
                : "opacity-50 hover:opacity-70"
            }`}
          >
            {m.emoji}
          </motion.button>
        ))}
      </div>

      {/* 텍스트 입력 */}
      <div className="relative">
        <Textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="오늘의 행복 기록하기..."
          className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 rounded-2xl mb-2 resize-none text-sm focus:bg-white dark:focus:bg-gray-800 transition-all pr-3"
          rows={3}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          maxLength={MAX_LENGTH}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
        />
      </div>

      {/* 글자 수 카운터 */}
      <div className="flex justify-end px-1 mb-3">
        <span
          className={`text-[10px] font-bold ${
            isOverLimit
              ? "text-red-400 dark:text-red-400"
              : "text-gray-400 dark:text-gray-600"
          }`}
        >
          {text.length} / {MAX_LENGTH}
        </span>
      </div>

      {/* 제출 버튼 */}
      <Button
        onClick={handleSubmit}
        disabled={!text.trim() || isSubmitting || isOverLimit}
        className={`w-full rounded-2xl h-11 transition-all text-sm font-semibold shadow-sm border-0 ${
          isOverLimit
            ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed shadow-none"
            : "bg-pink-200 hover:bg-pink-300 dark:bg-pink-900/50 dark:hover:bg-pink-900/70 text-pink-900 dark:text-pink-200"
        }`}
      >
        기록하기
      </Button>
    </div>
  );
}

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart } from "lucide-react";
import { Keyboard } from "@capacitor/keyboard"; // 🔥 추가

const MAX_LENGTH = 100; // 최대 글자 수

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
  // 🔥 1. 전체 리스트를 가리키는 ref 생성
  const listRef = useRef(null);
  const inputRef = useRef(null); // 🔥 인풋 직접 제어를 위한 ref

  // 글자 수 초과 여부 확인
  const isOverLimit = text.length > MAX_LENGTH;

  // 🔥 키보드 이벤트 감시 및 자동 Blur 처리
  useEffect(() => {
    // 키보드가 닫혔을 때 실행될 리스너
    const hideListener = Keyboard.addListener("keyboardWillHide", () => {
      if (inputRef.current) {
        inputRef.current.blur(); // 1. 강제로 포커스 해제
      }
      handleInputBlur(); // 2. 바닥 여백 원복
    });

    return () => {
      hideListener.remove(); // 컴포넌트 언마운트 시 리스너 제거
    };
  }, []);

  // 🔥 2. 포커스 시 컴포넌트 상단을 화면 최상단으로 이동
  const handleInputFocus = () => {
    // 바닥에 충분한 공간을 주어야 최상단까지 올라갈 수 있습니다.
    const container = document.querySelector(".min-h-screen") || document.body;
    container.style.paddingBottom = "60vh";

    setTimeout(() => {
      // 컴포넌트(listRef)의 시작 부분을 화면의 'start'(최상단)로 정렬
      listRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 300);
  };

  const handleInputBlur = () => {
    const container = document.querySelector(".min-h-screen") || document.body;
    // 입력을 마치면 여백 제거
    setTimeout(() => {
      container.style.paddingBottom = "";
    }, 300);
  };

  const handleSubmit = () => {
    if (!text.trim() || isOverLimit) return; // 🔥 글자 수 초과 시 실행 방지
    onSubmit({
      text: text.trim(),
      mood_score: moodScore,
      emoji: moods.find((m) => m.score === moodScore)?.emoji || "🙂",
      date: new Date().toISOString().split("T")[0],
    });
    setText("");
    setMoodScore(3);
    // 팁: 추가 완료 후에도 키보드를 닫고 싶다면 여기서 blur() 호출
    inputRef.current?.blur();
  };

  return (
    <div
      ref={listRef}
      className="rounded-3xl bg-white shadow-md p-5 border border-gray-100"
    >
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
              moodScore === m.score
                ? "bg-pink-100 shadow-md scale-110"
                : "opacity-50 hover:opacity-70"
            }`}
          >
            {m.emoji}
          </motion.button>
        ))}
      </div>

      <div className="relative">
        <Textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="오늘의 행복 기록하기..."
          // mb-2로 줄여서 카운터와 가깝게 배치
          className={`bg-gray-50 border rounded-2xl mb-2 resize-none text-sm focus:bg-white transition-all pr-3`}
          rows={3}
          // 🔥 추가된 부분: 포커스 시 스크롤 실행
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          maxLength={MAX_LENGTH} // 글자 수 제한 적용
          onKeyDown={(e) => {
            // 1. Enter 키가 눌렸을 때
            if (e.key === "Enter") {
              // 2. 기본 동작(줄바꿈)을 막습니다.
              e.preventDefault();
            }
          }}
        />
      </div>

      {/* 2. 🔥 새로운 위치의 글자 수 카운터 (Textarea와 버튼 사이) */}
      <div className="flex justify-end px-1 mb-3">
        <span
          className={`text-[10px] font-bold ${
            isOverLimit ? "text-red-500" : "text-gray-400"
          }`}
        >
          {text.length} / {MAX_LENGTH}
        </span>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!text.trim() || isSubmitting || isOverLimit}
        className={`w-full rounded-2xl h-11 transition-all text-sm font-semibold shadow-lg ${
          isOverLimit
            ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
            : "bg-gradient-to-r from-pink-400 to-orange-400 hover:from-pink-500 hover:to-orange-500 text-white shadow-pink-100"
        }`}
      >
        기록하기
      </Button>
    </div>
  );
}

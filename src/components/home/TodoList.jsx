import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AdModal from "@/components/shop/AdModal";
import { Keyboard } from "@capacitor/keyboard"; // 🔥 추가

function ProgressTask({ todo, onToggle }) {
  return (
    <div className="flex items-center py-3 px-2 hover:bg-gray-50 transition-colors">
      <button
        onClick={() => onToggle(todo)}
        className="w-6 h-6 rounded-full border-2 border-gray-300 mr-4 bg-white flex items-center justify-center shrink-0 hover:border-purple-500 transition-colors"
      >
        {todo.completed && (
          <Check className="w-4 h-4 text-purple-500" strokeWidth={1.5} />
        )}
      </button>
      <span className="flex-1 text-[13px] font-medium text-gray-800 leading-snug">
        {todo.title}
      </span>
    </div>
  );
}

export default function TodoList({
  todos,
  onAdd,
  onToggle,
  onConvert,
  isConverting,
}) {
  const [newTodo, setNewTodo] = useState("");
  const [showAd, setShowAd] = useState(false);
  const addCountRef = useRef(0);
  const adShownRef = useRef(false);

  // 🔥 1. 전체 리스트를 가리키는 ref 생성
  const listRef = useRef(null);
  const inputRef = useRef(null); // 🔥 인풋 직접 제어를 위한 ref

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
    container.style.paddingBottom = "10vh";

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

  const handleAdd = () => {
    if (!newTodo.trim()) return;
    onAdd(newTodo.trim());
    setNewTodo("");
    if (!adShownRef.current) {
      addCountRef.current += 1;
      if (addCountRef.current >= 5) {
        setShowAd(true);
        adShownRef.current = true;
      }
    }
    // 팁: 추가 완료 후에도 키보드를 닫고 싶다면 여기서 blur() 호출
    inputRef.current?.blur();
  };

  const allTodos = todos || [];
  const activeTodos = allTodos.filter((t) => !t.completed);

  return (
    <>
      <AdModal
        visible={showAd}
        onClose={() => setShowAd(false)}
        closeLabel="닫기"
      />
      <div
        ref={listRef}
        className="p-5 rounded-3xl shadow-md border border-gray-100 bg-white"
      >
        <div className="flex justify-between mb-4 items-center">
          <h3 className="text-[14px] font-bold text-gray-900">오늘 할 일</h3>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-purple-600">
              {(todos || []).filter((t) => t.completed).length}/
              {(todos || []).length}
            </span>
            <Link
              to={createPageUrl("CalendarPage")}
              className="text-[11px] font-semibold text-gray-400 hover:text-purple-600 transition-colors whitespace-nowrap"
            >
              전체보기 →
            </Link>
          </div>
        </div>

        {/* Quick add input */}
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-3"
          >
            <div className="flex gap-2 pb-3">
              <Input
                // autoFocus
                value={newTodo}
                ref={inputRef}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAdd();
                    e.target.blur(); // 키보드 닫기
                  }
                }}
                // 🔥 추가된 부분: 포커스 시 스크롤 실행
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder="할 일 추가하기..."
                /* 
                  🔥 개선된 스타일: 
                  1. focus-visible:ring-0 (기본 파란색/검은색 링 제거)
                  2. focus:outline-none (브라우저 기본 아웃라인 제거)
                  3. focus:border-purple-400 (포커스 시 나타날 부드러운 테두리 색상)
                  4. ring-offset-0 (링 여백 제거)
                */
                className="rounded-xl bg-gray-50 border-gray-200 text-xs flex-1 transition-all focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:border-purple-400 focus:bg-white"
              />
              <button
                onClick={handleAdd}
                className="px-3 py-2 rounded-xl bg-purple-500 text-white text-xs font-semibold hover:bg-purple-600 transition-colors whitespace-nowrap"
              >
                추가
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* List */}
        <div className="space-y-3">
          <AnimatePresence>
            {activeTodos.map((todo) => (
              <motion.div
                key={todo.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -24, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                <ProgressTask todo={todo} onToggle={onToggle} />
              </motion.div>
            ))}
          </AnimatePresence>

          {activeTodos.length === 0 && (
            <p className="text-center text-[11px] text-gray-400 py-4">
              완료할 할 일이 없습니다 🎉
            </p>
          )}
        </div>
      </div>
    </>
  );
}

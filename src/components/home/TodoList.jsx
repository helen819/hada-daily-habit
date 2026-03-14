import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AdModal from "@/components/shop/AdModal";
import { Keyboard } from "@capacitor/keyboard";

function ProgressTask({ todo, onToggle }) {
  return (
    <div className="flex items-center py-3 px-2 hover:bg-gray-50 dark:hover:bg-[#363D54] transition-colors">
      <button
        onClick={() => onToggle(todo)}
        className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-[#4A5270] mr-4 bg-white dark:bg-[#1A1F2E] flex items-center justify-center shrink-0 hover:border-purple-500 dark:hover:border-purple-400 transition-colors"
      >
        {todo.completed && (
          <Check
            className="w-4 h-4 text-purple-500 dark:text-purple-300"
            strokeWidth={1.5}
          />
        )}
      </button>
      <span className="flex-1 text-[13px] font-medium text-gray-800 dark:text-slate-200 leading-snug">
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
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const hideListener = Keyboard.addListener("keyboardWillHide", () => {
      if (inputRef.current) inputRef.current.blur();
      handleInputBlur();
    });
    return () => hideListener.remove();
  }, []);

  const handleInputFocus = () => {
    const container = document.querySelector(".min-h-screen") || document.body;
    container.style.paddingBottom = "10vh";
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
        className="p-5 rounded-3xl border border-gray-100 dark:border-[#424B63] bg-white dark:bg-[#2E3447] shadow-md dark:shadow-[0_2px_12px_rgba(0,0,0,0.4)]"
      >
        {/* 헤더 */}
        <div className="flex justify-between mb-4 items-center">
          <h3 className="text-[14px] font-bold text-gray-900 dark:text-white">
            오늘 할 일
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-300">
              {(todos || []).filter((t) => t.completed).length}/
              {(todos || []).length}
            </span>
            <Link
              to={createPageUrl("CalendarPage")}
              className="text-[11px] font-semibold text-gray-400 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 transition-colors whitespace-nowrap"
            >
              전체보기 →
            </Link>
          </div>
        </div>

        {/* 입력창 */}
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-3"
          >
            <div className="flex gap-2 pb-3">
              <Input
                value={newTodo}
                ref={inputRef}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAdd();
                    e.target.blur();
                  }
                }}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder="할 일 추가하기..."
                className="rounded-xl bg-gray-50 dark:bg-[#1A1F2E] border-gray-200 dark:border-[#424B63] text-gray-900 dark:text-slate-200 placeholder:text-gray-400 dark:placeholder:text-slate-500 text-xs flex-1 transition-all focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:border-purple-400 dark:focus:border-purple-400 focus:bg-white dark:focus:bg-[#262B3D]"
              />
              <button
                onClick={handleAdd}
                className="px-3 py-2 rounded-xl bg-purple-500 dark:bg-purple-600 text-white text-xs font-semibold hover:bg-purple-600 dark:hover:bg-purple-500 transition-colors whitespace-nowrap"
              >
                추가
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* 할 일 목록 */}
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
            <p className="text-center text-[11px] text-gray-400 dark:text-slate-500 py-4">
              완료할 할 일이 없습니다 🎉
            </p>
          )}
        </div>
      </div>
    </>
  );
}

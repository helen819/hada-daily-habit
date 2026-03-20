import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Loader2, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function MicroActionSheet({
  schedule,
  profile,
  onClose,
  onSave,
}) {
  const [microAction, setMicroAction] = useState(schedule?.micro_action || "");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!schedule) return;
    setLoading(true);
    // 삭제
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `너는 HADA 앱의 운명학 마이크로 액션 엔진이다.
      
사용자 정보:
- 이름: ${profile?.full_name || "사용자"}
- 생년월일: ${profile?.birth_date || "미상"}
- 목표: ${profile?.goal || "자기계발"}

일정 정보:
- 제목: "${schedule.title}"
- 날짜: ${schedule.date}
- 시간: ${schedule.time || "미정"}

이 일정을 성공시키기 위해 1~2분 안에 바로 할 수 있는 마이크로 액션 하나를 추천해줘.
사주/기운과 연결하여 이유도 한 줄 포함. 부드러운 존댓말로.`,
      response_json_schema: {
        type: "object",
        properties: {
          micro_action: { type: "string" },
          reason: { type: "string" },
        },
      },
    });
    setMicroAction(
      res.micro_action + (res.reason ? `\n\n✨ ${res.reason}` : ""),
    );
    setLoading(false);
  };

  React.useEffect(() => {
    if (schedule && !schedule.micro_action) generate();
  }, [schedule]);

  if (!schedule) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-[#2E3447] rounded-3xl w-full max-w-md p-6 border border-transparent dark:border-[#424B63] shadow-2xl"
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-purple-500 dark:text-purple-300 font-semibold uppercase tracking-wider mb-0.5">
                마이크로 액션
              </p>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                {schedule.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#363D54] transition-colors"
            >
              <X className="w-4 h-4 text-gray-500 dark:text-slate-400" />
            </button>
          </div>

          {/* 내용 박스 */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-800/30 dark:to-indigo-800/30 rounded-2xl p-4 min-h-[100px] flex items-center justify-center mb-4 border border-transparent dark:border-purple-600/40">
            {loading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-purple-400 dark:text-purple-300" />
                <p className="text-xs text-purple-400 dark:text-purple-300">
                  운명학 분석 중...
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {microAction}
              </p>
            )}
          </div>

          {/* 버튼 */}
          <div className="flex gap-2">
            <button
              onClick={generate}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-purple-200 dark:border-purple-600/60 text-purple-600 dark:text-purple-300 text-sm font-semibold hover:bg-purple-50 dark:hover:bg-purple-800/30 disabled:opacity-40 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              다시 생성
            </button>
            <button
              onClick={() => onSave(schedule, microAction)}
              disabled={loading || !microAction}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-500 dark:bg-purple-600 hover:bg-purple-600 dark:hover:bg-purple-500 text-white text-sm font-bold disabled:opacity-40 transition-colors"
            >
              <Check className="w-4 h-4" />
              저장하기
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

import React, { useState, useMemo } from "react";
import { base44, getWeekKey } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Sparkles,
  Loader2,
  X,
  Trophy,
  RotateCcw,
  AlertTriangle,
  GripVertical,
  Calendar as CalendarIcon,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  setYear,
  setMonth as setDateMonth,
  endOfMonth,
  endOfYear,
  addMonths as addM,
  differenceInCalendarDays,
  parseISO,
} from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ─── dnd-kit imports ─────────────────────────────────────────────
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const GOAL_THEMES = [
  { dot: "bg-indigo-400" },
  { dot: "bg-rose-400" },
  { dot: "bg-amber-400" },
  { dot: "bg-emerald-400" },
  { dot: "bg-sky-400" },
  { dot: "bg-violet-400" },
  { dot: "bg-pink-400" },
];

// ─── 기간 유형 정의 ────────────────────────────────────────────────
const DURATION_TYPES = [
  { value: "no_limit", label: "꾸준히" },
  { value: "this_month", label: "이번 달" },
  { value: "this_year", label: "올해" },
  { value: "monthly", label: "N개월" },
  { value: "custom", label: "날짜 입력" },
];

// ─── deadline 계산 유틸 ────────────────────────────────────────────
function calcDeadline(durationType, durationMonths, customDate) {
  const now = new Date();
  switch (durationType) {
    case "no_limit":
      return null;
    case "this_month":
      return format(endOfMonth(now), "yyyy-MM-dd");
    case "this_year":
      return format(endOfYear(now), "yyyy-MM-dd");
    case "monthly":
      return format(
        endOfMonth(addM(now, parseInt(durationMonths || 1))),
        "yyyy-MM-dd",
      );
    case "custom":
      return customDate || null;
    default:
      return null;
  }
}

// ─── 기간 선택 컴포넌트 ────────────────────────────────────────────
function DurationSelector({ value, durationMonths, customDate, onChange }) {
  const [customCalOpen, setCustomCalOpen] = useState(false);
  const [customMonth, setCustomMonth] = useState(new Date());

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        {/* 유형 드롭다운 */}
        <div className="relative flex-1">
          <select
            value={value}
            onChange={(e) => onChange("durationType", e.target.value)}
            className="w-full h-11 pl-3 pr-7 rounded-2xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 border-2 text-sm font-semibold text-gray-700 dark:text-gray-200 appearance-none focus:outline-none focus:ring-2 focus:ring-purple-200 cursor-pointer"
          >
            {DURATION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-purple-400 rotate-90 pointer-events-none" />
        </div>

        {/* monthly: 개월 수 */}
        {value === "monthly" && (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative flex-1"
          >
            <select
              value={durationMonths}
              onChange={(e) => onChange("durationMonths", e.target.value)}
              className="w-full h-11 pl-3 pr-7 rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 appearance-none focus:outline-none focus:ring-2 focus:ring-purple-200 cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={String(m)}>
                  {m}개월
                </option>
              ))}
            </select>
            <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 rotate-90 pointer-events-none" />
          </motion.div>
        )}

        {/* custom: 날짜 피커 */}
        {value === "custom" && (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1"
          >
            <Popover open={customCalOpen} onOpenChange={setCustomCalOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-11 justify-start text-left font-semibold rounded-2xl border-2 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm px-3 gap-1.5"
                >
                  <CalendarIcon className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
                  <span
                    className={
                      customDate
                        ? "text-gray-700 dark:text-gray-200"
                        : "text-gray-400"
                    }
                  >
                    {customDate
                      ? format(new Date(customDate), "yyyy.MM.dd", {
                          locale: ko,
                        })
                      : "날짜 선택"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[260px] p-0 rounded-3xl shadow-2xl border-none overflow-hidden"
                align="end"
              >
                <div className="p-4 bg-white dark:bg-gray-900">
                  <div className="flex items-center justify-between mb-4 px-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-purple-500"
                      onClick={() => setCustomMonth(subMonths(customMonth, 1))}
                    >
                      <ChevronLeft size={20} />
                    </Button>
                    <div className="flex gap-1">
                      <select
                        value={customMonth.getFullYear()}
                        onChange={(e) =>
                          setCustomMonth(
                            setYear(customMonth, parseInt(e.target.value)),
                          )
                        }
                        className="bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold text-sm rounded-lg px-2 py-1 border-none focus:ring-0 appearance-none cursor-pointer"
                      >
                        {Array.from(
                          { length: 10 },
                          (_, i) => new Date().getFullYear() + i,
                        ).map((y) => (
                          <option key={y} value={y}>
                            {y}년
                          </option>
                        ))}
                      </select>
                      <select
                        value={customMonth.getMonth()}
                        onChange={(e) =>
                          setCustomMonth(
                            setDateMonth(customMonth, parseInt(e.target.value)),
                          )
                        }
                        className="bg-purple-50 text-purple-700 font-bold text-sm rounded-lg px-2 py-1 border-none focus:ring-0 appearance-none cursor-pointer"
                      >
                        {Array.from({ length: 12 }, (_, i) => i).map((m) => (
                          <option key={m} value={m}>
                            {m + 1}월
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-purple-500"
                      onClick={() => setCustomMonth(addMonths(customMonth, 1))}
                    >
                      <ChevronRight size={20} />
                    </Button>
                  </div>
                  <style>{`
                    .rdp-vhidden, .rdp-caption_label, .rdp-caption { display: none !important; }
                    .rdp { margin: 0 !important; width: 100% !important; }
                    .rdp-months { justify-content: center !important; width: 100% !important; }
                    .rdp-month { width: 100% !important; }
                    .rdp-table { width: 100% !important; max-width: none !important; }
                    .rdp-cell { text-align: center !important; padding: 0 !important; }
                    .rdp-day { width: 40px !important; height: 40px !important; margin: auto !important; display: flex !important; align-items: center !important; justify-content: center !important; }
                    .rdp-day_selected { background-color: #a855f7 !important; color: white !important; border-radius: 12px !important; }
                    .dark .rdp-day { color: #e5e7eb; }
                    .dark .rdp-head_cell { color: #9ca3af; }
                  `}</style>
                  <Calendar
                    mode="single"
                    selected={customDate ? new Date(customDate) : undefined}
                    onSelect={(d) => {
                      if (d) onChange("customDate", format(d, "yyyy-MM-dd"));
                    }}
                    month={customMonth}
                    onMonthChange={setCustomMonth}
                    locale={ko}
                    disableNavigation
                    disabled={{ before: new Date() }}
                    className="p-0 border-none"
                    classNames={{
                      caption_label: "hidden",
                      caption: "flex justify-center relative items-center h-0",
                    }}
                  />
                  <Button
                    onClick={() => setCustomCalOpen(false)}
                    className="w-full h-12 mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-lg"
                  >
                    선택 완료
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </motion.div>
        )}
      </div>

      {/* 마감일 요약 */}
      {value !== "no_limit" && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500 ml-1">
          {value === "this_month" &&
            `마감 ${format(endOfMonth(new Date()), "yyyy.MM.dd")}`}
          {value === "this_year" &&
            `마감 ${format(endOfYear(new Date()), "yyyy.MM.dd")}`}
          {value === "monthly" &&
            durationMonths &&
            `마감 ${format(
              endOfMonth(addM(new Date(), parseInt(durationMonths))),
              "yyyy.MM.dd",
            )}`}
          {value === "custom" &&
            customDate &&
            `마감 ${customDate.replace(/-/g, ".")}`}
          {value === "custom" && !customDate && "날짜를 선택해주세요"}
        </p>
      )}
    </div>
  );
}

// ─── 공통 확인 팝업 ──────────────────────────────────────────────
function ConfirmModal({
  icon,
  iconBg,
  title,
  description,
  confirmLabel,
  confirmStyle,
  onConfirm,
  onClose,
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 340 }}
        className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-[28px] p-6 shadow-2xl"
      >
        <div
          className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center mx-auto mb-4`}
        >
          {icon}
        </div>
        <h3 className="text-base font-black text-gray-900 dark:text-white text-center mb-2">
          {title}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed mb-6 whitespace-pre-line">
          {description}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-sm"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 h-12 rounded-2xl font-black text-sm text-white ${confirmStyle}`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── 목표 추가/수정 팝업 ──────────────────────────────────────────
function GoalFormModal({ mode = "add", initial = {}, onConfirm, onClose }) {
  const [title, setTitle] = useState(initial.title || "");
  const [description, setDescription] = useState(initial.description || "");
  const [durationType, setDurationType] = useState(
    initial.duration_type || "no_limit",
  );
  const [durationMonths, setDurationMonths] = useState(
    String(initial.duration_months || "3"),
  );
  const [customDate, setCustomDate] = useState(
    initial.deadline && initial.duration_type === "custom"
      ? initial.deadline
      : "",
  );

  const titleCount = title.length;
  const isTitleOver = titleCount > 10;

  const handleDurationChange = (field, val) => {
    if (field === "durationType") setDurationType(val);
    if (field === "durationMonths") setDurationMonths(val);
    if (field === "customDate") setCustomDate(val);
  };

  const canSubmit =
    title.trim().length > 0 &&
    title.trim().length <= 10 &&
    description.trim().length > 0 &&
    !(durationType === "custom" && !customDate);

  const handleConfirm = () => {
    if (!canSubmit) return;
    const deadline = calcDeadline(durationType, durationMonths, customDate);
    onConfirm({
      title: title.trim(),
      description: description.trim(),
      duration_type: durationType,
      duration_months:
        durationType === "monthly" ? parseInt(durationMonths) : null,
      deadline,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-[32px] px-6 pt-5 pb-10 shadow-2xl"
      >
        <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto mb-6" />
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black text-gray-900 dark:text-white">
            {mode === "add" ? "새 목표 추가" : "목표 수정"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5">
          {/* 제목 */}
          <div>
            <label className="text-[11px] font-bold text-purple-500 uppercase tracking-widest mb-2 block">
              목표 제목
            </label>
            <div className="relative">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={12}
                placeholder="예: 꾸준히 운동하기"
                className={`w-full rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 px-4 py-3.5 text-sm font-semibold pr-14 outline-none transition-colors dark:text-white dark:placeholder:text-gray-600
                  ${
                    isTitleOver
                      ? "border-red-300 focus:border-red-400"
                      : "border-gray-100 dark:border-gray-700 focus:border-purple-300 dark:focus:border-purple-600"
                  }`}
              />
              <span
                className={`absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold tabular-nums ${
                  isTitleOver
                    ? "text-red-400"
                    : "text-gray-300 dark:text-gray-600"
                }`}
              >
                {titleCount}/10
              </span>
            </div>
            {isTitleOver && (
              <p className="text-xs text-red-400 mt-1.5 ml-1">
                제목은 10자 이내로 입력해주세요
              </p>
            )}
          </div>

          {/* 설명 */}
          <div>
            <label className="text-[11px] font-bold text-purple-500 uppercase tracking-widest mb-2 block">
              목표 설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="왜 이루고 싶은지, 어떻게 실천할지 자유롭게 써주세요..."
              className="w-full rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 focus:border-purple-300 dark:focus:border-purple-600 px-4 py-3.5 text-sm resize-none outline-none transition-colors dark:text-white dark:placeholder:text-gray-600"
            />
          </div>

          {/* 기간 */}
          <div>
            <label className="text-[11px] font-bold text-purple-500 uppercase tracking-widest mb-2 block">
              목표 기간
            </label>
            <DurationSelector
              value={durationType}
              durationMonths={durationMonths}
              customDate={customDate}
              onChange={handleDurationChange}
            />
          </div>

          <button
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="w-full h-14 rounded-2xl bg-purple-600 text-white font-black text-sm disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98] transition-transform shadow-lg shadow-purple-200 dark:shadow-purple-900/30"
          >
            {mode === "add" ? "목표 추가하기" : "수정 완료"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── AI 분석 팝업 ─────────────────────────────────────────────────
function AnalysisModal({ goal, allTodos, onClose }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const run = async () => {
      const doneTodos = allTodos.filter((t) => t.completed).map((t) => t.title);
      const pendingTodos = allTodos
        .filter((t) => !t.completed)
        .map((t) => t.title);
      try {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: `너는 HADA 앱의 목표 분석 엔진이다.

                    아래 사용자의 목표와 실천 현황을 분석해 종합 평가를 작성하라.

                    [목표]
                    제목: ${goal.title}
                    설명: ${goal.description || "없음"}
                    기간 유형: ${
                      goal.duration_type === "no_limit" || !goal.duration_type
                        ? "꾸준히 (기한 없음)"
                        : goal.duration_type === "this_month"
                        ? "이번 달"
                        : goal.duration_type === "this_year"
                        ? "올해"
                        : goal.duration_type === "monthly"
                        ? `${goal.duration_months}개월`
                        : "날짜 지정"
                    }
                    마감일: ${
                      goal.deadline ? goal.deadline.replace(/-/g, ".") : "없음"
                    }

                    [완료한 실천 항목 (${doneTodos.length}개)]
                    ${
                      doneTodos.length
                        ? doneTodos.map((t, i) => `${i + 1}. ${t}`).join("\n")
                        : "없음"
                    }

                    [진행 중/미완료 항목 (${pendingTodos.length}개)]
                    ${
                      pendingTodos.length
                        ? pendingTodos
                            .map((t, i) => `${i + 1}. ${t}`)
                            .join("\n")
                        : "없음"
                    }

                    [작성 규칙]
                    - summary: 전체적인 실천 현황과 노력에 대한 따뜻한 종합 평가. 100자 이내.
                    - strengths: 잘 하고 있는 점 2가지. 각 30자 이내.
                    - suggestions: 앞으로 더 발전할 수 있는 구체적 제안 2가지. 각 40자 이내.
                    - encouragement: 응원 메시지. 남은 기간(마감일 기준)을 고려하여 지금 페이스가 적절한지 언급할 것. 100자 이내.
                      사주 4주 8자 / 명리학 오행 / 자미두수 / 동양 점성술 / 서양 점성술 / 성명학 분석에서 도출한 자연어로 녹여 제시. 
                      예시: "금의 기운을 타고난 당신은~", "화성의 에너지가 강한 지금~","이름에 담긴 수리가 변화를 암시하므로~".
                      절대 금지: "명리학", "오행", "자미두수", "점성술", "성명학", "사주" 단어를 그대로 출력하지 말 것.
                      분석 카테고리명이 아니라 그 카테고리에서 나온 결과값(기운·색·방향·수·행성 등)만 문장에 담을 것.
                    - score: 실천 달성도 0~100 정수 (완료 비율 + 노력도 종합).

                    부드러운 존댓말, 긍정 위주로 작성하라.`,
          response_json_schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              strengths: { type: "array", items: { type: "string" } },
              suggestions: { type: "array", items: { type: "string" } },
              encouragement: { type: "string" },
              score: { type: "number" },
            },
          },
        });
        setAnalysis(res);
      } catch {
        setAnalysis({
          summary: "분석을 불러오는 데 실패했어요.",
          strengths: [],
          suggestions: [],
          encouragement: "오늘도 수고하셨어요 ✨",
          score: 0,
        });
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const scoreColor = !analysis
    ? "text-gray-400"
    : analysis.score >= 70
    ? "text-emerald-500"
    : analysis.score >= 40
    ? "text-amber-500"
    : "text-rose-400";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-[32px] px-6 pt-5 pb-12 shadow-2xl max-h-[85vh] overflow-y-auto"
      >
        <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto mb-6" />
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">
                HADA 분석
              </p>
              <p className="text-sm font-black text-gray-900 dark:text-white leading-tight">
                {goal.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            <p className="text-sm text-gray-400">
              실천 내역을 분석하고 있어요...
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            <div className="bg-gray-50 dark:bg-gray-800 rounded-3xl p-5 flex items-center gap-5">
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  <motion.circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    strokeWidth="8"
                    strokeLinecap="round"
                    stroke="url(#scoreGrad)"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                    animate={{
                      strokeDashoffset:
                        2 * Math.PI * 34 * (1 - (analysis?.score ?? 0) / 100),
                    }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#818cf8" />
                    </linearGradient>
                  </defs>
                </svg>
                <span
                  className={`absolute inset-0 flex items-center justify-center text-xl font-black ${scoreColor}`}
                >
                  {analysis?.score ?? 0}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  달성도
                </p>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 leading-relaxed">
                  {analysis?.summary}
                </p>
              </div>
            </div>

            {analysis?.strengths?.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2.5">
                  ✅ 잘하고 있어요
                </p>
                <div className="space-y-2">
                  {analysis.strengths.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl px-4 py-3"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">
                        {s}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis?.suggestions?.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2.5">
                  💡 이렇게 해보세요
                </p>
                <div className="space-y-2">
                  {analysis.suggestions.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl px-4 py-3"
                    >
                      <span className="text-amber-500 font-black text-xs mt-0.5 flex-shrink-0">
                        {i + 1}
                      </span>
                      <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                        {s}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis?.encouragement && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-3xl px-5 py-4 text-center">
                <p className="text-sm font-black text-purple-700 dark:text-purple-300">
                  ✨ {analysis.encouragement}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── 목표 상세 패널 ───────────────────────────────────────────────
function GoalDetail({ goal, allTodos, onEdit }) {
  const [showAnalysis, setShowAnalysis] = useState(false);

  const todos = useMemo(
    () => (allTodos || []).filter((t) => t.goal_id === goal.id),
    [allTodos, goal.id],
  );
  const doneCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;
  const progressPct =
    totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  // D-day 표시 (deadline 있을 때만)
  const ddayText = useMemo(() => {
    if (!goal.deadline) return null;
    const diff = differenceInCalendarDays(parseISO(goal.deadline), new Date());
    if (diff < 0) return `마감 ${goal.deadline.replace(/-/g, ".")} (종료)`;
    if (diff === 0) return "오늘 마감";
    return `마감까지 ${diff}일`;
  }, [goal.deadline]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22 }}
        className="mt-2 bg-gray-50 dark:bg-gray-800/60 rounded-[24px] p-5 border border-gray-100 dark:border-gray-800"
      >
        {/* 진행도 */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              실천 현황
            </p>
            <p className="text-xs font-black text-purple-600 dark:text-purple-400">
              {doneCount} / {totalCount}
              <span className="text-gray-400 font-semibold ml-1">완료</span>
            </p>
          </div>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-purple-400 to-indigo-400"
            />
          </div>
          {totalCount > 0 && (
            <p className="text-[10px] text-gray-400 mt-1.5 text-right">
              {progressPct}% 달성
            </p>
          )}
        </div>

        {/* 목표 설명 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              목표 설명
            </p>
            <button
              onClick={() => onEdit(goal)}
              className="flex items-center gap-1 text-[11px] font-bold text-purple-500 dark:text-purple-400 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/30 active:scale-95 transition-transform"
            >
              <Pencil className="w-3 h-3" />
              수정
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            {goal.description || (
              <span className="text-gray-300 dark:text-gray-600 italic">
                설명이 없어요
              </span>
            )}
          </p>
        </div>

        {/* 기간 정보 — 설명 바로 아래, 항상 표시 */}
        <div className="mb-5 flex items-center gap-1.5">
          <CalendarIcon className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
            {goal.duration_type === "no_limit" || !goal.duration_type
              ? "꾸준히 (기한 없음)"
              : ddayText}
          </span>
        </div>

        {/* HADA 분석 버튼 */}
        <button
          onClick={() => setShowAnalysis(true)}
          className="w-full h-16 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-base flex items-center justify-center gap-2.5 shadow-xl shadow-purple-200 dark:shadow-purple-900/40 active:scale-[0.98] transition-transform"
        >
          <Sparkles className="w-5 h-5" />
          HADA 분석 받기
        </button>
      </motion.div>

      <AnimatePresence>
        {showAnalysis && (
          <AnalysisModal
            goal={goal}
            allTodos={todos}
            onClose={() => setShowAnalysis(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── 드래그 가능한 목표 행 ────────────────────────────────────────
function SortableGoalRow({
  goal,
  index,
  isSelected,
  onSelect,
  onComplete,
  onDelete,
  isDragDisabled,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: goal.id, disabled: isDragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    position: isDragging ? "relative" : "static",
  };

  const idHash = goal.id
    ? goal.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    : 0;
  const theme = GOAL_THEMES[idHash % GOAL_THEMES.length];
  const isCompleted = goal.is_completed;

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`rounded-2xl border-2 transition-all duration-200 ${
          isDragging
            ? "bg-white dark:bg-gray-800 border-purple-300 dark:border-purple-600 shadow-2xl opacity-95 scale-[1.02]"
            : isSelected
            ? "bg-white dark:bg-gray-800 border-purple-300 dark:border-purple-600 shadow-md"
            : isCompleted
            ? "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-60"
            : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
        }`}
      >
        <div className="flex items-center gap-3 px-4 py-4">
          {!isCompleted && (
            <button
              {...attributes}
              {...listeners}
              className="flex-shrink-0 touch-none p-1 -ml-1 text-gray-300 dark:text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing"
              aria-label="순서 변경"
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}

          <div
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              isCompleted ? "bg-gray-300 dark:bg-gray-600" : theme.dot
            }`}
          />

          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => !isCompleted && onSelect(goal.id)}
          >
            <span
              className={`text-sm font-bold block truncate ${
                isCompleted
                  ? "text-gray-400"
                  : "text-gray-800 dark:text-gray-100"
              }`}
            >
              {goal.title}
            </span>
            {isCompleted && (
              <span className="text-[9px] font-bold text-gray-400">완료됨</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComplete(goal);
              }}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                isCompleted
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200"
                  : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 hover:bg-emerald-100"
              }`}
            >
              {isCompleted ? (
                <RotateCcw className="w-3.5 h-3.5" />
              ) : (
                <Trophy className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(goal.id);
              }}
              className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-400 hover:bg-red-100 flex items-center justify-center transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            {!isCompleted && (
              <div onClick={() => onSelect(goal.id)} className="cursor-pointer">
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isSelected
                      ? "rotate-180 text-purple-400"
                      : "text-gray-300 dark:text-gray-600"
                  }`}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Goals 메인
// ═══════════════════════════════════════════════════════════════════
export default function Goals() {
  const queryClient = useQueryClient();
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [completeConfirm, setCompleteConfirm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showCannotDelete, setShowCannotDelete] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  );

  const { data: profiles = [] } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => base44.entities.UserProfile.list(),
  });
  const profile = profiles[0];

  const { data: goals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ["goals", profile?.id],
    queryFn: async () => {
      const all = await base44.entities.Goal.list();
      const mine = all.filter((g) => g.user_profile_id === profile.id);

      const needsMigration = mine.some((g) => g.order == null);
      if (needsMigration) {
        const sorted = [...mine].sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at),
        );
        for (let i = 0; i < sorted.length; i++) {
          await base44.entities.Goal.update(sorted[i].id, { order: i });
          sorted[i] = { ...sorted[i], order: i };
        }
        return sorted;
      }
      return mine.sort((a, b) => a.order - b.order);
    },
    enabled: !!profile?.id,
  });

  const { data: allTodos = [] } = useQuery({
    queryKey: ["allGoalTodosEver", profile?.id],
    queryFn: async () => {
      const all = await base44.entities.GoalTodo.list();
      return all.filter((t) => t.user_profile_id === profile.id);
    },
    enabled: !!profile?.id,
  });

  const activeGoals = goals.filter((g) => !g.is_completed);
  const completedGoals = goals.filter((g) => g.is_completed);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = activeGoals.findIndex((g) => g.id === active.id);
    const newIndex = activeGoals.findIndex((g) => g.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(activeGoals, oldIndex, newIndex);
    const reorderedWithOrder = reordered.map((goal, idx) => ({
      ...goal,
      order: idx,
    }));

    queryClient.setQueryData(
      ["goals", profile.id],
      [...reorderedWithOrder, ...completedGoals],
    );

    for (let idx = 0; idx < reorderedWithOrder.length; idx++) {
      await base44.entities.Goal.update(reorderedWithOrder[idx].id, {
        order: idx,
      });
    }
    await queryClient.invalidateQueries({ queryKey: ["goals", profile.id] });
  };

  // ─── 추가 (기간 필드 포함) ──────────────────────────────────
  const handleAdd = async ({
    title,
    description,
    duration_type,
    duration_months,
    deadline,
  }) => {
    await base44.entities.Goal.create({
      user_profile_id: profile.id,
      title,
      description,
      order: goals.length,
      is_primary: goals.length === 0,
      is_completed: false,
      xp: 0,
      xp_reset_week: getWeekKey(),
      duration_type,
      duration_months,
      deadline,
    });
    await queryClient.invalidateQueries({ queryKey: ["goals", profile.id] });
    setShowAddModal(false);
  };

  // ─── 수정 (기간 필드 포함) ──────────────────────────────────
  const handleEdit = async ({
    title,
    description,
    duration_type,
    duration_months,
    deadline,
  }) => {
    if (!editingGoal) return;
    await base44.entities.Goal.update(editingGoal.id, {
      title,
      description,
      duration_type,
      duration_months,
      deadline,
    });
    if (editingGoal.is_primary && profile) {
      await base44.entities.UserProfile.update(profile.id, { goal: title });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    }
    await queryClient.invalidateQueries({ queryKey: ["goals", profile.id] });
    setEditingGoal(null);
  };

  const handleCompleteClick = (goal) => {
    if (goal.is_completed) {
      doComplete(goal);
    } else {
      if (activeGoals.length <= 1) {
        setShowCannotDelete(true);
        return;
      }
      setCompleteConfirm(goal);
    }
  };

  const doComplete = async (goal) => {
    const isCompleting = !goal.is_completed;
    await base44.entities.Goal.update(goal.id, {
      is_completed: isCompleting,
      completed_at: isCompleting ? new Date().toISOString() : null,
    });
    if (isCompleting && selectedGoalId === goal.id) setSelectedGoalId(null);
    await queryClient.invalidateQueries({ queryKey: ["goals", profile.id] });
  };

  const handleDeleteClick = (goalId) => {
    const targetGoal = goals.find((g) => g.id === goalId);
    if (targetGoal && !targetGoal.is_completed && activeGoals.length <= 1) {
      setShowCannotDelete(true);
      return;
    }
    setDeleteConfirm(goalId);
  };

  const handleDeleteConfirmed = async () => {
    const goalId = deleteConfirm;
    setDeleteConfirm(null);
    const todosToDelete = allTodos.filter((t) => t.goal_id === goalId);
    await Promise.all(
      todosToDelete.map((t) => base44.entities.GoalTodo.delete(t.id)),
    );
    await base44.entities.Goal.delete(goalId);
    if (selectedGoalId === goalId) setSelectedGoalId(null);
    await queryClient.invalidateQueries({ queryKey: ["goals", profile.id] });
    await queryClient.invalidateQueries({
      queryKey: ["allGoalTodosEver", profile.id],
    });
  };

  return (
    <div className="min-h-screen bg-[#FDFCFE] dark:bg-gray-950 pb-32 transition-colors duration-300">
      {/* 헤더 */}
      <div className="px-6 pt-12 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em] mb-2">
            HADA
          </p>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                목표 관리
              </h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-semibold">
                {activeGoals.length}개 진행 중 · {completedGoals.length}개 달성
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-black bg-purple-600 text-white shadow-md shadow-purple-200 dark:shadow-purple-900/30"
            >
              <Plus className="w-4 h-4" />
              추가
            </motion.button>
          </div>
        </motion.div>
      </div>

      <div className="px-5 space-y-3">
        {/* 진행 중 */}
        <div className="bg-white dark:bg-gray-900 rounded-[32px] p-5 shadow-[0_8px_40px_rgba(120,50,255,0.06)] border border-purple-50 dark:border-gray-800">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-2 h-6 bg-purple-500 rounded-full shadow-[0_0_12px_rgba(168,85,247,0.25)]" />
            <p className="text-sm font-black text-gray-800 dark:text-gray-100">
              진행 중
            </p>
            <span className="ml-auto text-[11px] font-black text-gray-300 dark:text-gray-600">
              {activeGoals.length}개
            </span>
          </div>

          {goalsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            </div>
          ) : activeGoals.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-2xl mb-2">🎯</p>
              <p className="text-sm font-bold text-gray-400">
                아직 목표가 없어요
              </p>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                오른쪽 위 추가 버튼을 눌러보세요
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={activeGoals.map((g) => g.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {activeGoals.map((goal, index) => (
                    <div key={goal.id}>
                      <SortableGoalRow
                        goal={goal}
                        index={index}
                        isSelected={selectedGoalId === goal.id}
                        onSelect={(id) =>
                          setSelectedGoalId((p) => (p === id ? null : id))
                        }
                        onComplete={handleCompleteClick}
                        onDelete={handleDeleteClick}
                        isDragDisabled={false}
                      />
                      <AnimatePresence>
                        {selectedGoalId === goal.id && (
                          <motion.div
                            key={`detail-${goal.id}`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.28, ease: "easeOut" }}
                            className="overflow-hidden"
                          >
                            <GoalDetail
                              goal={goal}
                              allTodos={allTodos}
                              onEdit={(g) => setEditingGoal(g)}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* 달성한 목표 */}
        {completedGoals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 rounded-[32px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-gray-50 dark:border-gray-800"
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-2 h-6 bg-emerald-400 rounded-full" />
              <p className="text-sm font-black text-gray-800 dark:text-gray-100">
                달성한 목표
              </p>
              <span className="ml-auto text-[11px] font-black text-gray-300 dark:text-gray-600">
                {completedGoals.length}개
              </span>
            </div>
            <div className="space-y-2">
              <AnimatePresence>
                {completedGoals.map((goal, index) => (
                  <SortableGoalRow
                    key={goal.id}
                    goal={goal}
                    index={index}
                    isSelected={false}
                    onSelect={() => {}}
                    onComplete={handleCompleteClick}
                    onDelete={(id) => setDeleteConfirm(id)}
                    isDragDisabled={true}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </div>

      {/* 모달들 */}
      <AnimatePresence>
        {showCannotDelete && (
          <ConfirmModal
            key="cannot-delete-alert"
            icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
            iconBg="bg-amber-50 dark:bg-amber-900/30"
            title="최소 1개의 진행 중인 목표가 필요해요"
            description={`HADA의 분석과 할일 목록 이용하기 위해\n최소 1개의 진행 중인 목표가 유지되어야 합니다.\n\n새로운 목표를 추가한 뒤에\n기존 목표를 삭제하거나 달성 완료해 주세요.`}
            confirmLabel="확인"
            confirmStyle="bg-gray-900 dark:bg-gray-700"
            onConfirm={() => setShowCannotDelete(false)}
            onClose={() => setShowCannotDelete(false)}
          />
        )}
        {showAddModal && (
          <GoalFormModal
            mode="add"
            onConfirm={handleAdd}
            onClose={() => setShowAddModal(false)}
          />
        )}
        {editingGoal && (
          <GoalFormModal
            mode="edit"
            initial={editingGoal}
            onConfirm={handleEdit}
            onClose={() => setEditingGoal(null)}
          />
        )}
        {completeConfirm && (
          <ConfirmModal
            key="complete-confirm"
            icon={<Trophy className="w-6 h-6 text-emerald-500" />}
            iconBg="bg-emerald-50 dark:bg-emerald-900/30"
            title="목표를 달성했나요? 🎉"
            description={`달성 완료 처리를 하면 홈 화면에서 사라집니다.\n달성한 목표 목록에서 언제든 다시 복구할 수 있어요.`}
            confirmLabel="달성 완료"
            confirmStyle="bg-emerald-500 hover:bg-emerald-600"
            onConfirm={() => {
              doComplete(completeConfirm);
              setCompleteConfirm(null);
            }}
            onClose={() => setCompleteConfirm(null)}
          />
        )}
        {deleteConfirm && (
          <ConfirmModal
            key="delete-confirm"
            icon={<AlertTriangle className="w-6 h-6 text-red-500" />}
            iconBg="bg-red-50 dark:bg-red-900/30"
            title="정말 삭제하시겠어요?"
            description={`목표와 관련된 모든 할일 기록도\n함께 삭제됩니다. 이 작업은 되돌릴 수 없어요.`}
            confirmLabel="삭제하기"
            confirmStyle="bg-red-500 hover:bg-red-600"
            onConfirm={handleDeleteConfirmed}
            onClose={() => setDeleteConfirm(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

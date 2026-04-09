import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44, getWeekKey } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ChevronRight,
  Plus,
  CheckCircle2,
  Circle,
  Sparkles,
  Target,
  X,
  Palette,
  MessageCircle,
  Clover,
  Check,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import ModeCard from "@/components/home/ModeCard";
import { MODE_CONFIGS } from "@/components/home/modeConfig";
import TarotSection from "@/components/home/TarotSection";
import { getKSTDateString } from "@/utils/date";
import { differenceInCalendarDays, parseISO } from "date-fns";

const GOAL_THEMES = [
  {
    light: "bg-indigo-50 border-indigo-100 text-indigo-600",
    dark: "dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-300",
    bar: "bg-indigo-400",
    glow: "dark:shadow-[0_0_15px_rgba(99,102,241,0.15)]",
  },
  {
    light: "bg-rose-50 border-rose-100 text-rose-600",
    dark: "dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-300",
    bar: "bg-rose-400",
    glow: "dark:shadow-[0_0_15px_rgba(244,63,94,0.15)]",
  },
  {
    light: "bg-amber-50 border-amber-100 text-amber-600",
    dark: "dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-300",
    bar: "bg-amber-400",
    glow: "dark:shadow-[0_0_15px_rgba(245,158,11,0.15)]",
  },
  {
    light: "bg-emerald-50 border-emerald-100 text-emerald-600",
    dark: "dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300",
    bar: "bg-emerald-400",
    glow: "dark:shadow-[0_0_15px_rgba(16,185,129,0.15)]",
  },
  {
    light: "bg-sky-50 border-sky-100 text-sky-600",
    dark: "dark:bg-sky-500/10 dark:border-sky-500/20 dark:text-sky-300",
    bar: "bg-sky-400",
    glow: "dark:shadow-[0_0_15px_rgba(14,165,233,0.15)]",
  },
];

const statIcons = {
  work_efficiency: Target,
  creativity: Palette,
  communication: MessageCircle,
  focus: Sparkles,
  fortune: Clover,
};

const cardBackGradients = {
  work_efficiency: "from-purple-400 to-violet-500",
  creativity: "from-fuchsia-400 to-purple-500",
  communication: "from-pink-400 to-rose-500",
  focus: "from-blue-400 to-sky-500",
  fortune: "from-amber-400 to-yellow-500",
};

const borderColors = {
  work_efficiency: "border-purple-400",
  creativity: "border-fuchsia-400",
  communication: "border-pink-400",
  focus: "border-blue-400",
  fortune: "border-amber-400",
};

const buttonAddedColors = {
  work_efficiency:
    "bg-purple-100 dark:bg-purple-800/50 text-purple-600 dark:text-purple-300",
  creativity:
    "bg-fuchsia-100 dark:bg-fuchsia-800/50 text-fuchsia-600 dark:text-fuchsia-300",
  communication:
    "bg-pink-100 dark:bg-pink-800/50 text-pink-600 dark:text-pink-300",
  focus: "bg-blue-100 dark:bg-blue-800/50 text-blue-600 dark:text-blue-300",
  fortune:
    "bg-amber-100 dark:bg-amber-800/50 text-amber-600 dark:text-amber-300",
};

function getDday(deadline) {
  if (!deadline) return null;
  const diff = differenceInCalendarDays(parseISO(deadline), new Date());
  if (diff < 0) return null;
  if (diff === 0) return "D-day";
  return `D-${diff}`;
}

function getDdayStyle(deadline) {
  if (!deadline) return "";
  const diff = differenceInCalendarDays(parseISO(deadline), new Date());
  if (diff <= 3)
    return "bg-red-100 text-red-500 dark:bg-red-900/40 dark:text-red-400";
  if (diff <= 7)
    return "bg-orange-100 text-orange-500 dark:bg-orange-900/40 dark:text-orange-400";
  if (diff <= 30)
    return "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400";
  return "bg-gray-100 text-gray-400 dark:bg-gray-700/50 dark:text-gray-500";
}

function GoalBar({ goal, isSelected, onClick, index }) {
  const currentWeek = getWeekKey();
  const needsReset = goal.xp_reset_week !== currentWeek;
  const xp = needsReset ? 0 : goal.xp || 0;
  const pct = Math.min((xp / 100) * 100, 100);
  const theme = GOAL_THEMES[index % GOAL_THEMES.length];
  const dday = getDday(goal.deadline);
  const ddayStyle = goal.deadline ? getDdayStyle(goal.deadline) : "";

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full text-left rounded-2xl px-5 py-4 transition-all duration-300 border-2 backdrop-blur-md ${
        isSelected
          ? `bg-white dark:bg-purple-500/20 border-purple-400 dark:border-purple-400/60 shadow-lg ${theme.glow}`
          : `${theme.light} ${theme.dark} border-transparent opacity-60 hover:opacity-100`
      }`}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`p-1.5 rounded-lg flex-shrink-0 transition-colors ${
              isSelected
                ? "bg-purple-100 dark:bg-purple-400/30 text-purple-600 dark:text-purple-200"
                : "bg-white/50 dark:bg-white/5"
            }`}
          >
            <Target className="w-3.5 h-3.5" />
          </div>
          <span
            className={`text-sm font-bold truncate ${
              isSelected ? "text-gray-900 dark:text-white" : "text-current"
            }`}
          >
            {goal.title}
          </span>
          {dday && (
            <span
              className={`flex-shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded-md leading-none shadow-sm ${ddayStyle}`}
            >
              {dday}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span
            className={`text-[11px] font-black ${
              isSelected ? "text-purple-600 dark:text-purple-300" : "opacity-60"
            }`}
          >
            {xp} XP
          </span>
          <ChevronRight
            className={`w-3.5 h-3.5 transition-transform ${
              isSelected
                ? "rotate-90 text-purple-500 dark:text-purple-300"
                : "opacity-30"
            }`}
          />
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          className={`h-full rounded-full transition-colors ${
            isSelected ? "bg-purple-500 dark:bg-purple-400" : theme.bar
          }`}
        />
      </div>
    </motion.button>
  );
}

function GoalTodoPanel({ goalId, today, profile, todos = [], queryClient }) {
  const [tab, setTab] = useState("ongoing");
  const [newTodo, setNewTodo] = useState("");
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => {
    setTab("ongoing");
  }, [goalId]);

  const ongoing = (todos || []).filter((t) => !Boolean(t.completed));
  const done = (todos || []).filter((t) => Boolean(t.completed));

  const addTodo = async () => {
    const t = newTodo.trim();
    if (!t) return;
    await base44.entities.GoalTodo.create({
      goal_id: goalId,
      user_profile_id: profile?.id,
      title: t,
      completed: false,
      date: today,
    });
    setNewTodo("");
    queryClient.invalidateQueries({ queryKey: ["allGoalTodos", today] });
  };

  const toggleTodo = async (todo) => {
    const isCompleting = !todo.completed;
    try {
      queryClient.setQueryData(["allGoalTodos", today], (old = []) =>
        old.map((t) =>
          t.id === todo.id ? { ...t, completed: isCompleting } : t,
        ),
      );
      await base44.entities.GoalTodo.update(todo.id, {
        completed: isCompleting,
      });

      if (isCompleting && profile?.id) {
        const goalsCache = queryClient.getQueryData(["goals", profile.id]);
        const currentGoal = goalsCache?.find((g) => g.id === goalId);
        if (currentGoal) {
          const currentWeek = getWeekKey();
          const currentXp =
            currentGoal.xp_reset_week !== currentWeek ? 0 : currentGoal.xp || 0;
          await base44.entities.Goal.update(goalId, {
            xp: currentXp + 10,
            xp_reset_week: currentWeek,
          });
        }
        const newXp = (profile.xp || 0) + 10;
        await base44.entities.UserProfile.update(profile.id, {
          xp: newXp,
          level: Math.floor(newXp / 100) + 1,
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["allGoalTodos", today] }),
        queryClient.invalidateQueries({ queryKey: ["goals", profile?.id] }),
        queryClient.invalidateQueries({ queryKey: ["userProfile"] }),
      ]);
    } catch (e) {
      console.error("업데이트 실패:", e);
      queryClient.invalidateQueries({ queryKey: ["allGoalTodos", today] });
      alert("처리에 실패했습니다.");
    }
  };

  return (
    <div className="mt-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
      <div className="flex border-b border-gray-100 dark:border-gray-800">
        {[
          { key: "ongoing", label: "진행 중", count: ongoing.length },
          { key: "done", label: "완료", count: done.length },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-4 text-xs font-black relative ${
              tab === t.key
                ? "text-purple-600 dark:text-purple-400"
                : "text-gray-400"
            }`}
          >
            {t.label} <span className="ml-1 opacity-50">{t.count}</span>
            {tab === t.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
            )}
          </button>
        ))}
      </div>
      <div className="px-4 py-2 min-h-[120px]">
        {(tab === "ongoing" ? ongoing : done).map((todo) => (
          <div
            key={todo.id}
            className="flex items-center gap-3 py-3 border-b border-gray-50 dark:border-gray-800/50 last:border-0"
          >
            <button onClick={() => toggleTodo(todo)}>
              {todo.completed ? (
                <CheckCircle2 className="w-5 h-5 text-purple-400" />
              ) : (
                <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600" />
              )}
            </button>
            <span
              className={`text-sm flex-1 ${
                todo.completed
                  ? "text-gray-400"
                  : "text-gray-700 dark:text-gray-200"
              }`}
            >
              {todo.title}
            </span>
            {todo.is_from_card && (
              <button
                onClick={() => setSelectedCard(todo)}
                className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-500 active:scale-95 transition-transform"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        {(tab === "ongoing" ? ongoing : done).length === 0 && (
          <p className="text-center py-10 text-xs text-gray-400">
            목록이 비어있습니다.
          </p>
        )}
      </div>
      <div className="px-4 pb-4 pt-2">
        <div className="flex gap-2">
          <input
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
            placeholder="할일 추가..."
            className="flex-1 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 px-4 py-3 outline-none dark:text-white"
          />
          <button
            onClick={addTodo}
            className="px-4 bg-purple-600 text-white rounded-xl active:scale-95"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      <AnimatePresence>
        {selectedCard &&
          (() => {
            const Icon = statIcons[selectedCard.stat_focus] || Sparkles;
            const backGradient =
              cardBackGradients[selectedCard.stat_focus] ||
              "from-purple-400 to-indigo-500";
            const borderColor =
              borderColors[selectedCard.stat_focus] || "border-purple-400";
            const buttonAddedColor =
              buttonAddedColors[selectedCard.stat_focus] ||
              "bg-purple-100 dark:bg-purple-800/50 text-purple-600 dark:text-purple-300";

            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-5 touch-none"
                onClick={() => setSelectedCard(null)}
              >
                <motion.div
                  initial={{ scale: 0.85, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.85, opacity: 0, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className={`relative bg-white dark:bg-[#2E3447] rounded-3xl w-full max-w-sm border-l-4 ${borderColor} overflow-hidden shadow-2xl`}
                >
                  <div
                    className={`bg-gradient-to-r ${backGradient} p-5 flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/30 flex items-center justify-center">
                        <Icon
                          className="w-5 h-5 text-white"
                          strokeWidth={1.5}
                        />
                      </div>
                      <div>
                        <p className="text-white/80 text-xs font-semibold uppercase tracking-widest">
                          {selectedCard.card_keyword}
                        </p>
                        {(() => {
                          const ts = hhToTimeSlotLabel(
                            selectedCard.recommended_time,
                          );
                          const bs = ts ? timeSlotBadgeColors[ts] : null;
                          return ts && bs ? (
                            <span
                              className={`inline-flex items-center gap-0.5 mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none ${bs}`}
                            >
                              <Clock className="w-2.5 h-2.5" strokeWidth={2} />
                              {ts} 추천
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedCard(null)}
                      className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" strokeWidth={1.5} />
                    </button>
                  </div>
                  <div className="p-6 space-y-5 bg-white dark:bg-[#2E3447]">
                    <p className="text-xl font-black text-gray-800 dark:text-white leading-snug break-keep">
                      {selectedCard.title}
                    </p>
                    <div className="bg-gray-50 dark:bg-[#1A1F2E] rounded-2xl p-4 border border-gray-100 dark:border-[#424B63]">
                      <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed break-keep">
                        {selectedCard.card_how}
                        {selectedCard.card_fortune && (
                          <span className="block mt-2 text-purple-600 dark:text-purple-300 font-medium">
                            ✨ {selectedCard.card_fortune}
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      disabled={true}
                      className={`w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${buttonAddedColor}`}
                    >
                      <Check className="w-4 h-4" />
                      할일에 추가됨
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            );
          })()}
      </AnimatePresence>
    </div>
  );
}

// ─── HH → 표시용 시간대 라벨 변환 ──────────────────────────────
// 뒷단(AI, DB, 알람)은 "09", "14", "21" 같은 HH 숫자로 저장·비교
// 화면에는 오전/오후/저녁/밤으로만 표시
export function hhToTimeSlotLabel(hh) {
  const h = parseInt(hh, 10);
  if (isNaN(h)) return null;
  if (h >= 6 && h < 12) return "오전";
  if (h >= 12 && h < 18) return "오후";
  if (h >= 18 && h < 22) return "저녁";
  return "밤";
}

const timeSlotBadgeColors = {
  오전: "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400",
  오후: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
  저녁: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
  밤: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400",
};

// ─── 현재 시각 기준으로 오늘 밤 10시(22)까지 가능한 HH 범위 문자열 목록 ──
// AI에게는 "09~11", "12~17", "18~20", "21~22" 같은 구체적 시간 범위 문자열이 아닌
// 정수 HH 목록을 넘겨서 정확한 시간으로 응답받는다
function getAvailableHours(hour) {
  const hours = [];
  for (let h = Math.max(hour, 6); h <= 22; h++) {
    hours.push(String(h).padStart(2, "0"));
  }
  if (hours.length === 0) hours.push("22"); // 22시 이후면 21시로 fallback
  return hours;
}

function GoalDetailPanel({
  goal,
  profile,
  today,
  actions = [],
  todos = [],
  queryClient,
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (hasTriggered.current) return;

    const recentTodos = [...(todos || [])].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    );
    const recentIncomplete = recentTodos
      .filter((t) => !t.completed)
      .slice(0, 5)
      .map((t) => t.title);
    const recentComplete = recentTodos
      .filter((t) => t.completed)
      .slice(0, 5)
      .map((t) => t.title);

    const unviewed = actions.filter((a) => !a.viewed);
    if (isGenerating || unviewed.length >= 5 || hasTriggered.current) return;

    const generateActions = async (modeOverride) => {
      hasTriggered.current = true;
      setIsGenerating(true);
      try {
        const currentMode = modeOverride || profile?.current_mode || "action";
        const config = MODE_CONFIGS[currentMode] || MODE_CONFIGS["action"];
        const hour = new Date().getHours();
        const timeSlot =
          hour < 6
            ? "밤"
            : hour < 12
            ? "오전"
            : hour < 18
            ? "오후"
            : hour < 22
            ? "저녁"
            : "밤";

        // ── 현재 시각부터 오늘 밤 10시(22) 사이에 가능한 HH 목록 ──
        const availableHours = getAvailableHours(hour);

        const res = await base44.integrations.Core.InvokeLLM({
          prompt: `
너는 HADA 앱의 마이크로 액션 생성 엔진이다.

=== ${config.name} (${currentMode.toUpperCase()} MODE) ===
분석 위계:
- ${config.weights[Object.keys(config.weights)[0]]}
- ${config.weights[Object.keys(config.weights)[1]]}
- ${config.weights[Object.keys(config.weights)[2]]}
- ${config.weights[Object.keys(config.weights)[3]]}

톤앤매너 키워드: ${config.tone_keywords.join(", ")}
목표 영역: ${config.goal_focus.join(", ")}

[목표]
${goal.title}

[사용자의 목표 설명]
${goal.description}

[목표 기간]
${
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
마감일: ${goal.deadline ? goal.deadline.replace(/-/g, ".") : "없음"}

[현재 날짜]
${today}

[현재 시간대]
${timeSlot} (현재 ${hour}시)

[오늘 실행 가능한 시간 범위]
현재 시각 이후 오늘 밤 10시(22시)까지 가능한 시간(24h HH): ${availableHours.join(
            ", ",
          )}
- recommended_time 필드는 반드시 위 목록 중 정확히 하나의 HH 문자열("09", "14", "21" 등)로만 응답.
- 5개 카드에 걸쳐 시간이 골고루 분포되도록 배분. 시간이 부족하면 중복 허용.
- 집중이 필요한 행동은 오전~오후(06~17), 가벼운 행동은 저녁~밤(18~21)에 배치.

[최근 완료한 행동들]
${recentComplete.length ? recentComplete.join(", ") : "없음"}

[최근 미완료 행동들]
${recentIncomplete.length ? recentIncomplete.join(", ") : "없음"}

[카드 생성 규칙]
- 위 맥락을 기반으로 오늘 실행할 수 있는 "행운 실천 카드" 5개를 생성하라.
- 반드시 서로 다른 방향의 행동이어야 한다.
- 너무 추상적이면 안 되고, 바로 실행 가능한 행동이어야 한다.
- 반드시 정확히 5개의 카드를 cards 배열로 반환. 5개 미만·초과 금지.

각 카드 필드 규칙:
- keyword: 10자 이내 핵심 단어 (짧게)
- micro_action: 20자 이내 오늘 할 구체적 행동 (한 줄)
- how: 50자 이내. 어떻게 하면 좋은지 설명. 줄바꿈 금지.
- fortune: 100자 이내. 이 행동이 가져올 긍정적 효과.
  사주 4주 8자 / 명리학 오행 / 자미두수 / 동양 점성술 / 서양 점성술 / 성명학 분석에서 도출한 자연어로 녹여 제시. 
  예시: "금의 기운을 타고난 당신은~", "화성의 에너지가 강한 지금~","이름에 담긴 수리가 변화를 암시하므로~".
  절대 금지: "명리학", "오행", "자미두수", "점성술", "성명학", "사주" 단어를 그대로 출력하지 말 것.
  분석 카테고리명이 아니라 그 카테고리에서 나온 결과값(기운·색·방향·수·행성 등)만 문장에 담을 것.
- stat_focus: work_efficiency / creativity / communication / focus / fortune 중 하나만.
- recommended_time: 24시간 표기 HH 문자열 (예: "09", "14", "21").
  반드시 오늘 실행 가능한 시간 목록(${availableHours.join(", ")}) 중 하나만.

1~2분이면 바로 할 수 있는 사소한 행동만.
전문 용어 사용 금지.
부드러운 존댓말로 작성.`,
          response_json_schema: {
            type: "object",
            properties: {
              cards: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    keyword: { type: "string" },
                    micro_action: { type: "string" },
                    how: { type: "string" },
                    fortune: { type: "string" },
                    stat_focus: { type: "string" },
                    recommended_time: { type: "string" },
                  },
                },
              },
            },
          },
        });

        if (res.cards?.length) {
          for (const card of res.cards) {
            await base44.entities.GoalAction.create({
              goal_id: goal.id,
              user_profile_id: profile?.id,
              date: today,
              ...card,
              completed: false,
              viewed: false,
            });
          }
          queryClient.invalidateQueries({ queryKey: ["allGoalActions"] });
        }
      } finally {
        setIsGenerating(false);
      }
    };
    generateActions();
  }, [goal.id, actions]);

  return (
    <div className="pt-2 space-y-10">
      <div className="px-1">
        <TarotSection
          actions={actions}
          todos={todos}
          isLoading={isGenerating}
          canFlip={actions.length > 0}
          onViewed={() =>
            queryClient.invalidateQueries({ queryKey: ["allGoalActions"] })
          }
          onAddToTodo={async (card) => {
            await base44.entities.GoalTodo.create({
              goal_id: goal.id,
              user_profile_id: profile?.id,
              title: card.micro_action,
              completed: false,
              date: today,
              is_from_card: true,
              card_keyword: card.keyword,
              card_how: card.how,
              card_fortune: card.fortune,
              stat_focus: card.stat_focus,
              // ▼ 권장 시간대 저장 — AlarmReceiver에서 시간대 필터링에 활용
              recommended_time: card.recommended_time || null,
            });
            queryClient.invalidateQueries({
              queryKey: ["allGoalTodos", today],
            });
          }}
        />
      </div>
      <div className="px-1">
        <p className="text-[12px] font-black text-gray-800 dark:text-gray-100 uppercase tracking-widest mb-3">
          오늘의 할일 목록
        </p>
        <GoalTodoPanel
          goalId={goal.id}
          today={today}
          profile={profile}
          todos={todos || []}
          queryClient={queryClient}
        />
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showModeCard, setShowModeCard] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);
  const today = getKSTDateString();

  const hasGeneratedReading = useRef(false);
  const hasGeneratedActions = useRef(false);
  const isModeChanging = useRef(false);

  const { data: profiles, isLoading: profileLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => base44.entities.UserProfile.list(),
  });
  const profile = profiles?.[0];

  const generateDailyReading = async (modeOverride) => {
    const currentMode = modeOverride || profile?.current_mode || "action";
    const config = MODE_CONFIGS[currentMode] || MODE_CONFIGS["action"];
    const hour = new Date().getHours();
    const timeSlot =
      hour < 6
        ? "밤"
        : hour < 12
        ? "오전"
        : hour < 18
        ? "오후"
        : hour < 22
        ? "저녁"
        : "밤";

    const needsTraits = !profile?.traits?.strengths?.length;
    const traitsPrompt = needsTraits
      ? `
6. traits: 사용자의 사주·성명·별자리 분석을 바탕으로 딱 한 번만 생성.
   - strengths: 강점 3개 (각 10자 이내)
   - weaknesses: 성장 포인트 3개 (각 10자 이내)
   - potentials: 잠재력 3개 (각 10자 이내)`
      : "";

    const allGoals = await base44.entities.Goal.list();
    const activeGoals = allGoals
      .filter((g) => g.user_profile_id === profile.id && !g.is_completed)
      .sort((a, b) => {
        if (a.order == null) return 1;
        if (b.order == null) return -1;
        return a.order - b.order;
      });

    const goalsContext =
      activeGoals.length > 0
        ? activeGoals
            .map(
              (g, i) =>
                `${i + 1}. 제목: ${g.title} / 설명: ${
                  g.description || "설명 없음"
                }`,
            )
            .join("\n")
        : "현재 설정된 목표가 없습니다.";

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `너는 HADA 앱의 일일 리딩 엔진이다.
사용자의 목표 리스트를 분석하여 오늘 하루의 방향성을 제시하라.

오늘 날짜: ${today}, 시간대: ${timeSlot}

[사용자의 현재 목표 리스트]
${goalsContext}

[작성 규칙 — 글자 수는 방향 지시, 초과 시 코드 truncate]
1. today_hint: 헤더 인사말. 사용자의 목표들 중 오늘 가장 집중하면 좋을 키워드를 녹여낼 것. 16자 이내. 줄바꿈 금지.
2. welcome_subtitle: 전체 목표의 맥락과 연결된 동기부여 문구. 20자 이내. 줄바꿈 금지.
3. base_stats: 위 목표들을 달성하기 위한 오늘 사용자의 기운/능력치 (0~100 정수).
4. mode_card.suggested_mode: 아래 기준으로 action 또는 restore 중 하나만 선택.
   - action: 목표가 성과·실행·생산성·공부·업무·재물·자기계발 위주일 때
   - restore: 목표에 치료·회복·완치·건강·휴식·정신건강·관계 회복 등 몸과 마음을 돌보는 내용이 포함될 때
   - 둘 다 섞여 있으면 더 비중이 높은 쪽을 선택. restore는 진짜 필요할 때만.
5. mode_card.card_body: 사용자의 목표 리스트 중 하나를 언급하며 구체적인 조언을 제공할 것 (60자 이내).${traitsPrompt}`,
      response_json_schema: {
        type: "object",
        properties: {
          today_hint: { type: "string" },
          welcome_subtitle: { type: "string" },
          base_stats: {
            type: "object",
            properties: {
              work_efficiency: { type: "number" },
              creativity: { type: "number" },
              communication: { type: "number" },
              focus: { type: "number" },
              fortune: { type: "number" },
            },
          },
          mode_card: {
            type: "object",
            properties: {
              suggested_mode: { type: "string" },
              card_title: { type: "string" },
              card_body: { type: "string" },
            },
          },
          ...(needsTraits && {
            traits: {
              type: "object",
              properties: {
                strengths: { type: "array", items: { type: "string" } },
                weaknesses: { type: "array", items: { type: "string" } },
                potentials: { type: "array", items: { type: "string" } },
              },
            },
          }),
        },
      },
    });

    const existingReadings = await base44.entities.DailyReading.filter({
      date: today,
    });
    const newReading = existingReadings?.[0]
      ? await base44.entities.DailyReading.update(existingReadings[0].id, {
          welcome_subtitle: res.welcome_subtitle,
          today_hint: res.today_hint,
          recommended_mode: res.mode_card?.suggested_mode || currentMode,
          base_stats: res.base_stats,
          mode_card: res.mode_card,
        })
      : await base44.entities.DailyReading.create({
          date: today,
          welcome_subtitle: res.welcome_subtitle,
          today_hint: res.today_hint,
          recommended_mode: res.mode_card?.suggested_mode || currentMode,
          base_stats: res.base_stats,
          mode_card: res.mode_card,
        });

    const updatePayload = { base_stats: res.base_stats };
    if (needsTraits && res.traits?.strengths?.length) {
      updatePayload.traits = res.traits;
    }
    await base44.entities.UserProfile.update(profile.id, updatePayload);

    queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    queryClient.invalidateQueries({ queryKey: ["dailyReading"] });

    return newReading;
  };

  const { data: readings } = useQuery({
    queryKey: ["dailyReading", today],
    queryFn: async () => {
      const existing = await base44.entities.DailyReading.filter({
        date: today,
      });
      if (existing?.length > 0) return existing;
      const newReading = await generateDailyReading();
      return [newReading];
    },
    enabled: !!profile,
  });

  const reading = readings?.[0];

  const { data: goals = [] } = useQuery({
    queryKey: ["goals", profile?.id],
    queryFn: async () => {
      const all = await base44.entities.Goal.list();
      return all
        .filter((g) => g.user_profile_id === profile.id)
        .filter((g) => !g.is_completed)
        .sort((a, b) => {
          if (a.order == null) return 1;
          if (b.order == null) return -1;
          return a.order - b.order;
        });
    },
    enabled: !!profile?.id,
  });

  useEffect(() => {
    if (goals.length > 0) {
      const isStillValid = goals.some((g) => g.id === selectedGoalId);
      if (!selectedGoalId || !isStillValid) setSelectedGoalId(goals[0].id);
    } else {
      setSelectedGoalId(null);
    }
  }, [goals, selectedGoalId]);

  const { data: allActions = [] } = useQuery({
    queryKey: ["allGoalActions", today],
    queryFn: () => base44.entities.GoalAction.filter({ date: today }),
    enabled: !!profile,
  });

  const { data: allTodos = [] } = useQuery({
    queryKey: ["allGoalTodos", today],
    queryFn: () => base44.entities.GoalTodo.filter({ date: today }),
    enabled: !!profile,
  });

  useEffect(() => {
    if (!profileLoading && (!profile || !profile.onboarding_complete))
      navigate("/Onboarding", { replace: true });
    if (profile && isInitializing) setIsInitializing(false);
  }, [profileLoading, profile]);

  useEffect(() => {
    if (goals.length > 0 && !selectedGoalId) setSelectedGoalId(goals[0].id);
  }, [goals]);

  useEffect(() => {
    if (!profile || !reading?.mode_card) return;
    const checkPopup = async () => {
      const lastShown = await base44.storage.get("modeCardLastShownDate");
      if (lastShown !== today) {
        setShowModeCard(true);
        await base44.storage.set("modeCardLastShownDate", today);
      }
    };
    checkPopup();
  }, [profile, reading?.mode_card, today]);

  const currentGoal = useMemo(
    () => goals.find((g) => g.id === selectedGoalId),
    [goals, selectedGoalId],
  );
  const currentActions = useMemo(
    () => (allActions || []).filter((a) => a.goal_id === selectedGoalId),
    [allActions, selectedGoalId],
  );
  const currentTodos = useMemo(
    () => (allTodos || []).filter((t) => t.goal_id === selectedGoalId),
    [allTodos, selectedGoalId],
  );

  useEffect(() => {
    const handleExternalModeChange = async (e) => {
      const newMode = e.detail;
      if (!newMode || newMode === profile?.current_mode) return;
      isModeChanging.current = true;
      hasGeneratedReading.current = false;
      hasGeneratedActions.current = false;
      setIsInitializing(true);
      await generateDailyReading(newMode);
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      isModeChanging.current = false;
      setIsInitializing(false);
    };
    window.addEventListener("modeChanged", handleExternalModeChange);
    return () =>
      window.removeEventListener("modeChanged", handleExternalModeChange);
  }, [profile]);

  const handleModeSelect = async (mode) => {
    setShowModeCard(false);
    if (mode === profile?.current_mode) return;
    isModeChanging.current = true;
    hasGeneratedReading.current = false;
    hasGeneratedActions.current = false;
    setIsInitializing(true);
    await base44.entities.UserProfile.update(profile.id, {
      current_mode: mode,
    });
    await generateDailyReading(mode);
    queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    isModeChanging.current = false;
    setIsInitializing(false);
  };

  useEffect(() => {
    if (!profile) return;
    const init = async () => {
      setIsInitializing(true);
      const lastInit = await base44.storage.get("homeInitDate");
      if (lastInit === today) {
        setIsAppReady(true);
        setIsInitializing(false);
        return;
      }
      await generateDailyReading();
      await base44.storage.set("homeInitDate", today);
      setIsAppReady(true);
      setIsInitializing(false);
    };
    init();
  }, [profile]);

  if (profileLoading || isInitializing || !isAppReady)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-950">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
      </div>
    );

  return (
    <>
      {showModeCard && reading?.mode_card && (
        <ModeCard
          data={reading.mode_card}
          onDismiss={() => setShowModeCard(false)}
          onSelect={handleModeSelect}
        />
      )}

      <div className="min-h-screen bg-[#FDFCFE] dark:bg-gray-950 pb-32 transition-colors duration-500">
        <div className="px-6 pt-12 pb-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em] mb-2">
              HADA
            </p>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight break-keep">
              {reading?.today_hint
                ? `${reading.today_hint}`
                : `안녕하세요, ${profile.full_name}님!`}
            </h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 font-semibold">
              {reading?.welcome_subtitle || profile.goal}
            </p>
          </motion.div>
        </div>

        <div className="px-5 space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-[32px] p-6 shadow-[0_8px_30px_rgba(120,50,255,0.04)] border border-purple-50/50 dark:border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-8 bg-purple-500 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.2)]" />
                <h2 className="text-lg font-black text-gray-800 dark:text-gray-100 tracking-tight">
                  이번 주 실천도
                </h2>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/40 px-3 py-1.5 rounded-2xl">
                <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 tracking-wider">
                  할일 +10 XP
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {goals.map((goal, index) => (
                <GoalBar
                  key={goal.id}
                  goal={goal}
                  index={index}
                  isSelected={selectedGoalId === goal.id}
                  onClick={() => setSelectedGoalId(goal.id)}
                />
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {currentGoal && (
              <motion.div
                key={currentGoal.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                <GoalDetailPanel
                  goal={currentGoal}
                  profile={profile}
                  today={today}
                  actions={currentActions}
                  todos={currentTodos}
                  queryClient={queryClient}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

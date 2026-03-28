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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { MODE_CONFIGS } from "@/components/home/modeConfig";
import TarotSection from "@/components/home/TarotSection";
import ModeCard from "@/components/home/ModeCard";
import { getKSTDateString } from "@/utils/date";

// ─── 목표별 파스텔 테마 정의 ─────────────────────────────────────
const GOAL_THEMES = [
  {
    light: "bg-indigo-50 border-indigo-100 text-indigo-600",
    dark: "dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400",
    bar: "bg-indigo-400",
  },
  {
    light: "bg-rose-50 border-rose-100 text-rose-600",
    dark: "dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400",
    bar: "bg-rose-400",
  },
  {
    light: "bg-amber-50 border-amber-100 text-amber-600",
    dark: "dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400",
    bar: "bg-amber-400",
  },
  {
    light: "bg-emerald-50 border-emerald-100 text-emerald-600",
    dark: "dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400",
    bar: "bg-emerald-400",
  },
  {
    light: "bg-sky-50 border-sky-100 text-sky-600",
    dark: "dark:bg-sky-900/20 dark:border-sky-800 dark:text-sky-400",
    bar: "bg-sky-400",
  },
];

// ─── 목표 XP 바 컴포넌트 ─────────────────────────────────────────
function GoalBar({ goal, isSelected, onClick, index }) {
  const currentWeek = getWeekKey();
  const needsReset = goal.xp_reset_week !== currentWeek;
  const xp = needsReset ? 0 : goal.xp || 0;
  const pct = Math.min((xp / 100) * 100, 100);
  const theme = GOAL_THEMES[index % GOAL_THEMES.length];

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full text-left rounded-2xl px-5 py-4 transition-all duration-300 border-2 ${
        isSelected
          ? `bg-white dark:bg-gray-800 border-purple-400 dark:border-purple-500 shadow-lg`
          : `${theme.light} ${theme.dark} border-transparent opacity-60 hover:opacity-100`
      }`}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`p-1.5 rounded-lg ${
              isSelected
                ? "bg-purple-100 dark:bg-purple-900/40 text-purple-600"
                : "bg-white/50 dark:bg-black/20"
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
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-black ${
              isSelected ? "text-purple-600" : "opacity-60"
            }`}
          >
            {xp} XP
          </span>
          <ChevronRight
            className={`w-3.5 h-3.5 transition-transform ${
              isSelected ? "rotate-90 text-purple-500" : "opacity-30"
            }`}
          />
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          className={`h-full rounded-full ${
            isSelected ? "bg-purple-500" : theme.bar
          }`}
        />
      </div>
    </motion.button>
  );
}

// ─── 목표별 할일 패널 (탭 오류 수정 버전) ──────────────────────────
function GoalTodoPanel({ goalId, today, profile, todos = [], queryClient }) {
  const [tab, setTab] = useState("ongoing");
  const [newTodo, setNewTodo] = useState("");

  useEffect(() => {
    setTab("ongoing");
  }, [goalId]);

  // 안전하게 데이터 필터링 (undefined 방지)
  const ongoing = (todos || []).filter((t) => !t.completed);
  const done = (todos || []).filter((t) => t.completed);

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
    queryClient.invalidateQueries({ queryKey: ["allGoalTodos"] });
  };

  const toggleTodo = async (todo) => {
    const isCompleting = !todo.completed;
    await base44.entities.GoalTodo.update(todo.id, { completed: isCompleting });

    if (isCompleting && profile) {
      const allGoals = await base44.entities.Goal.list();
      const goal = allGoals.find((g) => g.id === goalId);
      if (goal) {
        const currentWeek = getWeekKey();
        const currentXp =
          (goal.xp_reset_week !== currentWeek ? 0 : goal.xp) || 0;
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
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    }
    queryClient.invalidateQueries({ queryKey: ["allGoalTodos"] });
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
                  ? "line-through text-gray-400"
                  : "text-gray-700 dark:text-gray-200"
              }`}
            >
              {todo.title}
            </span>
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
    </div>
  );
}

// ─── 목표 상세 패널 ────────────────────────────────────────────
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
    hasTriggered.current = false; // 👈 이거 추가

    if (isGenerating || actions.length > 0 || hasTriggered.current) return;
    const generate = async () => {
      hasTriggered.current = true;
      setIsGenerating(true);
      try {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: `목표: "${goal.title}"에 대한 오늘의 행운 카드 3개를 생성해라.`,
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
    generate();
  }, [goal.id]);

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
          onAddToTodo={async (title) => {
            await base44.entities.GoalTodo.create({
              goal_id: goal.id,
              user_profile_id: profile?.id,
              title,
              completed: false,
              date: today,
            });
            queryClient.invalidateQueries({ queryKey: ["allGoalTodos"] });
          }}
        />
      </div>
      <div className="px-1">
        <p className="text-[12px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
          오늘의 실천 리스트
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

// ═══════════════════════════════════════════════════════════════
// Home 메인
// ═══════════════════════════════════════════════════════════════
export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const today = getKSTDateString();

  const { data: profiles, isLoading: profileLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => base44.entities.UserProfile.list(),
  });
  const profile = profiles?.[0];

  const { data: readings } = useQuery({
    queryKey: ["dailyReading", today],
    queryFn: () => base44.entities.DailyReading.filter({ date: today }),
    enabled: !!profile,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["goals", profile?.id],
    queryFn: async () => {
      const all = await base44.entities.Goal.list();
      return all
        .filter((g) => g.user_profile_id === profile.id)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },
    enabled: !!profile?.id,
  });

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

  // 목표 전환 시 필터링 (데이터가 로딩 중일 때도 빈 배열을 반환해 에러 방지)
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

  if (profileLoading || isInitializing)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-950">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
      </div>
    );

  return (
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
            {readings?.[0]?.today_hint
              ? `"${readings[0].today_hint}"`
              : `안녕하세요, ${profile.full_name}님!`}
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 font-semibold">
            {readings?.[0]?.welcome_subtitle || profile.goal}
          </p>
        </motion.div>
      </div>

      <div className="px-5">
        <div className="bg-white dark:bg-gray-900 rounded-[45px] p-8 shadow-[0_20px_60px_rgba(120,50,255,0.06)] border border-purple-50 dark:border-gray-800 transition-all">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-8 bg-purple-500 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.3)]" />
              <h2 className="text-lg font-black text-gray-800 dark:text-gray-100 tracking-tight">
                이번 주 실천도
              </h2>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/40 px-3.5 py-1.5 rounded-2xl">
              <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 tracking-wider">
                할일 +10 XP
              </span>
            </div>
          </div>

          <div className="space-y-3 mb-10">
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

          <div className="min-h-[500px]">
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
      </div>
    </div>
  );
}

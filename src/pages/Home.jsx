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
import ModeCard from "@/components/home/ModeCard";
import { MODE_CONFIGS } from "@/components/home/modeConfig";
import TarotSection from "@/components/home/TarotSection";
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
      // 1. [Optimistic Update] 화면에 즉시 반영 (가장 중요!)
      // 서버 응답을 기다리지 않고 캐시 데이터를 먼저 수정해서 탭 이동을 즉시 시킵니다.
      queryClient.setQueryData(["allGoalTodos", today], (old = []) =>
        old.map((t) =>
          t.id === todo.id ? { ...t, completed: isCompleting } : t,
        ),
      );

      // 2. 서버 업데이트 수행
      await base44.entities.GoalTodo.update(todo.id, {
        completed: isCompleting,
      });

      // 3. 완료 처리된 경우에만 XP 추가 로직 실행
      if (isCompleting && profile?.id) {
        // 캐시에서 현재 목표 찾기
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

      // 4. [동기화] 서버 데이터와 화면 데이터 최종 맞추기
      // 키 이름을 ["allGoalTodos", today]로 정확히 맞춰야 합니다.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["allGoalTodos", today] }),
        queryClient.invalidateQueries({ queryKey: ["goals", profile?.id] }),
        queryClient.invalidateQueries({ queryKey: ["userProfile"] }),
      ]);
    } catch (e) {
      console.error("업데이트 실패:", e);
      // 에러 발생 시 원래 상태로 복구하기 위해 다시 불러옴
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

                [현재 날짜]
                ${today}

                [현재 시간대]
                ${timeSlot}

                [최근 완료한 행동들]
                ${recentComplete.length ? recentComplete.join(", ") : "없음"}

                [최근 미완료 행동들]
                ${
                  recentIncomplete.length ? recentIncomplete.join(", ") : "없음"
                }

                [카드 생성 규칙]
                - 위 맥락을 기반으로 오늘 실행할 수 있는 "행운 실천 카드" 5개를 생성하라.
                - 반드시 서로 다른 방향의 행동이어야 한다.
                - 너무 추상적이면 안 되고, 바로 실행 가능한 행동이어야 한다.
                - 반드시 정확히 5개의 카드를 cards 배열로 반환.
                - 5개 미만·초과 금지.

                각 카드 필드 규칙:
                - keyword: 10자 이내 핵심 단어 (짧게)
                - micro_action: 20자 이내 오늘 할 구체적 행동 (한 줄)
                - how: 50자 이내. 어떻게 하면 좋은지 설명. 줄바꿈 금지.
                - fortune: 40자 이내. 이 행동이 가져올 긍정적 효과. 줄바꿈 금지.
                - stat_focus: 아래 5가지 중 하나만:
                  work_efficiency / creativity /
                  communication / focus / fortune

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
          onAddToTodo={async (title) => {
            await base44.entities.GoalTodo.create({
              goal_id: goal.id,
              user_profile_id: profile?.id,
              title,
              completed: false,
              date: today,
            });
            queryClient.invalidateQueries({
              queryKey: ["allGoalTodos", today],
            });
          }}
        />
      </div>
      <div className="px-1">
        <p className="text-[12px] font-black text-gray-800 dark:text-gray-100 uppercase tracking-widest mb-3">
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

  // ─── generateDailyReading ─────────────────────────────────
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

    // ─── traits가 없을 때만 프롬프트에 추가 ───
    const needsTraits = !profile?.traits?.strengths?.length;
    const traitsPrompt = needsTraits
      ? `
6. traits: 사용자의 사주·성명·별자리 분석을 바탕으로 딱 한 번만 생성.
   - strengths: 강점 3개 (각 10자 이내)
   - weaknesses: 성장 포인트 3개 (각 10자 이내)
   - potentials: 잠재력 3개 (각 10자 이내)`
      : "";

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `너는 HADA 앱의 일일 리딩 엔진이다.

              === ${config.name} (${currentMode.toUpperCase()} MODE) ===
              분석 위계:
              - ${config.weights[Object.keys(config.weights)[0]]}
              - ${config.weights[Object.keys(config.weights)[1]]}
              - ${config.weights[Object.keys(config.weights)[2]]}
              - ${config.weights[Object.keys(config.weights)[3]]}

              톤앤매너 키워드: ${config.tone_keywords.join(", ")}
              목표 영역: ${config.goal_focus.join(", ")}
              오늘 날짜: ${today}, 시간대: ${timeSlot}
              모드: ${currentMode} 

              [작성 규칙 — 글자 수는 방향 지시, 초과 시 코드 truncate]
              1. today_hint: 헤더 인사말.
                16자 이내(text-xl 기준 iPhone SE 1줄).
                줄바꿈 금지.
              2. welcome_subtitle: 목표와 연결된 문구.
                20자 이내(text-base 기준). 줄바꿈 금지.
              3. base_stats: 오늘 날짜·목표·모드 종합
                0~100 정수. 매일 다른 값 필수.
              4. mode_card.suggested_mode : action 또는 restore 하나 선택.
              5. mode_card.card_body: 60자 이내.${traitsPrompt}`,
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
          // ─── traits는 needsTraits일 때만 스키마에 포함 ───
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

    // ─── traits 저장: 응답에 있고 아직 없을 때만 ───
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
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },
    enabled: !!profile?.id,
  });

  useEffect(() => {
    if (goals.length > 0) {
      // 리스트의 첫 번째(index 0) 목표의 ID를 기본값으로 설정
      // 만약 이미 선택된 ID가 있더라도, 그 ID가 현재 리스트에 없다면 첫 번째로 리셋
      const isStillValid = goals.some((g) => g.id === selectedGoalId);
      if (!selectedGoalId || !isStillValid) {
        setSelectedGoalId(goals[0].id);
      }
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

  // ─── 레이아웃 모드 변경 감지 ──────────────────────────────
  useEffect(() => {
    const handleExternalModeChange = async (e) => {
      const newMode = e.detail;
      if (!newMode || newMode === profile?.current_mode) return;

      // handleModeSelect와 동일한 로직 실행
      isModeChanging.current = true;
      hasGeneratedReading.current = false;
      hasGeneratedActions.current = false;
      setIsInitializing(true);

      await generateDailyReading(newMode);
      await generateActions(newMode);
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      isModeChanging.current = false;
      setIsInitializing(false);
    };

    window.addEventListener("modeChanged", handleExternalModeChange);
    return () =>
      window.removeEventListener("modeChanged", handleExternalModeChange);
  }, [profile]); // profile 의존성 필요

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

      // 👉 이미 오늘 했으면 skip
      if (lastInit === today) {
        setIsAppReady(true);
        setIsInitializing(false);
        return;
      }

      // 👉 daily reading만 생성 (actions는 자동 생성됨)
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

        <div className="px-5">
          <div className="bg-white dark:bg-[#2E3447] rounded-[45px] p-8 shadow-[0_20px_60px_rgba(120,50,255,0.06)] border border-purple-50 dark:border-gray-800 transition-all">
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
    </>
  );
}

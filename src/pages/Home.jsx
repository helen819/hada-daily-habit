import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import EnergyStats from "@/components/home/EnergyStats";
import { MODE_CONFIGS } from "@/components/home/modeConfig";
import TarotSection from "@/components/home/TarotSection";
import ModeCard from "@/components/home/ModeCard";
import TodoList from "@/components/home/TodoList";
import { getKSTDateString } from "@/utils/date";

export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showModeCard, setShowModeCard] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // 생성 중복 방지 ref
  const hasGeneratedReading = useRef(false);
  const hasGeneratedActions = useRef(false);
  const isModeChanging = useRef(false);

  const today = getKSTDateString();

  // ─── 프로필 ───────────────────────────────────────────────
  const { data: profiles, isLoading: profileLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => base44.entities.UserProfile.list(),
  });
  const profile = profiles?.[0];

  // ─── 오늘의 리딩 ──────────────────────────────────────────
  const { data: readings } = useQuery({
    queryKey: ["dailyReading", today],
    queryFn: () => base44.entities.DailyReading.filter({ date: today }),
    enabled: !!profile,
  });
  const reading = readings?.[0];

  // ─── 오늘의 액션 (created_at 내림차순 = 최신순) ───────────
  const { data: actions, isLoading: actionsLoading } = useQuery({
    queryKey: ["microActions", today],
    queryFn: async () => {
      const result = await base44.entities.MicroAction.filter({ date: today });
      // created_at 내림차순 정렬 (최신이 앞)
      return [...result].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );
    },
    enabled: !!profile,
  });

  // ─── 투두 & 스케줄 ────────────────────────────────────────
  const { data: todos = [] } = useQuery({
    queryKey: ["todos", today],
    queryFn: () => base44.entities.Todo.filter({ date: today }),
    enabled: !!profile,
  });

  const { data: allSchedules = [] } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => base44.entities.ScheduleItem.list("-date"),
    enabled: !!profile,
  });
  const todaySchedules = useMemo(
    () => allSchedules.filter((s) => s.date === today),
    [allSchedules, today],
  );

  useEffect(() => {
    if (!profileLoading && (!profile || !profile.onboarding_complete)) {
      navigate("/Onboarding", { replace: true });
    }
  }, [profileLoading, profile, navigate]);

  // ─── 모드 카드 팝업: 하루 한 번 ──────────────────────────
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
    const needsTraits = !profile.traits?.strengths?.length;
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
              목표: ${profile.goal}, 시간대: ${timeSlot}
              모드: ${currentMode}, 오늘 날짜: ${today}

              [작성 규칙 — 글자 수는 방향 지시, 초과 시 코드 truncate]
              1. today_hint: 헤더 인사말.
                16자 이내(text-xl 기준 iPhone SE 1줄).
                줄바꿈 금지.
              2. welcome_title: 오늘 분위기 키워드.
                18자 이내(text-lg 기준). 줄바꿈 금지.
              3. welcome_subtitle: 목표와 연결된 문구.
                20자 이내(text-base 기준). 줄바꿈 금지.
              4. base_stats: 오늘 날짜·목표·모드 종합
                0~100 정수. 매일 다른 값 필수.
              5. mode_card.card_body: 60자 이내.${traitsPrompt}`,
      response_json_schema: {
        type: "object",
        properties: {
          welcome_title: { type: "string" },
          welcome_subtitle: { type: "string" },
          today_hint: { type: "string" },
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
          welcome_title: res.welcome_title,
          welcome_subtitle: res.welcome_subtitle,
          today_hint: res.today_hint,
          recommended_mode: res.mode_card?.suggested_mode || currentMode,
          base_stats: res.base_stats,
          mode_card: res.mode_card,
        })
      : await base44.entities.DailyReading.create({
          date: today,
          welcome_title: res.welcome_title,
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

  // ─── generateActions ──────────────────────────────────────
  const generateActions = async (modeOverride) => {
    const currentMode = modeOverride || profile?.current_mode || "action";
    const config = MODE_CONFIGS[currentMode] || MODE_CONFIGS["action"];
    const hour = new Date().getHours();
    const timeSlot =
      hour < 6
        ? "밤"
        : hour < 12
        ? "아침"
        : hour < 18
        ? "낮"
        : hour < 22
        ? "저녁"
        : "밤";

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `너는 HADA 앱의 마이크로 액션 생성 엔진이다.

                === ${config.name} (${currentMode.toUpperCase()} MODE) ===
                분석 위계:
                - ${config.weights[Object.keys(config.weights)[0]]}
                - ${config.weights[Object.keys(config.weights)[1]]}
                - ${config.weights[Object.keys(config.weights)[2]]}
                - ${config.weights[Object.keys(config.weights)[3]]}

                톤앤매너 키워드: ${config.tone_keywords.join(", ")}
                목표 영역: ${config.goal_focus.join(", ")}

                사용자 정보:
                base_stats: ${JSON.stringify(profile.base_stats)}
                오늘 목표: ${profile.goal}
                현재 시간대: ${timeSlot}

                [카드 생성 규칙]
                반드시 정확히 5개의 카드를 cards 배열로 반환.
                5개 미만·초과 금지.

                각 카드 필드 규칙:
                - keyword: 10자 이내 핵심 단어
                - micro_action: 20자 이내 행동 제목
                - how: 50자 이내. 줄바꿈 금지.
                - fortune: 40자 이내. 줄바꿈 금지.
                - stat_focus: 아래 5가지 중 하나만:
                  work_efficiency / creativity /
                  communication / focus / fortune
                  (5개 값 고르게 분배 권장)

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

    const validStatFocus = [
      "work_efficiency",
      "creativity",
      "communication",
      "focus",
      "fortune",
    ];
    if (res.cards?.length) {
      for (const card of res.cards) {
        await base44.entities.MicroAction.create({
          date: today,
          keyword: card.keyword,
          micro_action: card.micro_action,
          how: card.how,
          fortune: card.fortune,
          stat_focus: validStatFocus.includes(card.stat_focus)
            ? card.stat_focus
            : "focus",
          completed: false,
          viewed: false, // ← 새 필드
          mode: currentMode,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["microActions"] });
      return true;
    }
  };

  // ─── 홈 초기화 ────────────────────────────────────────────
  useEffect(() => {
    if (!profile || readings === undefined || actions === undefined) return;
    if (isModeChanging.current) return;

    const initToday = async () => {
      setIsInitializing(true);
      try {
        if (!hasGeneratedReading.current) {
          hasGeneratedReading.current = true;
          await generateDailyReading();
        }

        if (!actionsLoading && !hasGeneratedActions.current) {
          const allViewed =
            actions.length > 0 && actions.every((a) => a.viewed === true);
          const isEmpty = actions.length === 0;

          if (isEmpty || allViewed) {
            hasGeneratedActions.current = true;
            if (readings.length === 0)
              await new Promise((r) => setTimeout(r, 1500));
            await generateActions();
          }
        }
      } finally {
        setIsInitializing(false);
      }
    };

    initToday();
  }, [profile, readings, actions, actionsLoading]);

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

  // ─── 모드 선택 처리 ───────────────────────────────────────
  const handleModeSelect = async (mode) => {
    setShowModeCard(false);

    // 현재 모드와 같으면 아무것도 안 함
    if (mode === profile?.current_mode) return;

    isModeChanging.current = true;
    hasGeneratedReading.current = false;
    hasGeneratedActions.current = false;
    setIsInitializing(true);

    await base44.entities.UserProfile.update(profile.id, {
      current_mode: mode,
    });
    await generateDailyReading(mode);
    await generateActions(mode); // 기존 액션 유지 + 새 모드 액션 추가
    queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    isModeChanging.current = false;
    setIsInitializing(false);
  };

  // ─── 투두 관련 ────────────────────────────────────────────
  const addTodo = async (title) => {
    await base44.entities.Todo.create({ title, completed: false, date: today });
    queryClient.invalidateQueries({ queryKey: ["todos", today] });
  };

  const toggleTodo = async (todo) => {
    const isCompleting = !todo.completed;
    await base44.entities.Todo.update(todo.id, { completed: isCompleting });
    if (isCompleting && profile) {
      const newXp = (profile.xp || 0) + 10;
      const newLevel = Math.floor(newXp / 100) + 1;
      await base44.entities.UserProfile.update(profile.id, {
        xp: newXp,
        level: newLevel,
      });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    }
    queryClient.invalidateQueries({ queryKey: ["todos", today] });
  };

  const toggleSchedule = async (schedule) => {
    await base44.entities.ScheduleItem.update(schedule.id, {
      completed: !schedule.completed,
    });
    queryClient.invalidateQueries({ queryKey: ["schedules"] });
  };

  // ─── 렌더 가드 ────────────────────────────────────────────
  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!profile || !profile.onboarding_complete) return null;

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        <p className="text-sm text-muted-foreground">
          오늘의 에너지를 분석하고 있어요...
        </p>
      </div>
    );
  }

  // actions가 하나도 없으면 카드 뒤집기 비활성화 플래그
  const canFlipCards = actions && actions.length > 0;

  const handleCardViewed = () => {
    // allViewed 상태가 될 수 있으니 가드 리셋 후 invalidate
    hasGeneratedActions.current = false;
    queryClient.invalidateQueries({ queryKey: ["microActions", today] });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {showModeCard && reading?.mode_card && (
        <ModeCard
          data={reading.mode_card}
          onDismiss={() => setShowModeCard(false)}
          onSelect={handleModeSelect}
          key="mode-card-unique"
        />
      )}

      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-[10px] font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-widest mb-1">
            HADA
          </p>
          <h1 className="text-lg font-bold text-foreground leading-snug break-keep whitespace-normal">
            {reading?.today_hint
              ? `"${reading.today_hint}"`
              : `안녕하세요, ${profile.full_name}님`}
          </h1>
          <p className="text-[11px] text-muted-foreground mt-1 break-keep whitespace-normal">
            {reading?.welcome_subtitle || profile.goal}
          </p>
        </motion.div>
      </div>

      <div className="px-5 space-y-5">
        {reading?.welcome_title && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/Shop")}
            className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 rounded-2xl p-4 cursor-pointer hover:shadow-sm transition-shadow
             dark:from-amber-900/40 dark:to-yellow-900/40 dark:border-amber-700/60"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  오늘의 분위기
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  ✨ {reading.welcome_title}
                </p>
              </div>
              <span className="text-amber-400 dark:text-amber-500 text-lg">
                ›
              </span>
            </div>
          </motion.div>
        )}

        <EnergyStats stats={reading?.base_stats || profile.base_stats} />

        {/* canFlipCards=false면 TarotSection에서 카드 뒤집기 막아야 함 */}
        <TarotSection
          actions={actions ?? []}
          todos={todos}
          onAddToTodo={addTodo}
          isLoading={actionsLoading}
          canFlip={canFlipCards}
          onViewed={handleCardViewed} // ← 추가
        />

        <TodoList
          todos={todos}
          schedules={todaySchedules}
          onAdd={addTodo}
          onToggle={toggleTodo}
          onToggleSchedule={toggleSchedule}
        />
      </div>
    </div>
  );
}

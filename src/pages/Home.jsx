import React, { useState, useEffect, useMemo } from "react";
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

  const today = getKSTDateString();

  const { data: profiles, isLoading: profileLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => base44.entities.UserProfile.list(),
  });

  const profile = profiles?.[0];

  useEffect(() => {
    if (!profileLoading && !profile) {
      navigate("/Onboarding", { replace: true });
    }
  }, [profileLoading, profile, navigate]);

  const { data: readings } = useQuery({
    queryKey: ["dailyReading", today],
    queryFn: () => base44.entities.DailyReading.filter({ date: today }),
    enabled: !!profile,
  });

  const reading = readings?.[0];

  const { data: actions, isLoading: actionsLoading } = useQuery({
    queryKey: ["microActions", today],
    queryFn: () => base44.entities.MicroAction.filter({ date: today }),
    enabled: !!profile,
  });

  const { data: todos = [] } = useQuery({
    queryKey: ["todos", today],
    queryFn: () => base44.entities.Todo.filter({ date: today }),
    enabled: !!profile,
  });

  // 오늘 스케줄
  const { data: allSchedules = [] } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => base44.entities.ScheduleItem.list("-date"),
    enabled: !!profile,
  });

  const todaySchedules = useMemo(
    () => allSchedules.filter((s) => s.date === today),
    [allSchedules, today],
  );

  // 모드 카드 팝업 체크
  useEffect(() => {
    if (profile && reading?.mode_card) {
      const checkAndShowPopup = async () => {
        const todayDate = getKSTDateString();
        const lastShownDate = await base44.storage.get("modeCardLastShownDate");
        if (lastShownDate !== todayDate) {
          setShowModeCard(true);
          await base44.storage.set("modeCardLastShownDate", todayDate);
        }
      };
      checkAndShowPopup();
    }
  }, [profile, reading]);

  // 모드 변경 이벤트 리스너
  useEffect(() => {
    const handler = async (e) => {
      if (profile) {
        setIsInitializing(true);
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        await generateDailyReading(e.detail);
        await new Promise((r) => setTimeout(r, 1500));
        await generateActions(e.detail);
        setIsInitializing(false);
      }
    };
    window.addEventListener("modeChanged", handler);
    return () => window.removeEventListener("modeChanged", handler);
  }, [profile]);

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
user_level: ${profile.level || 1}
오늘 목표: ${profile.goal}
현재 시간대: ${timeSlot}

마이크로 액션 원칙: 1~2분이면 바로 할 수 있는 아주 사소한 행동만 추천.
전문 용어는 절대 사용하지 마라. 부드러운 존댓말로 작성.`,
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
                level: { type: "number" },
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
    if (res.cards) {
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
          level: card.level || 1,
          completed: false,
          mode: currentMode,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["microActions"] });
    }
  };

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
목표: ${
        profile.goal
      }, 시간대: ${timeSlot}, 모드: ${currentMode}, 오늘 날짜: ${today}

[작성 규칙]
1. today_hint: 헤더에 들어갈 인사말. 17자 이내로 짧고 강렬하게 작성.
2. welcome_title: 오늘의 분위기. 20자 이내 키워드형 문구.
3. base_stats: 오늘 날짜(${today})와 사용자의 생년월일, 목표, 모드를 종합하여 오늘 하루의 에너지 수치를 0~100 사이 숫자로 계산하라. 매일 다른 값이 나와야 한다.

아래 JSON 스키마로만 답하라. 전문 용어 금지. 부드러운 존댓말.`,
      response_json_schema: {
        type: "object",
        properties: {
          welcome_title: { type: "string" },
          welcome_subtitle: { type: "string" },
          today_hint: { type: "string" },
          summary_text: { type: "string" },
          advice_title: { type: "string" },
          advice_body: { type: "string" },
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
        },
      },
    });

    await base44.entities.DailyReading.create({
      date: today,
      welcome_title: res.welcome_title,
      welcome_subtitle: res.welcome_subtitle,
      today_hint: res.today_hint,
      summary_text: res.summary_text,
      advice_title: res.advice_title,
      advice_body: res.advice_body,
      recommended_mode: res.mode_card?.suggested_mode || profile.current_mode,
      base_stats: res.base_stats,
      mode_card: res.mode_card,
    });

    // 추가
    await base44.entities.UserProfile.update(profile.id, {
      base_stats: res.base_stats,
    });
    queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    queryClient.invalidateQueries({ queryKey: ["dailyReading"] });
  };

  // 홈 초기화
  useEffect(() => {
    if (!profile) return;
    if (readings === undefined) return;
    if (actions === undefined) return;

    const initToday = async () => {
      setIsInitializing(true);
      try {
        if (readings.length === 0) {
          await generateDailyReading();
        }
        if (!actionsLoading && actions.length === 0) {
          await new Promise((r) => setTimeout(r, 1500));
          await generateActions();
        }
      } finally {
        setIsInitializing(false);
      }
    };

    initToday();
  }, [profile, readings, actions, actionsLoading]);

  const handleModeSelect = async (mode) => {
    setShowModeCard(false);
    await base44.entities.UserProfile.update(profile.id, {
      current_mode: mode,
    });
    window.dispatchEvent(new CustomEvent("modeChanged", { detail: mode }));
    queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    await generateDailyReading(mode);
    await generateActions(mode);
  };

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

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!profile) return null;

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

  return (
    <div className="min-h-screen bg-background pb-24">
      {showModeCard && (
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

        <TarotSection
          actions={actions}
          todos={todos}
          onAddToTodo={addTodo}
          isLoading={actionsLoading}
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

import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import EnergyStats from "@/components/home/EnergyStats";
import AdSlot from "@/components/ads/AdSlot";
import FortuneStats from "@/components/home/FortuneStats";
import { MODE_CONFIGS } from "@/components/home/modeConfig";
import ModeToggle from "@/components/home/ModeToggle";
import TarotSection from "@/components/home/TarotSection";
import AdviceBanner from "@/components/home/AdviceBanner";
import ModeCard from "@/components/home/ModeCard";
import TodoList from "@/components/home/TodoList";

// KST 기준 오늘 날짜 반환 (YYYY-MM-DD)
const getKSTDateString = () => {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000); // UTC+9
  return kst.toISOString().split("T")[0];
};

export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showModeCard, setShowModeCard] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const today = getKSTDateString();

  // Check onboarding
  const { data: profiles, isLoading: profileLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => base44.entities.UserProfile.list(),
  });

  const profile = profiles?.[0];

  // Redirect to onboarding if needed
  useEffect(() => {
    if (!profile || profile.length === 0) {
      console.log("프로필이 없거나 온보딩 미완료 - 이동함");
      navigate("/Onboarding", { replace: true });
    } else {
      console.log("프로필 확인됨:", profiles[0].full_name);
    }
  }, [profileLoading, profiles, navigate]);

  // Fetch daily reading
  const { data: readings } = useQuery({
    queryKey: ["dailyReading", today],
    queryFn: () => base44.entities.DailyReading.filter({ date: today }),
    enabled: !!profile,
  });

  const reading = readings?.[0];

  // Fetch micro actions
  const { data: actions, isLoading: actionsLoading } = useQuery({
    queryKey: ["microActions", today],
    queryFn: () => base44.entities.MicroAction.filter({ date: today }),
    enabled: !!profile,
  });

  // Fetch todos
  const { data: todos = [] } = useQuery({
    queryKey: ["todos"],
    queryFn: () => base44.entities.Todo.filter({ completed: false }),
    enabled: !!profile,
  });

  // Generate actions if none exist today
  // useEffect(() => {
  //   if (profile && !actionsLoading && actions && actions.length === 0) {
  //     generateActions();
  //   }
  // }, [profile, actionsLoading, actions]);

  // Home.jsx 수정
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

  // Listen for mode change from layout
  useEffect(() => {
    const handler = async (e) => {
      if (profile) {
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        await generateDailyReading(e.detail);
        await new Promise((r) => setTimeout(r, 1500));
        await generateActions(e.detail);
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

  // Generate daily reading + advice if none exist
  // useEffect(() => {
  //   if (profile && readings && readings.length === 0) {
  //     generateDailyReading();
  //   }
  // }, [profile, readings]);

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

사용자: ${profile.full_name}, 목표: ${profile.goal}
base_stats: ${JSON.stringify(profile.base_stats)}
시간대: ${timeSlot}, 모드: ${currentMode}

[작성 규칙]
1. today_hint: 헤더에 들어갈 인사말. **17자 이내**로 짧고 강렬하게 작성. (예: "빛내기 좋은 하루입니다!")
2. welcome_title: 오늘의 분위기. **20자 이내** 키워드형 문구.

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
      base_stats: profile.base_stats,
      mode_card: res.mode_card,
    });

    queryClient.invalidateQueries({ queryKey: ["dailyReading"] });
  };

  // ✅ 이걸로 교체
  useEffect(() => {
    if (!profile) return;
    if (readings === undefined) return;
    if (actions === undefined) return;

    const initToday = async () => {
      if (readings.length === 0) {
        await generateDailyReading();
      }
      if (!actionsLoading && actions.length === 0) {
        await new Promise((r) => setTimeout(r, 1500));
        await generateActions();
      }
    };

    initToday();
  }, [profile, readings, actions, actionsLoading]);

  const handleModeSelect = async (mode) => {
    setShowModeCard(false); // 🔥 일단 팝업부터 닫고 처리를 시작합니다.
    await base44.entities.UserProfile.update(profile.id, {
      current_mode: mode,
    });
    window.dispatchEvent(new CustomEvent("modeChanged", { detail: mode }));
    queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    // Regenerate sequentially to avoid 502 from parallel LLM calls
    await generateDailyReading(mode);
    await generateActions(mode);
  };

  // Todo handlers
  const addTodo = async (title) => {
    await base44.entities.Todo.create({ title, completed: false, date: today });
    queryClient.invalidateQueries({ queryKey: ["todos"] });
  };

  // 1. 할 일(Todo) 토글 시 XP 부여 로직 추가
  const toggleTodo = async (todo) => {
    const isCompleting = !todo.completed; // 새로 완료되는 상태인지 확인

    // 할 일 상태 업데이트
    await base44.entities.Todo.update(todo.id, { completed: isCompleting });

    // 🔥 완료 체크 시에만 XP 10 부여
    if (isCompleting && profile) {
      const newXp = (profile.xp || 0) + 10;
      const newLevel = Math.floor(newXp / 100) + 1; // 100점마다 레벨 1 상승

      await base44.entities.UserProfile.update(profile.id, {
        xp: newXp,
        level: newLevel,
      });

      // 유저 프로필 정보 갱신 (상단 레벨바 등에 즉시 반영)
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    }

    queryClient.invalidateQueries({ queryKey: ["todos"] });
  };
  const convertTodo = async (todo) => {
    setIsConverting(true);
    // 삭제
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `너는 사용자가 적은 큰 할 일을 당장 실행할 수 있는 마이크로 액션 1단계로 바꾸는 엔진이다.
할 일: ${todo.title}
1분 이내에 할 수 있고, 실패하기 힘들 정도로 작은 행동으로 변환해라.`,
      response_json_schema: {
        type: "object",
        properties: {
          micro_step: { type: "string" },
        },
      },
    });

    await base44.entities.Todo.update(todo.id, { micro_step: res.micro_step });
    queryClient.invalidateQueries({ queryKey: ["todos"] });
    setIsConverting(false);
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!profile) return null;

  const completedCount = actions?.filter((a) => a.completed).length || 0;
  const totalActions = actions?.length || 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Mode Card Popup */}
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
        {/* Today Mood/Atmosphere */}
        {reading?.welcome_title && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            whileTap={{ scale: 0.98 }} // [추가] 터치 시 살짝 눌리는 효과
            onClick={() => navigate("/Shop")} // [추가] 상점 탭으로 이동
            className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 rounded-2xl p-4 cursor-pointer hover:shadow-sm transition-shadow
           dark:from-amber-900/40 dark:to-yellow-900/40 dark:border-amber-700/60"
          >
            <div className="flex items-center justify-between">
              {" "}
              {/* [추가] 화살표 아이콘을 위해 레이아웃 변경 */}
              <div>
                <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 ...">
                  오늘의 분위기
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  ✨ {reading.welcome_title}
                </p>
              </div>
              {/* [선택사항] 이동 가능하다는 힌트 아이콘 */}
              <span className="text-amber-400 dark:text-amber-500 text-lg">
                ›
              </span>
            </div>
          </motion.div>
        )}

        {/* Energy Stats */}
        <EnergyStats stats={reading?.base_stats || profile.base_stats} />

        {/* Tarot Section - 행운 실천 */}
        <TarotSection
          actions={actions}
          todos={todos} // 🔥 추가: 할 일 목록 전달
          onAddToTodo={addTodo}
          isLoading={actionsLoading}
          userGoal={profile?.goal}
        />

        {/* Todo List */}
        <TodoList
          todos={todos}
          onAdd={addTodo}
          onToggle={toggleTodo}
          onConvert={convertTodo}
          isConverting={isConverting}
        />
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Loader2,
  Sparkles,
  X,
  ChevronRight,
  ChevronDown,
  Heart,
  Lock,
} from "lucide-react";
import AdModal from "@/components/shop/AdModal";
import CharmReveal from "@/components/shop/CharmReveal";
import { getKSTDateString } from "@/utils/date";

import {
  getMaxCharmPicks,
  getMaxCheeringLetter,
  getWeekKeyBySunday,
  LUCKY_LEVEL_THRESHOLD,
} from "@/config/unlockConfig";

function getTodayKey() {
  return getKSTDateString();
}

async function generateAICharm(profile) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const allGoals = await base44.entities.Goal.list();
  const activeGoals = allGoals
    .filter((g) => g.user_profile_id === profile.id && !g.is_completed)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .slice(0, 10);

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

  const allTodos = await base44.entities.GoalTodo.list();
  const userTodos = allTodos
    .filter((t) => t.user_profile_id === profile.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const recentComplete = userTodos
    .filter((t) => t.completed)
    .slice(0, 5)
    .map((t) => t.title);
  const recentIncomplete = userTodos
    .filter((t) => !t.completed)
    .slice(0, 5)
    .map((t) => t.title);

  return base44.integrations.Core.InvokeLLM({
    prompt: `너는 'HADA' 앱의 실시간 행운 추천 엔진이다.
            사용자의 전체 목표 리스트와 최근 활동 내역을 분석하여, 오늘 하루 가장 필요한 행운의 물건을 추천하라.

            [사용자의 현재 목표 리스트]
            ${goalsContext}

            [최근 완료한 행동들]
            ${recentComplete.length ? recentComplete.join(", ") : "없음"}

            [최근 미완료 행동들]
            ${recentIncomplete.length ? recentIncomplete.join(", ") : "없음"}

            오늘 날짜: ${dateStr}

            [작성 규칙]
            - name: 10자 이내. 일상에서 당장 구할 수 있는 일반적인 물건.
            - emoji: 위 물건과 가장 잘 어울리는 이모지 기호 딱 1개. (예: 🔑, ☕) 다른 텍스트 포함 금지.
            - effect: 30자 이내. "어떤 목표"와 연관된 효과인지 명시하여 작성.
            - description: 100자 이내. 사용법·의미. 줄바꿈 금지.`,
    response_json_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        emoji: { type: "string" },
        effect: { type: "string" },
        description: { type: "string" },
      },
      required: ["name", "emoji", "effect", "description"],
    },
  });
}

const CONCERN_CATEGORIES = [
  {
    id: "motivation",
    label: "🔥 동기부여",
    subs: [
      "의욕이 생기지 않아요",
      "시작하기가 두려워요",
      "포기하고 싶은 마음이 들어요",
      "꾸준함이 부족해요",
    ],
  },
  {
    id: "time",
    label: "⏰ 시간 관리",
    subs: [
      "시간이 부족해요",
      "집중이 잘 안 돼요",
      "미루는 습관이 있어요",
      "일과 목표 병행이 힘들어요",
    ],
  },
  {
    id: "confidence",
    label: "💪 자신감",
    subs: [
      "내가 할 수 있을지 모르겠어요",
      "남들과 비교하게 돼요",
      "실패가 두려워요",
      "과거의 실패가 발목을 잡아요",
    ],
  },
  {
    id: "direction",
    label: "🧭 방향 설정",
    subs: [
      "어디서부터 시작해야 할지 모르겠어요",
      "목표가 너무 막연해요",
      "계획을 세워도 지키기 어려워요",
      "중간 단계를 모르겠어요",
    ],
  },
  {
    id: "environment",
    label: "🌿 환경·관계",
    subs: [
      "주변 환경이 방해가 돼요",
      "응원해주는 사람이 없어요",
      "비판적인 시선이 힘들어요",
      "혼자라서 외로워요",
    ],
  },
];

function CheeringLetterModal({
  letter,
  goalTitle,
  concern,
  subConcern,
  onClose,
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-[32px] px-6 pt-5 pb-12 shadow-2xl max-h-[85vh] overflow-y-auto"
      >
        <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto mb-6" />
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-fuchsia-100 dark:bg-fuchsia-950/50 flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 text-fuchsia-500 dark:text-fuchsia-400" />
            </div>
            <div>
              <p className="text-[10px] font-black text-fuchsia-500 dark:text-fuchsia-400 uppercase tracking-widest">
                HADA 응원
              </p>
              <p className="text-sm font-black text-gray-900 dark:text-white leading-tight">
                {goalTitle}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                {concern} · {subConcern}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-fuchsia-50 dark:bg-fuchsia-950/30 rounded-3xl p-6 border border-fuchsia-100 dark:border-fuchsia-900/40">
          {letter.greeting && (
            <p className="text-sm font-black text-fuchsia-700 dark:text-fuchsia-300 mb-4 leading-snug">
              {letter.greeting}
            </p>
          )}
          {letter.empathy && (
            <div className="mb-4">
              <p className="text-[10px] font-black text-fuchsia-400 dark:text-fuchsia-500 uppercase tracking-widest mb-1.5">
                잘하고 있어요
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                {letter.empathy}
              </p>
            </div>
          )}
          {letter.core_message && (
            <div className="mb-4 bg-white/70 dark:bg-white/5 rounded-2xl px-4 py-3 border border-fuchsia-100 dark:border-fuchsia-800/30">
              <p className="text-sm font-bold text-fuchsia-800 dark:text-fuchsia-200 leading-relaxed">
                {letter.core_message}
              </p>
            </div>
          )}
          {letter.advice && (
            <div className="mb-4">
              <p className="text-[10px] font-black text-violet-400 dark:text-violet-500 uppercase tracking-widest mb-1.5">
                이렇게 해보세요
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                {letter.advice}
              </p>
            </div>
          )}
          {letter.closing && (
            <p className="text-sm font-bold text-fuchsia-600 dark:text-fuchsia-300 text-center pt-2 leading-relaxed">
              ✨ {letter.closing}
            </p>
          )}
        </div>

        <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center mt-4">
          이 응원은 일요일 자정에 초기화됩니다
        </p>
      </motion.div>
    </motion.div>
  );
}

function ConcernSelectorModal({ goals, onConfirm, onClose }) {
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);
  const [openCatId, setOpenCatId] = useState(null);

  const selectedGoal = goals.find((g) => g.id === selectedGoalId);
  const canConfirm = selectedGoalId && selectedCat && selectedSub;

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
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-[32px] px-6 pt-5 pb-10 shadow-2xl max-h-[85vh] overflow-y-auto"
      >
        <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto mb-6" />
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black text-gray-900 dark:text-white">
            어떤 고민이 있나요?
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-5">
          <p className="text-[11px] font-black text-violet-500 dark:text-violet-400 uppercase tracking-widest mb-2">
            1. 어떤 목표에 대한 고민인가요?
          </p>
          <div className="space-y-2">
            {goals.map((goal) => (
              <button
                key={goal.id}
                onClick={() => setSelectedGoalId(goal.id)}
                className={`w-full text-left px-4 py-3 rounded-2xl border-2 text-sm font-bold transition-all ${
                  selectedGoalId === goal.id
                    ? "border-violet-300 dark:border-violet-600 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300"
                    : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
                }`}
              >
                {goal.title}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-[11px] font-black text-violet-500 dark:text-violet-400 uppercase tracking-widest mb-2">
            2. 어떤 부분이 힘드신가요?
          </p>
          <div className="space-y-2">
            {CONCERN_CATEGORIES.map((cat) => (
              <div key={cat.id}>
                <button
                  onClick={() => {
                    setOpenCatId(openCatId === cat.id ? null : cat.id);
                    if (selectedCat?.id !== cat.id) {
                      setSelectedCat(cat);
                      setSelectedSub(null);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 text-sm font-bold transition-all ${
                    selectedCat?.id === cat.id
                      ? "border-violet-300 dark:border-violet-600 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300"
                      : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <span>{cat.label}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      openCatId === cat.id ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {openCatId === cat.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden mt-1 ml-3 space-y-1"
                    >
                      {cat.subs.map((sub) => (
                        <button
                          key={sub}
                          onClick={() => {
                            setSelectedCat(cat);
                            setSelectedSub(sub);
                          }}
                          className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                            selectedSub === sub && selectedCat?.id === cat.id
                              ? "border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
                              : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          · {sub}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() =>
            canConfirm &&
            onConfirm({
              goal: selectedGoal,
              category: selectedCat,
              subConcern: selectedSub,
            })
          }
          disabled={!canConfirm}
          className="w-full h-14 rounded-2xl bg-fuchsia-200 hover:bg-fuchsia-300 dark:bg-fuchsia-800/60 dark:hover:bg-fuchsia-700/60 text-fuchsia-900 dark:text-fuchsia-200 font-black text-sm disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2"
        >
          <Heart className="w-4 h-4" />
          HADA의 응원 메시지 받기
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function Cheering() {
  const queryClient = useQueryClient();
  const today = getTodayKey();
  const weekKey = getWeekKeyBySunday();

  const [showAdForCharm, setShowAdForCharm] = useState(false);
  const [revealedCharm, setRevealedCharm] = useState(null);
  const [dailyCharm, setDailyCharm] = useState(null);
  const [loadingCharm, setLoadingCharm] = useState(false);
  const [charmPickCount, setCharmPickCount] = useState(0);
  const charmPromiseRef = useRef(null);
  const [showCharmDetail, setShowCharmDetail] = useState(false);

  const [showConcernSelector, setShowConcernSelector] = useState(false);
  const [loadingLetter, setLoadingLetter] = useState(false);
  const [letterResult, setLetterResult] = useState(null);
  const [savedLetter, setSavedLetter] = useState(null);
  const [savedLetterMeta, setSavedLetterMeta] = useState(null);
  const [weeklyLetterUsed, setWeeklyLetterUsed] = useState(0);

  const { data: profiles = [] } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => base44.entities.UserProfile.list(),
  });
  const profile = profiles[0];
  const level = profile?.level || 1;
  const maxCharmPicks = getMaxCharmPicks(level);
  const maxCheeringLetter = getMaxCheeringLetter(level);

  const { data: goals = [] } = useQuery({
    queryKey: ["goals", profile?.id],
    queryFn: async () => {
      const all = await base44.entities.Goal.list();
      return all
        .filter((g) => g.user_profile_id === profile.id && !g.is_completed)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },
    enabled: !!profile?.id,
  });

  // 행운 뽑기 상태 로드
  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      const lastDate = await base44.storage.get("lastCharmDate");
      const cachedCharm = await base44.storage.get("cachedCharm");
      const lastPickDate = await base44.storage.get("lastPickDate");
      const savedCount = await base44.storage.get("pickCount");

      if (lastDate === today && cachedCharm) {
        setDailyCharm(cachedCharm);
      } else if (lastDate && lastDate !== today) {
        await base44.storage.remove("lastCharmDate");
        await base44.storage.remove("cachedCharm");
        setDailyCharm(null);
      }

      if (lastPickDate === today) {
        setCharmPickCount(Number(savedCount) || 0);
      } else {
        await base44.storage.set("lastPickDate", today);
        await base44.storage.set("pickCount", 0);
        setCharmPickCount(0);
      }
    };
    load();
  }, [profile, today]);

  // 주간 응원 메시지 사용 횟수 로드
  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      const key = `cheering_used_${profile.id}_${weekKey}`;
      const stored = await base44.storage.get(key);
      setWeeklyLetterUsed(Number(stored) || 0);

      // 오늘의 저장된 응원 메시지도 로드
      const cachedDate = await base44.storage.get("cheeringLetterDate");
      const cachedLetter = await base44.storage.get("cheeringLetter");
      const cachedMeta = await base44.storage.get("cheeringLetterMeta");
      if (cachedDate === today && cachedLetter) {
        setSavedLetter(cachedLetter);
        setSavedLetterMeta(cachedMeta);
      } else if (cachedDate && cachedDate !== today) {
        await base44.storage.remove("cheeringLetterDate");
        await base44.storage.remove("cheeringLetter");
        await base44.storage.remove("cheeringLetterMeta");
        setSavedLetter(null);
        setSavedLetterMeta(null);
      }
    };
    load();
  }, [profile, today, weekKey]);

  const handleCharmClick = () => {
    if (maxCharmPicks === 0 || charmPickCount >= maxCharmPicks) return;
    setShowAdForCharm(true);
    setLoadingCharm(true);
    charmPromiseRef.current = generateAICharm(profile);
  };

  const handleCharmAdClose = async () => {
    setShowAdForCharm(false);
    try {
      const charm = await charmPromiseRef.current;
      // AI 응답이 없거나 필수 필드 누락 시 사용자에게 알림
      if (!charm || !charm.name || !charm.emoji) {
        console.error("행운 뽑기 AI 응답 오류:", charm);
        // 조용히 실패하지 않고 횟수도 차감하지 않음
        return;
      }

      await base44.storage.set("lastCharmDate", today);
      await base44.storage.set("cachedCharm", charm);

      const newCount = charmPickCount + 1;
      setCharmPickCount(newCount);
      await base44.storage.set("pickCount", newCount);
      await base44.storage.set("lastPickDate", today);

      setDailyCharm(charm);
      setShowCharmDetail(true);
    } catch (e) {
      console.error("행운 뽑기 실패:", e);
    } finally {
      setLoadingCharm(false);
      charmPromiseRef.current = null;
    }
  };

  const handleConcernConfirm = async ({ goal, category, subConcern }) => {
    setShowConcernSelector(false);
    setLoadingLetter(true);
    try {
      const allTodos = await base44.entities.GoalTodo.list();
      const goalSpecificTodos = allTodos
        .filter(
          (t) => t.user_profile_id === profile.id && t.goal_id === goal.id,
        )
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const recentGoalComplete = goalSpecificTodos
        .filter((t) => t.completed)
        .slice(0, 20)
        .map((t) => t.title);
      const recentGoalIncomplete = goalSpecificTodos
        .filter((t) => !t.completed)
        .slice(0, 20)
        .map((t) => t.title);

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `너는 HADA 앱의 따뜻한 응원 엔진이다.
              사용자가 특정 목표를 수행하며 겪는 고민을 분석하고, 그간의 실천 데이터를 바탕으로 진심 어린 응원 편지를 써라.

              [사용자 정보 및 고민]
              - 목표 제목: ${goal.title}
              - 목표 설명: ${goal.description || "없음"}
              - 고민 분류: ${category.label}
              - 구체적 고민: ${subConcern}

              [최근 해당 목표의 실천 기록 (완료 내역 - 최대 20개)]
              ${
                recentGoalComplete.length
                  ? recentGoalComplete.join(", ")
                  : "아직 완료된 기록이 없습니다."
              }

              [최근 해당 목표의 미완료/진행 중 기록 (최대 20개)]
              ${
                recentGoalIncomplete.length
                  ? recentGoalIncomplete.join(", ")
                  : "기록이 없습니다."
              }

              [응원 편지 작성 규칙]
              - greeting: 15자 이내. 줄바꿈 금지.
              - empathy: 60자 이내. 줄바꿈 금지.
              - core_message: 60자 이내. 줄바꿈 금지.
              - advice: 120자 이내. 줄바꿈 금지.
              - closing: 30자 이내. 줄바꿈 금지.
              전문 용어 금지. 비교·경쟁 표현 금지. 존댓말.`,
        response_json_schema: {
          type: "object",
          properties: {
            greeting: { type: "string" },
            empathy: { type: "string" },
            core_message: { type: "string" },
            advice: { type: "string" },
            closing: { type: "string" },
          },
        },
      });

      if (!res) return;

      const meta = {
        goalTitle: goal.title,
        concern: category.label,
        subConcern,
      };

      await base44.storage.set("cheeringLetterDate", today);
      await base44.storage.set("cheeringLetter", res);
      await base44.storage.set("cheeringLetterMeta", meta);

      // 주간 사용 횟수 증가
      const newCount = weeklyLetterUsed + 1;
      setWeeklyLetterUsed(newCount);
      const key = `cheering_used_${profile.id}_${weekKey}`;
      await base44.storage.set(key, newCount);

      setSavedLetter(res);
      setSavedLetterMeta(meta);
      setLetterResult({ letter: res, ...meta });
    } catch (e) {
      console.error("응원 편지 생성 실패:", e);
    } finally {
      setLoadingLetter(false);
    }
  };

  const remainingCharms =
    maxCharmPicks === 0 ? 0 : maxCharmPicks - charmPickCount;
  const remainingLetters =
    maxCheeringLetter === 0
      ? 0
      : maxCheeringLetter === 999
      ? 999
      : maxCheeringLetter - weeklyLetterUsed;
  const isCharmLocked = maxCharmPicks === 0;
  const isLetterLocked = maxCheeringLetter === 0;
  const isLetterLimitReached = !isLetterLocked && remainingLetters <= 0;

  // 첫 해금 레벨
  const CHARM_FIRST_LEVEL = 2;
  const LETTER_FIRST_LEVEL = 21;

  return (
    <div className="min-h-screen bg-[#FDFCFE] dark:bg-gray-950 pb-32 transition-colors duration-300">
      <AdModal visible={showAdForCharm} onClose={handleCharmAdClose} />

      <div className="px-6 pt-12 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-[10px] font-black text-violet-500 dark:text-violet-400 uppercase tracking-[0.3em] mb-2">
            HADA
          </p>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
            응원
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-semibold">
            오늘 하루, HADA가 당신 곁에 있어요
          </p>
        </motion.div>
      </div>

      <div className="px-5 space-y-6">
        {/* ── 오늘의 행운 ────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-2 h-6 bg-amber-300 dark:bg-amber-500 rounded-full" />
            <p className="text-sm font-black text-gray-800 dark:text-gray-100">
              오늘의 행운
            </p>
          </div>

          <motion.button
            whileTap={
              !isCharmLocked && remainingCharms > 0 ? { scale: 0.97 } : {}
            }
            onClick={handleCharmClick}
            disabled={loadingCharm || isCharmLocked || remainingCharms <= 0}
            className={`relative w-full rounded-3xl p-5 overflow-hidden text-center transition-all ${
              isCharmLocked
                ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                : remainingCharms <= 0
                ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                : "bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 active:scale-[0.98]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    !isCharmLocked && remainingCharms > 0
                      ? "bg-amber-200 dark:bg-amber-800/60"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}
                >
                  {loadingCharm ? (
                    <Loader2 className="w-5 h-5 animate-spin text-amber-700 dark:text-amber-300" />
                  ) : isCharmLocked ? (
                    <Lock className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ShoppingBag className="w-5 h-5 text-amber-700 dark:text-amber-300" />
                  )}
                </div>
                <div className="text-left">
                  <p
                    className={`text-sm font-black ${
                      isCharmLocked || remainingCharms <= 0
                        ? "text-gray-400 dark:text-gray-500"
                        : "text-amber-900 dark:text-amber-200"
                    }`}
                  >
                    {isCharmLocked
                      ? `행운 뽑기`
                      : remainingCharms <= 0
                      ? "내일 다시 뽑아주세요"
                      : "행운 뽑기"}
                  </p>
                  <p
                    className={`text-[11px] mt-0.5 ${
                      isCharmLocked || remainingCharms <= 0
                        ? "text-gray-400 dark:text-gray-500"
                        : "text-amber-700/70 dark:text-amber-400/60"
                    }`}
                  >
                    {isCharmLocked
                      ? `레벨 ${CHARM_FIRST_LEVEL}에 도달하면 사용 가능해요`
                      : loadingCharm
                      ? "운명 계산 중..."
                      : maxCharmPicks === 999
                      ? "무제한 이용 가능"
                      : `오늘 ${charmPickCount} / ${maxCharmPicks}회 사용`}
                  </p>
                </div>
              </div>
              {!isCharmLocked && remainingCharms > 0 && !loadingCharm && (
                <ChevronRight className="w-5 h-5 text-amber-600 dark:text-amber-400 opacity-70" />
              )}
            </div>
          </motion.button>

          <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center mt-2">
            {isCharmLocked
              ? `레벨 ${CHARM_FIRST_LEVEL}에서 첫 행운 뽑기가 가능합니다`
              : "새로 뽑으면 이전 행운이 사라져요 · 자정에 초기화"}
          </p>

          <AnimatePresence>
            {!loadingCharm && dailyCharm && !isCharmLocked && (
              <motion.div
                key="charm-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mt-3"
              >
                <button
                  onClick={() => setShowCharmDetail(true)}
                  className="w-full bg-amber-50 dark:bg-amber-950/30 rounded-[24px] p-5 border border-amber-100 dark:border-amber-900/40 text-left active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {dailyCharm.emoji || "✨"}
                      </span>
                      <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                        오늘의 행운
                      </p>
                    </div>
                    <span className="text-[10px] text-amber-500 dark:text-amber-400 font-bold">
                      탭해서 전체 보기 →
                    </span>
                  </div>
                  <p className="text-base font-black text-amber-800 dark:text-amber-200 mb-1">
                    {dailyCharm.name}
                  </p>
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-2">
                    {dailyCharm.effect}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2">
                    {dailyCharm.description}
                  </p>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 행운 상세 팝업 */}
          <AnimatePresence>
            {showCharmDetail && dailyCharm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
                onClick={(e) =>
                  e.target === e.currentTarget && setShowCharmDetail(false)
                }
              >
                <motion.div
                  initial={{ y: 60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 60, opacity: 0 }}
                  transition={{ type: "spring", damping: 28, stiffness: 320 }}
                  className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-[32px] px-6 pt-5 pb-12 shadow-2xl"
                >
                  <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto mb-6" />
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-xl">
                        {dailyCharm.emoji || "✨"}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-amber-500 dark:text-amber-400 uppercase tracking-widest">
                          오늘의 행운
                        </p>
                        <p className="text-base font-black text-gray-900 dark:text-white leading-tight">
                          {dailyCharm.name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowCharmDetail(false)}
                      className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-950/30 rounded-3xl p-6 border border-amber-100 dark:border-amber-900/40 space-y-4">
                    <div>
                      <p className="text-[10px] font-black text-amber-500 dark:text-amber-400 uppercase tracking-widest mb-1.5">
                        핵심 효과
                      </p>
                      <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                        {dailyCharm.effect}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-1.5">
                        사용법 · 의미
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                        {dailyCharm.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ── 응원 메시지 섹션 ───────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-2 h-6 bg-fuchsia-300 dark:bg-fuchsia-600 rounded-full" />
            <p className="text-sm font-black text-gray-800 dark:text-gray-100">
              HADA의 응원
            </p>
          </div>

          <div
            className={`rounded-[28px] p-5 shadow-[0_4px_20px_rgba(232,121,249,0.06)] ${
              isLetterLocked
                ? "bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                : "bg-white dark:bg-gray-900 border border-fuchsia-50 dark:border-gray-800"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  isLetterLocked
                    ? "bg-gray-200 dark:bg-gray-700"
                    : "bg-fuchsia-100 dark:bg-fuchsia-950/50"
                }`}
              >
                {isLetterLocked ? (
                  <Lock className="w-5 h-5 text-gray-400" />
                ) : (
                  <Heart className="w-5 h-5 text-fuchsia-500 dark:text-fuchsia-400" />
                )}
              </div>
              <div>
                <p
                  className={`text-sm font-black ${
                    isLetterLocked
                      ? "text-gray-400 dark:text-gray-500"
                      : "text-gray-900 dark:text-white"
                  }`}
                >
                  지금 어떤 고민이 있나요?
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {isLetterLocked
                    ? `레벨 ${LETTER_FIRST_LEVEL}에 도달하면 사용 가능해요`
                    : maxCheeringLetter === 999
                    ? "무제한 이용 가능"
                    : `이번 주 ${weeklyLetterUsed} / ${maxCheeringLetter}회 사용`}
                </p>
              </div>
            </div>

            {!isLetterLocked && (
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                목표를 향해 나아가다 보면 힘든 순간이 찾아오기 마련이에요. 어떤
                고민인지 선택하면 HADA가 맞춤 응원 편지를 써드려요.
              </p>
            )}

            <button
              onClick={() =>
                !loadingLetter &&
                !isLetterLocked &&
                !isLetterLimitReached &&
                setShowConcernSelector(true)
              }
              disabled={
                loadingLetter ||
                isLetterLocked ||
                isLetterLimitReached ||
                goals.length === 0
              }
              className={`w-full h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all ${
                isLetterLocked || isLetterLimitReached
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                  : "bg-fuchsia-200 hover:bg-fuchsia-300 dark:bg-fuchsia-800/60 dark:hover:bg-fuchsia-700/60 text-fuchsia-900 dark:text-fuchsia-200 disabled:opacity-40"
              }`}
            >
              {loadingLetter ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> 응원 편지 작성
                  중...
                </>
              ) : isLetterLocked ? (
                <>
                  <Lock className="w-4 h-4" /> 레벨 {LETTER_FIRST_LEVEL}에서
                  이용 가능합니다
                </>
              ) : isLetterLimitReached ? (
                <>
                  <Sparkles className="w-4 h-4" /> 이번 주 사용 횟수를 모두
                  썼어요
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4" /> HADA의 응원 메시지 받기
                </>
              )}
            </button>

            {goals.length === 0 && !isLetterLocked && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
                목표 화면에서 목표를 먼저 추가해주세요
              </p>
            )}

            {isLetterLimitReached && (
              <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center mt-3">
                일요일 자정에 초기화됩니다
              </p>
            )}

            {!isLetterLocked && !isLetterLimitReached && (
              <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center mt-3">
                새로 받으면 이전 메시지가 사라져요 · 일요일 초기화
              </p>
            )}
          </div>

          <AnimatePresence>
            {savedLetter && savedLetterMeta && (
              <motion.div
                key="saved-letter"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mt-3"
              >
                <button
                  onClick={() =>
                    setLetterResult({ letter: savedLetter, ...savedLetterMeta })
                  }
                  className="w-full bg-fuchsia-50 dark:bg-fuchsia-950/30 rounded-[24px] p-5 border border-fuchsia-100 dark:border-fuchsia-900/40 text-left active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-fuchsia-500 dark:text-fuchsia-400" />
                      <p className="text-[10px] font-black text-fuchsia-500 dark:text-fuchsia-400 uppercase tracking-widest">
                        오늘의 응원
                      </p>
                    </div>
                    <span className="text-[10px] text-fuchsia-400 dark:text-fuchsia-500 font-bold">
                      탭해서 전체 보기 →
                    </span>
                  </div>
                  <p className="text-xs font-bold text-fuchsia-700 dark:text-fuchsia-300 mb-1">
                    {savedLetterMeta.goalTitle}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
                    {savedLetterMeta.concern} · {savedLetterMeta.subConcern}
                  </p>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-relaxed line-clamp-2">
                    {savedLetter.core_message}
                  </p>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      <AnimatePresence>
        {showConcernSelector && (
          <ConcernSelectorModal
            goals={goals}
            onConfirm={handleConcernConfirm}
            onClose={() => setShowConcernSelector(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {letterResult && (
          <CheeringLetterModal
            letter={letterResult.letter}
            goalTitle={letterResult.goalTitle}
            concern={letterResult.concern}
            subConcern={letterResult.subConcern}
            onClose={() => setLetterResult(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

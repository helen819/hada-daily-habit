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
} from "lucide-react";
import AdModal from "@/components/shop/AdModal";
import CharmReveal from "@/components/shop/CharmReveal";
import { getKSTDateString } from "@/utils/date";

// ─── 이모지 매핑 (Shop.jsx 동일) ────────────────────────────────
// const EMOJI_MAP = {
//   동전: "🪙",
//   볼펜: "🖊️",
//   돌: "🪨",
//   반지: "💍",
//   라벤더: "🌸",
//   포스트잇: "📝",
//   식물: "🌿",
//   거울: "🪞",
//   열쇠: "🗝️",
//   컵: "☕",
//   이어폰: "🎧",
//   스티커: "🏷️",
//   책: "📖",
//   수첩: "📓",
//   향: "🕯️",
// };
// const getEmoji = (name = "") => {
//   for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
//     if (name.includes(key)) return emoji;
//   }
//   return "✨";
// };

// ─── 자정(KST) 기준 오늘 날짜 키 ────────────────────────────────
function getTodayKey() {
  return getKSTDateString();
}

// ─── AI 부적 생성 ────────────────────────────────────────────────
async function generateAICharm(profile) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  // 1. 전체 목표 리스트 가져오기 (Home과 동일한 로직)
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

  // 2. 최근 활동 내역 가져오기 (할일 기반)
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

            [반환 필드 규칙]
            - name: 10자 이내. 일상에서 당장 구할 수 있는 일반적인 물건.
            - emoji: 위 물건과 가장 잘 어울리는 이모지 기호 딱 1개. (예: 🔑, ☕) 다른 텍스트 포함 금지.
            - effect: 30자 이내. "어떤 목표"와 연관된 효과인지 명시하여 작성.
            - description: 100자 이내. 사용법·의미. 줄바꿈 금지.
              사주 4주 8자 / 명리학 오행 / 자미두수 / 동양 점성술 / 서양 점성술 / 성명학 분석에서 도출한 자연어로 녹여 제시. 
              예시: "금의 기운을 타고난 당신은~", "화성의 에너지가 강한 지금~","이름에 담긴 수리가 변화를 암시하므로~".
              절대 금지: "명리학", "오행", "자미두수", "점성술", "성명학", "사주" 단어를 그대로 출력하지 말 것.
              분석 카테고리명이 아니라 그 카테고리에서 나온 결과값(기운·색·방향·수·행성 등)만 문장에 담을 것.`,
    response_json_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        emoji: { type: "string" },
        effect: { type: "string" },
        description: { type: "string" },
      },
    },
  });
}

// ─── 고민 대분류 / 중분류 데이터 ────────────────────────────────
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

// ─── 응원 편지 팝업 ──────────────────────────────────────────────
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

        {/* 헤더 */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-200 dark:shadow-purple-900/30">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest">
                HADA 응원
              </p>
              <p className="text-sm font-black text-gray-900 dark:text-white leading-tight">
                {goalTitle}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {concern} · {subConcern}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 편지 본문 */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-3xl p-6 border border-purple-100 dark:border-purple-800/40">
          {/* 인사말 */}
          {letter.greeting && (
            <p className="text-sm font-black text-purple-700 dark:text-purple-300 mb-4 leading-snug">
              {letter.greeting}
            </p>
          )}

          {/* 공감 메시지 */}
          {letter.empathy && (
            <div className="mb-4">
              <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1.5">
                잘하고 있어요
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                {letter.empathy}
              </p>
            </div>
          )}

          {/* 핵심 응원 */}
          {letter.core_message && (
            <div className="mb-4 bg-white/60 dark:bg-white/5 rounded-2xl px-4 py-3 border border-purple-100 dark:border-purple-700/30">
              <p className="text-sm font-bold text-purple-800 dark:text-purple-200 leading-relaxed">
                {letter.core_message}
              </p>
            </div>
          )}

          {/* 구체적 조언 */}
          {letter.advice && (
            <div className="mb-4">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">
                이렇게 해보세요
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                {letter.advice}
              </p>
            </div>
          )}

          {/* 마무리 응원 */}
          {letter.closing && (
            <p className="text-sm font-bold text-purple-600 dark:text-purple-300 text-center pt-2 leading-relaxed">
              ✨ {letter.closing}
            </p>
          )}
        </div>

        {/* 오늘 하루만 라벨 */}
        <p className="text-[10px] text-gray-400 text-center mt-4">
          이 응원은 오늘 자정에 사라져요 · 새로 받으면 기존 메시지가 대체돼요
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── 고민 선택 팝업 ──────────────────────────────────────────────
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
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 목표 선택 */}
        <div className="mb-5">
          <p className="text-[11px] font-black text-purple-500 uppercase tracking-widest mb-2">
            1. 어떤 목표에 대한 고민인가요?
          </p>
          <div className="space-y-2">
            {goals.map((goal) => (
              <button
                key={goal.id}
                onClick={() => setSelectedGoalId(goal.id)}
                className={`w-full text-left px-4 py-3 rounded-2xl border-2 text-sm font-bold transition-all ${
                  selectedGoalId === goal.id
                    ? "border-purple-400 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                    : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
                }`}
              >
                {goal.title}
              </button>
            ))}
          </div>
        </div>

        {/* 고민 대분류 + 중분류 */}
        <div className="mb-6">
          <p className="text-[11px] font-black text-purple-500 uppercase tracking-widest mb-2">
            2. 어떤 부분이 힘드신가요?
          </p>
          <div className="space-y-2">
            {CONCERN_CATEGORIES.map((cat) => (
              <div key={cat.id}>
                {/* 대분류 */}
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
                      ? "border-purple-400 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
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

                {/* 중분류 */}
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
                              ? "border-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
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

        {/* 확인 버튼 */}
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
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-sm disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98] transition-transform shadow-lg shadow-purple-200 dark:shadow-purple-900/30 flex items-center justify-center gap-2"
        >
          <Heart className="w-4 h-4" />
          HADA의 응원 메시지 받기
        </button>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Cheering 메인
// ═══════════════════════════════════════════════════════════════════
export default function Cheering() {
  const queryClient = useQueryClient();
  const today = getTodayKey();

  // ─── 행운 상태 ──────────────────────────────────────────────
  const [showAdForCharm, setShowAdForCharm] = useState(false);
  const [revealedCharm, setRevealedCharm] = useState(null);
  const [dailyCharm, setDailyCharm] = useState(null);
  const [loadingCharm, setLoadingCharm] = useState(false);
  const [charmPickCount, setCharmPickCount] = useState(0);
  const MAX_PICK_LIMIT = 5;
  const charmPromiseRef = useRef(null);
  const [showCharmDetail, setShowCharmDetail] = useState(false);

  // ─── 응원 상태 ──────────────────────────────────────────────
  const [showConcernSelector, setShowConcernSelector] = useState(false);
  const [loadingLetter, setLoadingLetter] = useState(false);
  const [letterResult, setLetterResult] = useState(null); // 팝업 표시용
  const [savedLetter, setSavedLetter] = useState(null); // 오늘 저장된 편지
  const [savedLetterMeta, setSavedLetterMeta] = useState(null); // { goalTitle, concern, subConcern }

  // ─── 데이터 ─────────────────────────────────────────────────
  const { data: profiles = [] } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => base44.entities.UserProfile.list(),
  });
  const profile = profiles[0];

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

  // ─── 행운 캐시 로드 ─────────────────────────────────────────
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

  // ─── 응원 편지 캐시 로드 ────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      const cachedDate = await base44.storage.get("cheeringLetterDate");
      const cachedLetter = await base44.storage.get("cheeringLetter");
      const cachedMeta = await base44.storage.get("cheeringLetterMeta");
      if (cachedDate === today && cachedLetter) {
        setSavedLetter(cachedLetter);
        setSavedLetterMeta(cachedMeta);
      } else if (cachedDate && cachedDate !== today) {
        // 자정 리셋
        await base44.storage.remove("cheeringLetterDate");
        await base44.storage.remove("cheeringLetter");
        await base44.storage.remove("cheeringLetterMeta");
        setSavedLetter(null);
        setSavedLetterMeta(null);
      }
    };
    load();
  }, [profile, today]);

  // ─── 행운 뽑기 ──────────────────────────────────────────────
  const handleCharmClick = () => {
    if (charmPickCount >= MAX_PICK_LIMIT) return;
    setShowAdForCharm(true);
    setLoadingCharm(true);
    charmPromiseRef.current = generateAICharm(profile);
  };

  const handleCharmAdClose = async () => {
    setShowAdForCharm(false);
    try {
      const charm = await charmPromiseRef.current;
      if (!charm || !charm.name || !charm.emoji) return;

      await base44.storage.set("lastCharmDate", today);
      await base44.storage.set("cachedCharm", charm);

      const newCount = charmPickCount + 1;
      setCharmPickCount(newCount);
      await base44.storage.set("pickCount", newCount);
      await base44.storage.set("lastPickDate", today);

      setDailyCharm(charm);
      // 저장 버튼 없이 그냥 화면에 표시 (revealedCharm 팝업 사용 안 함)

      setShowCharmDetail(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCharm(false);
      charmPromiseRef.current = null;
    }
  };

  // ─── 응원 메시지 요청 ────────────────────────────────────────
  const handleConcernConfirm = async ({ goal, category, subConcern }) => {
    setShowConcernSelector(false);
    setLoadingLetter(true);
    try {
      // 1. 해당 목표(goal.id)에 연관된 사용자의 모든 할일 가져오기 및 정렬
      const allTodos = await base44.entities.GoalTodo.list();
      const goalSpecificTodos = allTodos
        .filter(
          (t) => t.user_profile_id === profile.id && t.goal_id === goal.id,
        )
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // 2. 완료된 할일과 미완료된 할일 각각 최대 20개씩 추출
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
                실천 기록을 참고하여 사용자가 노력해온 점을 구체적으로 언급하며 격려할 것. 
                다음 필드를 채워라.

                - greeting: 15자 이내. 사용자에게 직접 말을 거는 첫 인사. 줄바꿈 금지.
                - empathy: 60자 이내. 고민에 깊이 공감하는 내용. "~하시죠" "~하실 수 있어요" 형식. 줄바꿈 금지.
                - core_message: 60자 이내. 핵심 응원 메시지. 목표와 연결된 진심. 줄바꿈 금지.
                - advice: 120자 이내. 고민을 극복할 수 있는 구체적이고 따뜻한 조언. 줄바꿈 금지.
                  사주 4주 8자 / 명리학 오행 / 자미두수 / 동양 점성술 / 서양 점성술 / 성명학 분석에서 도출한 자연어로 녹여 조언. 
                  예시: "금의 기운을 타고난 당신은~", "화성의 에너지가 강한 지금~","이름에 담긴 수리가 변화를 암시하므로~".
                  절대 금지: "명리학", "오행", "자미두수", "점성술", "성명학", "사주" 단어를 그대로 출력하지 말 것.
                  분석 카테고리명이 아니라 그 카테고리에서 나온 결과값(기운·색·방향·수·행성 등)만 문장에 담을 것.
                - closing: 30자 이내. 마무리 응원 한 줄. 줄바꿈 금지.

                전문 용어 금지. 비교·경쟁 표현 금지. 존댓말. 따뜻하고 진심 어린 톤.`,
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

      // 캐싱 (새로 받으면 기존 덮어쓰기)
      await base44.storage.set("cheeringLetterDate", today);
      await base44.storage.set("cheeringLetter", res);
      await base44.storage.set("cheeringLetterMeta", meta);

      setSavedLetter(res);
      setSavedLetterMeta(meta);
      setLetterResult({ letter: res, ...meta });
    } catch (e) {
      console.error("응원 편지 생성 실패:", e);
    } finally {
      setLoadingLetter(false);
    }
  };

  const remainingCharms = MAX_PICK_LIMIT - charmPickCount;

  return (
    <div className="min-h-screen bg-[#FDFCFE] dark:bg-gray-950 pb-32 transition-colors duration-300">
      {/* 행운 광고 모달 */}
      <AdModal visible={showAdForCharm} onClose={handleCharmAdClose} />

      {/* ── 헤더 ──────────────────────────────────────────────── */}
      <div className="px-6 pt-12 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em] mb-2">
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
        {/* ════ 오늘의 행운 섹션 ════ */}
        <section>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-2 h-6 bg-amber-400 rounded-full" />
            <p className="text-sm font-black text-gray-800 dark:text-gray-100">
              오늘의 행운
            </p>
          </div>

          {/* 뽑기 버튼 */}
          <motion.button
            whileTap={remainingCharms > 0 ? { scale: 0.97 } : {}}
            onClick={handleCharmClick}
            disabled={loadingCharm || remainingCharms <= 0}
            className={`relative w-full rounded-3xl p-5 overflow-hidden text-center transition-all ${
              remainingCharms <= 0
                ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                : "active:scale-[0.98]"
            }`}
            style={
              remainingCharms > 0
                ? {
                    background:
                      "linear-gradient(135deg, rgba(251,191,36,0.9) 0%, rgba(249,115,22,0.8) 100%)",
                  }
                : {}
            }
          >
            {remainingCharms > 0 && (
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              </div>
            )}
            <div
              className={`relative z-10 flex items-center justify-between ${
                remainingCharms <= 0 ? "text-gray-400" : "text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    remainingCharms > 0
                      ? "bg-white/20"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}
                >
                  {loadingCharm ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ShoppingBag className="w-5 h-5" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-black">
                    {remainingCharms <= 0
                      ? "내일 다시 뽑아주세요"
                      : "행운 뽑기"}
                  </p>
                  <p className="text-[11px] opacity-70 mt-0.5">
                    {loadingCharm
                      ? "운명 계산 중..."
                      : `오늘 남은 횟수 ${remainingCharms} / ${MAX_PICK_LIMIT}`}
                  </p>
                </div>
              </div>
              {remainingCharms > 0 && !loadingCharm && (
                <ChevronRight className="w-5 h-5 opacity-70" />
              )}
            </div>
          </motion.button>

          {/* 새로 뽑으면 사라진다는 안내 */}
          <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center mt-2">
            새로 뽑으면 이전 행운이 대체돼요 · 자정에 초기화
          </p>

          {/* 오늘의 행운 카드 — 미리보기 스타일 */}
          <AnimatePresence>
            {!loadingCharm && dailyCharm && (
              <motion.div
                key="charm-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mt-3"
              >
                <button
                  onClick={() => setShowCharmDetail(true)}
                  className="w-full bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-[24px] p-5 border border-amber-100 dark:border-amber-800/40 text-left active:scale-[0.98] transition-transform"
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
                    <span className="text-[10px] text-amber-500 font-bold">
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
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-200 dark:shadow-amber-900/30 text-xl">
                        {dailyCharm.emoji || "✨"}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
                          오늘의 행운
                        </p>
                        <p className="text-base font-black text-gray-900 dark:text-white leading-tight">
                          {dailyCharm.name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowCharmDetail(false)}
                      className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-3xl p-6 border border-amber-100 dark:border-amber-800/40 space-y-4">
                    <div>
                      <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1.5">
                        핵심 효과
                      </p>
                      <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                        {dailyCharm.effect}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1.5">
                        사용법 · 의미
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                        {dailyCharm.description}
                      </p>
                    </div>
                    <p className="text-[10px] text-gray-400 text-center italic pt-1">
                      HADA 운명학 분석
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ════ 응원 메시지 섹션 ════ */}
        <section>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-2 h-6 bg-purple-500 rounded-full shadow-[0_0_12px_rgba(168,85,247,0.25)]" />
            <p className="text-sm font-black text-gray-800 dark:text-gray-100">
              HADA의 응원
            </p>
          </div>

          {/* 응원 요청 카드 */}
          <div className="bg-white dark:bg-gray-900 rounded-[28px] p-5 border border-purple-50 dark:border-gray-800 shadow-[0_8px_30px_rgba(120,50,255,0.06)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shadow-md shadow-purple-200 dark:shadow-purple-900/30">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-gray-900 dark:text-white">
                  지금 어떤 고민이 있나요?
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  목표를 이루는 길, HADA가 함께해요
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
              목표를 향해 나아가다 보면 힘든 순간이 찾아오기 마련이에요. 어떤
              고민인지 선택하면 HADA가 맞춤 응원 편지를 써드려요.
            </p>

            <button
              onClick={() => !loadingLetter && setShowConcernSelector(true)}
              disabled={loadingLetter || goals.length === 0}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-200 dark:shadow-purple-900/30 disabled:opacity-40 active:scale-[0.98] transition-transform"
            >
              {loadingLetter ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> 응원 편지 작성
                  중...
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4" /> HADA의 응원 메시지 받기
                </>
              )}
            </button>

            {goals.length === 0 && (
              <p className="text-xs text-gray-400 text-center mt-2">
                목표 화면에서 목표를 먼저 추가해주세요
              </p>
            )}

            {/* 안내 */}
            <p className="text-[10px] text-gray-400 text-center mt-3">
              새로 받으면 이전 메시지가 대체돼요 · 자정에 초기화
            </p>
          </div>

          {/* 오늘 받은 응원 편지 미리보기 */}
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
                  className="w-full bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-[24px] p-5 border border-purple-100 dark:border-purple-800/40 text-left active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest">
                        오늘의 응원
                      </p>
                    </div>
                    <span className="text-[10px] text-purple-400 font-bold">
                      탭해서 전체 보기 →
                    </span>
                  </div>

                  <p className="text-xs font-bold text-purple-700 dark:text-purple-300 mb-1">
                    {savedLetterMeta.goalTitle}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
                    {savedLetterMeta.concern} · {savedLetterMeta.subConcern}
                  </p>

                  {/* 핵심 메시지 미리보기 */}
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-relaxed line-clamp-2">
                    {savedLetter.core_message}
                  </p>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      {/* ── 고민 선택 팝업 ──────────────────────────────────── */}
      <AnimatePresence>
        {showConcernSelector && (
          <ConcernSelectorModal
            goals={goals}
            onConfirm={handleConcernConfirm}
            onClose={() => setShowConcernSelector(false)}
          />
        )}
      </AnimatePresence>

      {/* ── 응원 편지 팝업 ──────────────────────────────────── */}
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

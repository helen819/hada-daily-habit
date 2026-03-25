import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ShoppingBag,
  Loader2,
  ChevronRight,
  Sun,
  Wand2,
  Heart,
  Banknote,
  Briefcase,
  Leaf,
} from "lucide-react";
import AdModal from "@/components/shop/AdModal";
import CharmReveal from "@/components/shop/CharmReveal";
import FortuneResultModal from "@/components/shop/FortuneResultModal";
import { getKSTDateString } from "@/utils/date";

const EMOJI_MAP = {
  동전: "🪙",
  볼펜: "🖊️",
  돌: "🪨",
  반지: "💍",
  라벤더: "🌸",
  포스트잇: "📝",
  식물: "🌿",
  거울: "🪞",
  열쇠: "🗝️",
  컵: "☕",
  이어폰: "🎧",
  스티커: "🏷️",
  책: "📖",
  수첩: "📓",
  향: "🕯️",
};
const getEmoji = (name = "") => {
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (name.includes(key)) return emoji;
  }
  return "✨";
};

// ─── 날짜 유틸 ────────────────────────────────────────────────
/** 이번 주 월요일 날짜 (YYYY-MM-DD) */
function getThisMonday() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000); // KST 보정
  const day = kst.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  kst.setDate(kst.getDate() + diff);
  return kst.toISOString().split("T")[0];
}
/** 이번 달 1일 (YYYY-MM-DD) */
function getThisMonthFirst() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
/** 올해 1월 1일 (YYYY-MM-DD) */
function getThisYearFirst() {
  return `${new Date().getFullYear()}-01-01`;
}
/** 오늘 날짜 (YYYY-MM-DD) */
function getToday() {
  return getKSTDateString();
}

// ─── AI 부적 생성 ─────────────────────────────────────────────
async function generateAICharm(profile) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  // 계산기 사용
  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `너는 'HADA' 앱의
            실시간 행운 추천 엔진이다.
            사용자 목표: ${profile?.goal}
            오늘 날짜: ${dateStr}

            [반환 필드 규칙]
            - name: 10자 이내. 일상에서 당장 구할 수 있는 일반적인 물건.
            - effect: 20자 이내. 핵심 효과 한 줄.
            - description: 60자 이내. 사용법·의미.
              줄바꿈 금지.`,
    response_json_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        effect: { type: "string" },
        description: { type: "string" },
      },
    },
  });
  return res;
}

// ─── 운세 상수 ────────────────────────────────────────────────
const FORTUNE_DAILY = {
  id: "daily",
  title: "오늘의 운세",
  icon: Sun,
  subtitle: "오늘 전체 흐름",
  gradient: "from-amber-300 to-orange-300",
};

const FORTUNE_DETAILED = [
  {
    id: "summary",
    title: "종합운세",
    icon: Wand2,
    subtitle: "주간·월간·연간",
    gradient: "from-violet-300 to-purple-300",
  },
  {
    id: "love",
    title: "애정운",
    icon: Heart,
    subtitle: "관계 에너지",
    gradient: "from-rose-300 to-pink-300",
  },
  {
    id: "wealth",
    title: "재물운",
    icon: Banknote,
    subtitle: "금전 흐름",
    gradient: "from-yellow-300 to-amber-300",
  },
  {
    id: "career",
    title: "취업운",
    icon: Briefcase,
    subtitle: "커리어 기회",
    gradient: "from-indigo-300 to-blue-300",
  },
  {
    id: "health",
    title: "건강운",
    icon: Leaf,
    subtitle: "몸과 마음",
    gradient: "from-teal-300 to-emerald-300",
  },
];

// ─── 캐시 키 생성 ─────────────────────────────────────────────
function buildCacheKey(profile, categoryId) {
  const base = `${profile?.full_name}_${profile?.birth_date}`;
  if (categoryId === "summary") {
    // 주간(월요일)/월간(1일)/연간(1월1일) 중 가장 최근 기준점을 키에 포함
    return `fortune_${base}_summary_w${getThisMonday()}_m${getThisMonthFirst()}_y${getThisYearFirst()}`;
  }
  return `fortune_${base}_${categoryId}_${getToday()}`;
}

// ─── in-memory 캐시 (세션 중 중복 AI 호출 방지) ──────────────
const fortuneMemCache = new Map();

// ─── 운세 생성 (summary / 나머지 분리) ───────────────────────
async function generateFortune(profile, category) {
  const base = `${profile?.full_name}_${profile?.birth_date}`;

  // ── summary: 주간/월간/연간 각각 독립 캐시 ──
  if (category.id === "summary") {
    const weekKey = `fortune_${base}_weekly_${getThisMonday()}`;
    const monthKey = `fortune_${base}_monthly_${getThisMonthFirst()}`;
    const yearKey = `fortune_${base}_yearly_${getThisYearFirst()}`;

    // 각각 캐시 로드
    let weekly =
      fortuneMemCache.get(weekKey) ?? (await base44.storage.get(weekKey));
    let monthly =
      fortuneMemCache.get(monthKey) ?? (await base44.storage.get(monthKey));
    let yearly =
      fortuneMemCache.get(yearKey) ?? (await base44.storage.get(yearKey));

    // KST 기준 오늘 날짜 체크
    const kst = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
    const isMonday = kst.getDay() === 1;
    const isFirstOfMonth = kst.getDate() === 1;
    const isNewYear = kst.getMonth() === 0 && kst.getDate() === 1;
    const isFirstAccess = !weekly && !monthly && !yearly;

    const needWeekly = isFirstAccess || isMonday || !weekly;
    const needMonthly = isFirstAccess || isFirstOfMonth || !monthly;
    const needYearly = isFirstAccess || isNewYear || !yearly;

    // 갱신할 게 없으면 캐시만 반환
    if (!needWeekly && !needMonthly && !needYearly) {
      if (!weekly && !monthly && !yearly) return null;
      return {
        weekly: weekly ?? null,
        monthly: monthly ?? null,
        yearly: yearly ?? null,
      };
    }

    // AI 호출 (하나의 프롬프트로 전체)
    const now = new Date();
    const dateStr = now.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
    const timeStr = now.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    let aiResult = null;
    try {
      aiResult = await base44.integrations.Core.InvokeLLM({
        prompt: `너는 'HADA' 앱의 AI 운명 분석 엔진이다.
                분석 기준일: ${dateStr} ${timeStr}

                [분석 카테고리] 종합운세 — 주간·월간·연간 분석
                - 주간: ${getThisMonday()} 
                - 월간: ${getThisMonthFirst()} 
                - 연간: ${getThisYearFirst()}

                [전체 공통 규칙]
                - summary: 전체 아우르는 한 줄 요약. 30자 이내.
                - detailed: 전체 종합 설명. 80자 이내. 줄바꿈 금지.
                - fortuneSource: "HADA 운명학 분석" 고정.

                [기간별 규칙]
                - *.summary: 각 기간 핵심 한 줄. 30자 이내.
                - *.actionTips: 정확히 2개.
                  각 항목 20자 이내. 구체 행동만.`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            detailed: { type: "string" },
            weekly: {
              type: "object",
              properties: {
                summary: { type: "string" },
                actionTips: { type: "array", items: { type: "string" } },
              },
            },
            monthly: {
              type: "object",
              properties: {
                summary: { type: "string" },
                actionTips: { type: "array", items: { type: "string" } },
              },
            },
            yearly: {
              type: "object",
              properties: {
                summary: { type: "string" },
                actionTips: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
      });
    } catch {
      console.log("종합운세 AI 호출 실패");
    }

    // 갱신 필요한 항목만 저장
    if (needWeekly) {
      weekly = aiResult?.weekly ?? null;
      if (weekly) {
        // ← 성공한 경우만 저장
        await base44.storage.set(weekKey, weekly);
        fortuneMemCache.set(weekKey, weekly);
      }
    }
    if (needMonthly) {
      monthly = aiResult?.monthly ?? null;
      if (monthly) {
        // ← 성공한 경우만 저장
        await base44.storage.set(monthKey, monthly);
        fortuneMemCache.set(monthKey, monthly);
      }
    }
    if (needYearly) {
      yearly = aiResult?.yearly ?? null;
      if (yearly) {
        // ← 성공한 경우만 저장
        await base44.storage.set(yearKey, yearly);
        fortuneMemCache.set(yearKey, yearly);
      }
    }

    if (!weekly && !monthly && !yearly) return null;

    return {
      summary: aiResult?.summary ?? null,
      detailed: aiResult?.detailed ?? null,
      weekly: weekly ?? null,
      monthly: monthly ?? null,
      yearly: yearly ?? null,
    };
  }

  // ── summary 외 나머지 (daily/love/wealth/career/health) ──
  const storageKey = buildCacheKey(profile, category.id);

  if (fortuneMemCache.has(storageKey)) {
    const cached = fortuneMemCache.get(storageKey);
    if (cached === "FAILED") return null;
    return cached;
  }
  const stored = await base44.storage.get(storageKey);
  if (stored) {
    if (stored === "FAILED") return null;
    fortuneMemCache.set(storageKey, stored);
    return stored;
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const timeStr = now.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const CATEGORY_FOCUS = {
    daily: "오늘 하루 전체 에너지 흐름, 업무/대인관계/건강 종합",
    love: "감성 지수, 연애운, 관계 회복 가능성, 표현력",
    wealth: "금전운, 재물 흐름, 투자 적합도, 절약 에너지",
    career: "취업운, 업무 효율, 집중력, 리더십 잠재력",
    health: "신체 회복력, 멘탈 에너지, 수면 질, 활력 지수",
  };

  let result;
  try {
    const raw = await base44.integrations.Core.InvokeLLM({
      prompt: `너는 'HADA' 앱의 AI 운명 분석 엔진이다.
              분석 기준일: ${getToday()}

              [분석 카테고리] ${category.title}
              [분석 항목] ${CATEGORY_FOCUS[category.id]}

              해당 카테고리만 집중. 다른 카테고리 금지.

              [반환 필드 규칙]
              - title: 15자 이내. 오늘 키워드 제목. 줄바꿈 금지.
              - summary: 30자 이내. 한 줄 핵심. 줄바꿈 금지.
              - energyLevel: 0~100 사이 정수만.
              - detailed: 100자 이내. 줄바꿈 금지.
              - actionTips: 정확히 3개.
                각 항목 20자 이내. 구체적인 행동만.
              ${
                category.id === "daily" ? "- luckyColor: #RRGGBB 형식만." : ""
              }`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          energyLevel: { type: "number" },
          detailed: { type: "string" },
          actionTips: { type: "array", items: { type: "string" } },
          luckyColor: { type: "string" },
        },
      },
    });
    if (raw) {
      result = {
        ...raw,
        aiLuckyColor:
          category.id === "daily" && raw.luckyColor
            ? raw.luckyColor
            : undefined,
      };
    }
  } catch {
    console.log("운세 팝업 에러");
  }

  const valueToStore = result ?? "FAILED";
  await base44.storage.set(storageKey, valueToStore);
  fortuneMemCache.set(storageKey, valueToStore);
  return result ?? null;
}

// ─── 상세 운세 리스트 아이템 ──────────────────────────────────
function FortuneListItem({ category, onClick, isLoading }) {
  const IconComponent = category.icon;
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(category)}
      disabled={isLoading}
      className="w-full flex items-center gap-4 bg-white dark:bg-transparent rounded-2xl px-4 py-3.5 border border-gray-100 dark:border-[#424B63] hover:shadow-md dark:hover:border-[#5A6380] transition-all relative overflow-hidden shadow-sm"
    >
      <div
        className={`absolute inset-0 hidden dark:block opacity-10 bg-gradient-to-r ${category.gradient}`}
      />
      <div
        className={`relative z-10 w-10 h-10 rounded-xl bg-gradient-to-br ${category.gradient} flex items-center justify-center flex-shrink-0`}
      >
        {isLoading ? (
          <Loader2
            className="w-5 h-5 text-white animate-spin"
            strokeWidth={1.5}
          />
        ) : (
          <IconComponent className="w-5 h-5 text-white" strokeWidth={1.5} />
        )}
      </div>
      <div className="relative z-10 flex-1 text-left">
        <p className="text-sm font-bold text-gray-800 dark:text-slate-200">
          {category.title}
        </p>
        <p className="text-xs text-gray-400 dark:text-slate-400">
          {isLoading ? "분석 중..." : category.subtitle}
        </p>
      </div>
      {isLoading ? (
        <Loader2 className="relative z-10 w-4 h-4 text-gray-300 dark:text-slate-400 animate-spin" />
      ) : (
        <span className="relative z-10 text-gray-300 dark:text-slate-400 text-lg">
          ›
        </span>
      )}
    </motion.button>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────
export default function Shop() {
  const queryClient = useQueryClient();
  const [showAdForCharm, setShowAdForCharm] = useState(false);
  const [showAdForFortune, setShowAdForFortune] = useState(false);
  const [revealedCharm, setRevealedCharm] = useState(null);
  const [dailyCharm, setDailyCharm] = useState(null);
  const [loadingCharm, setLoadingCharm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [fortuneResult, setFortuneResult] = useState(null);
  const [loadingFortune, setLoadingFortune] = useState(false);
  const [dailyFortunePreview, setDailyFortunePreview] = useState(null);
  const [loadingDailyPreview, setLoadingDailyPreview] = useState(false);

  // 🔥 [추가] 뽑기 횟수 상태
  const [charmPickCount, setCharmPickCount] = useState(0);
  const MAX_PICK_LIMIT = 5;

  const { data: profiles } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => base44.entities.UserProfile.list(),
  });
  const profile = profiles?.[0];

  // ── [추가] 오늘 남은 횟수 로드 및 초기화 로직 ──
  useEffect(() => {
    const loadPickCount = async () => {
      const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
      const lastDate = await base44.storage.get("lastPickDate");
      const savedCount = await base44.storage.get("pickCount");

      if (lastDate === today) {
        setCharmPickCount(Number(savedCount) || 0);
      } else {
        // 날짜가 바뀌었으면 카운트 초기화
        await base44.storage.set("lastPickDate", today);
        await base44.storage.set("pickCount", 0);
        setCharmPickCount(0);
      }
    };
    loadPickCount();
  }, []);

  // ── 오늘의 운세 미리보기 로드 ──
  useEffect(() => {
    if (!profile) return;
    const today = getToday();
    const cacheKey = `dailyPreview_${profile.full_name}_${today}`;
    const loadPreview = async () => {
      const cached = await base44.storage.get(cacheKey);
      if (cached) {
        if (cached === "FAILED") return; // ← 추가: 실패 기록이면 그냥 종료 (아무것도 안 보임)
        setDailyFortunePreview(cached);
        return;
      }
      setLoadingDailyPreview(true);
      try {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: `오늘 하루 운세를 두 줄로 요약해줘.

                  [규칙]
                  - line1: 오늘 전체 에너지 흐름.
                    23자 이내(text-sm 기준 iPhone SE 1줄).
                    줄바꿈 금지.
                  - line2: 오늘 실천할 핵심 행동 조언.
                    23자 이내. 줄바꿈 금지.
                  - 두 줄은 서로 다른 관점이어야 함.
                    (에너지 설명 + 실천 제안)
                  - 따뜻하고 희망적인 톤.`,
          response_json_schema: {
            type: "object",
            properties: {
              line1: { type: "string" },
              line2: { type: "string" },
            },
          },
        });
        if (!res) {
          await base44.storage.set(cacheKey, "FAILED"); // ← 추가
          return;
        }
        setDailyFortunePreview(res);
        await base44.storage.set(cacheKey, res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingDailyPreview(false);
      }
    };
    loadPreview();
  }, [profile]);

  // ── 오늘의 부적 캐시 로드 ──
  useEffect(() => {
    if (!profile) return;
    const todayStr = new Date().toDateString();
    const loadCharm = async () => {
      const lastDate = await base44.storage.get("lastCharmDate");
      const cachedCharm = await base44.storage.get("cachedCharm");
      if (lastDate === todayStr && cachedCharm) {
        setDailyCharm(cachedCharm);
      } else if (lastDate && lastDate !== todayStr) {
        await base44.storage.remove("lastCharmDate");
        await base44.storage.remove("cachedCharm");
        setDailyCharm(null);
      }
    };
    loadCharm();
  }, [profile]);

  const charmPromiseRef = React.useRef(null);
  const fortunePromiseRef = React.useRef(null);

  // ── 부적 뽑기 ──
  const handleCharmClick = () => {
    // 🔥 횟수 제한 체크
    if (charmPickCount >= MAX_PICK_LIMIT) {
      alert(
        "오늘은 이미 5번의 행운을 모두 뽑으셨습니다. 내일 다시 찾아와주세요! ✨",
      );
      return;
    }
    setShowAdForCharm(true);
    setLoadingCharm(true);
    charmPromiseRef.current = generateAICharm(profile);
  };

  const handleCharmAdClose = async () => {
    setShowAdForCharm(false);
    try {
      const charm = await charmPromiseRef.current;

      // ← 추가: AI 실패 시 횟수 차감 없이 에러 안내
      if (!charm) {
        alert(
          "과한 에너지는 흐름에 방해가 되니 잠시 쉬었다가 내일 다시 확인해주세요 🙏",
        );
        return;
      }

      const todayStr = new Date().toDateString();
      const todayDate = new Date().toLocaleDateString("en-CA");

      await base44.storage.set("lastCharmDate", todayStr);
      await base44.storage.set("cachedCharm", charm);

      // 2. 🔥 [중요] 뽑기 횟수 증가 및 저장
      const newCount = charmPickCount + 1;
      setCharmPickCount(newCount);
      await base44.storage.set("pickCount", newCount);
      await base44.storage.set("lastPickDate", todayDate);

      setDailyCharm(charm);
      setRevealedCharm({ ...charm, emoji: getEmoji(charm.name) });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCharm(false);
      charmPromiseRef.current = null;
    }
  };

  const handleSaveCharm = async () => {
    await base44.entities.CharmItem.create({
      ...revealedCharm,
      obtained_date: getToday(),
    });
    queryClient.invalidateQueries({ queryKey: ["charms"] });
    setRevealedCharm(null);
  };

  // ── 운세 카테고리 클릭 ──
  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setShowAdForFortune(true);
    setLoadingFortune(true);
    // 광고 보는 동안 백그라운드에서 AI 요청 (캐시 우선)
    fortunePromiseRef.current = generateFortune(profile, category);
  };

  const handleFortuneAdClose = async () => {
    setShowAdForFortune(false);
    try {
      const result = await fortunePromiseRef.current;

      // ← 추가: AI 실패 시 팝업 없이 에러 안내
      if (!result) {
        alert(
          "과한 에너지는 흐름에 방해가 되니 잠시 쉬었다가 내일 다시 확인해주세요 🙏",
        );
        setSelectedCategory(null);
        return;
      }
      setFortuneResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFortune(false);
      fortunePromiseRef.current = null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <AdModal visible={showAdForCharm} onClose={handleCharmAdClose} />
      <AdModal visible={showAdForFortune} onClose={handleFortuneAdClose} />
      <CharmReveal
        charm={revealedCharm}
        onSave={handleSaveCharm}
        onClose={() => setRevealedCharm(null)}
      />
      <FortuneResultModal
        result={fortuneResult}
        category={selectedCategory}
        onClose={() => {
          setFortuneResult(null);
          setSelectedCategory(null);
        }}
      />

      {/* 헤더 */}
      <div className="px-5 pt-8 pb-4">
        <p className="text-xs font-semibold text-orange-500 dark:text-orange-400 uppercase tracking-widest mb-1">
          행운 상점
        </p>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          운세 상점 ✨
        </h1>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
          오늘 당신의 에너지에 맞는 물건을 가까이 두는 것만으로도, 행운을 모으는
          힘을 만들 수 있어요.
        </p>
      </div>

      <div className="px-5 space-y-6">
        {/* 🔥 수정된 행운 뽑기 버튼 */}
        <div className="space-y-2">
          <motion.button
            whileTap={charmPickCount < MAX_PICK_LIMIT ? { scale: 0.96 } : {}}
            onClick={() => handleCharmClick()}
            disabled={loadingCharm || charmPickCount >= MAX_PICK_LIMIT}
            className={`relative w-full rounded-2xl p-6 text-center overflow-hidden group
              ${
                charmPickCount >= MAX_PICK_LIMIT
                  ? "bg-gray-200 dark:bg-gray-800 cursor-not-allowed"
                  : "dark:bg-transparent dark:border dark:border-amber-400/50"
              }`}
            style={
              charmPickCount < MAX_PICK_LIMIT
                ? {
                    background:
                      "linear-gradient(135deg, rgba(251,191,36,0.85) 0%, rgba(249,115,22,0.75) 100%)",
                  }
                : {}
            }
          >
            <div className="absolute inset-0 hidden dark:block rounded-2xl bg-[#121212] opacity-50" />
            <div
              className={`relative z-10 ${
                charmPickCount >= MAX_PICK_LIMIT
                  ? "text-gray-400"
                  : "text-white dark:text-amber-300"
              }`}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <p className="text-base font-bold mb-1">
                {charmPickCount >= MAX_PICK_LIMIT
                  ? "내일 다시 뽑아주세요"
                  : "행운 뽑기"}
              </p>
              {/* 🔥 횟수 표시 UI */}
              <p className="text-[11px] font-medium opacity-80">
                오늘 남은 횟수: {MAX_PICK_LIMIT - charmPickCount} /{" "}
                {MAX_PICK_LIMIT}
              </p>
            </div>
          </motion.button>

          {/* 횟수가 꽉 찼을 때 안내 문구 */}
          {charmPickCount >= MAX_PICK_LIMIT && (
            <p className="text-[10px] text-center text-orange-400 font-medium animate-pulse">
              모든 행운을 다 소진했습니다! 내일 또 만나요 🌙
            </p>
          )}
        </div>

        {/* 로딩 중 */}
        {loadingCharm && (
          <div className="bg-gradient-to-br from-violet-300 to-pink-300 dark:bg-transparent dark:border dark:border-violet-500/50 rounded-2xl p-6 text-white text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold opacity-90 dark:text-violet-300">
              운명 계산 중...
            </p>
          </div>
        )}

        {/* 오늘의 행운템 */}
        {!loadingCharm && dailyCharm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative rounded-3xl p-8 text-white overflow-hidden
              dark:bg-transparent dark:border dark:border-purple-400/50"
            style={{
              background:
                "linear-gradient(135deg, rgba(124, 58, 237, 0.95) 0%, rgba(139, 92, 246, 0.90) 100%)",
              boxShadow: "0 8px 24px rgba(167,139,250,0.2)",
            }}
          >
            <div className="absolute inset-0 hidden dark:block rounded-3xl bg-[#121212]" />
            <div className="absolute inset-0 overflow-hidden rounded-3xl opacity-20">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
            </div>
            <div className="relative z-10 space-y-3">
              <p className="text-[10px] font-bold dark:text-purple-300 text-white/70 uppercase tracking-widest">
                ✨ 오늘의 행운 ✨
              </p>
              <div className="flex items-center gap-4">
                <p className="text-5xl drop-shadow-xl">
                  {getEmoji(dailyCharm.name)}
                </p>
                <div className="flex-1">
                  <p className="text-2xl font-black dark:text-purple-200 drop-shadow-lg">
                    {dailyCharm.name}
                  </p>
                </div>
              </div>
              <div className="bg-white/15 dark:bg-purple-400/10 dark:border dark:border-purple-400/30 backdrop-blur-md rounded-2xl p-4 space-y-2">
                <p className="text-xs font-bold text-purple-200 dark:text-purple-300 drop-shadow-lg">
                  ✦ {dailyCharm.effect}
                </p>
                <p className="text-[11px] dark:text-purple-200 text-white/90 leading-relaxed">
                  {dailyCharm.description}
                </p>
              </div>
              <p className="text-[10px] dark:text-purple-300/60 text-white/60 italic text-center pt-2">
                HADA 분석 데이터
              </p>
            </div>
          </motion.div>
        )}

        {/* 운세 섹션 */}
        <div className="space-y-8">
          {/* 오늘의 운세 */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-amber-400 dark:bg-amber-500 rounded-full" />
              오늘의 운세
            </h3>
            {loadingFortune && selectedCategory?.id === "daily" && (
              <div className="flex items-center justify-center py-8 gap-2 bg-gray-50 dark:bg-transparent dark:border dark:border-[#424B63] rounded-xl">
                <Loader2 className="w-5 h-5 animate-spin text-purple-600 dark:text-purple-400" />
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  운세 분석 중...
                </p>
              </div>
            )}
            <div
              className="rounded-2xl overflow-hidden dark:border dark:border-amber-500/40"
              style={{
                background: "linear-gradient(135deg, #FDE68A 0%, #FCD34D 100%)",
              }}
            >
              <div className="px-5 py-4 flex items-center gap-3">
                <FORTUNE_DAILY.icon
                  className="w-8 h-8 text-amber-600"
                  strokeWidth={1.5}
                />
                <div className="text-left flex-1">
                  <p className="text-base font-bold text-amber-900">
                    {FORTUNE_DAILY.title}
                  </p>
                  <p className="text-xs text-amber-700/70">
                    {FORTUNE_DAILY.subtitle}
                  </p>
                </div>
              </div>
              {/* 미리보기 영역 */}
              <div className="bg-white dark:bg-[#1A1F2E] border-t border-amber-100 dark:border-amber-500/20 px-5 py-4 space-y-3">
                {loadingDailyPreview ? (
                  <div className="flex items-center gap-2 py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <p className="text-xs text-gray-400 dark:text-slate-400">
                      운세 요약 중...
                    </p>
                  </div>
                ) : dailyFortunePreview ? (
                  <div className="space-y-1">
                    <p className="text-sm text-gray-700 dark:text-slate-200 leading-relaxed">
                      ☀️ {dailyFortunePreview.line1}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
                      ✨ {dailyFortunePreview.line2}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-slate-400">
                    오늘의 운세를 불러오는 중이에요...
                  </p>
                )}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleCategoryClick(FORTUNE_DAILY)}
                  disabled={loadingFortune && selectedCategory?.id === "daily"}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-yellow-400 dark:bg-amber-500/20 dark:border dark:border-amber-500/50 hover:bg-yellow-500 dark:hover:bg-amber-500/30 text-white dark:text-amber-300 text-sm font-bold transition-all"
                  style={{ boxShadow: "0 2px 8px rgba(180,140,0,0.25)" }}
                >
                  {loadingFortune && selectedCategory?.id === "daily" ? (
                    <>
                      <Loader2
                        className="w-4 h-4 animate-spin"
                        strokeWidth={2}
                      />
                      <span>분석 중...</span>
                    </>
                  ) : (
                    <>
                      <span>자세히 보기</span>
                      <ChevronRight className="w-4 h-4" strokeWidth={2} />
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </div>

          {/* 상세 운세 */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-purple-600 dark:bg-purple-400 rounded-full" />
              상세 운세
            </h3>
            <div className="flex flex-col gap-2">
              {FORTUNE_DETAILED.map((cat) => (
                <FortuneListItem
                  key={cat.id}
                  category={cat}
                  onClick={handleCategoryClick}
                  isLoading={loadingFortune && selectedCategory?.id === cat.id}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

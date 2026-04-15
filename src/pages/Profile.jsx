import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Loader2,
  Star,
  Zap,
  AlertTriangle,
  Trash2,
  Sun,
  Wand2,
  Heart,
  Banknote,
  Briefcase,
  Leaf,
  ChevronRight,
  X,
  Sparkles,
  Lock,
  Bell,
  BellOff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StatsRadar from "@/components/home/StatsRadar";
import AdModal from "@/components/shop/AdModal";
import FortuneResultModal from "@/components/shop/FortuneResultModal";
import { useNavigate } from "react-router-dom";
import { getFullDestinyData } from "@/components/services/calculator/destinyCalculator";
import { getKSTDateString } from "@/utils/date";

import {
  canViewFortune,
  canResetData,
  getNextUnlockMessage,
  LUCKY_LEVEL_THRESHOLD,
} from "@/config/unlockConfig";

import DevUnlockPanel from "@/components/dev/DevUnlockPanel";

function getToday() {
  return getKSTDateString();
}
function getThisMonday() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  kst.setDate(kst.getDate() + diff);
  return kst.toISOString().split("T")[0];
}
function getThisMonthFirst() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function getThisYearFirst() {
  return `${new Date().getFullYear()}-01-01`;
}

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
    glassDark:
      "dark:bg-violet-900/40 dark:border-violet-500/30 dark:hover:bg-violet-900/60 dark:hover:border-violet-400/50",
    iconNeon: "dark:drop-shadow-[0_0_6px_rgba(167,139,250,0.9)]",
  },
  {
    id: "love",
    title: "애정운",
    icon: Heart,
    subtitle: "관계 에너지",
    gradient: "from-rose-300 to-pink-300",
    glassDark:
      "dark:bg-rose-900/40 dark:border-rose-500/30 dark:hover:bg-rose-900/60 dark:hover:border-rose-400/50",
    iconNeon: "dark:drop-shadow-[0_0_6px_rgba(251,113,133,0.9)]",
  },
  {
    id: "wealth",
    title: "재물운",
    icon: Banknote,
    subtitle: "금전 흐름",
    gradient: "from-yellow-300 to-amber-300",
    glassDark:
      "dark:bg-amber-900/40 dark:border-amber-500/30 dark:hover:bg-amber-900/60 dark:hover:border-amber-400/50",
    iconNeon: "dark:drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]",
  },
  {
    id: "career",
    title: "취업운",
    icon: Briefcase,
    subtitle: "커리어 기회",
    gradient: "from-indigo-300 to-blue-300",
    glassDark:
      "dark:bg-indigo-900/40 dark:border-indigo-500/30 dark:hover:bg-indigo-900/60 dark:hover:border-indigo-400/50",
    iconNeon: "dark:drop-shadow-[0_0_6px_rgba(99,102,241,0.9)]",
  },
  {
    id: "health",
    title: "건강운",
    icon: Leaf,
    subtitle: "몸과 마음",
    gradient: "from-teal-300 to-emerald-300",
    glassDark:
      "dark:bg-teal-900/40 dark:border-teal-500/30 dark:hover:bg-teal-900/60 dark:hover:border-teal-400/50",
    iconNeon: "dark:drop-shadow-[0_0_6px_rgba(45,212,191,0.9)]",
  },
];

// 운세별 해금 레벨 (안내용)
const FORTUNE_UNLOCK_LEVELS = {
  summary: 91,
  love: 63,
  wealth: 25,
  career: 73,
  health: 34,
};

const fortuneMemCache = new Map();

function buildCacheKey(profile, categoryId) {
  const base = `${profile?.full_name}_${profile?.birth_date}`;
  if (categoryId === "summary") {
    return `fortune_${base}_summary_w${getThisMonday()}_m${getThisMonthFirst()}_y${getThisYearFirst()}`;
  }
  return `fortune_${base}_${categoryId}_${getToday()}`;
}

async function generateFortune(profile, category) {
  const base = `${profile?.full_name}_${profile?.birth_date}`;

  if (category.id === "summary") {
    const weekKey = `fortune_${base}_weekly_${getThisMonday()}`;
    const monthKey = `fortune_${base}_monthly_${getThisMonthFirst()}`;
    const yearKey = `fortune_${base}_yearly_${getThisYearFirst()}`;
    let weekly =
      fortuneMemCache.get(weekKey) ?? (await base44.storage.get(weekKey));
    let monthly =
      fortuneMemCache.get(monthKey) ?? (await base44.storage.get(monthKey));
    let yearly =
      fortuneMemCache.get(yearKey) ?? (await base44.storage.get(yearKey));
    const kst = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
    const isMonday = kst.getDay() === 1;
    const isFirstOfMonth = kst.getDate() === 1;
    const isNewYear = kst.getMonth() === 0 && kst.getDate() === 1;
    const isFirstAccess = !weekly && !monthly && !yearly;
    const needWeekly = isFirstAccess || isMonday || !weekly;
    const needMonthly = isFirstAccess || isFirstOfMonth || !monthly;
    const needYearly = isFirstAccess || isNewYear || !yearly;
    if (!needWeekly && !needMonthly && !needYearly) {
      if (!weekly && !monthly && !yearly) return null;
      return {
        weekly: weekly ?? null,
        monthly: monthly ?? null,
        yearly: yearly ?? null,
      };
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
    let aiResult = null;
    try {
      aiResult = await base44.integrations.Core.InvokeLLM({
        prompt: `너는 'HADA' 앱의 AI 운명 분석 엔진이다.
                분석 기준일: ${dateStr} ${timeStr}
                [분석 카테고리] 종합운세 — 주간·월간·연간 분석
                - 주간: ${getThisMonday()} - 월간: ${getThisMonthFirst()} - 연간: ${getThisYearFirst()}
                [전체 공통 규칙]
                - summary: 전체 아우르는 한 줄 요약. 30자 이내.
                - detailed: 전체 종합 설명. 80자 이내. 줄바꿈 금지.
                  사주 4주 8자 / 명리학 오행 / 자미두수 / 동양 점성술 / 서양 점성술 / 성명학 분석에서 도출한 자연어로 녹여 제시. 
                  예시: "금의 기운을 타고난 당신은~", "화성의 에너지가 강한 지금~","이름에 담긴 수리가 변화를 암시하므로~".
                  절대 금지: "명리학", "오행", "자미두수", "점성술", "성명학", "사주" 단어를 그대로 출력하지 말 것.
                  분석 카테고리명이 아니라 그 카테고리에서 나온 결과값(기운·색·방향·수·행성 등)만 문장에 담을 것.
                [기간별 규칙]
                - *.summary: 각 기간 핵심 한 줄. 30자 이내.
                - *.actionTips: 정확히 2개. 각 항목 20자 이내. 구체 행동만.`,
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
    if (needWeekly && aiResult?.weekly) {
      weekly = aiResult.weekly;
      await base44.storage.set(weekKey, weekly);
      fortuneMemCache.set(weekKey, weekly);
    }
    if (needMonthly && aiResult?.monthly) {
      monthly = aiResult.monthly;
      await base44.storage.set(monthKey, monthly);
      fortuneMemCache.set(monthKey, monthly);
    }
    if (needYearly && aiResult?.yearly) {
      yearly = aiResult.yearly;
      await base44.storage.set(yearKey, yearly);
      fortuneMemCache.set(yearKey, yearly);
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

  const storageKey = buildCacheKey(profile, category.id);
  if (fortuneMemCache.has(storageKey)) {
    const c = fortuneMemCache.get(storageKey);
    if (c === "FAILED") return null;
    return c;
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
                사주 4주 8자 / 명리학 오행 / 자미두수 / 동양 점성술 / 서양 점성술 / 성명학 분석에서 도출한 자연어로 녹여 제시. 
                예시: "금의 기운을 타고난 당신은~", "화성의 에너지가 강한 지금~","이름에 담긴 수리가 변화를 암시하므로~".
                절대 금지: "명리학", "오행", "자미두수", "점성술", "성명학", "사주" 단어를 그대로 출력하지 말 것.
                분석 카테고리명이 아니라 그 카테고리에서 나온 결과값(기운·색·방향·수·행성 등)만 문장에 담을 것.
              - actionTips: 정확히 3개. 각 항목 20자 이내. 구체적인 행동만.
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
    if (raw)
      result = {
        ...raw,
        aiLuckyColor:
          category.id === "daily" && raw.luckyColor
            ? raw.luckyColor
            : undefined,
      };
  } catch {
    console.log("운세 에러");
  }
  const valueToStore = result ?? "FAILED";
  await base44.storage.set(storageKey, valueToStore);
  fortuneMemCache.set(storageKey, valueToStore);
  return result ?? null;
}

async function loadDailyPreview(profile) {
  const today = getToday();
  const cacheKey = `dailyPreview_${profile.full_name}_${today}`;
  const cached = await base44.storage.get(cacheKey);
  if (cached && cached !== "FAILED") return cached;
  try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `오늘 하루 운세를 두 줄로 요약해줘.
              [규칙]
              - line1: 오늘 전체 에너지 흐름. 23자 이내. 줄바꿈 금지.
              - line2: 오늘 실천할 핵심 행동 조언. 23자 이내. 줄바꿈 금지.
              - 따뜻하고 희망적인 톤.`,
      response_json_schema: {
        type: "object",
        properties: { line1: { type: "string" }, line2: { type: "string" } },
      },
    });
    if (!res) {
      await base44.storage.set(cacheKey, "FAILED");
      return null;
    }
    await base44.storage.set(cacheKey, res);
    return res;
  } catch {
    return null;
  }
}

function TraitsModal({ traits, onClose }) {
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
        className="w-full max-w-lg bg-white dark:bg-[#1A1830] rounded-t-[32px] px-6 pt-5 pb-12 shadow-2xl max-h-[85vh] overflow-y-auto"
      >
        <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto mb-6" />
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            </div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white">
              나의 운명적 특성
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-100 dark:bg-[#2A2845] text-gray-500 dark:text-violet-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-8">
          {traits.strengths?.length > 0 && (
            <div>
              <p className="text-[11px] font-black text-teal-500 dark:text-teal-400 uppercase tracking-widest mb-3 px-1">
                💪 타고난 강점
              </p>
              <div className="flex flex-wrap gap-2">
                {traits.strengths.map((s, i) => (
                  <span
                    key={i}
                    className="px-4 py-2 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 rounded-2xl text-sm font-bold border border-teal-100 dark:border-teal-900/50"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {traits.potentials?.length > 0 && (
            <div>
              <p className="text-[11px] font-black text-violet-500 dark:text-violet-400 uppercase tracking-widest mb-3 px-1">
                ✨ 숨겨진 잠재력
              </p>
              <div className="flex flex-wrap gap-2">
                {traits.potentials.map((p, i) => (
                  <span
                    key={i}
                    className="px-4 py-2 bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 rounded-2xl text-sm font-bold border border-violet-100 dark:border-violet-900/50"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
          {traits.weaknesses?.length > 0 && (
            <div>
              <p className="text-[11px] font-black text-orange-500 dark:text-orange-400 uppercase tracking-widest mb-3 px-1">
                🌱 성장 포인트
              </p>
              <div className="flex flex-wrap gap-2">
                {traits.weaknesses.map((w, i) => (
                  <span
                    key={i}
                    className="px-4 py-2 bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 rounded-2xl text-sm font-bold border border-orange-100 dark:border-orange-900/50"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full h-14 mt-10 rounded-2xl bg-violet-200 hover:bg-violet-300 dark:bg-violet-800/50 dark:hover:bg-violet-700/50 text-violet-900 dark:text-violet-200 font-black text-sm active:scale-[0.98] transition-all"
        >
          확인했습니다
        </button>
      </motion.div>
    </motion.div>
  );
}

function ResetConfirmModal({ onConfirm, onCancel }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-5"
    >
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 340 }}
        className="bg-white dark:bg-[#1A1830] rounded-[28px] w-full max-w-sm p-6 shadow-2xl"
      >
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white">
            정말 초기화할까요?
          </h2>
          <p className="text-sm text-gray-500 dark:text-violet-200 leading-relaxed break-keep">
            모든 데이터(프로필, 할일, 기록 등)가
            <br />
            <span className="font-black text-red-400">영구적으로 삭제</span>
            됩니다.
          </p>
          <div className="flex gap-3 w-full mt-2">
            <button
              onClick={onCancel}
              className="flex-1 h-12 rounded-2xl bg-gray-100 dark:bg-[#2A2845] text-gray-600 dark:text-gray-300 font-bold text-sm"
            >
              취소
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 h-12 rounded-2xl bg-red-400 hover:bg-red-500 text-white font-black text-sm"
            >
              초기화
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FortuneListItem({
  category,
  onClick,
  isLoading,
  isLocked,
  unlockLevel,
}) {
  const Icon = category.icon;
  return (
    <motion.button
      whileTap={!isLocked ? { scale: 0.98 } : {}}
      onClick={() => !isLocked && onClick(category)}
      disabled={isLoading || isLocked}
      className={`w-full flex items-center gap-4 rounded-2xl px-4 py-3.5 border-2 transition-all relative overflow-hidden ${
        isLocked
          ? "bg-white/5 dark:bg-white/[0.03] border-purple-900/20 dark:border-violet-800/20 cursor-not-allowed opacity-60"
          : `bg-white border-gray-100 ${category.glassDark} transition-all`
      }`}
    >
      <div
        className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isLocked
            ? "bg-gray-200 dark:bg-gray-700"
            : `bg-gradient-to-br ${category.gradient}`
        }`}
      >
        {isLoading ? (
          <Loader2
            className="w-5 h-5 text-white animate-spin"
            strokeWidth={1.5}
          />
        ) : isLocked ? (
          <Lock className="w-5 h-5 text-gray-400" />
        ) : (
          <Icon
            className={`w-5 h-5 text-white ${category.iconNeon}`}
            strokeWidth={1.5}
          />
        )}
      </div>
      <div className="relative z-10 flex-1 text-left">
        <p
          className={`text-sm font-bold ${
            isLocked
              ? "text-gray-400 dark:text-gray-600"
              : "text-gray-800 dark:text-gray-100"
          }`}
        >
          {category.title}
        </p>
        <p
          className={`text-xs ${
            isLocked
              ? "text-gray-400 dark:text-gray-600"
              : "text-gray-400 dark:text-violet-300/70"
          }`}
        >
          {isLoading
            ? "분석 중..."
            : isLocked
            ? `레벨 ${unlockLevel} 이용 가능`
            : category.subtitle}
        </p>
      </div>
      {isLoading ? (
        <Loader2 className="relative z-10 w-4 h-4 text-gray-300 dark:text-gray-600 animate-spin" />
      ) : isLocked ? (
        <Lock className="relative z-10 w-4 h-4 text-gray-300 dark:text-gray-600" />
      ) : (
        <span className="relative z-10 text-gray-300 dark:text-gray-600 text-lg">
          ›
        </span>
      )}
    </motion.button>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showTraitsModal, setShowTraitsModal] = useState(false);
  const [activeTab, setActiveTab] = useState("level");

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const [showAdForBoost, setShowAdForBoost] = useState(false);
  const [xpBarPhase, setXpBarPhase] = useState("idle");

  const [dailyPreview, setDailyPreview] = useState(null);
  const [loadingDailyPreview, setLoadingDailyPreview] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [fortuneResult, setFortuneResult] = useState(null);
  const [loadingFortune, setLoadingFortune] = useState(false);
  const [showAdForFortune, setShowAdForFortune] = useState(false);
  const fortunePromiseRef = useRef(null);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => base44.entities.UserProfile.list(),
  });
  const profile = profiles?.[0];
  const level = profile?.level || 1;

  const isLuckyMode = level >= LUCKY_LEVEL_THRESHOLD;
  const nextUnlockMessage = getNextUnlockMessage(level);
  const resetAllowed = canResetData(level);

  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      setLoadingDailyPreview(true);
      const res = await loadDailyPreview(profile);
      setDailyPreview(res);
      setLoadingDailyPreview(false);
    };
    load();
  }, [profile?.id]);

  useEffect(() => {
    const loadNotifSetting = async () => {
      try {
        const saved = await base44.storage.get("notificationsEnabled");
        if (saved === false) setNotificationsEnabled(false);
      } catch {}
    };
    loadNotifSetting();
  }, []);

  const handleNotificationToggle = async () => {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    try {
      await base44.storage.set("notificationsEnabled", next);
    } catch {}
  };

  const handleBoostClick = () => {
    setShowAdForBoost(true);
  };

  const handleBoostAdClose = async () => {
    setShowAdForBoost(false);
    if (!profile) return;

    setXpBarPhase("filling");
    await new Promise((r) => setTimeout(r, 900));

    const current = profile.level || 1;
    const next = current + 1;
    try {
      await base44.entities.UserProfile.update(profile.id, {
        level: next,
        xp: (next - 1) * 100,
      });
      await queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    } catch (e) {
      console.error(e);
    }

    setXpBarPhase("idle");
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setShowAdForFortune(true);
    setLoadingFortune(true);
    fortunePromiseRef.current = generateFortune(profile, category);
  };

  const handleFortuneAdClose = async () => {
    setShowAdForFortune(false);
    try {
      const result = await fortunePromiseRef.current;
      if (!result) {
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

  const handleReset = async () => {
    setResetting(true);
    try {
      await base44.storage.clear();
      queryClient.clear();
      await new Promise((r) => setTimeout(r, 500));
      navigate("/Onboarding", { replace: true });
      window.location.reload();
    } catch {
      alert("초기화에 실패했습니다.");
    } finally {
      setResetting(false);
    }
  };

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
      </div>
    );
  if (!profile) return null;

  const xpProgress = (profile.xp || 0) % 100;
  const currentLevel = profile.level || 1;
  const nextLevel = currentLevel + 1;

  const TABS = [
    { key: "level", label: isLuckyMode ? "행운 레벨" : "레벨", icon: Star },
    { key: "fortune", label: "운세", icon: Sparkles },
  ];

  return (
    <>
      <div className="min-h-screen bg-[#FDFCFE] dark:bg-[#0F0E17] pb-32 transition-colors duration-300">
        <AdModal visible={showAdForBoost} onClose={handleBoostAdClose} />
        <AdModal visible={showAdForFortune} onClose={handleFortuneAdClose} />

        <FortuneResultModal
          result={fortuneResult}
          category={selectedCategory}
          onClose={() => {
            setFortuneResult(null);
            setSelectedCategory(null);
          }}
        />

        <AnimatePresence>
          {showResetModal && (
            <ResetConfirmModal
              onConfirm={handleReset}
              onCancel={() => setShowResetModal(false)}
            />
          )}
          {showTraitsModal && profile.traits && (
            <TraitsModal
              traits={profile.traits}
              onClose={() => setShowTraitsModal(false)}
            />
          )}
        </AnimatePresence>

        {/* 헤더 */}
        <div className="px-6 pt-12 pb-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-black text-violet-500 dark:text-violet-400 uppercase tracking-[0.3em] mb-2">
                  HADA
                </p>
                <button
                  onClick={() => setShowTraitsModal(true)}
                  className="group flex items-center gap-2 text-left active:opacity-60 transition-opacity"
                >
                  <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                    프로필
                  </h1>
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/40 mt-1">
                    <ChevronRight className="w-3 h-3 text-violet-500 dark:text-violet-400" />
                  </div>
                </button>
                <p className="text-xs text-gray-400 dark:text-violet-300/70 mt-1 font-semibold">
                  6대 운명학 기반 알고리즘 계산
                </p>
              </div>

              {/* 알림 토글 버튼 — mt-1 제거 */}
              <div className="flex flex-col items-center gap-1">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleNotificationToggle}
                  className={`relative w-11 h-6 rounded-full flex items-center px-0.5 transition-colors duration-300 ${
                    notificationsEnabled
                      ? "bg-violet-500 dark:bg-violet-500"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}
                >
                  <motion.div
                    className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0"
                    animate={{ x: notificationsEnabled ? 20 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    {notificationsEnabled ? (
                      <Bell
                        className="w-2.5 h-2.5 text-violet-500"
                        strokeWidth={2.5}
                      />
                    ) : (
                      <BellOff
                        className="w-2.5 h-2.5 text-gray-400"
                        strokeWidth={2.5}
                      />
                    )}
                  </motion.div>
                </motion.button>
                <span
                  className={`text-[10px] font-bold transition-colors ${
                    notificationsEnabled
                      ? "text-violet-500 dark:text-violet-400"
                      : "text-gray-400 dark:text-gray-600"
                  }`}
                >
                  {notificationsEnabled ? "알림 ON" : "알림 OFF"}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* 탭 토글 */}
        <div className="px-5 mb-5">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex bg-gray-100 dark:bg-[#2A2845]/60 rounded-2xl p-1 gap-1"
          >
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all duration-200 ${
                  activeTab === key
                    ? "bg-white dark:bg-[#1A1830] text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-400 dark:text-violet-300/70"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    activeTab === key
                      ? key === "fortune"
                        ? "text-amber-400"
                        : "text-violet-500 dark:text-violet-400"
                      : ""
                  }`}
                />
                {label}
              </button>
            ))}
          </motion.div>
        </div>

        <div className="px-5 space-y-5">
          <AnimatePresence mode="wait">
            {activeTab === "level" && (
              <motion.div
                key="level"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* 레벨 카드 */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-3xl p-6 border shadow-[0_4px_24px_rgba(196,181,253,0.15)] ${
                    isLuckyMode
                      ? "bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800/50"
                      : "bg-white dark:bg-[#1A1830] border-violet-100 dark:border-purple-900/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isLuckyMode
                            ? "bg-amber-100 dark:bg-amber-900/40"
                            : "bg-violet-50 dark:bg-violet-900/30"
                        }`}
                      >
                        <Star
                          className={`w-6 h-6 ${
                            isLuckyMode
                              ? "text-amber-500"
                              : "text-violet-400 dark:text-violet-300"
                          }`}
                          strokeWidth={2}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-violet-300/70 uppercase tracking-wide">
                          {isLuckyMode ? "행운 레벨" : "레벨"}
                        </p>
                        <motion.span
                          key={currentLevel}
                          initial={{ scale: 0.7, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={`text-4xl font-black ${
                            isLuckyMode
                              ? "text-amber-500"
                              : "text-gray-900 dark:text-white"
                          }`}
                        >
                          {currentLevel}
                        </motion.span>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        isLuckyMode
                          ? "text-amber-500"
                          : "text-violet-400 dark:text-violet-400"
                      }`}
                    >
                      {profile.xp || 0} XP
                    </span>
                  </div>

                  {/* XP 바 */}
                  <div
                    className={`h-3 rounded-full overflow-hidden mb-3 ${
                      isLuckyMode
                        ? "bg-amber-100 dark:bg-amber-900/30"
                        : "bg-violet-50 dark:bg-[#2A2845]"
                    }`}
                  >
                    <motion.div
                      className={`h-full rounded-full ${
                        isLuckyMode
                          ? "bg-amber-400"
                          : "bg-violet-200 dark:bg-violet-500"
                      }`}
                      animate={{
                        width:
                          xpBarPhase === "filling" ? "100%" : `${xpProgress}%`,
                      }}
                      transition={{
                        width: { duration: 0.8, ease: "easeInOut" },
                      }}
                    />
                  </div>

                  {/* 레벨업 부스트 버튼 */}
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleBoostClick}
                    disabled={xpBarPhase === "filling"}
                    className={`w-full h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all shadow-sm ${
                      isLuckyMode
                        ? "bg-amber-200 hover:bg-amber-300 dark:bg-amber-800/60 dark:hover:bg-amber-700/60 text-amber-900 dark:text-amber-200"
                        : "bg-violet-200 hover:bg-violet-300 dark:bg-violet-800/60 dark:hover:bg-violet-700/60 text-violet-900 dark:text-violet-200"
                    }`}
                  >
                    <Zap
                      className={`w-4 h-4 ${
                        xpBarPhase === "filling" ? "animate-bounce" : ""
                      }`}
                    />
                    {xpBarPhase === "filling"
                      ? "부스트 적용 중..."
                      : isLuckyMode
                      ? "행운 레벨 올리기"
                      : "레벨업 부스트"}
                  </motion.button>

                  {/* 다음 해금 안내 */}
                  <p
                    className={`text-xs text-center mt-2.5 font-semibold ${
                      isLuckyMode
                        ? "text-amber-500/70 dark:text-amber-600"
                        : "text-violet-300 dark:text-violet-600"
                    }`}
                  >
                    {xpBarPhase === "filling"
                      ? "레벨업 중! ✨"
                      : nextUnlockMessage}
                  </p>
                </motion.div>

                {/* 오늘의 에너지 */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 }}
                  className="bg-white dark:bg-[#1A1830] rounded-[32px] border border-gray-100 dark:border-purple-900/30 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
                >
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-2 h-6 bg-violet-300 dark:bg-violet-600 rounded-full" />
                    <h3 className="text-sm font-black text-gray-800 dark:text-gray-100">
                      오늘의 에너지
                    </h3>
                  </div>
                  <StatsRadar stats={profile.base_stats} />
                </motion.div>

                {/* 초기화 버튼 */}
                <div className="pt-2 pb-4">
                  <button
                    onClick={() => resetAllowed && setShowResetModal(true)}
                    disabled={resetting || !resetAllowed}
                    className={`w-full py-3.5 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors ${
                      resetAllowed
                        ? "border-red-100 dark:border-red-900/40 text-red-400 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                        : "border-gray-100 dark:border-purple-900/30 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                    }`}
                  >
                    {resetting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : resetAllowed ? (
                      <Trash2 className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                    {resetting
                      ? "초기화 중..."
                      : resetAllowed
                      ? "데이터 초기화"
                      : `데이터 초기화`}
                  </button>
                  <p className="text-center text-[10px] text-gray-300 dark:text-gray-700 mt-2">
                    {resetAllowed
                      ? "모든 데이터가 삭제되고 처음부터 시작됩니다"
                      : "레벨 89에 도달하면 초기화 기능이 활성화됩니다"}
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === "fortune" && (
              <motion.div
                key="fortune"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* 오늘의 운세 배너 (항상 가능) */}
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-2 h-6 bg-amber-300 dark:bg-amber-500 rounded-full" />
                    <h3 className="text-sm font-black text-gray-800 dark:text-gray-100">
                      오늘의 운세
                    </h3>
                  </div>

                  <div className="rounded-2xl overflow-hidden border border-amber-100 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/30">
                    <div className="px-5 py-4 flex items-center gap-3">
                      <Sun
                        className="w-7 h-7 text-amber-500 dark:text-amber-400"
                        strokeWidth={1.5}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                          오늘의 운세
                        </p>
                        <p className="text-xs text-amber-600/70 dark:text-amber-400/60">
                          오늘 전체 흐름
                        </p>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-[#1A1830] border-t border-amber-100 dark:border-amber-900/30 px-5 py-4 space-y-3">
                      {loadingDailyPreview ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                          <p className="text-xs text-gray-400 dark:text-violet-300/70">
                            운세 요약 중...
                          </p>
                        </div>
                      ) : dailyPreview ? (
                        <div className="space-y-1">
                          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed break-keep">
                            ☀️ {dailyPreview.line1}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-violet-200 leading-relaxed break-keep">
                            ✨ {dailyPreview.line2}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 dark:text-violet-300/70 break-keep">
                          오늘의 운세를 불러오는 중이에요...
                        </p>
                      )}
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleCategoryClick(FORTUNE_DAILY)}
                        disabled={
                          loadingFortune && selectedCategory?.id === "daily"
                        }
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-sm font-black transition-all border border-amber-200 dark:border-amber-800/50"
                      >
                        {loadingFortune && selectedCategory?.id === "daily" ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
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

                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-2 h-6 bg-violet-300 dark:bg-violet-600 rounded-full" />
                    <h3 className="text-sm font-black text-gray-800 dark:text-gray-100">
                      상세 운세
                    </h3>
                  </div>
                  <div className="flex flex-col gap-2">
                    {FORTUNE_DETAILED.map((cat) => {
                      const isLocked = !canViewFortune(level, cat.id);
                      const unlockLevel = FORTUNE_UNLOCK_LEVELS[cat.id];
                      return (
                        <FortuneListItem
                          key={cat.id}
                          category={cat}
                          onClick={handleCategoryClick}
                          isLoading={
                            loadingFortune && selectedCategory?.id === cat.id
                          }
                          isLocked={isLocked}
                          unlockLevel={unlockLevel}
                        />
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <DevUnlockPanel />
    </>
  );
}

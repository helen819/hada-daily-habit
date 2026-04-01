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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StatsRadar from "@/components/home/StatsRadar";
import AdModal from "@/components/shop/AdModal";
import FortuneResultModal from "@/components/shop/FortuneResultModal";
import { useNavigate } from "react-router-dom";
import { Preferences } from "@capacitor/preferences";
import { getFullDestinyData } from "@/components/services/calculator/destinyCalculator";
import { getKSTDateString } from "@/utils/date";

// ─── 날짜 유틸 ────────────────────────────────────────────────────
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

// ─── 운세 상수 ────────────────────────────────────────────────────
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

// ─── in-memory 운세 캐시 ─────────────────────────────────────────
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
                - fortuneSource: "HADA 운명학 분석" 고정.
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

// ─── 운세 미리보기 로드 ───────────────────────────────────────────
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

// ─── 나의 특성 팝업 (고민 선택 팝업 스타일) ──────────────────────
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
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-[32px] px-6 pt-5 pb-12 shadow-2xl max-h-[85vh] overflow-y-auto"
      >
        <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto mb-6" />
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white">
              나의 운명적 특성
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-8">
          {/* 강점 */}
          {traits.strengths?.length > 0 && (
            <div>
              <p className="text-[11px] font-black text-teal-500 uppercase tracking-widest mb-3 px-1">
                💪 타고난 강점
              </p>
              <div className="flex flex-wrap gap-2">
                {traits.strengths.map((s, i) => (
                  <span
                    key={i}
                    className="px-4 py-2 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-2xl text-sm font-bold border border-teal-100 dark:border-teal-800/50"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 잠재력 */}
          {traits.potentials?.length > 0 && (
            <div>
              <p className="text-[11px] font-black text-purple-500 uppercase tracking-widest mb-3 px-1">
                ✨ 숨겨진 잠재력
              </p>
              <div className="flex flex-wrap gap-2">
                {traits.potentials.map((p, i) => (
                  <span
                    key={i}
                    className="px-4 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-2xl text-sm font-bold border border-purple-100 dark:border-purple-800/50"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 성장 포인트 */}
          {traits.weaknesses?.length > 0 && (
            <div>
              <p className="text-[11px] font-black text-orange-500 uppercase tracking-widest mb-3 px-1">
                🌱 성장 포인트
              </p>
              <div className="flex flex-wrap gap-2">
                {traits.weaknesses.map((w, i) => (
                  <span
                    key={i}
                    className="px-4 py-2 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-2xl text-sm font-bold border border-orange-100 dark:border-orange-800/50"
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
          className="w-full h-14 mt-10 rounded-2xl bg-gray-900 dark:bg-white dark:text-gray-900 text-white font-black text-sm active:scale-[0.98] transition-transform"
        >
          확인했습니다
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── 초기화 확인 팝업 ────────────────────────────────────────────
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
        className="bg-white dark:bg-gray-900 rounded-[28px] w-full max-w-sm p-6 shadow-2xl"
      >
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white">
            정말 초기화할까요?
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            모든 데이터(프로필, 할일, 기록 등)가
            <br />
            <span className="font-black text-red-500">영구적으로 삭제</span>
            됩니다.
          </p>
          <div className="flex gap-3 w-full mt-2">
            <button
              onClick={onCancel}
              className="flex-1 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-sm"
            >
              취소
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 h-12 rounded-2xl bg-red-500 text-white font-black text-sm"
            >
              초기화
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── 운세 아이템 컴포넌트 ────────────────────────────────────────
function FortuneListItem({ category, onClick, isLoading }) {
  const Icon = category.icon;
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(category)}
      disabled={isLoading}
      className="w-full flex items-center gap-4 bg-white dark:bg-gray-900 rounded-2xl px-4 py-3.5 border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all relative overflow-hidden shadow-sm"
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
          <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
        )}
      </div>
      <div className="relative z-10 flex-1 text-left">
        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
          {category.title}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {isLoading ? "분석 중..." : category.subtitle}
        </p>
      </div>
      {isLoading ? (
        <Loader2 className="relative z-10 w-4 h-4 text-gray-300 animate-spin" />
      ) : (
        <span className="relative z-10 text-gray-300 dark:text-gray-600 text-lg">
          ›
        </span>
      )}
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Profile 메인
// ═══════════════════════════════════════════════════════════════════
export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showTraitsModal, setShowTraitsModal] = useState(false); // ✅ 특성 팝업 상태

  // 다크모드 감지
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(el.classList.contains("dark"));
    });
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // 레벨업 부스트
  const [showAdForBoost, setShowAdForBoost] = useState(false);
  // xpBarPhase: "idle" | "filling" | "done"
  // "filling" 동안 바가 현재값→100%로 호로록 차오름
  // "done" 되면 레벨업 이펙트 표시
  const [xpBarPhase, setXpBarPhase] = useState("idle");

  // 운세
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

  // ─── 오늘 운세 미리보기 로드 ─────────────────────────────────
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

  // ─── 레벨업 부스트 (광고 → 레벨+1) ──────────────────────────
  const handleBoostClick = () => {
    setShowAdForBoost(true);
  };

  const handleBoostAdClose = async () => {
    setShowAdForBoost(false);
    if (!profile) return;

    // 1단계: 바를 현재값에서 100%까지 호로록 채움
    setXpBarPhase("filling");

    // 2단계: 바가 다 찰 때까지 대기 (transition duration과 맞춤)
    await new Promise((r) => setTimeout(r, 900));

    // 3단계: 실제 레벨업 처리
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

    // 4단계: 바 애니메이션 종료, idle 복귀
    setXpBarPhase("idle");
  };

  // ─── 운세 클릭 ───────────────────────────────────────────────
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

  // ─── 초기화 ──────────────────────────────────────────────────
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    );
  }
  if (!profile) return null;

  const xpProgress = (profile.xp || 0) % 100;
  const currentLevel = profile.level || 1;
  const nextLevel = currentLevel + 1;

  return (
    <div className="min-h-screen bg-[#FDFCFE] dark:bg-gray-950 pb-32 transition-colors duration-300">
      {/* 광고 모달들 */}
      <AdModal visible={showAdForBoost} onClose={handleBoostAdClose} />
      <AdModal visible={showAdForFortune} onClose={handleFortuneAdClose} />

      {/* 운세 결과 모달 */}
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
        {/* ✅ 특성 모달 추가 */}
        {showTraitsModal && profile.traits && (
          <TraitsModal
            traits={profile.traits}
            onClose={() => setShowTraitsModal(false)}
          />
        )}
      </AnimatePresence>

      {/* ── 헤더 ──────────────────────────────────────────────── */}
      <div className="px-6 pt-12 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em] mb-2">
            HADA
          </p>
          {/* ✅ 클릭 가능한 타이틀 */}
          <button
            onClick={() => setShowTraitsModal(true)}
            className="group flex items-center gap-2 text-left active:opacity-60 transition-opacity"
          >
            <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
              프로필
            </h1>
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/40 mt-1">
              <ChevronRight className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            </div>
          </button>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-semibold">
            6대 운명학 기반 알고리즘 계산
          </p>
        </motion.div>
      </div>

      <div className="px-5 space-y-5">
        {/* ── 레벨 카드 ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-purple-400 to-blue-400 dark:bg-transparent rounded-3xl p-6 text-white dark:text-purple-300 shadow-lg dark:border dark:border-purple-500/50 relative overflow-hidden"
        >
          <div className="absolute inset-0 hidden dark:block rounded-3xl bg-[#121212]" />
          <div
            className="absolute inset-0 hidden dark:block rounded-3xl"
            style={{
              boxShadow:
                "inset 0 0 30px rgba(167,139,250,0.1), 0 0 30px rgba(167,139,250,0.15)",
            }}
          />

          <div className="relative z-10">
            {/* 레벨 + XP */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 dark:bg-purple-500/20 dark:border dark:border-purple-500/40 flex items-center justify-center">
                  <Star
                    className="w-6 h-6 text-white dark:text-purple-300"
                    strokeWidth={2}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide opacity-90">
                    레벨
                  </p>
                  <motion.span
                    key={currentLevel}
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-4xl font-black dark:text-purple-200"
                  >
                    {currentLevel}
                  </motion.span>
                </div>
              </div>
              <span className="text-sm font-bold opacity-95 dark:text-purple-300">
                {profile.xp || 0} XP
              </span>
            </div>

            {/* XP 바 — filling 단계에서 현재값→100% 호로록 */}
            <div className="h-3 bg-white/20 dark:bg-purple-900/40 rounded-full overflow-hidden mb-4">
              <motion.div
                className="h-full rounded-full"
                animate={{
                  width: xpBarPhase === "filling" ? "100%" : `${xpProgress}%`,
                  background:
                    xpBarPhase === "filling"
                      ? ["#fef08a", "#facc15", "#fbbf24", "#facc15"]
                      : "#fef08a",
                }}
                transition={{
                  width: { duration: 0.8, ease: "easeInOut" },
                  background: {
                    duration: 0.6,
                    repeat: xpBarPhase === "filling" ? Infinity : 0,
                  },
                }}
              />
            </div>
            <p className="text-xs font-medium opacity-90 dark:text-purple-300 mb-4">
              {xpBarPhase === "filling"
                ? "레벨업 중! ✨"
                : `다음 레벨까지 ${100 - xpProgress} XP`}
            </p>

            {/* 레벨업 부스트 버튼
                라이트: 골드/오렌지
                다크:   퍼플 (응원 버튼과 동일) */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleBoostClick}
              disabled={xpBarPhase === "filling"}
              className={`w-full h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform ${
                isDark
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/30"
                  : ""
              }`}
              style={
                !isDark
                  ? {
                      background:
                        "linear-gradient(135deg, #facc15 0%, #f59e0b 100%)",
                      color: "#78350f",
                      boxShadow:
                        "0 4px 16px rgba(245,158,11,0.45), 0 1px 3px rgba(0,0,0,0.1)",
                    }
                  : undefined
              }
            >
              <Zap
                className={`w-4 h-4 ${
                  xpBarPhase === "filling" ? "animate-bounce" : ""
                }`}
              />
              {xpBarPhase === "filling" ? "부스트 적용 중..." : "레벨업 부스트"}
            </motion.button>

            {/* 다음 레벨 잠금 해제 문구 */}
            <p className="text-[11px] text-white/60 dark:text-purple-400/60 text-center mt-2.5 font-semibold">
              레벨 {nextLevel}이 되면 추가 기능이 해제됩니다 ✨
            </p>
          </div>
        </motion.div>

        {/* ── 기본 에너지 ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-2 h-6 bg-purple-500 rounded-full shadow-[0_0_12px_rgba(168,85,247,0.25)]" />
            <h3 className="text-sm font-black text-gray-800 dark:text-gray-100">
              오늘의 에너지
            </h3>
          </div>
          <StatsRadar stats={profile.base_stats} />
        </motion.div>

        {/* ── 운세 섹션 ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] space-y-4"
        >
          {/* 오늘의 운세 배너 */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-2 h-6 bg-amber-400 rounded-full" />
              <h3 className="text-sm font-black text-gray-800 dark:text-gray-100">
                오늘의 운세
              </h3>
            </div>

            <div
              className="rounded-2xl overflow-hidden dark:border dark:border-amber-500/40"
              style={{
                background: "linear-gradient(135deg, #FDE68A 0%, #FCD34D 100%)",
              }}
            >
              <div className="px-5 py-4 flex items-center gap-3">
                <Sun className="w-7 h-7 text-amber-600" strokeWidth={1.5} />
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-900">
                    오늘의 운세
                  </p>
                  <p className="text-xs text-amber-700/70">오늘 전체 흐름</p>
                </div>
              </div>
              <div className="bg-white dark:bg-[#1A1F2E] border-t border-amber-100 dark:border-amber-500/20 px-5 py-4 space-y-3">
                {loadingDailyPreview ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <p className="text-xs text-gray-400">운세 요약 중...</p>
                  </div>
                ) : dailyPreview ? (
                  <div className="space-y-1">
                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                      ☀️ {dailyPreview.line1}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      ✨ {dailyPreview.line2}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    오늘의 운세를 불러오는 중이에요...
                  </p>
                )}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleCategoryClick(FORTUNE_DAILY)}
                  disabled={loadingFortune && selectedCategory?.id === "daily"}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-yellow-400 dark:bg-amber-500/20 dark:border dark:border-amber-500/50 hover:bg-yellow-500 text-white dark:text-amber-300 text-sm font-black transition-all"
                  style={{ boxShadow: "0 2px 8px rgba(180,140,0,0.25)" }}
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

          {/* 상세 운세 */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-2 h-6 bg-violet-400 rounded-full" />
              <h3 className="text-sm font-black text-gray-800 dark:text-gray-100">
                상세 운세
              </h3>
            </div>
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
        </motion.div>

        {/* ── 초기화 버튼 ──────────────────────────────────────── */}
        <div className="pt-2 pb-4">
          <button
            onClick={() => setShowResetModal(true)}
            disabled={resetting}
            className="w-full py-3.5 rounded-2xl border-2 border-red-100 dark:border-red-900/50 text-red-400 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors hover:bg-red-50 dark:hover:bg-red-900/10"
          >
            {resetting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {resetting ? "초기화 중..." : "데이터 초기화"}
          </button>
          <p className="text-center text-[10px] text-gray-300 dark:text-gray-700 mt-2">
            모든 데이터가 삭제되고 처음부터 시작됩니다
          </p>
        </div>
      </div>
    </div>
  );
}

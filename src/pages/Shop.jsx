import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
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
const WEATHER_MOCK = ["맑음", "흐림", "비", "눈", "바람"];
const getWeatherMock = () =>
  WEATHER_MOCK[new Date().getHours() % WEATHER_MOCK.length];

async function generateAICharm(profile) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `너는 'HADA' 앱의 실시간 부적 추천 엔진이다.
[사용자] 이름: ${profile?.full_name}, 생년월일: ${profile?.birth_date}, 목표: ${
      profile?.goal
    }
[현재] 날짜: ${dateStr}, 날씨: ${getWeatherMock()}
규칙: 지금 당장 구할 수 있는 평범한 물건만 추천. 운명학 근거 명시.`,
    response_json_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        effect: { type: "string" },
        source: { type: "string" },
      },
    },
  });
  return res;
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
    subtitle: "전체 분석",
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

function generateOfflineFortune(profile, categoryId) {
  const nameHash = (profile?.full_name || "")
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  const baseEnergy = Math.floor((nameHash % 50) + 50);
  const colors = ["#FBBF24", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899"];
  return {
    title: categoryId,
    summary: `${categoryId} 에너지 안정적`,
    energyLevel: baseEnergy,
    detailed:
      "오늘 관련 업무 효율이 안정적입니다. 멘탈 에너지도 좋으니 집중력을 활용해보세요.",
    actionTips: [
      "책상에 물 한 잔 두기",
      "3분간 창밖 보기",
      "깊게 숨 5회 들이쉬기",
    ],
    luckyColor: colors[nameHash % colors.length],
    fortuneSource: "사용자 사주 기반 오프라인 분석",
  };
}

const fortuneCache = new Map();

async function generateFortune(profile, category) {
  const today = new Date().toISOString().split("T")[0];
  const cacheKey = `${profile?.full_name}_${profile?.birth_date}_${category.id}_${today}`;
  if (fortuneCache.has(cacheKey)) return fortuneCache.get(cacheKey);
  try {
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
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `너는 'HADA' 앱의 AI 운명 분석 엔진이다. 성명: ${profile?.full_name}, 생년월일: ${profile?.birth_date}, 현재: ${dateStr} ${timeStr}`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          energyLevel: { type: "number" },
          detailed: { type: "string" },
          actionTips: { type: "array", items: { type: "string" } },
          luckyColor: { type: "string" },
          fortuneSource: { type: "string" },
        },
      },
    });
    fortuneCache.set(cacheKey, result);
    return result;
  } catch {
    const fallback = generateOfflineFortune(profile, category.id);
    fortuneCache.set(cacheKey, fallback);
    return fallback;
  }
}

// 상세 운세 리스트 아이템
function FortuneListItem({ category, onClick }) {
  const IconComponent = category.icon;
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(category)}
      className="w-full flex items-center gap-4 bg-white dark:bg-transparent rounded-2xl px-4 py-3.5 border border-gray-100 dark:border-[#424B63] hover:shadow-md dark:hover:border-[#5A6380] transition-all relative overflow-hidden shadow-sm"
    >
      {/* 다크모드 — 그라디언트 아이콘 색상 배경 */}
      <div
        className={`absolute inset-0 hidden dark:block opacity-10 bg-gradient-to-r ${category.gradient}`}
      />

      <div
        className={`relative z-10 w-10 h-10 rounded-xl bg-gradient-to-br ${category.gradient} flex items-center justify-center flex-shrink-0`}
      >
        <IconComponent className="w-5 h-5 text-white" strokeWidth={1.5} />
      </div>
      <div className="relative z-10 flex-1 text-left">
        <p className="text-sm font-bold text-gray-800 dark:text-slate-200">
          {category.title}
        </p>
        <p className="text-xs text-gray-400 dark:text-slate-400">
          {category.subtitle}
        </p>
      </div>
      <span className="relative z-10 text-gray-300 dark:text-slate-400 text-lg">
        ›
      </span>
    </motion.button>
  );
}

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

  const { data: profiles } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => base44.entities.UserProfile.list(),
  });
  const profile = profiles?.[0];

  useEffect(() => {
    if (!profile) return;
    const today = new Date().toISOString().split("T")[0];
    const cacheKey = `dailyPreview_${profile.full_name}_${today}`;
    const loadPreview = async () => {
      const cached = await base44.storage.get(cacheKey);
      if (cached) {
        setDailyFortunePreview(cached);
        return;
      }
      setLoadingDailyPreview(true);
      try {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: `사용자 ${profile.full_name}(${profile.birth_date})의 ${today} 오늘의 운세를 두 문장 이내로 따뜻하게 요약해줘...`,
          response_json_schema: {
            type: "object",
            properties: {
              line1: { type: "string" },
              line2: { type: "string" },
            },
          },
        });
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

  const handleCharmAdClose = async () => {
    setShowAdForCharm(false);
    setLoadingCharm(true);
    try {
      const charm = await generateAICharm(profile);
      const todayStr = new Date().toDateString();
      await base44.storage.set("lastCharmDate", todayStr);
      await base44.storage.set("cachedCharm", charm);
      setDailyCharm(charm);
      setRevealedCharm({ ...charm, emoji: getEmoji(charm.name) });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCharm(false);
    }
  };

  const handleSaveCharm = async () => {
    await base44.entities.CharmItem.create({
      ...revealedCharm,
      obtained_date: new Date().toISOString().split("T")[0],
    });
    queryClient.invalidateQueries({ queryKey: ["charms"] });
    setRevealedCharm(null);
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setShowAdForFortune(true);
  };

  const handleFortuneAdClose = async () => {
    setShowAdForFortune(false);
    setLoadingFortune(true);
    const result = await generateFortune(profile, selectedCategory);
    setLoadingFortune(false);
    setFortuneResult(result);
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
        {/* 행운 뽑기 버튼 */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowAdForCharm(true)}
          disabled={loadingCharm}
          className="relative w-full rounded-2xl p-6 text-center disabled:opacity-50 overflow-hidden group
            dark:bg-transparent dark:border dark:border-amber-400/50 dark:text-amber-300"
          style={{
            background:
              "linear-gradient(135deg, rgba(251,191,36,0.85) 0%, rgba(249,115,22,0.75) 100%)",
          }}
        >
          {/* 다크모드에서 라이트 그라디언트 덮기 */}
          <div className="absolute inset-0 hidden dark:block rounded-2xl bg-[#121212]" />
          <div className="relative z-10 text-white dark:text-amber-300">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <p className="text-base font-bold mb-1">행운 뽑기</p>
          </div>
        </motion.button>

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
            {/* 다크모드에서 라이트 그라디언트 덮기 */}
            <div className="absolute inset-0 hidden dark:block rounded-3xl bg-[#121212]" />
            <div className="absolute inset-0 overflow-hidden rounded-3xl opacity-20">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
            </div>
            <div className="relative z-10 space-y-3">
              <p className="text-[10px] font-bold dark:text-purple-300 text-white/70 uppercase tracking-widest">
                ✨ 오늘의 행운템 ✨
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
                {dailyCharm.source}
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
            {loadingFortune && (
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
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-yellow-400 dark:bg-amber-500/20 dark:border dark:border-amber-500/50 hover:bg-yellow-500 dark:hover:bg-amber-500/30 text-white dark:text-amber-300 text-sm font-bold transition-all"
                  style={{ boxShadow: "0 2px 8px rgba(180,140,0,0.25)" }}
                >
                  <span>자세히 보기</span>
                  <ChevronRight className="w-4 h-4" strokeWidth={2} />
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
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

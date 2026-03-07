import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Loader2, ChevronRight, Sun, Wand2, Heart, Banknote, Briefcase, Leaf } from "lucide-react";
import AdModal from "@/components/shop/AdModal";
import CharmReveal from "@/components/shop/CharmReveal";
import FortuneResultModal from "@/components/shop/FortuneResultModal";

// ─── 부적 유틸 ───────────────────────────────────────────────
const EMOJI_MAP = {
  동전: "🪙", 볼펜: "🖊️", 돌: "🪨", 반지: "💍", 라벤더: "🌸",
  포스트잇: "📝", 식물: "🌿", 거울: "🪞", 열쇠: "🗝️", 컵: "☕",
  이어폰: "🎧", 스티커: "🏷️", 책: "📖", 수첩: "📓", 향: "🕯️",
};
const getEmoji = (name = "") => {
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (name.includes(key)) return emoji;
  }
  return "✨";
};
const WEATHER_MOCK = ["맑음", "흐림", "비", "눈", "바람"];
const getWeatherMock = () => WEATHER_MOCK[new Date().getHours() % WEATHER_MOCK.length];

async function generateAICharm(profile) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `너는 'HADA' 앱의 실시간 부적 추천 엔진이다.
[사용자] 이름: ${profile?.full_name}, 생년월일: ${profile?.birth_date}, 목표: ${profile?.goal}
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

// ─── 운세 카테고리 ───────────────────────────────────────────
const FORTUNE_DAILY = { id: "daily", title: "오늘의 운세", icon: Sun, subtitle: "오늘 전체 흐름", gradient: "from-amber-300 to-orange-300" };

const FORTUNE_DETAILED = [
  { id: "summary", title: "종합운세", icon: Wand2, subtitle: "전체 분석",   gradient: "from-violet-300 to-purple-300" },
  { id: "love",    title: "애정운",   icon: Heart, subtitle: "관계 에너지", gradient: "from-rose-300 to-pink-300" },
  { id: "wealth",  title: "재물운",   icon: Banknote, subtitle: "금전 흐름",   gradient: "from-yellow-300 to-amber-300" },
  { id: "career",  title: "취업운",   icon: Briefcase, subtitle: "커리어 기회", gradient: "from-indigo-300 to-blue-300" },
  { id: "health",  title: "건강운",   icon: Leaf, subtitle: "몸과 마음",   gradient: "from-teal-300 to-emerald-300" },
];

// 오프라인 Fallback (사용자 이름 해시 기반 결정론적)
function generateOfflineFortune(profile, categoryId) {
  const nameHash = (profile?.full_name || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const baseEnergy = Math.floor((nameHash % 50) + 50);
  const colors = ["#FBBF24", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899"];
  return {
    title: categoryId,
    summary: `${categoryId} 에너지 안정적`,
    energyLevel: baseEnergy,
    detailed: "오늘 관련 업무 효율이 안정적입니다. 멘탈 에너지도 좋으니 집중력을 활용해보세요. 작은 행동부터 시작하면 성과가 쌓입니다.",
    actionTips: ["책상에 물 한 잔 두기", "3분간 창밖 보기", "깊게 숨 5회 들이쉬기"],
    luckyColor: colors[nameHash % colors.length],
    fortuneSource: "사용자 사주 기반 오프라인 분석",
  };
}

// 운세 AI 생성 (캐싱 포함)
const fortuneCache = new Map();

async function generateFortune(profile, category) {
 const today = new Date().toISOString().split("T")[0];
 const cacheKey = `${profile?.full_name}_${profile?.birth_date}_${category.id}_${today}`;

 if (fortuneCache.has(cacheKey)) return fortuneCache.get(cacheKey);

 const CATEGORY_LABELS = {
   daily: "일일 운세 - 오늘의 업무 효율/집중력/인간관계 지수",
   monthly: "월간 운세 - 이번달 전체 에너지 흐름",
   love: "애정/궁합 운세 - 감성 지수/표현력/관계 회복 가능성",
   wealth: "재물/부자운 - 행운 지수/멘탈 에너지/안정감",
   career: "취업/합격운 - 업무 효율/집중력/리더십 잠재력",
   health: "건강운 - 회복력/멘탈 에너지/신체 안정감",
   growth: "발전 팁 - 강점 활용/약점 보완 전략",
   caution: "주의 사항 - 집중력 저하/멘탈 에너지 관리 팁",
   summary: "종합 운세 - 전체 에너지 균형 분석",
 };

  try {
    const now = new Date();
    const dateStr = now.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
    const timeStr = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `너는 'HADA' 앱의 AI 운명 분석 엔진(5대 운명학: 사주/명리학/자미두수/점성술/성명학)이다.

[입력 데이터 - 결정적 시드]
성명: ${profile?.full_name}
생년월일시: ${profile?.birth_date}
성별: ${profile?.gender}
위치: ${profile?.location}
현재 날짜: ${dateStr}
현재 시간: ${timeStr}

[분석 대상 카테고리]
${CATEGORY_LABELS[category.id]}

[출력 규칙 - 절대 준수]
1. **결정론적 결과**: 동일 입력 데이터 + 동일 카테고리 = 동일한 해석 + 행동 조언
2. **숙명론 금지**: "실패", "위험", "불행", "피할 수 없음" 절대 금지
3. **현대식 용어**: 
   - 업무 효율, 감성 지수, 멘탈 에너지, 집중력 지수, 행운 지수
   - 회복력, 리더십 잠재력, 창의력 스코어
4. **부정적 표현 → 행동 조언 변환**
   - ❌ "집중력이 흐릴 수 있다"
   - ✅ "잠시 눈 감고 심호흡 3회 추천" (구체적 액션)
5. **5대 운명학 근거 필수**
   - "사주의 [천간/지지] + 자미두수 [성명수] + [점성 배경]" 형태로 한 문장 명시
6. **친근한 존댓말**: 전문가 느낌보다는 가깝고 따뜻한 톤
7. **긍정 에너지**: 모든 조언은 사용자가 "오늘 할 수 있다"는 느낌으로 마무리

[JSON 출력 형식 - 정확 준수]
{
  "title": "카테고리명",
  "summary": "한 문장 요약 (30자 이내)",
  "energyLevel": 50~95 (숫자),
  "detailed": "자세한 해석 (150~200자, 2~3문장)",
  "actionTips": ["구체적 행동 조언 1", "구체적 행동 조언 2", "구체적 행동 조언 3"],
  "luckyColor": "#16진법색상코드",
  "fortuneSource": "사주 + 자미두수 + 점성 등 근거 한 문장"
}

[예시]
이름: 김혜선, 생년월일: 1985-07-15, 시간: 14:00
→ 요약: "집중력 맑음, 오후 3시간이 황금시간"
→ 행동: ["지금 중요한 일 시작하기", "물 한 컵 마시고 시작", "휴대폰 멀리 두기"]
→ 색상: "#FF6B6B" (활력 빨강)
→ 근거: "사주 천간 丙 + 자미두수 천기성 + 목성 상승 위치"`,
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

// ─── 상세 운세 리스트 아이템 ───────────────────────────────
function FortuneListItem({ category, onClick }) {
  const IconComponent = category.icon;
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(category)}
      className="w-full flex items-center gap-4 bg-white rounded-2xl px-4 py-3.5 border border-gray-100 shadow-sm hover:shadow-md transition-all"
    >
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${category.gradient} flex items-center justify-center flex-shrink-0`}>
        <IconComponent className="w-5 h-5 text-white" strokeWidth={1.5} />
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-bold text-gray-800">{category.title}</p>
        <p className="text-xs text-gray-400">{category.subtitle}</p>
      </div>
      <span className="text-gray-300 text-lg">›</span>
    </motion.button>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────
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

  // 오늘의 운세 미리보기 (요약 2줄) 자동 생성
  useEffect(() => {
    if (!profile) return;
    const today = new Date().toISOString().split("T")[0];
    const cacheKey = `dailyPreview_${profile.full_name}_${today}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) { setDailyFortunePreview(JSON.parse(cached)); return; }
    setLoadingDailyPreview(true);
    base44.integrations.Core.InvokeLLM({
      prompt: `사용자 ${profile.full_name}(${profile.birth_date})의 ${today} 오늘의 운세를 두 문장 이내로 따뜻하게 요약해줘. 긍정적이고 실천 가능한 톤으로. JSON: { "line1": "첫 번째 문장", "line2": "두 번째 문장" }`,
      response_json_schema: { type: "object", properties: { line1: { type: "string" }, line2: { type: "string" } } },
    }).then((res) => {
      setDailyFortunePreview(res);
      localStorage.setItem(cacheKey, JSON.stringify(res));
      setLoadingDailyPreview(false);
    }).catch(() => setLoadingDailyPreview(false));
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem("lastCharmDate");
    const cached = localStorage.getItem("cachedCharm");
    if (lastDate === today && cached) setDailyCharm(JSON.parse(cached));
    if (lastDate && lastDate !== today) {
      localStorage.removeItem("lastCharmDate");
      localStorage.removeItem("cachedCharm");
      setDailyCharm(null);
    }
  }, [profile]);

  // 부적 뽑기
  const handleCharmAdClose = async () => {
    setShowAdForCharm(false);
    setLoadingCharm(true);
    const charm = await generateAICharm(profile);
    localStorage.setItem("lastCharmDate", new Date().toDateString());
    localStorage.setItem("cachedCharm", JSON.stringify(charm));
    setDailyCharm(charm);
    setLoadingCharm(false);
    setRevealedCharm({ ...charm, emoji: getEmoji(charm.name) });
  };

  const handleSaveCharm = async () => {
    await base44.entities.CharmItem.create({
      ...revealedCharm,
      obtained_date: new Date().toISOString().split("T")[0],
    });
    queryClient.invalidateQueries({ queryKey: ["charms"] });
    setRevealedCharm(null);
  };

  // 운세 카테고리 클릭
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

   // 그림자 제거를 위한 전역 스타일 적용 (필요 시 global.css에 추가)
  // * { box-shadow: none !important; }

  return (
    <div className="min-h-screen bg-white pb-24">
      <AdModal visible={showAdForCharm} onClose={handleCharmAdClose} />
      <AdModal visible={showAdForFortune} onClose={handleFortuneAdClose} />
      <CharmReveal charm={revealedCharm} onSave={handleSaveCharm} onClose={() => setRevealedCharm(null)} />
      <FortuneResultModal
        result={fortuneResult}
        category={selectedCategory}
        onClose={() => { setFortuneResult(null); setSelectedCategory(null); }}
      />

      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-1">행운 상점</p>
        <h1 className="text-xl font-bold text-gray-900">운세 상점 ✨</h1>
        <p className="text-xs text-gray-500 mt-1">오늘 당신의 에너지에 맞는 물건을 가까이 두는 것만으로도, 행운을 모으는 힘을 만들 수 있어요.</p>
      </div>

      <div className="px-5 space-y-6">
        {/* 1. 새 부적 뽑기 */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowAdForCharm(true)}
          disabled={loadingCharm}
          className="relative w-full rounded-2xl p-6 text-white text-center disabled:opacity-50 overflow-hidden group"
          style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.85) 0%, rgba(249,115,22,0.75) 100%)' }}
        >
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <p className="text-base font-bold mb-1">행운 뽑기</p>

          </div>
        </motion.button>

        {/* 2. 오늘의 부적 */}
        {loadingCharm && (
          <div className="bg-gradient-to-br from-violet-300 to-pink-300 rounded-2xl p-6 text-white text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold opacity-90">운명 계산 중...</p>
          </div>
        )}
        {!loadingCharm && dailyCharm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative rounded-3xl p-8 text-white overflow-hidden group"
            style={{
              background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.75) 0%, rgba(196, 181, 253, 0.7) 100%)',
              boxShadow: '0 8px 24px rgba(167, 139, 250, 0.2)'
            }}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-20 overflow-hidden rounded-3xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
            </div>

            {/* Content */}
            <div className="relative z-10 space-y-3">
              <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">✨ 오늘의 행운템 ✨</p>

              <div className="flex items-center gap-4">
                <p className="text-5xl drop-shadow-xl">{getEmoji(dailyCharm.name)}</p>
                <div className="flex-1">
                  <p className="text-2xl font-black drop-shadow-lg">{dailyCharm.name}</p>
                </div>
              </div>

              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 space-y-2">
                <p className="text-xs font-bold text-purple-200 drop-shadow-lg">✦ {dailyCharm.effect}</p>
                <p className="text-[11px] opacity-90 leading-relaxed">{dailyCharm.description}</p>
              </div>

              <p className="text-[10px] opacity-60 italic text-center pt-2">{dailyCharm.source}</p>
            </div>
          </motion.div>
        )}

        {/* 운세 섹션 */}
        <div className="space-y-8">
          {/* 섹션 1: 오늘의 운세 */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-amber-400 rounded-full"></span>
              오늘의 운세
            </h3>
            {loadingFortune && (
              <div className="flex items-center justify-center py-8 gap-2 bg-gray-50 rounded-xl">
                <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                <p className="text-xs text-gray-500">운세 분석 중...</p>
              </div>
            )}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #FDE68A 0%, #FCD34D 100%)' }}
            >
              {/* 상단 헤더 */}
              <div className="px-5 py-4 flex items-center gap-3">
                <FORTUNE_DAILY.icon className="w-8 h-8 text-amber-600" strokeWidth={1.5} />
                <div className="text-left flex-1">
                  <p className="text-base font-bold text-amber-900">{FORTUNE_DAILY.title}</p>
                  <p className="text-xs text-amber-700/70">{FORTUNE_DAILY.subtitle}</p>
                </div>
              </div>
              {/* 미리보기 + 더 보기 버튼 */}
              <div className="bg-white border-t border-amber-100 px-5 py-4 space-y-3">
                {loadingDailyPreview ? (
                  <div className="flex items-center gap-2 py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <p className="text-xs text-gray-400">운세 요약 중...</p>
                  </div>
                ) : dailyFortunePreview ? (
                  <div className="space-y-1">
                    <p className="text-sm text-gray-700 leading-relaxed">☀️ {dailyFortunePreview.line1}</p>
                    <p className="text-sm text-gray-500 leading-relaxed">✨ {dailyFortunePreview.line2}</p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">오늘의 운세를 불러오는 중이에요...</p>
                )}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleCategoryClick(FORTUNE_DAILY)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-yellow-400 text-white text-sm font-bold transition-all hover:bg-yellow-500"
                  style={{ boxShadow: '0 2px 8px rgba(180,140,0,0.25)' }}
                >
                  <span>자세히 보기</span>
                  <ChevronRight className="w-4 h-4" strokeWidth={2} />
                </motion.button>
              </div>
            </div>
          </div>

          {/* 섹션 2: 상세 운세 (리스트) */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-purple-600 rounded-full"></span>
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
import { Preferences } from "@capacitor/preferences";
import { appParams } from "@/lib/app-params";
import { getFullDestinyData } from "@/components/services/calculator/destinyCalculator";

const { appId } = appParams;
const GEMINI_API_KEY =
    import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";

const getStoreKey = (entity) => `${appId}_entity_${entity}`;
const getGeneralKey = (key) => `${appId}_setting_${key}`;

const storageEngine = {
    get: async function(key, isEntity = true) {
        const finalKey = isEntity ? getStoreKey(key) : getGeneralKey(key);
        const { value } = await Preferences.get({ key: finalKey });
        return value ? JSON.parse(value) : isEntity ? [] : null;
    },
    set: async function(key, data, isEntity = true) {
        const finalKey = isEntity ? getStoreKey(key) : getGeneralKey(key);
        await Preferences.set({
            key: finalKey,
            value: JSON.stringify(data),
        });
    },
};

const createEntity = (name) => ({
    list: async function(sortParam, limit) {
        let all = await storageEngine.get(name);
        if (sortParam && typeof sortParam === "string") {
            const isDesc = sortParam.startsWith("-");
            const key = isDesc ? sortParam.substring(1) : sortParam;
            all.sort((a, b) => {
                const valA = a[key] || "";
                const valB = b[key] || "";
                if (valA < valB) return isDesc ? 1 : -1;
                if (valA > valB) return isDesc ? -1 : 1;
                return 0;
            });
        }
        if (limit) all = all.slice(0, limit);
        return all;
    },
    filter: async function(predicate) {
        const all = await storageEngine.get(name);
        return all.filter((item) =>
            Object.entries(predicate).every(([key, val]) => item[key] === val),
        );
    },
    create: async function(data) {
        const all = await storageEngine.get(name);
        const newItem = {
            ...data,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
        };
        await storageEngine.set(name, [...all, newItem]);
        return newItem;
    },
    update: async function(id, data) {
        const all = await storageEngine.get(name);
        let updatedItem = null;
        const updatedList = all.map((item) => {
            if (item.id === id) {
                updatedItem = {...item, ...data };
                return updatedItem;
            }
            return item;
        });
        await storageEngine.set(name, updatedList);
        return updatedItem;
    },
    delete: async function(id) {
        const all = await storageEngine.get(name);
        await storageEngine.set(
            name,
            all.filter((item) => item.id !== id),
        );
        return { success: true };
    },
});

// ══════════════════════════════════════════════════════════════════
// 변경 1: HADA 공통 시스템 프롬프트
// ══════════════════════════════════════════════════════════════════
const HADA_SYSTEM_PROMPT = `[HADA 앱 공통 규칙 — 모든 응답에 반드시 적용]
// 데이터 처리 규칙 

0. [시스템 데이터] 블록의 전문 용어(신약·억부법·
   자미두수 등)는 분석 근거로만 참조하고
   출력 문장에 절대 노출하지 마라.

1. 부정·공포 표현 절대 금지: "나쁨" "흉" "위험"
   "조심" "망함" "실패" → "조율이 필요한 에너지"
   "내실을 다지기 좋은 시기" 등으로 치환.
   
2. 전문 용어 절대 금지: 상관·편인·관살·충·형·파·해
   → 쉬운 현대어로만 작성.

3. 말투: 2인칭 대화체.
   (~하세요, ~해보세요, ~예요).

   "당신은 ~한 분이에요" 형식으로 직접 말 걸기.
   가능성 표현 사용: "~할 가능성이 높아요",
   "~에 강점이 있어요". 단정 표현 금지.

4. 필드별 최대 글자수:
   각 필드는 지시된 글자수 이내. 초과 시 요약.

   today_hint 30자 / welcome_title 20자 /
   card_body 80자 / actionTips 항목 25자.
   초과 시 요약.

5. 비교·경쟁 유발 금지: "남보다 뛰어난" "1등" 등
   비교 표현 금지.

6. 모든 약점·부족한 부분은 반드시
   "구체적 행동 조언"으로 전환.`;

// ══════════════════════════════════════════════════════════════════
// 변경 2: 프롬프트 유형 감지 + 유형별 생성 설정
// ══════════════════════════════════════════════════════════════════
function detectPromptType(prompt) {
    if (prompt.includes("오늘 하루 운세를 두 줄로 요약"))
        return "fortune_preview";
    if (prompt.includes("주간·월간·연간")) return "fortune_summary";
    if (prompt.includes("해당 카테고리만 집중")) return "fortune_detail";
    if (prompt.includes("행운 추천")) return "charm";
    if (prompt.includes("마이크로 액션 생성")) return "micro_action";
    if (prompt.includes("일일 리딩")) return "daily_reading";
    if (prompt.includes("행복 기록을 모아서")) return "happiness_summary";
    return "general";
}

const GENERATION_CONFIGS = {
    fortune_preview: { temperature: 0.8, maxOutputTokens: 8192 },
    fortune_summary: { temperature: 0.7, maxOutputTokens: 8192 },
    fortune_detail: { temperature: 0.75, maxOutputTokens: 8192 },
    charm: { temperature: 0.85, maxOutputTokens: 8192 },
    micro_action: { temperature: 0.7, maxOutputTokens: 8192 },
    daily_reading: { temperature: 0.6, maxOutputTokens: 8192 },
    happiness_summary: { temperature: 0.6, maxOutputTokens: 8192 },
    general: { temperature: 0.7, maxOutputTokens: 8192 },
};

// ══════════════════════════════════════════════════════════════════
// getFallbackData
// ══════════════════════════════════════════════════════════════════
const getFallbackData = (prompt) => {
    if (
        prompt.includes("행복 기록을 모아서") ||
        prompt.includes("행운 추천") ||
        prompt.includes("분석 카테고리")
    ) {
        return null;
    }
    if (prompt.includes("오늘 하루 운세를 두 줄로 요약")) {
        return {
            line1: "(가짜 데이터) line1",
            line2: "(가짜 데이터) line2",
        };
    }
    if (prompt.includes("엔진")) {
        return {
            mode_card: {
                suggested_mode: "restore",
                card_title: "(가짜 데이터) 오늘의 특별한 제안",
                card_body: "(가짜 데이터) 분석 결과, 현재 당신은 약간의 휴식이 행운을 불러올 기운입니다.",
            },
            base_stats: {
                work_efficiency: 100,
                creativity: 100,
                communication: 100,
                focus: 100,
                fortune: 100,
            },
            fortune_stats: {
                strengths: [
                    { name: "재물운", value: 90 },
                    { name: "성공운", value: 85 },
                ],
                weakness: { name: "건강 관리", value: 70 },
                potentials: [{ name: "인복", value: 95 }],
            },
            recommended_mode: "action",
            welcome_title: "(가짜 데이터) welcome_title",
            welcome_subtitle: "(가짜 데이터) welcome_subtitle",
            today_hint: "(가짜 데이터) today_hint",
        };
    }
    return null;
};

export const base44 = {
    storage: {
        get: async(key) => await storageEngine.get(key, false),
        set: async(key, val) => await storageEngine.set(key, val, false),
        remove: async(key) =>
            await Preferences.remove({ key: getGeneralKey(key) }),
        clear: async() => await Preferences.clear(),
    },
    entities: {
        UserProfile: createEntity("UserProfile"),
        DailyReading: createEntity("DailyReading"),
        MicroAction: createEntity("MicroAction"),
        Todo: createEntity("Todo"),
        ScheduleItem: createEntity("ScheduleItem"),
        HappinessRecord: createEntity("HappinessRecord"),
        CharmItem: createEntity("CharmItem"),

        // ── Goal 엔티티 ─────────────────────────────────────────
        // 저장 필드:
        //   id              : 자동 생성 UUID
        //   created_at      : 자동 생성
        //   user_profile_id : UserProfile.id (소유자)
        //   title           : 목표 제목 (10자 이내)
        //   description     : 목표 설명
        //   order           : 정렬 순서 (0 = 대표 목표)
        //   is_primary      : 대표 목표 여부 (profile.goal 호환용)
        //   is_completed    : 달성 여부
        //   completed_at    : 달성 일시 (선택)
        //   xp              : 이번 주 획득 경험치 (홈 화면 표시용)
        //   xp_reset_week   : 마지막 초기화 기준 주 식별자 "YYYY-WW"
        //                     (일요일 기준. 현재 주와 다르면 xp=0 으로 초기화)
        Goal: createEntity("Goal"),
    },

    integrations: {
        Core: {
            InvokeLLM: async function({ prompt, response_json_schema }) {
                if (!GEMINI_API_KEY) throw new Error("API Key 미설정");

                let finalPrompt = prompt;

                if (!prompt.includes("행복 기록을 모아서")) {
                    const profiles = await base44.entities.UserProfile.list(
                        "-created_at",
                        1,
                    );
                    const profile = profiles[0];

                    if (profile) {
                        const destinyData = getFullDestinyData(profile);
                        finalPrompt = `
                    [시스템 데이터: 아래 계산 결과를 바탕으로 분석하세요]
                    ${destinyData.summary_for_ai}

                    [사용자 요청]
                    ${prompt}`;
                    }
                }

                const promptType = detectPromptType(prompt);
                const genConfig =
                    GENERATION_CONFIGS[promptType] || GENERATION_CONFIGS.general;

                try {
                    const fullPrompt = `${HADA_SYSTEM_PROMPT}\n\n${finalPrompt}\n\n
                            [출력 규칙]
                            - 반드시 JSON만 반환한다
                            - 설명, 문장, 마크다운, 코드블록 절대 금지
                            - 모든 필드는 반드시 채운다
                            - 누락 금지`;

                    console.log(fullPrompt);
                    const response = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: fullPrompt }] }],
                                generationConfig: {
                                    response_mime_type: "application/json",
                                    responseSchema: response_json_schema,
                                    temperature: genConfig.temperature,
                                    maxOutputTokens: genConfig.maxOutputTokens,
                                },
                            }),
                        },
                    );

                    if (!response.ok) {
                        console.error("Gemini API 오류:", response.status);
                        return getFallbackData(prompt);
                    }

                    const result = await response.json();

                    if (!result.candidates || result.candidates.length === 0) {
                        console.error("AI 응답 없음, 기본 데이터 사용");
                        return getFallbackData(prompt);
                    }

                    const candidate = result.candidates[0];

                    if (candidate.finishReason === "SAFETY") {
                        console.error("안전 필터 차단, 기본 데이터 사용");
                        return getFallbackData(prompt);
                    }

                    const parts = candidate.content && candidate.content.parts;
                    const rawText = parts && parts[0] && parts[0].text;

                    if (!rawText) {
                        console.error("텍스트 없음, 기본 데이터 사용");
                        return getFallbackData(prompt);
                    }

                    try {
                        const cleaned = rawText
                            .replace(/```json\s*/gi, "")
                            .replace(/```\s*/g, "")
                            .trim();
                        console.log("llm 응답 :", cleaned);
                        return JSON.parse(cleaned);
                    } catch (parseError) {
                        console.error("JSON 파싱 실패 rawText:", rawText);
                        console.error("candidate 전체:", JSON.stringify(candidate));
                        return getFallbackData(prompt);
                    }
                } catch (e) {
                    console.error("LLM 호출 실패, 기본 데이터 사용:", e);
                    return getFallbackData(prompt);
                }
            },
        },
    },

    auth: {
        me: async function() {
            try {
                const profiles = await storageEngine.get("UserProfile");
                const profile = profiles[0] || { full_name: "로컬 사용자" };
                return {
                    ...profile,
                    id: profile.id || "local-admin-id",
                    role: "admin",
                };
            } catch (e) {
                return { id: "guest", full_name: "게스트", role: "user" };
            }
        },
        logout: function() {
            console.log("로컬 로그아웃 수행");
        },
    },
};

// ─── 일요일 기준 주 식별자 유틸 ──────────────────────────────────
// Goal.xp_reset_week 와 비교해 초기화 여부를 판단할 때 사용.
// import { getWeekKey } from "@/api/base44Client"; 로 불러와 쓰세요.
export function getWeekKey() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=일, 1=월 ... 6=토
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - dayOfWeek);
  const year = sunday.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekNum = Math.ceil(
    ((sunday - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7,
  );
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

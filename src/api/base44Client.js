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
// ──────────────────────────────────────────────────────────────────
// 모든 InvokeLLM 호출 시 사용자 프롬프트 앞에 자동으로 붙음.
// 각 페이지(Home, Shop 등)의 프롬프트에서 아래 규칙을 개별 기재할 필요 없음.
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
// ──────────────────────────────────────────────────────────────────
// 기존: 모든 호출 temperature 0.7 / maxOutputTokens 8192 고정.
// 개선: 짧은 응답(미리보기·한 줄)은 maxOutputTokens를 줄여 속도·비용 절감.
//       창의성이 필요한 운세는 temperature를 높임.
function detectPromptType(prompt) {
    if (prompt.includes("두 문장 이내로 따뜻하게 요약해줘"))
        return "fortune_preview";
    if (prompt.includes("주간·월간·연간")) return "fortune_summary";
    if (
        prompt.includes("월간 운세") ||
        (prompt.includes("월간") && prompt.length < 400)
    )
        return "monthly_fortune";
    if (
        prompt.includes("분석 카테고리") ||
        prompt.includes("오늘 하루 전체") ||
        prompt.includes("energyLevel")
    )
        return "fortune_detail";
    if (prompt.includes("지금 당장 구할 수 있는")) return "charm";
    if (
        prompt.includes("마이크로 액션 1단계로 바꾸") ||
        prompt.includes("micro_step")
    )
        return "convert_todo";
    if (prompt.includes("마이크로 액션 생성") || prompt.includes("stat_focus"))
        return "micro_action";
    if (prompt.includes("일일 리딩") || prompt.includes("today_hint"))
        return "daily_reading";
    if (prompt.includes("온보딩") || prompt.includes("6가지 학문"))
        return "onboarding";
    return "general";
}

const GENERATION_CONFIGS = {
    fortune_preview: { temperature: 0.8, maxOutputTokens: 256 },
    monthly_fortune: { temperature: 0.8, maxOutputTokens: 256 },
    fortune_summary: { temperature: 0.7, maxOutputTokens: 4096 },
    fortune_detail: { temperature: 0.75, maxOutputTokens: 2048 },
    charm: { temperature: 0.85, maxOutputTokens: 512 },
    convert_todo: { temperature: 0.5, maxOutputTokens: 512 },
    micro_action: { temperature: 0.7, maxOutputTokens: 2048 },
    daily_reading: { temperature: 0.6, maxOutputTokens: 2048 },
    onboarding: { temperature: 0.5, maxOutputTokens: 8192 },
    general: { temperature: 0.7, maxOutputTokens: 8192 },
};

// ══════════════════════════════════════════════════════════════════
// getFallbackData: 원본 그대로 유지
// ══════════════════════════════════════════════════════════════════
const getFallbackData = (prompt) => {
    // ── 오늘의 운세 미리보기 ──
    if (prompt.includes("두 문장 이내로 따뜻하게 요약해줘")) {
        return {
            line1: "(가짜 데이터) 오늘은 주변 사람들과의 조화가 빛나는 날입니다.",
            line2: "(가짜 데이터) 작은 배려가 예상치 못한 행운의 소식으로 돌아올 거예요.",
        };
    }

    // ── summary 주간/월간/연간 운세 ──
    if (prompt.includes("주간·월간·연간")) {
        return {
            summary: "(가짜 데이터) 이번 주·달·해를 아우르는 안정적인 흐름이 이어집니다.",
            detailed: "(가짜 데이터) 전반적으로 균형 잡힌 에너지가 흐르고 있습니다. 지금은 새로운 도전보다 현재의 관계와 기반을 다지는 시기입니다.",
            weekly: {
                summary: "(가짜 데이터) 이번 주는 새로운 시작에 좋은 기운이 흐릅니다.",
                actionTips: [
                    "(가짜 데이터) 중요한 약속은 수요일 전에 잡기",
                    "(가짜 데이터) 매일 10분 독서로 집중력 키우기",
                ],
            },
            monthly: {
                summary: "(가짜 데이터) 이번 달은 관계 회복과 재정 정리에 집중하세요.",
                actionTips: [
                    "(가짜 데이터) 불필요한 지출 점검하기",
                    "(가짜 데이터) 가까운 사람과 솔직한 대화 늘리기",
                ],
            },
            yearly: {
                summary: "(가짜 데이터) 올해는 변화보다 내실을 다지는 해입니다.",
                actionTips: [
                    "(가짜 데이터) 연간 목표를 글로 써서 눈에 띄는 곳에 붙이기",
                    "(가짜 데이터) 상반기 안에 건강 검진 예약하기",
                ],
            },
        };
    }

    // ── daily / love / wealth / career / health 오늘 운세 ──
    if (
        prompt.includes("오늘의 운세") ||
        prompt.includes("애정운") ||
        prompt.includes("재물운") ||
        prompt.includes("취업운") ||
        prompt.includes("건강운") ||
        prompt.includes("오늘 하루 전체") ||
        prompt.includes("분석 카테고리")
    ) {
        const isDaily = prompt.includes("행운 색상");
        return {
            title: "(가짜 데이터) 오늘의 에너지 안정적",
            summary: "(가짜 데이터) 에너지 흐름이 고르게 유지되고 있습니다.",
            energyLevel: 70,
            detailed: "(가짜 데이터) 오늘 관련 에너지가 안정적입니다. 멘탈 에너지도 좋으니 집중력을 활용해보세요.",
            actionTips: [
                "(가짜 데이터) 책상에 물 한 잔 두기",
                "(가짜 데이터) 3분간 창밖 바라보기",
                "(가짜 데이터) 깊게 숨 5회 들이쉬기",
            ],
            ...(isDaily ? { luckyColor: "#F59E0B", aiLuckyColor: "#F59E0B" } : {}),
        };
    }

    // ── 부적 / 온보딩 분석 ──
    if (prompt.includes("엔진")) {
        return {
            mode_card: {
                suggested_mode: "restore",
                card_title: "(가짜 데이터) 오늘의 특별한 제안",
                card_body: "(가짜 데이터) 분석 결과, 현재 당신은 약간의 휴식이 행운을 불러올 기운입니다.",
            },
            name: "(가짜 데이터) 은색 볼펜",
            description: "(가짜 데이터) 중요한 결정을 내리거나 메모를 할 때 이 펜을 사용하세요. 차가운 금속의 기운이 판단력을 날카롭게 세워줄 것입니다.",
            effect: "(가짜 데이터) 집중력 향상 및 논리적 사고 강화",
            source: "(가짜 데이터) 사주 천간 庚(경금) 기운 보완 분석",
            header_text: " (가짜 데이터)작은 기쁨들이 모여 당신의 결을 만들고 있어요.",
            encouragement: "(가짜 데이터) 일상의 소중함을 발견할 줄 아는 당신은 지금도 충분히 잘하고 있습니다.",
            title: "(가짜 데이터) 오늘의 분석 결과",
            summary: "(가짜 데이터) 역동적이고 활기찬 에너지의 흐름",
            energyLevel: 88,
            detailed: "(가짜 데이터) 현재 목(木)의 성장 에너지와 만나 매우 역동적입니다. 평소 미뤄두었던 과제를 해결하기에 가장 적합한 시기입니다.",
            actionTips: [
                "(가짜 데이터) 중요 업무는 오후 2시 전 처리",
                "(가짜 데이터) 초록색 소품 곁에 두기",
                "(가짜 데이터) 따뜻한 인사 건네기",
            ],
            luckyColor: "#10B981",
            analysis_data: {
                sasoo: "(가짜 데이터) 따뜻한 봄날의 햇살 같은 기운을 타고나셨습니다.",
                myungri: "(가짜 데이터) 목(木)의 기운이 강하여 성장이 빠르고 유연합니다.",
                jamidusoo: "(가짜 데이터) 천부성이 명궁에 있어 안정적인 삶의 기반을 가집니다.",
                astrology_명식: "(가짜 데이터) 목성과 금성이 조화로운 위치에 있습니다.",
                western_astrology: "(가짜 데이터) 태양 사자자리, 달 사수자리의 열정적인 조합입니다.",
                seongmyung: "(가짜 데이터) 이름의 기운이 조화로워 대인 관계가 원만합니다.",
                overall_insight: "(가짜 데이터) 전반적으로 에너지가 넘치며 새로운 시작에 최적화된 기운입니다.",
            },
            base_stats: {
                work_efficiency: 100,
                creativity: 100,
                communication: 100,
                focus: 100,
                fortune: 100,
            },
            traits: {
                strengths: [
                    "(가짜 데이터) 빠른 실행력",
                    "(가짜 데이터) 창의적 사고",
                    "(가짜 데이터) 긍정적인 에너지",
                ],
                weaknesses: ["(가짜 데이터) 쉽게 질림", "(가짜 데이터) 디테일 부족"],
                potentials: ["(가짜 데이터) 예술적 재능", "(가짜 데이터) 리더십"],
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
            welcome_title: "(가짜 데이터) 환영합니다! 운명이 당신을 돕고 있습니다.",
            welcome_subtitle: "(가짜 데이터) 오늘부터 HADA와 함께 행운을 쌓아보세요.",
            today_hint: "(가짜 데이터) 자신감을 갖고 도전하세요!",
            cards: [{
                    keyword: "명상",
                    micro_action: "(가짜 데이터) 1분간의 정적 명상하기",
                    how: "(가짜 데이터) 의자에 등을 곧게 펴고 앉아 눈을 부드럽게 감으세요. 코로 들어오는 시원한 공기와 입으로 나가는 따뜻한 숨의 감각에만 온전히 집중하며 10회 반복합니다.",
                    fortune: "(가짜 데이터) 정적인 명상을 통해 차분한 수(水)의 기운을 보충하면 오늘 하루 업무 효율이 비약적으로 상승하게 될 것입니다.",
                    stat_focus: "work_efficiency",
                    level: 1,
                },
                {
                    keyword: "스트레칭",
                    micro_action: "(가짜 데이터) 전신 에너지 순환 스트레칭",
                    how: "(가짜 데이터) 자리에서 일어나 양발을 어깨너비로 벌리고 양팔을 하늘 높이 쭉 뻗으세요. 손가락 끝까지 힘을 주어 7초간 유지한 뒤, 상체를 좌우로 천천히 굽히세요.",
                    fortune: "(가짜 데이터) 몸을 크게 움직여 목(木)의 성장 에너지를 깨우면 창의적인 아이디어가 샘솟을 수 있습니다.",
                    stat_focus: "creativity",
                    level: 1,
                },
                {
                    keyword: "정리",
                    micro_action: "(가짜 데이터) 책상 위 불필요한 물건 치우기",
                    how: "(가짜 데이터) 지금 당장 눈앞에 보이는 영수증, 다 쓴 종이컵, 혹은 흩어진 서류 중 딱 하나만 골라 제자리에 두세요.",
                    fortune: "(가짜 데이터) 금(金)의 절제된 기운을 활용해 주변을 정돈하면 막혀있던 금전운의 흐름이 트입니다.",
                    stat_focus: "communication",
                    level: 1,
                },
                {
                    keyword: "아이디어",
                    micro_action: "(가짜 데이터) 한 줄 메모 작성하기",
                    how: "(가짜 데이터) 스마트폰 메모장이나 포스트잇을 꺼내세요. 지금 머릿속을 스쳐 지나가는 짧은 생각이나 기분을 단 한 문장으로 솔직하게 적어보세요.",
                    fortune: "(가짜 데이터) 타오르는 불꽃 같은 아이디어를 기록으로 남겨두면 커다란 재물운의 씨앗이 됩니다.",
                    stat_focus: "fortune",
                    level: 1,
                },
                {
                    keyword: "미소",
                    micro_action: "(가짜 데이터) 거울 보며 미소 짓기",
                    how: "(가짜 데이터) 가까운 거울이나 스마트폰 전면 카메라를 보세요. 나 자신의 눈을 3초 동안 지긋이 바라본 뒤, 입꼬리를 최대한 높이 올려 환하게 웃어주세요.",
                    fortune: "(가짜 데이터) 토(土)의 포용력을 담은 미소는 주변 사람들의 마음을 움직여 귀인을 끌어당기는 가장 강력한 부적이 됩니다.",
                    stat_focus: "communication",
                    level: 1,
                },
            ],
        };
    }

    // 기본 fallback
    return {
        welcome_title: "오늘도 멋진 하루입니다!",
        welcome_subtitle: "작은 실천이 큰 변화를 만듭니다.",
        today_hint: "지금 바로 시작해보세요.",
        mode_card: {
            suggested_mode: "action",
            card_title: "액션 모드 추천",
            card_body: "지금 바로 에너지를 발산해보세요.",
        },
    };
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
    },

    integrations: {
        Core: {
            InvokeLLM: async function({ prompt, response_json_schema }) {
                if (!GEMINI_API_KEY) throw new Error("API Key 미설정");

                let finalPrompt = prompt;

                if (!prompt.includes("한 줄로 요약하는 엔진")) {
                    // 1. 현재 사용자 프로필 가져오기 (가장 최근 것)
                    const profiles = await base44.entities.UserProfile.list(
                        "-created_at",
                        1,
                    );
                    const profile = profiles[0];

                    // 2. 만약 프로필이 있다면, 로컬 계산기 데이터를 프롬프트 상단에 강제 주입
                    if (profile) {
                        const destinyData = getFullDestinyData(profile);
                        finalPrompt = `
                    [시스템 데이터: 아래 계산 결과를 바탕으로 분석하세요]
                    ${destinyData.summary_for_ai}

                    [사용자 요청]
                    ${prompt}`;
                    }
                }
                // 변경 2: 유형 감지 → 설정 선택
                const promptType = detectPromptType(prompt);
                const genConfig =
                    GENERATION_CONFIGS[promptType] || GENERATION_CONFIGS.general;

                try {
                    // 변경 1: 공통 규칙 prepend
                    // 변경 3: JSON 스키마를 텍스트로 붙이던 방식 제거
                    const fullPrompt = `${HADA_SYSTEM_PROMPT}\n\n${finalPrompt}\n\n반드시 순수한 JSON만 반환하고, 마크다운 코드블록이나 다른 텍스트는 포함하지 마세요.`;

                    const response = await fetch(
                        `generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: fullPrompt }] }],
                                generationConfig: {
                                    response_mime_type: "application/json",
                                    responseSchema: response_json_schema, // 변경 3: 파라미터로 분리 전달
                                    temperature: genConfig.temperature, // 변경 2
                                    maxOutputTokens: genConfig.maxOutputTokens, // 변경 2
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
                        return JSON.parse(cleaned);
                    } catch (parseError) {
                        console.error("JSON 파싱 실패, 기본 데이터 사용:", rawText);
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
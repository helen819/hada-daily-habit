import { Preferences } from "@capacitor/preferences";
import { appParams } from "@/lib/app-params";

const { appId } = appParams;
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";

const getStoreKey = (entity) => `${appId}_entity_${entity}`;
// 범용 키 생성 (entity와 겹치지 않게 하기 위함)
const getGeneralKey = (key) => `${appId}_setting_${key}`;

// 로컬 저장소 엔진
const storageEngine = {
  get: async function (key, isEntity = true) {
    const finalKey = isEntity ? getStoreKey(key) : getGeneralKey(key);
    const { value } = await Preferences.get({ key: finalKey });
    return value ? JSON.parse(value) : isEntity ? [] : null;
  },
  set: async function (key, data, isEntity = true) {
    const finalKey = isEntity ? getStoreKey(key) : getGeneralKey(key);
    await Preferences.set({
      key: finalKey,
      value: JSON.stringify(data),
    });
  },
};

const createEntity = (name) => ({
  list: async function (sortParam, limit) {
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
  filter: async function (predicate) {
    const all = await storageEngine.get(name);
    return all.filter((item) =>
      Object.entries(predicate).every(([key, val]) => item[key] === val),
    );
  },
  create: async function (data) {
    const all = await storageEngine.get(name);
    const newItem = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    await storageEngine.set(name, [...all, newItem]);
    return newItem;
  },
  update: async function (id, data) {
    const all = await storageEngine.get(name);
    let updatedItem = null;
    const updatedList = all.map((item) => {
      if (item.id === id) {
        updatedItem = { ...item, ...data };
        return updatedItem;
      }
      return item;
    });
    await storageEngine.set(name, updatedList);
    return updatedItem;
  },
  delete: async function (id) {
    const all = await storageEngine.get(name);
    await storageEngine.set(
      name,
      all.filter((item) => item.id !== id),
    );
    return { success: true };
  },
});

export const base44 = {
  // --- [추가] 범용 저장소 (localStorage 대체용) ---
  storage: {
    get: async (key) => await storageEngine.get(key, false),
    set: async (key, val) => await storageEngine.set(key, val, false),
    remove: async (key) =>
      await Preferences.remove({ key: getGeneralKey(key) }),
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
      InvokeLLM: async function ({ prompt, response_json_schema }) {
        // if (!GEMINI_API_KEY) throw new Error("API Key 미설정");
        // try {
        //   const fullPrompt = `${prompt}\n\n결과는 반드시 다음 JSON 형식을 따라야 합니다: ${JSON.stringify(response_json_schema)}`;
        //   const response = await fetch(
        //     `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        //     {
        //       method: "POST",
        //       headers: { "Content-Type": "application/json" },
        //       body: JSON.stringify({
        //         contents: [{ parts: [{ text: fullPrompt }] }],
        //         generationConfig: { response_mime_type: "application/json" },
        //       }),
        //     },
        //   );
        //   const result = await response.json();

        //   if (!result.candidates || result.candidates.length === 0) {
        //     throw new Error("AI 응답이 없습니다.");
        //   }

        console.log("--- AI 호출 차단 모드 작동 중 ---");
        console.log("요청된 프롬프트:", prompt);

        // 1초 정도 로딩 효과를 주기 위해 지연시간 추가
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 온보딩 분석 요청일 경우 반환할 가짜 데이터
        if (prompt.includes("엔진")) {
          return {
            analysis_data: {
              sasoo: "따뜻한 봄날의 햇살 같은 기운을 타고나셨습니다.",
              myungri: "목(木)의 기운이 강하여 성장이 빠르고 유연합니다.",
              jamidusoo: "천부성이 명궁에 있어 안정적인 삶의 기반을 가집니다.",
              astrology_명식: "목성과 금성이 조화로운 위치에 있습니다.",
              western_astrology:
                "태양 사자자리, 달 사수자리의 열정적인 조합입니다.",
              seongmyung: "이름의 기운이 조화로워 대인 관계가 원만합니다.",
              overall_insight:
                "전반적으로 에너지가 넘치며 새로운 시작에 최적화된 기운입니다.",
            },
            base_stats: {
              work_efficiency: 85,
              creativity: 92,
              communication: 78,
              focus: 80,
              fortune: 88,
            },
            traits: {
              strengths: ["빠른 실행력", "창의적 사고", "긍정적인 에너지"],
              weaknesses: ["쉽게 질림", "디테일 부족"],
              potentials: ["예술적 재능", "리더십"],
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
            welcome_title:
              "환영합니다! 운명이 당신을 돕고 있습니다. (적어도 다 눈에 보여야 하니까 이렇게 길게 만들어서 잘 나오는지 확인하는게 맞겠죠)",
            welcome_subtitle:
              "오늘부터 HADA와 함께 행운을 쌓아보세요. (AI한테 아무리 글자수 제한을 줘도 자기 맘대로 길게 여러문장 출력합니다)",
            today_hint:
              "자신감을 갖고 도전하세요! (가짜로 넣은 데이터인데 길어지면 어떻게 표시되는지 알고 싶습니다)",
            cards: [
              {
                keyword: "명상",
                micro_action:
                  "복잡한 생각을 잠재우고 내면의 소리에 귀를 기울이는 1분간의 정적 명상하기",
                how: "의자에 등을 곧게 펴고 앉아 눈을 부드럽게 감으세요. 코로 들어오는 시원한 공기와 입으로 나가는 따뜻한 숨의 감각에만 온전히 집중하며 10회 반복합니다.",
                fortune:
                  "현재 당신의 사주 기운이 다소 들떠 있는 상태입니다. 정적인 명상을 통해 차분한 수(水)의 기운을 보충하면 오늘 하루 업무 효율이 비약적으로 상승하게 될 것입니다.",
                stat_focus: "work_efficiency",
                level: 1,
              },
              {
                keyword: "스트레칭",
                micro_action:
                  "경직된 근육을 이완시키고 전신의 에너지를 순환시키는 고강도 기지개 켜기",
                how: "자리에서 일어나 양발을 어깨너비로 벌리고 양팔을 하늘 높이 쭉 뻗으세요. 손가락 끝까지 힘을 주어 7초간 유지한 뒤, 상체를 좌우로 천천히 굽히며 옆구리 근육을 자극하세요.",
                fortune:
                  "오전 시간대의 정체된 기운을 몰아내야 하는 시점입니다. 몸을 크게 움직여 목(木)의 성장 에너지를 깨우면 창의적인 아이디어가 샘솟고 예상치 못한 행운의 소식이 들려올 수 있습니다.",
                stat_focus: "creativity",
                level: 1,
              },
              {
                keyword: "정리",
                micro_action:
                  "주변 환경을 정돈하여 맑은 행운의 통로를 만드는 책상 위 불필요한 물건 치우기",
                how: "지금 당장 눈앞에 보이는 영수증, 다 쓴 종이컵, 혹은 흩어진 서류 중 딱 하나만 골라 쓰레기통에 버리거나 제자리에 두세요. 작은 빈 공간이 행운이 들어올 자리가 됩니다.",
                fortune:
                  "운명학적으로 주변의 무질서는 마음의 혼란을 야기합니다. 금(金)의 절제된 기운을 활용해 주변을 정돈하면 막혀있던 금전운의 흐름이 트이고 대인 관계에서의 오해가 풀리는 마법이 일어납니다.",
                stat_focus: "communication",
                level: 1,
              },
              {
                keyword: "아이디어",
                micro_action:
                  "무의식 속에 잠자고 있는 보석 같은 영감을 포착하여 기록하는 한 줄 메모 작성하기",
                how: "스마트폰 메모장이나 근처에 있는 포스트잇을 꺼내세요. 거창한 목표가 아니어도 좋습니다. 지금 머릿속을 스쳐 지나가는 짧은 생각이나 기분을 단 한 문장으로 솔직하게 적어보세요.",
                fortune:
                  "당신은 현재 화(火)의 열정이 가득한 시기를 지나고 있습니다. 타오르는 불꽃 같은 아이디어를 기록으로 남겨두면 나중에 이것이 커다란 재물운의 씨앗이 되어 돌아올 것임을 명심하세요.",
                stat_focus: "fortune",
                level: 1,
              },
              {
                keyword: "미소",
                micro_action:
                  "거울 속에 비친 소중한 나 자신과 눈을 맞추며 가장 밝고 따뜻한 미소 지어주기",
                how: "가까운 거울이나 스마트폰 전면 카메라를 보세요. 나 자신의 눈을 3초 동안 지긋이 바라본 뒤, 입꼬리를 최대한 높이 올려 환하게 웃어주세요. '오늘도 잘 부탁해'라고 속으로 속삭입니다.",
                fortune:
                  "웃는 얼굴은 만복의 근원이라는 말은 과학적인 동시에 명리학적인 진리입니다. 토(土)의 포용력을 담은 미소는 주변 사람들의 마음을 움직여 당신을 돕는 귀인을 끌어당기는 가장 강력한 부적이 됩니다.",
                stat_focus: "communication",
                level: 1,
              },
            ],
          };
        }

        // 그 외 일일 리딩이나 마이크로 액션 요청일 경우
        return {
          welcome_title: "오늘도 멋진 하루입니다!",
          welcome_subtitle: "작은 실천이 큰 변화를 만듭니다.",
          today_hint: "지금 바로 시작해보세요.",
          mode_card: {
            suggested_mode: "action",
            card_title: "액션 모드 추천",
            card_body: "지금 바로 에너지를 발산해보세요.",
            cta_primary: "확인",
            cta_secondary: "나중에",
          },
        };
      },
    },
  },

  auth: {
    me: async function () {
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
    logout: function () {
      console.log("로컬 로그아웃 수행");
    },
  },
};

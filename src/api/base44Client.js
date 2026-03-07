import { Preferences } from "@capacitor/preferences";
import { appParams } from "@/lib/app-params";

const { appId } = appParams;
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";

const getStoreKey = (entity) => `${appId}_entity_${entity}`;

// 로컬 저장소 엔진 (표준 함수 선언 방식으로 변경)
const storage = {
  get: async function (entity) {
    const { value } = await Preferences.get({ key: getStoreKey(entity) });
    return value ? JSON.parse(value) : [];
  },
  set: async function (entity, data) {
    await Preferences.set({
      key: getStoreKey(entity),
      value: JSON.stringify(data),
    });
  },
};

const createEntity = (name) => ({
  list: async function (sortParam, limit) {
    let all = await storage.get(name);
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
    const all = await storage.get(name);
    return all.filter((item) =>
      Object.entries(predicate).every(([key, val]) => item[key] === val),
    );
  },
  create: async function (data) {
    const all = await storage.get(name);
    const newItem = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    await storage.set(name, [...all, newItem]);
    return newItem;
  },
  update: async function (id, data) {
    const all = await storage.get(name);
    let updatedItem = null;
    const updatedList = all.map((item) => {
      if (item.id === id) {
        updatedItem = { ...item, ...data };
        return updatedItem;
      }
      return item;
    });
    await storage.set(name, updatedList);
    return updatedItem;
  },
  delete: async function (id) {
    const all = await storage.get(name);
    await storage.set(
      name,
      all.filter((item) => item.id !== id),
    );
    return { success: true };
  },
});

export const base44 = {
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
        if (!GEMINI_API_KEY) throw new Error("API Key 미설정");
        try {
          const fullPrompt = `${prompt}\n\n결과는 반드시 다음 JSON 형식을 따라야 합니다: ${JSON.stringify(response_json_schema)}`;
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: fullPrompt }] }],
                generationConfig: { response_mime_type: "application/json" },
              }),
            },
          );
          const result = await response.json();

          if (!result.candidates || result.candidates.length === 0) {
            throw new Error("AI 응답이 없습니다.");
          }

          const textContent = result.candidates[0].content.parts[0].text;
          return JSON.parse(textContent);
        } catch (error) {
          console.error("AI 호출 에러:", error);
          throw error;
        }
      },
    },
  },

  auth: {
    me: async function () {
      try {
        const profiles = await storage.get("UserProfile");
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

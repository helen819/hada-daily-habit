/**
 * base44CompatAdapter.js
 * Base44 entities API와 동일한 인터페이스를 제공하지만,
 * 내부적으로는 HADA의 fileSystem(localStorage)을 사용한다.
 *
 * [사용법]
 * hada-daily-habit (vanilla JS 앱)에서:
 *   import { hadaEntities } from '../hada/integrations/base44CompatAdapter.js';
 * 
 * 그 다음 base44WithHada.js에서:
 *   export const base44WithHada = { ...base44, entities: hadaEntities };
 *
 * 이렇게 하면 UI 코드 변경 없이 HADA 로컬 스토리지 로직을 사용할 수 있다.
 */

import { fileSystem } from "@/components/storage";

// ─── 스토리지 경로 상수 ────────────────────────────────────────────────────────
const FILES = {
  profile:        "profile/user",
  todos:          "todos/list",
  happinessList:  "happiness/list",
  calendarEvents: "calendar/events",
  charmItems:     "charm/items",
  dailyLog:       (date) => `dailyLog/${date}`,
  microActions:   (date) => `microActions/${date}`,
};

// ─── 유틸 ─────────────────────────────────────────────────────────────────────
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function withMeta(data) {
  return { ...data, id: data.id || generateId(), created_date: new Date().toISOString() };
}

// ─── UserProfile ──────────────────────────────────────────────────────────────
const UserProfile = {
  async list() {
    const profile = fileSystem.read(FILES.profile);
    return profile ? [profile] : [];
  },

  async create(data) {
    const profile = withMeta(data);
    fileSystem.write(FILES.profile, profile);
    return profile;
  },

  async update(id, data) {
    const profile = fileSystem.read(FILES.profile) || {};
    const updated = { ...profile, ...data, id };
    fileSystem.write(FILES.profile, updated);
    return updated;
  },
};

// ─── DailyReading ─────────────────────────────────────────────────────────────
const DailyReading = {
  async filter({ date } = {}) {
    const d = date || today();
    const log = fileSystem.read(FILES.dailyLog(d));
    return log ? [log] : [];
  },

  async create(data) {
    const d = data.date || today();
    const record = withMeta(data);
    fileSystem.write(FILES.dailyLog(d), record);
    return record;
  },

  async list() {
    // 최근 30일 로그 수집
    const results = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const log = fileSystem.read(FILES.dailyLog(dateStr));
      if (log) results.push(log);
    }
    return results;
  },
};

// ─── MicroAction ──────────────────────────────────────────────────────────────
const MicroAction = {
  async filter({ date } = {}) {
    const d = date || today();
    return fileSystem.read(FILES.microActions(d)) || [];
  },

  async list() {
    return fileSystem.read(FILES.microActions(today())) || [];
  },

  async create(data) {
    const d = data.date || today();
    const existing = fileSystem.read(FILES.microActions(d)) || [];
    const record = withMeta(data);
    fileSystem.write(FILES.microActions(d), [...existing, record]);
    return record;
  },

  async update(id, data) {
    const d = data.date || today();
    const actions = fileSystem.read(FILES.microActions(d)) || [];
    const updated = actions.map(a => a.id === id ? { ...a, ...data } : a);
    fileSystem.write(FILES.microActions(d), updated);
    return updated.find(a => a.id === id);
  },
};

// ─── Todo ─────────────────────────────────────────────────────────────────────
const Todo = {
  async list(sortBy, limit) {
    const todos = fileSystem.read(FILES.todos) || [];
    return limit ? todos.slice(0, limit) : todos;
  },

  async filter(query = {}) {
    const todos = fileSystem.read(FILES.todos) || [];
    return todos.filter(t =>
      Object.entries(query).every(([k, v]) => t[k] === v)
    );
  },

  async create(data) {
    const todos = fileSystem.read(FILES.todos) || [];
    const record = withMeta(data);
    fileSystem.write(FILES.todos, [record, ...todos]);
    return record;
  },

  async update(id, data) {
    const todos = fileSystem.read(FILES.todos) || [];
    const updated = todos.map(t => t.id === id ? { ...t, ...data } : t);
    fileSystem.write(FILES.todos, updated);
    return updated.find(t => t.id === id);
  },

  async delete(id) {
    const todos = fileSystem.read(FILES.todos) || [];
    fileSystem.write(FILES.todos, todos.filter(t => t.id !== id));
  },
};

// ─── ScheduleItem ─────────────────────────────────────────────────────────────
const ScheduleItem = {
  async list() {
    return fileSystem.read(FILES.calendarEvents) || [];
  },

  async filter(query = {}) {
    const items = fileSystem.read(FILES.calendarEvents) || [];
    return items.filter(i =>
      Object.entries(query).every(([k, v]) => i[k] === v)
    );
  },

  async create(data) {
    const items = fileSystem.read(FILES.calendarEvents) || [];
    const record = withMeta(data);
    fileSystem.write(FILES.calendarEvents, [...items, record]);
    return record;
  },

  async update(id, data) {
    const items = fileSystem.read(FILES.calendarEvents) || [];
    const updated = items.map(i => i.id === id ? { ...i, ...data } : i);
    fileSystem.write(FILES.calendarEvents, updated);
    return updated.find(i => i.id === id);
  },

  async delete(id) {
    const items = fileSystem.read(FILES.calendarEvents) || [];
    fileSystem.write(FILES.calendarEvents, items.filter(i => i.id !== id));
  },
};

// ─── HappinessRecord ──────────────────────────────────────────────────────────
const HappinessRecord = {
  async list(sortBy, limit) {
    const list = fileSystem.read(FILES.happinessList) || [];
    return limit ? list.slice(0, limit) : list;
  },

  async filter(query = {}) {
    const list = fileSystem.read(FILES.happinessList) || [];
    return list.filter(r =>
      Object.entries(query).every(([k, v]) => r[k] === v)
    );
  },

  async create(data) {
    const list = fileSystem.read(FILES.happinessList) || [];
    const record = withMeta(data);
    fileSystem.write(FILES.happinessList, [record, ...list]);
    return record;
  },

  async delete(id) {
    const list = fileSystem.read(FILES.happinessList) || [];
    fileSystem.write(FILES.happinessList, list.filter(r => r.id !== id));
  },
};

// ─── CharmItem ────────────────────────────────────────────────────────────────
const CharmItem = {
  async list() {
    return fileSystem.read(FILES.charmItems) || [];
  },

  async create(data) {
    const items = fileSystem.read(FILES.charmItems) || [];
    const record = withMeta(data);
    fileSystem.write(FILES.charmItems, [...items, record]);
    return record;
  },

  async delete(id) {
    const items = fileSystem.read(FILES.charmItems) || [];
    fileSystem.write(FILES.charmItems, items.filter(i => i.id !== id));
  },
};

// ─── 내보내기 ──────────────────────────────────────────────────────────────────

/**
 * base44.entities 를 대체하는 HADA 로컬 스토리지 엔티티 맵
 */
export const hadaEntities = {
  UserProfile,
  DailyReading,
  MicroAction,
  Todo,
  ScheduleItem,
  HappinessRecord,
  CharmItem,
};

/**
 * 온보딩 완료 여부
 * profile이 존재하고 onboarding_complete === true 이면 true
 * @returns {boolean}
 */
export function hasOnboardingCompleted() {
  const profile = fileSystem.read(FILES.profile);
  return !!(profile?.onboarding_complete);
}

export default hadaEntities;
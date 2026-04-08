/**
 * HADA 앱 해금 기능 중앙 설정 파일
 * 이 파일 하나에서 모든 레벨별 해금 기능을 관리합니다.
 *
 * 주 기준: 일요일 시작
 */

// ─── 해금 정의 ─────────────────────────────────────────────────────
// 각 항목은 레벨 오름차순으로 정렬
export const UNLOCK_TABLE = [
  {
    level: 2,
    key: "charm_pick",
    label: "행운 뽑기 1회",
    description: "하루 최대 1회 행운 뽑기 가능",
  },
  {
    level: 3,
    key: "charm_pick",
    label: "행운 뽑기 +1회",
    description: "하루 최대 2회 행운 뽑기 가능",
  },
  {
    level: 5,
    key: "goal_analysis",
    label: "HADA 분석 받기 1회",
    description: "주 1회 목표 HADA 분석 가능",
  },
  {
    level: 8,
    key: "charm_pick",
    label: "행운 뽑기 +1회",
    description: "하루 최대 3회 행운 뽑기 가능",
  },
  {
    level: 13,
    key: "goal_slot",
    label: "목표 슬롯 +1개",
    description: "최대 2개 목표 관리 가능",
  },
  {
    level: 15,
    key: "happiness_vault",
    label: "행복 보관함 열람",
    description: "모든 행복 기록 모아보기 가능",
  },
  {
    level: 21,
    key: "cheering_letter",
    label: "응원 메시지 1회",
    description: "주 1회 HADA 응원 메시지 수신 가능",
  },
  {
    level: 25,
    key: "fortune_wealth",
    label: "재물운 보기",
    description: "재물운 상세 운세 열람 가능",
  },
  {
    level: 34,
    key: "fortune_health",
    label: "건강운 보기",
    description: "건강운 상세 운세 열람 가능",
  },
  {
    level: 37,
    key: "charm_pick",
    label: "행운 뽑기 +1회",
    description: "하루 최대 4회 행운 뽑기 가능",
  },
  {
    level: 42,
    key: "goal_analysis",
    label: "HADA 분석 +1회",
    description: "주 2회 목표 HADA 분석 가능",
  },
  {
    level: 55,
    key: "cheering_letter",
    label: "응원 메시지 +1회",
    description: "주 2회 HADA 응원 메시지 수신 가능",
  },
  {
    level: 58,
    key: "charm_pick",
    label: "행운 뽑기 +1회",
    description: "하루 최대 5회 행운 뽑기 가능",
  },
  {
    level: 63,
    key: "fortune_love",
    label: "애정운 보기",
    description: "애정운 상세 운세 열람 가능",
  },
  {
    level: 67,
    key: "goal_slot",
    label: "목표 슬롯 +1개",
    description: "최대 3개 목표 관리 가능",
  },
  {
    level: 73,
    key: "fortune_career",
    label: "취업운 보기",
    description: "취업운 상세 운세 열람 가능",
  },
  {
    level: 83,
    key: "goal_analysis",
    label: "HADA 분석 +1회",
    description: "주 3회 목표 HADA 분석 가능",
  },
  {
    level: 89,
    key: "reset_allowed",
    label: "데이터 초기화 가능",
    description: "앱 데이터 초기화 기능 활성화",
  },
  {
    level: 91,
    key: "fortune_summary",
    label: "종합운세 보기",
    description: "주간·월간·연간 종합운세 열람 가능",
  },
  {
    level: 100,
    key: "charm_pick",
    label: "행운 뽑기 +1회",
    description: "하루 최대 6회 행운 뽑기 가능",
  },
  {
    level: 102,
    key: "cheering_letter",
    label: "응원 메시지 +1회",
    description: "주 3회 HADA 응원 메시지 수신 가능",
  },
  {
    level: 103,
    key: "goal_analysis",
    label: "HADA 분석 +1회",
    description: "주 4회 목표 HADA 분석 가능",
  },
  {
    level: 105,
    key: "cheering_letter",
    label: "응원 메시지 +1회",
    description: "주 4회 HADA 응원 메시지 수신 가능",
  },
  {
    level: 108,
    key: "goal_analysis",
    label: "HADA 분석 +1회",
    description: "주 5회 목표 HADA 분석 가능",
  },
  {
    level: 113,
    key: "cheering_letter",
    label: "응원 메시지 +1회",
    description: "주 5회 HADA 응원 메시지 수신 가능",
  },
  {
    level: 115,
    key: "goal_analysis",
    label: "HADA 분석 +1회",
    description: "주 6회 목표 HADA 분석 가능",
  },
  {
    level: 121,
    key: "cheering_letter",
    label: "응원 메시지 +1회",
    description: "주 6회 HADA 응원 메시지 수신 가능",
  },
  {
    level: 125,
    key: "goal_analysis",
    label: "HADA 분석 +1회",
    description: "주 7회 목표 HADA 분석 가능",
  },
  {
    level: 134,
    key: "cheering_letter",
    label: "응원 메시지 +1회",
    description: "주 7회 HADA 응원 메시지 수신 가능",
  },
  {
    level: 137,
    key: "full_unlock",
    label: "전체 사용 가능",
    description: "행운 레벨 모드 진입 — 모든 기능 해제",
  },
];

// ─── 행운 레벨 임계 ────────────────────────────────────────────────
export const LUCKY_LEVEL_THRESHOLD = 137;

// ─── 주 식별자 (일요일 기준) ────────────────────────────────────────
export function getWeekKeyBySunday() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = 일요일
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - dayOfWeek);
  const y = sunday.getFullYear();
  const m = String(sunday.getMonth() + 1).padStart(2, "0");
  const d = String(sunday.getDate()).padStart(2, "0");
  return `${y}-W-${m}${d}`; // 예: "2025-W-0420"
}

// ─── 레벨별 누적 해금 계산 유틸 ────────────────────────────────────

/** 현재 레벨에서 해금된 하루 최대 행운 뽑기 횟수 */
export function getMaxCharmPicks(level) {
  if (level >= LUCKY_LEVEL_THRESHOLD) return 999; // 사실상 무제한
  const count = UNLOCK_TABLE.filter(
    (u) => u.key === "charm_pick" && u.level <= level,
  ).length;
  return count; // 0이면 아직 해금 안 됨
}

/** 현재 레벨에서 해금된 주간 HADA 분석 횟수 */
export function getMaxGoalAnalysis(level) {
  if (level >= LUCKY_LEVEL_THRESHOLD) return 999;
  const count = UNLOCK_TABLE.filter(
    (u) => u.key === "goal_analysis" && u.level <= level,
  ).length;
  return count;
}

/** 현재 레벨에서 해금된 주간 응원 메시지 횟수 */
export function getMaxCheeringLetter(level) {
  if (level >= LUCKY_LEVEL_THRESHOLD) return 999;
  const count = UNLOCK_TABLE.filter(
    (u) => u.key === "cheering_letter" && u.level <= level,
  ).length;
  return count;
}

/** 현재 레벨에서 해금된 최대 목표 슬롯 수 */
export function getMaxGoalSlots(level) {
  if (level >= LUCKY_LEVEL_THRESHOLD) return 999;
  const base = 1;
  const extra = UNLOCK_TABLE.filter(
    (u) => u.key === "goal_slot" && u.level <= level,
  ).length;
  return base + extra;
}

/** 행복 보관함 열람 가능 여부 */
export function canViewHappinessVault(level) {
  return (
    level >= LUCKY_LEVEL_THRESHOLD ||
    UNLOCK_TABLE.some((u) => u.key === "happiness_vault" && u.level <= level)
  );
}

/** 특정 운세 열람 가능 여부
 * @param {"wealth"|"health"|"love"|"career"|"summary"} fortuneId
 */
export function canViewFortune(level, fortuneId) {
  if (level >= LUCKY_LEVEL_THRESHOLD) return true;
  const keyMap = {
    wealth: "fortune_wealth",
    health: "fortune_health",
    love: "fortune_love",
    career: "fortune_career",
    summary: "fortune_summary",
    daily: "fortune_daily", // 항상 가능 (기본 기능)
  };
  if (fortuneId === "daily") return true; // 오늘의 운세는 기본 제공
  const key = keyMap[fortuneId];
  if (!key) return false;
  return UNLOCK_TABLE.some((u) => u.key === key && u.level <= level);
}

/** 데이터 초기화 가능 여부 */
export function canResetData(level) {
  return (
    level >= LUCKY_LEVEL_THRESHOLD ||
    UNLOCK_TABLE.some((u) => u.key === "reset_allowed" && u.level <= level)
  );
}

// ─── 다음 해금 안내 문자열 ──────────────────────────────────────────
/**
 * 현재 레벨에서 다음으로 해금될 기능 안내 문자열 반환
 * @param {number} level
 * @returns {string}
 */
export function getNextUnlockMessage(level) {
  if (level >= LUCKY_LEVEL_THRESHOLD) {
    return "당신의 행운 레벨을 할 수 있는 만큼 높여보세요! 🍀";
  }

  // 현재 레벨 초과하는 가장 가까운 해금 항목
  const next = UNLOCK_TABLE.find((u) => u.level > level);
  if (!next) {
    return "모든 기능이 사용 가능합니다 ✨";
  }

  // 누적 수치가 필요한 key들은 총합을 보여줌
  const weeklyKeys = {
    goal_analysis: "HADA 분석이",
    cheering_letter: "응원 메시지가",
  };
  const dailyKeys = {
    charm_pick: "행운 뽑기가",
  };
  const slotKeys = {
    goal_slot: "목표 슬롯이",
  };

  if (weeklyKeys[next.key]) {
    // 해금 후 총 횟수 계산
    const totalAfter = UNLOCK_TABLE.filter(
      (u) => u.key === next.key && u.level <= next.level,
    ).length;
    return `레벨 ${next.level}에서 ${
      weeklyKeys[next.key]
    } 주 ${totalAfter}회 가능합니다 ✨`;
  }
  if (dailyKeys[next.key]) {
    const totalAfter = UNLOCK_TABLE.filter(
      (u) => u.key === next.key && u.level <= next.level,
    ).length;
    return `레벨 ${next.level}에서 ${
      dailyKeys[next.key]
    } 하루 최대 ${totalAfter}회 가능합니다 ✨`;
  }
  if (slotKeys[next.key]) {
    const totalAfter =
      1 +
      UNLOCK_TABLE.filter((u) => u.key === next.key && u.level <= next.level)
        .length;
    return `레벨 ${next.level}에서 목표를 최대 ${totalAfter}개까지 관리할 수 있습니다 ✨`;
  }

  return `레벨 ${next.level}에서 ${next.label} 기능이 해제됩니다 ✨`;
}

/**
 * destinyCalculator.js
 * 사주(四柱) / 점성술 등 불변 운명 데이터를 계산하는 알고리즘 모음.
 * 외부 라이브러리가 필요할 경우 이 파일에서 import 한다.
 */

// ─── 천간(天干) / 지지(地支) ───────────────────────────────────────────────
const HEAVENLY_STEMS  = ["갑","을","병","정","무","기","경","신","임","계"];
const EARTHLY_BRANCHES = ["자","축","인","묘","진","사","오","미","신","유","술","해"];
const ZODIAC_ANIMALS   = ["쥐","소","호랑이","토끼","용","뱀","말","양","원숭이","닭","개","돼지"];
const ELEMENTS         = ["목","목","화","화","토","토","금","금","수","수"];

/**
 * 생년으로 연주(年柱) 천간·지지·띠 계산
 * @param {number} year
 * @returns {{ stem: string, branch: string, zodiac: string, element: string }}
 */
export function getYearPillar(year) {
  const stemIdx   = (year - 4)  % 10;
  const branchIdx = (year - 4)  % 12;
  return {
    stem:    HEAVENLY_STEMS[(stemIdx + 10) % 10],
    branch:  EARTHLY_BRANCHES[(branchIdx + 12) % 12],
    zodiac:  ZODIAC_ANIMALS[(branchIdx + 12) % 12],
    element: ELEMENTS[(stemIdx + 10) % 10],
  };
}

/**
 * 생월로 월주(月柱) 천간·지지 계산 (간략식)
 * @param {number} month  1~12
 * @param {number} year
 * @returns {{ stem: string, branch: string }}
 */
export function getMonthPillar(month, year) {
  const yearStemIdx = (year - 4) % 10;
  // 월간 기본 오프셋: 연간 × 2 를 시작으로 12개월 순환
  const stemIdx   = (yearStemIdx * 2 + month + 1) % 10;
  const branchIdx = (month + 1) % 12;
  return {
    stem:   HEAVENLY_STEMS[(stemIdx + 10) % 10],
    branch: EARTHLY_BRANCHES[(branchIdx + 12) % 12],
  };
}

/**
 * 생일로 일주(日柱) 천간·지지 계산 (간략식 — 정확도 참고용)
 * @param {string|Date} birthDate
 * @returns {{ stem: string, branch: string }}
 */
export function getDayPillar(birthDate) {
  const d        = new Date(birthDate);
  const base     = new Date(1900, 0, 31); // 경자일(庚子日) 기준
  const diffDays = Math.floor((d - base) / 86400000);
  const stemIdx   = ((diffDays % 10) + 10) % 10;
  const branchIdx = ((diffDays % 12) + 12) % 12;
  return {
    stem:   HEAVENLY_STEMS[stemIdx],
    branch: EARTHLY_BRANCHES[branchIdx],
  };
}

/**
 * 전체 사주 데이터 반환
 * @param {{ birth_date: string, birth_time?: string }} profile
 * @returns {{ year: object, month: object, day: object, element: string, zodiac: string }}
 */
export function getDestinyChart(profile) {
  const d     = new Date(profile.birth_date);
  const year  = d.getFullYear();
  const month = d.getMonth() + 1;

  const yearPillar  = getYearPillar(year);
  const monthPillar = getMonthPillar(month, year);
  const dayPillar   = getDayPillar(profile.birth_date);

  return {
    year:    yearPillar,
    month:   monthPillar,
    day:     dayPillar,
    element: yearPillar.element,
    zodiac:  yearPillar.zodiac,
  };
}
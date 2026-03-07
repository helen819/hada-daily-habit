/**
 * fortuneService.js
 * 운세 데이터를 계산하고 저장소(fileSystem)에 캐싱하는 서비스 레이어.
 * UI 코드는 이 서비스만 호출하면 된다.
 */

import { fileSystem } from "@/components/storage";
import { getDestinyChart } from "./calculator/destinyCalculator";
import { askAIJson } from "./aiService";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 시간

/**
 * 오늘 날짜 문자열 (YYYY-MM-DD)
 * @returns {string}
 */
function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 사주 불변 데이터 반환 (캐시 → 없으면 계산 후 저장)
 * @param {object} profile  UserProfile 레코드
 * @returns {object}  DestinyChart
 */
export function getOrCreateDestinyChart(profile) {
  const path = `destinyChart/${profile.id}`;
  const cached = fileSystem.read(path);
  if (cached) return cached;

  const chart = getDestinyChart(profile);
  fileSystem.write(path, chart);
  return chart;
}

/**
 * 오늘 운세 반환 (캐시 TTL 24h → 없으면 AI 생성 후 저장)
 * @param {object} profile     UserProfile 레코드
 * @param {object} chart       DestinyChart (getOrCreateDestinyChart 결과)
 * @returns {Promise<object>}  DailyFortune
 */
export async function getDailyFortune(profile, chart) {
  const path = `dailyFortune/${profile.id}/${today()}`;

  // 캐시 유효성 검사
  const cached = fileSystem.read(path);
  const stat   = fileSystem.stat(path);
  if (cached && stat && Date.now() - stat.updatedAt < CACHE_TTL_MS) {
    return cached;
  }

  // AI로 새 운세 생성
  const fortune = await askAIJson(
    `너는 사주·운세 전문가다.
사용자 정보:
- 이름: ${profile.full_name}
- 생년월일: ${profile.birth_date}
- 사주 연주: ${chart.year.stem}${chart.year.branch} (${chart.zodiac}띠, ${chart.element} 기운)
- 월주: ${chart.month.stem}${chart.month.branch}
- 일주: ${chart.day.stem}${chart.day.branch}
- 오늘: ${today()}

오늘의 운세를 반환하라. 긍정적이고 실천 가능한 조언 포함.
비교·경쟁 표현 금지. 항상 "지금도 충분히 잘하고 있다"는 뉘앙스.`,
    {
      type: "object",
      properties: {
        overall_score:  { type: "number",  description: "총운 점수 1~100" },
        summary:        { type: "string",  description: "한 줄 요약" },
        work_advice:    { type: "string",  description: "일·공부 조언" },
        relationship_advice: { type: "string", description: "관계 조언" },
        health_advice:  { type: "string",  description: "건강 조언" },
        lucky_color:    { type: "string",  description: "행운의 색" },
        lucky_number:   { type: "number",  description: "행운의 숫자" },
        micro_action:   { type: "string",  description: "오늘 실천 한 가지" },
      },
    }
  );

  fileSystem.write(path, fortune);
  return fortune;
}

/**
 * 특정 사용자의 모든 캐시 삭제
 * @param {string} userId
 */
export function clearUserCache(userId) {
  fileSystem.listDir(`destinyChart/${userId}`).forEach(p => fileSystem.remove(p));
  fileSystem.listDir(`dailyFortune/${userId}/`).forEach(p => fileSystem.remove(p));
}
/**
 * destinyCalculator.js
 *
 * 6대 운명학 알고리즘 계산 모음 (AI 호출 없이 로컬에서 처리)
 *
 * ┌─────────────────┬──────────────────────────────────────────┐
 * │ 시스템          │ 처리 방식                                │
 * ├─────────────────┼──────────────────────────────────────────┤
 * │ 사주 4주 8자    │ 완전 알고리즘 (연·월·일·시주 모두)       │
 * │ 명리학 오행     │ 알고리즘 (분포 계산) → AI 해석           │
 * │ 자미두수        │ 기본 명궁 계산 → AI 해석                 │
 * │ 동양 점성술     │ 알고리즘 (간지 기반) → AI 해석           │
 * │ 서양 점성술     │ 알고리즘 (태양궁·달궁·상승궁)            │
 * │ 성명학          │ 알고리즘 (획수 + 자원오행)               │
 * └─────────────────┴──────────────────────────────────────────┘
 *
 * 사용법:
 *   import { getFullDestinyData } from "@/api/calculator/destinyCalculator";
 *   const data = getFullDestinyData(profile);
 *   // data를 AI 프롬프트에 주입 → AI가 해석·현대어 변환
 */

// ══════════════════════════════════════════════════════════════════════════════
// 1. 기초 상수
// ══════════════════════════════════════════════════════════════════════════════

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCHES = [
  "자",
  "축",
  "인",
  "묘",
  "진",
  "사",
  "오",
  "미",
  "신",
  "유",
  "술",
  "해",
];
const ZODIAC = [
  "쥐",
  "소",
  "호랑이",
  "토끼",
  "용",
  "뱀",
  "말",
  "양",
  "원숭이",
  "닭",
  "개",
  "돼지",
];

// 천간 → 오행 매핑
const STEM_ELEMENT = {
  갑: "목",
  을: "목",
  병: "화",
  정: "화",
  무: "토",
  기: "토",
  경: "금",
  신: "금",
  임: "수",
  계: "수",
};

// 지지 → 오행 매핑
const BRANCH_ELEMENT = {
  자: "수",
  축: "토",
  인: "목",
  묘: "목",
  진: "토",
  사: "화",
  오: "화",
  미: "토",
  신: "금",
  유: "금",
  술: "토",
  해: "수",
};

// 일간(日干)별 자시(子時) 천간 시작 인덱스
// 갑·을일 → 자시가 갑(0), 병·정일 → 자시가 병(2), ...
const DAY_STEM_OFFSET = {
  갑: 0,
  을: 0,
  병: 2,
  정: 2,
  무: 4,
  기: 4,
  경: 6,
  신: 6,
  임: 8,
  계: 8,
};

// ══════════════════════════════════════════════════════════════════════════════
// 2. 사주 4주 계산
// ══════════════════════════════════════════════════════════════════════════════

/** 연주(年柱) */
function getYearPillar(year) {
  const si = (((year - 4) % 10) + 10) % 10;
  const bi = (((year - 4) % 12) + 12) % 12;
  return {
    stem: STEMS[si],
    branch: BRANCHES[bi],
    zodiac: ZODIAC[bi],
    element: STEM_ELEMENT[STEMS[si]],
  };
}

/** 월주(月柱) — 절입일 무시한 간략식 */
function getMonthPillar(month, year) {
  const yearStemIdx = (((year - 4) % 10) + 10) % 10;
  const si = (yearStemIdx * 2 + month + 1) % 10;
  const bi = (month + 1) % 12;
  return {
    stem: STEMS[(si + 10) % 10],
    branch: BRANCHES[(bi + 12) % 12],
    element: STEM_ELEMENT[STEMS[(si + 10) % 10]],
  };
}

/**
 * 일주(日柱) — 검증된 갑자일(甲子日) 기준 오프셋 적용
 *
 * 오프셋 검증 방법:
 *   기준점 1: 1986-02-09 = 갑자일(甲子) — 다수 만세력 일치
 *   기준점 2: 2024-09-17 = 갑자일(甲子) — 기준점1과 diff%60=0 ✅
 *
 *   base = 1900-01-31, 기준점1까지 diff = 31,422일
 *   갑(甲)=0: (31422 + SO) % 10 = 0  → SO = 0
 *   자(子)=0: (31422 + BO) % 12 = 0  → BO = (12 - 31422%12)%12 = 8
 *
 * ※ 기존 "1900-01-31=경자일" 주석은 오류였음 (실제: 갑신일)
 * ※ 절입일(節入日) 미적용 → 월주 경계 ±1일 오차 가능 (앱용 허용)
 */
function getDayPillar(birthDate) {
  const d = new Date(birthDate);
  const base = new Date(1900, 0, 31);
  const diff = Math.floor((d - base) / 86400000);
  const si = (((diff + 0) % 10) + 10) % 10; // 갑(甲)=0 기준
  const bi = (((diff + 8) % 12) + 12) % 12; // 자(子)=0, BO=8
  return {
    stem: STEMS[si],
    branch: BRANCHES[bi],
    element: STEM_ELEMENT[STEMS[si]],
  };
}

/**
 * 시주(時柱) — birth_time "HH:MM" 형식
 *
 * 시지(時支) 경계 (전통 2시간 단위):
 *   자시(子): 23:00~01:00 | 축시(丑): 01:00~03:00 | 인시(寅): 03:00~05:00
 *   묘시(卯): 05:00~07:00 | 진시(辰): 07:00~09:00 | 사시(巳): 09:00~11:00
 *   오시(午): 11:00~13:00 | 미시(未): 13:00~15:00 | 신시(申): 15:00~17:00
 *   유시(酉): 17:00~19:00 | 술시(戌): 19:00~21:00 | 해시(亥): 21:00~23:00
 *
 * 전자시(前子時) 처리:
 *   23:00~23:59 출생 → 시지는 자시(0)이지만 일주는 다음 날 기준 사용
 *   → getFullDestinyData()에서 is_jeon_jasi 플래그로 일주 날짜 보정
 *
 * @param {string} birthTime  "HH:MM"
 * @param {string} dayStem    일간 천간 (전자시 보정 후의 일주 천간)
 * @returns {{ stem, branch, element, branchIdx, is_jeon_jasi } | null}
 */
function getHourPillar(birthTime, dayStem) {
  if (!birthTime) return null;

  const hour = parseInt(birthTime.split(":")[0], 10);

  // 전자시(前子時): 23:00~23:59 — 자시이지만 일주는 다음 날
  const is_jeon_jasi = hour === 23;

  // 시지 인덱스: 자시(23,0시)=0, 축시(1,2시)=1, ...
  // 23시를 0시로 환산 후 계산
  const normalizedHour = is_jeon_jasi ? 0 : hour;
  const branchIdx = Math.floor(((normalizedHour + 1) % 24) / 2);
  const branch = BRANCHES[branchIdx];

  // 일간별 자시 천간 오프셋으로 시간(時干) 계산
  const offset = DAY_STEM_OFFSET[dayStem] ?? 0;
  const stemIdx = (offset + branchIdx) % 10;

  return {
    stem: STEMS[stemIdx],
    branch,
    element: STEM_ELEMENT[STEMS[stemIdx]],
    branchIdx,
    is_jeon_jasi, // 전자시 여부 — UI 표시 및 일주 보정에 사용
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. 명리학 — 심화 오행 분석 (억부법 용신)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 지지 장간(藏干) — 지지 속에 숨겨진 천간 오행
 * 각 지지에는 본기(本氣) + 중기(中氣) + 여기(餘氣)가 있음
 * 예: 축(丑) = 기(토)·신(금)·계(수) → 토·금·수 오행 내포
 */
const BRANCH_HIDDEN_STEMS = {
  자: ["임", "계"], // 수·수
  축: ["기", "신", "계"], // 토·금·수
  인: ["갑", "병", "무"], // 목·화·토
  묘: ["갑", "을"], // 목·목
  진: ["무", "을", "계"], // 토·목·수
  사: ["병", "경", "무"], // 화·금·토
  오: ["병", "정", "기"], // 화·화·토
  미: ["기", "정", "을"], // 토·화·목
  신: ["경", "임", "무"], // 금·수·토
  유: ["경", "신"], // 금·금
  술: ["무", "신", "정"], // 토·금·화
  해: ["임", "갑"], // 수·목
};

/**
 * 오행 상생(相生) 관계 — A가 B를 생(生)함
 * 목생화, 화생토, 토생금, 금생수, 수생목
 */
const GENERATES = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };

/**
 * 오행 상극(相剋) 관계 — A가 B를 극(剋)함
 * 목극토, 화극금, 토극수, 금극목, 수극화
 */
const CONTROLS = { 목: "토", 화: "금", 토: "수", 금: "목", 수: "화" };

/**
 * 4주 8자 + 장간 포함 심화 오행 분포 집계
 * @param {{ year, month, day, hour }} pillars
 * @returns {{
 *   목,화,토,금,수: number,     // 장간 포함 오행 점수
 *   dominant: string,
 *   lacking: string[],
 *   hidden_detail: object,      // 각 지지별 장간 목록
 * }}
 */
function analyzeElements(pillars) {
  // 가중치: 천간 1.0, 지지 본기 1.0, 장간 중기 0.5, 여기 0.3
  const score = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const hidden_detail = {};

  for (const [key, pillar] of Object.entries(pillars)) {
    if (!pillar) continue;

    // 천간 — 가중치 1.0
    const stemElem = STEM_ELEMENT[pillar.stem];
    if (stemElem) score[stemElem] += 1.0;

    // 지지 본기 — 가중치 1.0
    const branchElem = BRANCH_ELEMENT[pillar.branch];
    if (branchElem) score[branchElem] += 1.0;

    // 장간(藏干) — 중기 0.5, 여기 0.3
    const hiddenStems = BRANCH_HIDDEN_STEMS[pillar.branch] || [];
    hidden_detail[key] = hiddenStems.map((s) => ({
      stem: s,
      element: STEM_ELEMENT[s],
    }));
    hiddenStems.forEach((hs, idx) => {
      const weight = idx === 0 ? 0 : idx === 1 ? 0.5 : 0.3;
      const he = STEM_ELEMENT[hs];
      if (he && weight > 0) score[he] += weight;
    });
  }

  // 소수점 1자리 반올림
  for (const k of Object.keys(score)) score[k] = Math.round(score[k] * 10) / 10;

  const sorted = Object.entries(score).sort((a, b) => b[1] - a[1]);
  const dominant = sorted[0][0];
  const lacking = sorted.filter(([, v]) => v === 0).map(([k]) => k);

  return { ...score, dominant, lacking, hidden_detail };
}

/**
 * 일간(日干) 세력 강약 계산 — 억부법(抑扶法) 기반
 *
 * 강약 점수 공식:
 *   + 동기 오행(같은 오행) 개수 × 1.0
 *   + 생(生)해주는 오행(인성) 개수 × 0.8
 *   - 극(剋)하는 오행(관살) 개수 × 0.8
 *   - 내가 생해주는 오행(식상) 개수 × 0.3  (에너지 누설)
 *
 * 결과 해석:
 *   strength >= 3  → 신강(身强) — 일간이 강함 → 억제 필요
 *   strength < 3   → 신약(身弱) — 일간이 약함 → 보강 필요
 */
function calcDayStrength(pillars, elements) {
  const dayStem = pillars.day?.stem;
  const dayElem = STEM_ELEMENT[dayStem];
  if (!dayElem) return { strength: 0, label: "알 수 없음" };

  const motherElem = Object.keys(GENERATES).find(
    (k) => GENERATES[k] === dayElem,
  ); // 나를 생하는 오행
  const childElem = GENERATES[dayElem]; // 내가 생하는 오행
  const clasherElem = Object.keys(CONTROLS).find(
    (k) => CONTROLS[k] === dayElem,
  ); // 나를 극하는 오행

  const sameScore = elements[dayElem] * 1.0;
  const motherScore = motherElem ? elements[motherElem] * 0.8 : 0;
  const clasherScore = clasherElem ? elements[clasherElem] * 0.8 : 0;
  const childScore = childElem ? elements[childElem] * 0.3 : 0;

  const strength = parseFloat(
    (sameScore + motherScore - clasherScore - childScore).toFixed(1),
  );

  return {
    strength,
    label:
      strength >= 3
        ? "신강(身强)"
        : strength >= 1.5
        ? "중화(中和)"
        : "신약(身弱)",
    dayElem,
    motherElem,
    childElem,
    clasherElem,
  };
}

/**
 * 억부법(抑扶法) 용신(用神) 도출
 *
 * 신강(강함) → 억제가 필요 → 식상(내가 生하는 오행) 또는 관살(나를 剋하는 오행)
 * 신약(약함) → 보강이 필요 → 인성(나를 生하는 오행) 또는 비겁(같은 오행)
 *
 * @param {{ strength, dayElem, motherElem, childElem, clasherElem }} dayInfo
 * @returns {{ yongsin: string, reasoning: string }}
 */
function calcYongsin(dayInfo) {
  const { strength, dayElem, motherElem, childElem, clasherElem } = dayInfo;

  if (strength >= 3) {
    // 신강 → 식상(내가 生하는) 또는 관살(극하는) 오행이 용신
    const primary = childElem ?? clasherElem ?? motherElem;
    return {
      yongsin: primary,
      type: "억부(抑)",
      reasoning: `일간이 강함(${strength}점). ${primary} 기운으로 에너지 발산·균형이 필요합니다.`,
    };
  } else if (strength < 1.5) {
    // 신약 → 인성(나를 生하는) 또는 비겁(같은 오행)이 용신
    const primary = motherElem ?? dayElem;
    return {
      yongsin: primary,
      type: "억부(扶)",
      reasoning: `일간이 약함(${strength}점). ${primary} 기운으로 일간을 보강해야 합니다.`,
    };
  } else {
    // 중화 → 부족한 오행 보충
    const primary = motherElem ?? dayElem;
    return {
      yongsin: primary,
      type: "중화(中和)",
      reasoning: `일간이 중화 상태(${strength}점). ${primary} 기운으로 균형을 유지합니다.`,
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. 자미두수 — 전통 공식 명궁(命宮) 계산
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 자미두수 12궁 — 인(寅)궁부터 시작, 시계 방향 배열
 * 인덱스 0=인궁, 1=묘궁, ..., 11=축궁
 */
const ZIWEI_PALACES = [
  "인궁(명궁후보)",
  "묘궁",
  "진궁",
  "사궁",
  "오궁",
  "미궁",
  "신궁",
  "유궁",
  "술궁",
  "해궁",
  "자궁",
  "축궁",
];

/** 자미두수 12궁 현대 명칭 매핑 (명궁 위치에 따라 나머지 궁 배치) */
const PALACE_NAMES = [
  "명궁",
  "형제궁",
  "부처궁",
  "자녀궁",
  "재백궁",
  "질액궁",
  "천이궁",
  "노복궁",
  "관록궁",
  "전택궁",
  "복덕궁",
  "부모궁",
];

/**
 * 자미두수 14주성 — 생일(오행국수)로 자미성 위치 결정
 * 오행국수(五行局數): 납음오행에 따라 2·3·4·5·6국
 *
 * 납음오행 → 국수 매핑 (연주 납음 기준 간략식)
 * 실제는 연·월·일·시 납음 복합 적용; 여기서는 연주 납음 사용
 */
const NAYIN_TABLE = {
  // [연주 천간+지지] → 납음오행 (간략 매핑)
  갑자: "금",
  을축: "금",
  병인: "화",
  정묘: "화",
  무진: "목",
  기사: "목",
  경오: "토",
  신미: "토",
  임신: "금",
  계유: "금",
  갑술: "화",
  을해: "화",
  병자: "수",
  정축: "수",
  무인: "토",
  기묘: "토",
  경진: "금",
  신사: "금",
  임오: "목",
  계미: "목",
  갑신: "수",
  을유: "수",
  병술: "토",
  정해: "토",
  무자: "화",
  기축: "화",
  경인: "목",
  신묘: "목",
  임진: "수",
  계사: "수",
  갑오: "금",
  을미: "금",
  병신: "화",
  정유: "화",
  무술: "목",
  기해: "목",
  경자: "토",
  신축: "토",
  임인: "금",
  계묘: "금",
  갑진: "화",
  을사: "화",
  병오: "수",
  정미: "수",
  무신: "토",
  기유: "토",
  경술: "금",
  신해: "금",
  임자: "목",
  계축: "목",
  갑인: "수",
  을묘: "수",
  병진: "토",
  정사: "토",
  무오: "화",
  기미: "화",
  경신: "목",
  신유: "목",
  임술: "수",
  계해: "수",
};

const NAYIN_TO_JUK = { 금: 4, 목: 3, 수: 2, 화: 6, 토: 5 }; // 납음오행 → 국수

/**
 * 자미성(紫微星) 위치 계산
 * 전통 공식: 생일수(일지지 인덱스)를 국수로 나누어 자미 위치 결정
 *
 * 간략식 (앱용):
 *   자미 위치 = (생일 + 국수 - 1) % 12
 *   (인궁=0 기준 시계방향)
 */
function getZiweiPosition(day, nayinElem) {
  const juk = NAYIN_TO_JUK[nayinElem] ?? 5;
  return (((day + juk - 1) % 12) + 12) % 12;
}

/**
 * 14주성 배치 — 자미 위치 기준 역행 배치
 * 자미성 이하: 천기·태양·무곡·천동·염정 (역행)
 * 천부 이하: 태음·탐랑·거문·천상·천량·칠살·파군 (순행)
 */
const ZIWEI_GROUP = ["자미", "천기", "태양", "무곡", "천동", "염정"];
const TIANFU_GROUP = [
  "천부",
  "태음",
  "탐랑",
  "거문",
  "천상",
  "천량",
  "칠살",
  "파군",
];

/**
 * 명궁(命宮) 전통 계산 — 월지·시지 역행법
 *
 * 전통 공식:
 *   1. 월지 시작: 인월(寅月)=인궁(인덱스0) 고정
 *   2. 생월에 따라 인궁~축궁 순서로 시작궁 결정
 *      → 1월(인월)=인궁(0), 2월=묘궁(1), ..., 12월=축궁(11)
 *   3. 생시지에서 자시(子時)=자궁(10) 기준 역행
 *      → 자시=0칸, 축시=1칸(역), 인시=2칸(역) ...
 *   4. 명궁 = (월지 인덱스 - 시지 인덱스 + 24) % 12
 *
 * 궁 인덱스: 0=인, 1=묘, 2=진, 3=사, 4=오, 5=미, 6=신, 7=유, 8=술, 9=해, 10=자, 11=축
 *
 * @param {number} month 양력 월 (1~12, 음력 변환 미적용 — 앱용 근사값)
 * @param {number} hourBranchIdx 시지 인덱스 (BRANCHES 기준: 자=0, 축=1, ...)
 * @returns {{ palaceIdx, palaceName, branch }}
 */
function calcMingGongIdx(month, hourBranchIdx) {
  // 월지 인덱스: 1월=인(2번지지=인덱스2), 간략식으로 0기준 매핑
  // 인궁(0) 기준: 1월=0, 2월=1, ..., 12월=11
  const monthPalaceIdx = (month - 1) % 12;

  // 시지별 역행 칸수: 자시(0)=0칸, 축시(1)=1칸 역행, ...
  const mingGongIdx = (((monthPalaceIdx - hourBranchIdx) % 12) + 12) % 12;

  // 궁 인덱스 → 지지 이름 (인궁=0은 BRANCHES 인덱스 2=인)
  const branchIdx = (mingGongIdx + 2) % 12; // 인궁기준 → BRANCHES 인덱스로 변환
  const branch = BRANCHES[branchIdx];

  return { palaceIdx: mingGongIdx, palaceName: PALACE_NAMES[0], branch };
  // ※ PALACE_NAMES[0]="명궁" — 명궁 자체 이름은 고정, 위치(branch)가 달라짐
}

/**
 * 자미두수 전체 명반 데이터 반환
 * @param {number}  month          양력 월
 * @param {number}  day            생일 (1~31)
 * @param {number}  hourBranchIdx  시지 인덱스 (시간 미입력 시 0=자시 기본값)
 * @param {string}  yearStem       연주 천간
 * @param {string}  yearBranch     연주 지지
 * @param {boolean} hasBirthTime   출생 시간 입력 여부
 *                                  false → 명궁은 "출생 시간 미입력 추정값"으로 표시
 */
function getZiweiChart(
  month,
  day,
  hourBranchIdx,
  yearStem,
  yearBranch,
  hasBirthTime = true,
) {
  // 납음오행·국수
  const nayinKey = yearStem + yearBranch;
  const nayinElem = NAYIN_TABLE[nayinKey] ?? "토";
  const juk = NAYIN_TO_JUK[nayinElem] ?? 5;

  // 명궁 — 시간 미입력 시 hourBranchIdx=0(자시)로 계산하되 추정 플래그 표시
  const mingGong = calcMingGongIdx(month, hourBranchIdx);

  // 자미성 위치 (인궁=0 기준)
  const ziweiPos = getZiweiPosition(day, nayinElem);

  // 자미 그룹 주성 (역행: 자미에서 천기·태양... 역방향 배치)
  const mainStarIdx = ziweiPos % ZIWEI_GROUP.length;
  const mainStar = ZIWEI_GROUP[mainStarIdx] + "성";

  // 천부 그룹 (자미와 대칭 순행)
  const tianfuPos = (12 - ziweiPos) % 12;
  const tianfuStarIdx = tianfuPos % TIANFU_GROUP.length;
  const tianfuStar = TIANFU_GROUP[tianfuStarIdx] + "성";

  // 명궁에 위치한 주성 판별
  const starAtMingGong = getMingGongStar(mingGong.palaceIdx, ziweiPos);

  return {
    mingGong: {
      ...mingGong,
      is_estimated: !hasBirthTime, // 시간 미입력 시 true → AI/UI에서 주의 표시
    },
    ziweiPos,
    mainStar: starAtMingGong,
    tianfuStar,
    juk,
    nayinElem,
    hasBirthTime, // 원본 정보 보존
  };
}

/**
 * 명궁 위치에 해당하는 주성 반환
 * 자미 그룹(역행)과 천부 그룹(순행) 중 명궁과 겹치는 별 탐색
 */
function getMingGongStar(mingGongPalaceIdx, ziweiPos) {
  // 자미 그룹 역행 배치
  for (let i = 0; i < ZIWEI_GROUP.length; i++) {
    const pos = (((ziweiPos - i) % 12) + 12) % 12;
    if (pos === mingGongPalaceIdx) return ZIWEI_GROUP[i] + "성";
  }
  // 천부 그룹 순행 배치
  const tianfuPos = (12 - ziweiPos) % 12;
  for (let i = 0; i < TIANFU_GROUP.length; i++) {
    const pos = (tianfuPos + i) % 12;
    if (pos === mingGongPalaceIdx) return TIANFU_GROUP[i] + "성";
  }
  return "공궁(空宮)"; // 주성 없음
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. 서양 점성술 — 태양궁·달궁·상승궁
// ══════════════════════════════════════════════════════════════════════════════

const WESTERN_SIGNS = [
  "양자리",
  "황소자리",
  "쌍둥이자리",
  "게자리",
  "사자자리",
  "처녀자리",
  "천칭자리",
  "전갈자리",
  "사수자리",
  "염소자리",
  "물병자리",
  "물고기자리",
];

// 서양 점성술 태양궁 날짜 범위 [월, 일 시작]
const SUN_SIGN_RANGES = [
  { sign: "염소자리", m: 1, d: 1 },
  { sign: "물병자리", m: 1, d: 20 },
  { sign: "물고기자리", m: 2, d: 19 },
  { sign: "양자리", m: 3, d: 21 },
  { sign: "황소자리", m: 4, d: 20 },
  { sign: "쌍둥이자리", m: 5, d: 21 },
  { sign: "게자리", m: 6, d: 21 },
  { sign: "사자자리", m: 7, d: 23 },
  { sign: "처녀자리", m: 8, d: 23 },
  { sign: "천칭자리", m: 9, d: 23 },
  { sign: "전갈자리", m: 10, d: 23 },
  { sign: "사수자리", m: 11, d: 22 },
  { sign: "염소자리", m: 12, d: 22 },
];

/** 태양궁 계산 */
function getSunSign(month, day) {
  let sign = "염소자리";
  for (const r of SUN_SIGN_RANGES) {
    if (month > r.m || (month === r.m && day >= r.d)) {
      sign = r.sign;
    }
  }
  return sign;
}

/**
 * 달궁(Moon Sign) — 삭망 주기 기반 간략식
 * 정확도 ±1궁 (정확한 계산은 천체력 필요)
 */
function getMoonSign(birthDate) {
  const d = new Date(birthDate);
  const base = new Date(2000, 0, 6); // 2000-01-06 양자리 달 기준
  const diffDays = Math.floor((d - base) / 86400000);
  // 달은 약 27.32일에 12궁 순환
  const idx = ((Math.floor(diffDays / 2.277) % 12) + 12) % 12;
  return WESTERN_SIGNS[idx];
}

/**
 * 상승궁(Ascendant / Rising Sign) — 천문 계산
 * 위도·경도·출생 시간이 있을 때만 계산
 *
 * 알고리즘:
 *   1. Julian Day Number 계산
 *   2. Greenwich Mean Sidereal Time (GMST) 계산
 *   3. Local Sidereal Time (LST) = GMST + 경도 보정
 *   4. RAMC(Right Ascension of MC) = LST × 15°
 *   5. ASC = atan2(-cos(RAMC), sin(RAMC)·cos(ε) + tan(φ)·sin(ε))
 *      (ε = 황도경사각 ≈ 23.44°, φ = 위도)
 *
 * @param {string} birthDate  "YYYY-MM-DD"
 * @param {string} birthTime  "HH:MM"
 * @param {number} latitude   위도 (예: 37.5)
 * @param {number} longitude  경도 (예: 126.9)
 * @returns {string|null}  궁 이름 또는 null
 */
function getAscendant(birthDate, birthTime, latitude, longitude) {
  if (!birthTime || latitude == null || longitude == null) return null;

  const [dateStr] = [birthDate];
  const [hh, mm] = birthTime.split(":").map(Number);

  const [y, mo, dd] = dateStr.split("-").map(Number);

  // UTC 시간으로 변환 (한국 = UTC+9)
  const utcHour = hh - 9 + mm / 60;

  // Julian Day Number (JDN)
  const A = Math.floor((14 - mo) / 12);
  const Y = y + 4800 - A;
  const M = mo + 12 * A - 3;
  const JDN =
    dd +
    Math.floor((153 * M + 2) / 5) +
    365 * Y +
    Math.floor(Y / 4) -
    Math.floor(Y / 100) +
    Math.floor(Y / 400) -
    32045;
  const JD = JDN - 0.5 + utcHour / 24;

  // Julian Centuries from J2000.0
  const T = (JD - 2451545.0) / 36525;

  // GMST (도 단위)
  const GMST_deg =
    280.46061837 +
    360.98564736629 * (JD - 2451545) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;

  // LST (도 단위)
  const LST_deg = (((GMST_deg + longitude) % 360) + 360) % 360;

  // 황도 경사각 ε
  const epsilon = (23.439292 - 0.013004 * T) * (Math.PI / 180);

  // RAMC (라디안)
  const RAMC = LST_deg * (Math.PI / 180);
  const lat = latitude * (Math.PI / 180);

  // Ascendant 황경 (라디안)
  const ascRad = Math.atan2(
    -Math.cos(RAMC),
    Math.sin(RAMC) * Math.cos(epsilon) + Math.tan(lat) * Math.sin(epsilon),
  );
  let ascDeg = ascRad * (180 / Math.PI);
  if (ascDeg < 0) ascDeg += 180;
  if (Math.sin(RAMC) < 0) ascDeg += 180;
  ascDeg = ((ascDeg % 360) + 360) % 360;

  // 황경 → 12궁 (각 30°)
  const signIdx = Math.floor(ascDeg / 30) % 12;
  return WESTERN_SIGNS[signIdx];
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. 성명학 — 획수 + 자원오행(字源五行)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 한자 획수 테이블 — 한국 이름에 자주 쓰이는 한자 350자
 * (출처: 대법원 인명용 한자 기준)
 */
const HANJA_STROKES = {
  // 1획
  一: 1,
  // 2획
  人: 2,
  力: 2,
  二: 2,
  八: 2,
  // 3획
  三: 3,
  山: 3,
  士: 3,
  大: 3,
  女: 3,
  子: 3,
  小: 3,
  上: 3,
  工: 3,
  土: 3,
  // 4획
  天: 4,
  太: 4,
  元: 4,
  文: 4,
  方: 4,
  火: 4,
  王: 4,
  中: 4,
  心: 4,
  水: 4,
  木: 4,
  月: 4,
  手: 4,
  日: 4,
  化: 4,
  今: 4,
  父: 4,
  友: 4,
  分: 4,
  公: 4,
  // 5획
  生: 5,
  玉: 5,
  白: 5,
  石: 5,
  正: 5,
  世: 5,
  平: 5,
  主: 5,
  民: 5,
  立: 5,
  本: 5,
  由: 5,
  甲: 5,
  申: 5,
  田: 5,
  末: 5,
  市: 5,
  付: 5,
  代: 5,
  令: 5,
  // 6획
  光: 6,
  年: 6,
  成: 6,
  先: 6,
  宇: 6,
  安: 6,
  有: 6,
  在: 6,
  地: 6,
  朴: 6,
  百: 6,
  西: 6,
  行: 6,
  向: 6,
  全: 6,
  共: 6,
  名: 6,
  多: 6,
  合: 6,
  同: 6,
  // 7획
  男: 7,
  良: 7,
  秀: 7,
  助: 7,
  希: 7,
  快: 7,
  志: 7,
  材: 7,
  花: 7,
  佐: 7,
  完: 7,
  克: 7,
  君: 7,
  里: 7,
  時: 7,
  步: 7,
  言: 7,
  彩: 7,
  辰: 7,
  宋: 7,
  // 8획
  明: 8,
  林: 8,
  幸: 8,
  知: 8,
  和: 8,
  金: 8,
  武: 8,
  東: 8,
  奉: 8,
  杰: 8,
  松: 8,
  泳: 8,
  泰: 8,
  京: 8,
  昌: 8,
  典: 8,
  佳: 8,
  采: 8,
  固: 8,
  宗: 8,
  // 9획
  信: 9,
  星: 9,
  柱: 9,
  春: 9,
  炫: 9,
  南: 9,
  洙: 9,
  英: 9,
  政: 9,
  建: 9,
  美: 9,
  重: 9,
  勇: 9,
  度: 9,
  科: 9,
  律: 9,
  俊: 9,
  城: 9,
  思: 9,
  相: 9,
  // 10획
  烈: 10,
  容: 10,
  桂: 10,
  書: 10,
  顯: 10,
  海: 10,
  益: 10,
  根: 10,
  時: 10,
  特: 10,
  修: 10,
  晟: 10,
  珍: 10,
  恩: 10,
  峰: 10,
  振: 10,
  倫: 10,
  哲: 10,
  // 11획
  健: 11,
  教: 11,
  深: 11,
  雪: 11,
  族: 11,
  理: 11,
  現: 11,
  張: 11,
  國: 11,
  堅: 11,
  動: 11,
  望: 11,
  淑: 11,
  曹: 11,
  推: 11,
  晚: 11,
  彬: 11,
  彪: 11,
  // 12획
  景: 12,
  湖: 12,
  善: 12,
  雲: 12,
  喜: 12,
  敬: 12,
  博: 12,
  富: 12,
  普: 12,
  欽: 12,
  湯: 12,
  창: 12,
  清: 12,
  超: 12,
  植: 12,
  晶: 12,
  凱: 12,
  貴: 12,
  // 13획
  源: 13,
  準: 13,
  楓: 13,
  義: 13,
  溶: 13,
  雄: 13,
  殿: 13,
  群: 13,
  廉: 13,
  瑞: 13,
  煥: 13,
  業: 13,
  暉: 13,
  愛: 13,
  鉉: 13,
  圓: 13,
  葉: 13,
  // 14획
  榮: 14,
  豪: 14,
  語: 14,
  滿: 14,
  維: 14,
  銀: 14,
  嘉: 14,
  誠: 14,
  碩: 14,
  瑛: 14,
  漢: 14,
  福: 14,
  輝: 14,
  華: 14,
  蓮: 14,
  翠: 14,
  // 15획
  德: 15,
  賢: 15,
  潤: 15,
  緣: 15,
  樂: 15,
  璋: 15,
  廣: 15,
  魯: 15,
  儀: 15,
  慧: 15,
  熙: 15,
  調: 15,
  論: 15,
  範: 15,
  蔚: 15,
  // 16획
  燮: 16,
  龍: 16,
  學: 16,
  謙: 16,
  鋒: 16,
  靜: 16,
  積: 16,
  錫: 16,
  興: 16,
  橋: 16,
  機: 16,
  // 17획
  鍾: 17,
  講: 17,
  霞: 17,
  優: 17,
  總: 17,
  穗: 17,
  環: 17,
  謝: 17,
  // 18획
  鎬: 18,
  薰: 18,
  豐: 18,
  鍵: 18,
  藍: 18,
  // 19획
  瓊: 19,
  麗: 19,
  韻: 19,
  // 20획 이상
  饒: 20,
  蘭: 21,
  鑑: 22,
};

/**
 * 자원오행(字源五行) — 자음 초성 기반 오행 매핑
 * 목(木): ㄱ ㅋ / 화(火): ㄴ ㄷ ㄹ ㅌ / 토(土): ㅇ ㅎ
 * 금(金): ㅅ ㅈ ㅊ / 수(水): ㅁ ㅂ ㅍ
 */
const CHOSEONG_ELEMENT = {
  ㄱ: "목",
  ㅋ: "목",
  ㄴ: "화",
  ㄷ: "화",
  ㄹ: "화",
  ㅌ: "화",
  ㅇ: "토",
  ㅎ: "토",
  ㅅ: "금",
  ㅈ: "금",
  ㅊ: "금",
  ㅁ: "수",
  ㅂ: "수",
  ㅍ: "수",
};

// 한글 초성 19개 — 유니코드 한글 자모 순서와 정확히 일치해야 함
const CHOSEONG_LIST = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];

function extractChoseong(char) {
  const code = char.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;
  return CHOSEONG_LIST[Math.floor(code / 28 / 21)];
}

/**
 * 이름 성명학 분석
 * @param {string} name  한글 이름 (성 포함, 예: "홍길동")
 * @param {string} [hanja]  한자 이름 (선택, 예: "洪吉童")
 * @returns {{
 *   strokes: number[],        // 글자별 획수
 *   total_strokes: number,    // 총획수
 *   suri_81: number,          // 81수 코드
 *   suri_meaning: string,     // 81수 의미
 *   name_elements: string[],  // 글자별 자원오행
 *   dominant_element: string, // 주요 오행
 *   harmony_score: number,    // 오행 조화 점수 (0~100)
 * }}
 */
function analyzeNameology(name, hanja = "") {
  const chars = [...name];

  // 획수 계산: 한자 있으면 한자 기준, 없으면 한글 자모 획수 추정
  const strokes = chars.map((ch, i) => {
    if (hanja && hanja[i]) {
      return HANJA_STROKES[hanja[i]] ?? estimateHanjaStrokes(hanja[i]);
    }
    return estimateHangulStrokes(ch);
  });

  const total = strokes.reduce((a, b) => a + b, 0);
  const suri = ((total - 1) % 81) + 1;

  // 자원오행
  const name_elements = chars.map((ch) => {
    const cho = extractChoseong(ch);
    return CHOSEONG_ELEMENT[cho] ?? "토";
  });

  // 주요 오행 빈도 집계
  const elemCount = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  name_elements.forEach((e) => elemCount[e]++);
  const dominant = Object.entries(elemCount).sort((a, b) => b[1] - a[1])[0][0];

  // 조화 점수 — 3가지 이상 오행 = 고득점
  const uniqueElems = Object.values(elemCount).filter((v) => v > 0).length;
  const harmony_score = Math.min(100, uniqueElems * 20 + 20);

  return {
    strokes,
    total_strokes: total,
    suri_81: suri,
    suri_meaning: getSuri81Meaning(suri),
    name_elements,
    dominant_element: dominant,
    harmony_score,
  };
}

/** 한글 한 글자 획수 추정 (자모 획수 합산) */
function estimateHangulStrokes(char) {
  const JAMO_STROKES = {
    ㄱ: 2,
    ㄲ: 4,
    ㄴ: 2,
    ㄷ: 3,
    ㄸ: 6,
    ㄹ: 5,
    ㅁ: 4,
    ㅂ: 4,
    ㅃ: 8,
    ㅅ: 2,
    ㅆ: 4,
    ㅇ: 1,
    ㅈ: 3,
    ㅉ: 5,
    ㅊ: 4,
    ㅋ: 3,
    ㅌ: 4,
    ㅍ: 4,
    ㅎ: 3,
    ㅏ: 2,
    ㅐ: 3,
    ㅑ: 3,
    ㅒ: 4,
    ㅓ: 2,
    ㅔ: 3,
    ㅕ: 3,
    ㅖ: 4,
    ㅗ: 2,
    ㅘ: 4,
    ㅙ: 5,
    ㅚ: 3,
    ㅛ: 3,
    ㅜ: 2,
    ㅝ: 4,
    ㅞ: 5,
    ㅟ: 3,
    ㅠ: 3,
    ㅡ: 1,
    ㅢ: 2,
    ㅣ: 1,
  };
  const code = char.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return 5; // 기본값
  const cho = Math.floor(code / 28 / 21);
  const jung = Math.floor((code / 28) % 21);
  const jong = code % 28;
  const JUNG_JAMO = [
    "ㅏ",
    "ㅐ",
    "ㅑ",
    "ㅒ",
    "ㅓ",
    "ㅔ",
    "ㅕ",
    "ㅖ",
    "ㅗ",
    "ㅘ",
    "ㅙ",
    "ㅚ",
    "ㅛ",
    "ㅜ",
    "ㅝ",
    "ㅞ",
    "ㅟ",
    "ㅠ",
    "ㅡ",
    "ㅢ",
    "ㅣ",
  ];
  const JONG_JAMO = [
    null,
    "ㄱ",
    "ㄲ",
    "ㄳ",
    "ㄴ",
    "ㄵ",
    "ㄶ",
    "ㄷ",
    "ㄹ",
    "ㄺ",
    "ㄻ",
    "ㄼ",
    "ㄽ",
    "ㄾ",
    "ㄿ",
    "ㅀ",
    "ㅁ",
    "ㅂ",
    "ㅄ",
    "ㅅ",
    "ㅆ",
    "ㅇ",
    "ㅈ",
    "ㅊ",
    "ㅋ",
    "ㅌ",
    "ㅍ",
    "ㅎ",
  ];
  return (
    (JAMO_STROKES[CHOSEONG_LIST[cho]] ?? 2) +
    (JAMO_STROKES[JUNG_JAMO[jung]] ?? 2) +
    (jong > 0 ? JAMO_STROKES[JONG_JAMO[jong]] ?? 2 : 0)
  );
}

/** 한자 획수 미등록 시 유니코드 기반 추정 (CJK 평균 약 8획) */
function estimateHanjaStrokes(char) {
  // 자주 쓰이는 부수 획수로 간략 추정
  const code = char.charCodeAt(0);
  if (code >= 0x4e00 && code <= 0x9fff) return 8; // CJK 기본 한자 기본값
  return 5;
}

/** 81수리 의미 매핑 (주요 수리만) */
function getSuri81Meaning(n) {
  const MAP = {
    1: "시작·리더십",
    2: "협력·인내",
    3: "창의·표현",
    4: "안정·노력",
    5: "변화·모험",
    6: "조화·가정",
    7: "독립·연구",
    8: "성취·재물",
    9: "완성·지혜",
    10: "공허·전환",
    11: "발전·이상",
    12: "고독·인내",
    13: "지혜·명성",
    14: "변동·역경",
    15: "덕망·복",
    16: "귀인·성공",
    17: "강인·의지",
    18: "발전·진취",
    19: "문창·명예",
    20: "공허·허무",
    21: "독립·창조",
    22: "중단·역경",
    23: "旭日·광명",
    24: "재물·성공",
    25: "안정·건실",
    26: "영웅·파란",
    27: "중절·단절",
    28: "파란·고독",
    29: "지모·성공",
    30: "길흉·변동",
    31: "인덕·명성",
    32: "요행·행운",
    33: "旭日·승천",
    34: "파멸·고난",
    35: "온화·평안",
    36: "영웅·파란",
    37: "인덕·권위",
    38: "문예·인내",
    39: "재지·성공",
    40: "무상·공허",
    41: "대성·공명",
    42: "중단·불안",
    43: "산재·역경",
    44: "파란·고난",
    45: "大智·순조",
    46: "무상·불안",
    47: "출세·성공",
    48: "지모·대업",
    49: "길흉·반반",
    50: "길흉·변동",
  };
  return MAP[n] ?? "내실·성장";
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. 메인 통합 함수
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 전체 운명 데이터를 한 번에 계산하여 반환
 * → destinyProfileService.js에서 이 함수를 호출하고,
 *   결과를 AI 프롬프트에 주입한다.
 *
 * @param {{
 *   full_name: string,
 *   birth_date: string,    "YYYY-MM-DD"
 *   birth_time?: string,   "HH:MM" (선택)
 *   gender: string,
 *   latitude?: number,     GPS 위도 (선택)
 *   longitude?: number,    GPS 경도 (선택)
 *   hanja_name?: string,   한자 이름 (선택)
 * }} profile
 *
 * @returns {{
 *   saju: object,
 *   elements: object,
 *   ziwei: object,
 *   western: object,
 *   nameology: object,
 *   summary_for_ai: string,   AI 프롬프트에 바로 붙여 쓸 텍스트
 * }}
 */
export function getFullDestinyData(profile) {
  const d = new Date(profile.birth_date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  // ── 사주 4주 ──────────────────────────────────────────────
  // 전자시(前子時) 처리: 23시 출생 시 일주는 다음 날 기준
  const birthHour = profile.birth_time
    ? parseInt(profile.birth_time.split(":")[0], 10)
    : null;
  const isJeonJasi = birthHour === 23;

  // 전자시면 일주(日柱)에 다음 날 날짜 적용
  let dayBirthDate = profile.birth_date;
  if (isJeonJasi) {
    const nextDay = new Date(profile.birth_date);
    nextDay.setDate(nextDay.getDate() + 1);
    dayBirthDate = nextDay.toISOString().slice(0, 10);
  }

  const yearPillar = getYearPillar(year);
  const monthPillar = getMonthPillar(month, year);
  const dayPillar = getDayPillar(dayBirthDate); // 전자시 보정 날짜 사용
  const hourPillar = profile.birth_time
    ? getHourPillar(profile.birth_time, dayPillar.stem) // 보정된 일간 전달
    : null;

  const pillars = {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
  };

  // ── 명리학 심화 분석 ───────────────────────────────────────
  const elements = analyzeElements(pillars);
  const dayInfo = calcDayStrength(pillars, elements);
  const yongsinInfo = calcYongsin(dayInfo);

  // ── 자미두수 전통 명반 ────────────────────────────────────
  // 시간 미입력 시: 명궁을 시간별로 12가지 모두 추정 불가 → 추정값임을 명시
  const hourBranchIdx = hourPillar?.branchIdx ?? null;
  const ziweiHasBirthTime = hourBranchIdx !== null;
  const ziwei = getZiweiChart(
    month,
    day,
    ziweiHasBirthTime ? hourBranchIdx : 0, // 미입력 시 자시(0) 임시 사용
    yearPillar.stem,
    yearPillar.branch,
    ziweiHasBirthTime, // 시간 입력 여부 전달
  );

  // ── 서양 점성술 ───────────────────────────────────────────
  const sunSign = getSunSign(month, day);
  const moonSign = getMoonSign(profile.birth_date);
  const rising = getAscendant(
    profile.birth_date,
    profile.birth_time,
    profile.latitude,
    profile.longitude,
  );

  // ── 성명학 ────────────────────────────────────────────────
  const nameology = analyzeNameology(profile.full_name, profile.hanja_name);

  // ── AI용 요약 텍스트 ──────────────────────────────────────
  const summary_for_ai = buildAISummary({
    profile,
    pillars,
    elements,
    dayInfo,
    yongsinInfo,
    ziwei,
    sunSign,
    moonSign,
    rising,
    nameology,
    isJeonJasi,
  });

  return {
    saju: {
      year: yearPillar,
      month: monthPillar,
      day: dayPillar,
      hour: hourPillar,
      zodiac: yearPillar.zodiac,
      main_element: yearPillar.element,
      is_jeon_jasi: isJeonJasi, // 23시 출생 여부 — UI 표시용
    },
    elements: {
      ...elements,
      dayStrength: dayInfo.strength,
      dayStrengthLabel: dayInfo.label,
      yongsin: yongsinInfo.yongsin,
      yongsinType: yongsinInfo.type,
      yongsinReasoning: yongsinInfo.reasoning,
    },
    ziwei,
    western: { sun: sunSign, moon: moonSign, rising },
    nameology,
    summary_for_ai,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// 8. AI 프롬프트용 텍스트 조립
// ══════════════════════════════════════════════════════════════════════════════

function buildAISummary({
  profile,
  pillars,
  elements,
  dayInfo,
  yongsinInfo,
  ziwei,
  sunSign,
  moonSign,
  rising,
  nameology,
  isJeonJasi,
}) {
  const { year: y, month: mo, day: da, hour: h } = pillars;

  // 시주 텍스트 — 전자시·미입력 상황 명확히 표시
  let hourText;
  if (!h) {
    hourText = "시주 미입력 (출생 시간 없음)";
  } else if (isJeonJasi) {
    hourText = `${h.stem}${h.branch}시 ※전자시(前子時) — 23시 출생으로 다음 날 일주 적용됨`;
  } else {
    hourText = `${h.stem}${h.branch}시 (${profile.birth_time})`;
  }

  // 명궁 추정 여부 표시
  const mingGongNote = ziwei.mingGong.is_estimated
    ? `${ziwei.mingGong.branch}궁 ※추정값 (출생 시간 미입력 — 자시 기준)`
    : `${ziwei.mingGong.branch}궁`;

  // 장간 요약
  const hiddenText = Object.entries(elements.hidden_detail || {})
    .map(
      ([key, stems]) =>
        `${key}주 지지 장간: ${stems
          .map((s) => s.stem + "(" + s.element + ")")
          .join("·")}`,
    )
    .join(" / ");

  return `
━━━ [알고리즘 계산 완료 — AI 해석 요청] ━━━

[1. 사주 4주 8자]
연주: ${y.stem}${y.branch} | 월주: ${mo.stem}${mo.branch} | 일주: ${da.stem}${
    da.branch
  } | 시주: ${hourText}
띠: ${y.zodiac} | 일간(나의 오행): ${da.element}
${
  isJeonJasi
    ? "⚠ 전자시(前子時): 23시 출생으로 일주를 다음 날 기준으로 보정함"
    : ""
}
[2. 명리학 심화 분석]
── 오행 분포 (장간 포함 가중치) ──
목: ${elements.목}점 / 화: ${elements.화}점 / 토: ${elements.토}점 / 금: ${
    elements.금
  }점 / 수: ${elements.수}점
지배 오행: ${elements.dominant} | 결핍 오행: ${
    elements.lacking.length ? elements.lacking.join(", ") : "없음"
  }
장간 세부: ${hiddenText || "시주 미입력으로 일부 생략"}

── 일간 세력 (억부법) ──
일간 오행: ${dayInfo.dayElem} | 세력 점수: ${dayInfo.strength}점 | 판정: ${
    dayInfo.label
  }
생(生)해주는 오행(인성): ${dayInfo.motherElem ?? "없음"}
극(剋)하는 오행(관살): ${dayInfo.clasherElem ?? "없음"}

── 용신(用神) ──
용신: ${yongsinInfo.yongsin} | 유형: ${yongsinInfo.type}
근거: ${yongsinInfo.reasoning}

[3. 자미두수 명반 (전통 역행법)]
납음오행: ${ziwei.nayinElem} | 국수: ${ziwei.juk}국
명궁 위치: ${mingGongNote}
자미성 위치: 인궁기준 ${ziwei.ziweiPos}번 궁
명궁 주성: ${ziwei.mainStar}${
    ziwei.mainStar === "공궁(空宮)" ? " (주성 없음 — 빈 궁)" : ""
  }
천부 계열 주성: ${ziwei.tianfuStar}
※ 음력 변환 미적용 — 양력 근사값. 정밀 계산은 음력 API 연동 권장.

[4. 서양 점성술]
태양궁: ${sunSign}
달궁: ${moonSign}
상승궁: ${rising ?? "위치·시간 정보 없어 계산 불가"}

[5. 성명학]
이름: ${profile.full_name}${
    profile.hanja_name ? ` (${profile.hanja_name})` : " (한자 미입력)"
  }
글자별 획수: ${nameology.strokes.join(" / ")} → 총 ${nameology.total_strokes}획
81수리: ${nameology.suri_81}수 (${nameology.suri_meaning})
이름 오행: ${nameology.name_elements.join(" / ")} | 주요 오행: ${
    nameology.dominant_element
  }
오행 조화 점수: ${nameology.harmony_score}점

━━━ 위 수치를 현대적 언어로 해석하여 사용자 맞춤 분석을 제공하라 ━━━
전문 용어 금지 | 부정·공포 표현 금지 | 모든 약점은 "행동 조언"으로 치환`.trim();
}

// ══════════════════════════════════════════════════════════════════════════════
// 9. 캐싱·결정론 지원 유틸리티
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 프로필 해시 생성 — 동일 입력 = 동일 결과 보장 (결정론적 캐시 키)
 *
 * 해시에 포함되는 필드 (운명 계산에 영향을 주는 값만):
 *   full_name, birth_date, birth_time, gender, latitude, longitude, hanja_name
 *
 * 해시에 포함하지 않는 필드:
 *   id, goal, xp, level, current_mode, created_at 등
 *   → 이 값들이 바뀌어도 명식(命式) 자체는 달라지지 않음
 *
 * 알고리즘: djb2 변형 (외부 라이브러리 불필요, 동기 실행)
 *
 * @param {object} profile
 * @returns {string}  8자리 16진수 해시 (예: "a3f7c219")
 *
 * 사용 예:
 *   const hash = hashProfile(profile);
 *   // → "a3f7c219"
 *   // Capacitor Preferences 키: "destinyCache_a3f7c219"
 */
export function hashProfile(profile) {
  // 계산에 영향을 주는 필드만 정렬된 순서로 직렬화 (key 순서 고정)
  const canonical = [
    profile.full_name ?? "",
    profile.birth_date ?? "",
    profile.birth_time ?? "",
    profile.gender ?? "",
    // 위도·경도는 소수점 2자리까지만 사용 (미세한 GPS 오차 무시)
    profile.latitude != null ? Number(profile.latitude).toFixed(2) : "",
    profile.longitude != null ? Number(profile.longitude).toFixed(2) : "",
    profile.hanja_name ?? "",
  ].join("|");

  // djb2 해시
  let hash = 5381;
  for (let i = 0; i < canonical.length; i++) {
    hash = ((hash << 5) + hash) ^ canonical.charCodeAt(i);
    hash = hash >>> 0; // unsigned 32bit 유지
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * 오프라인 fallback — AI 없이 로컬 계산값만 반환
 *
 * 오프라인 또는 AI 호출 실패 시 사용.
 * ai_analysis가 없으므로 buildDestinyContext()는 "[로컬 계산값만 포함]" 텍스트를 반환.
 *
 * @param {object} profile
 * @returns {object}  destinyProfile (ai_analysis = null)
 */
export function getLocalDestinyOnly(profile) {
  const data = getFullDestinyData(profile);
  return {
    schema_version: "v1_local",
    user_id: profile.id,
    generated_at: new Date().toISOString(),
    is_offline: true, // ← AI 분석 없음을 명시
    profile_hash: hashProfile(profile),
    saju_chart: {
      year: data.saju.year,
      month: data.saju.month,
      day: data.saju.day,
      hour: data.saju.hour,
      element: data.saju.main_element,
      zodiac: data.saju.zodiac,
    },
    elements: data.elements,
    ziwei: data.ziwei,
    western: data.western,
    nameology: data.nameology,
    summary_for_ai: data.summary_for_ai, // AI가 나중에 쓸 계산값 보존
    ai_analysis: null, // 오프라인이므로 없음
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// 10. 하위 호환 (기존 destinyCalculator 호출부 대응)
// ══════════════════════════════════════════════════════════════════════════════

/** @deprecated getFullDestinyData 사용 권장 */
export function getDestinyChart(profile) {
  const data = getFullDestinyData(profile);
  return {
    year: data.saju.year,
    month: data.saju.month,
    day: data.saju.day,
    element: data.saju.main_element,
    zodiac: data.saju.zodiac,
  };
}

export { getYearPillar, getMonthPillar, getDayPillar };

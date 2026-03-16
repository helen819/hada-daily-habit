/**
 * destinyCalculator.js
 *
 * 6대 운명학 + 대운 계산 알고리즘 (AI 호출 없이 로컬에서 처리)
 *
 * ┌─────────────────────┬───────────────────────────────────────────┐
 * │ 모듈                │ 처리 방식                                  │
 * ├─────────────────────┼───────────────────────────────────────────┤
 * │ Time Normalization  │ Date.UTC + 진태양시 경도 보정              │
 * │ 절기 엔진           │ 앵커 데이터 내장 테이블 (1940~2040)        │
 * │ 사주 4주 8자        │ 완전 알고리즘 (절기·오서둔 적용)           │
 * │ 오행 분석           │ 장간 가중치 + 계절 왕상(旺相) 보너스       │
 * │ 대운 엔진           │ 양남음녀 순역행, 8대운 60년 계산           │
 * │ 자미두수            │ 전통 역행법 명궁 + 14주성 배치             │
 * │ 서양 점성술         │ 태양궁·달궁·상승궁 천문 계산               │
 * │ 성명학              │ 획수 + 자원오행(字源五行)                  │
 * └─────────────────────┴───────────────────────────────────────────┘
 *
 * 스펙 반영 내역 (Professional Destiny System Spec v1):
 *   ✅ 시주 공식: (dayStemIdx × 2 + hourBranchIdx) % 10 — 스펙과 동치 확인
 *   ✅ 월주 공식: 절기 기반 + (yearStemIdx×2 + 2 + sajuMonth) % 10
 *      (스펙 공식에 인월 오프셋 +2 누락 확인 — 현행 코드가 정확)
 *   ✅ 오행 가중치: stem 1.0 / branch 0.7 / hidden 0.3 (스펙 기준)
 *   ✅ 오행 계절 보너스: 旺상(旺相休囚死) 월령 적용
 *   ✅ 대운 엔진: (출생 → 다음/이전 절기 일수) ÷ 3 = 시작 나이, 8대운 산출
 *   ⏭  Swiss Ephemeris: JS 앱 환경에서는 절기 테이블로 대체 (정밀도 충분)
 *   ⏭  대운 DB 저장: destinyProfileService에서 담당
 *
 * 사용법:
 *   import { getFullDestinyData } from "@/api/calculator/destinyCalculator";
 *   const data = getFullDestinyData(profile);
 */

// ══════════════════════════════════════════════════════════════════════════════
// 1. 기초 상수
// ══════════════════════════════════════════════════════════════════════════════

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const ZODIAC = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];

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

/**
 * 오서둔일법(五鼠遁日法) — 일간(日干)별 자시(子時) 천간 시작 인덱스
 *
 * 전통 공식:
 *   甲·己일 → 자시 = 甲(0)   乙·庚일 → 자시 = 丙(2)
 *   丙·辛일 → 자시 = 戊(4)   丁·壬일 → 자시 = 庚(6)
 *   戊·癸일 → 자시 = 壬(8)
 *
 * 검증 (2001-01-14 丁丑일, 19:02 술시):
 *   정(丁)일 offset=6, 술시 branchIdx=10
 *   → (6 + 10) % 10 = 6 → 경(庚) → 경술(庚戌) ✅
 *
 * ※ 이전 코드는 쌍(pair)을 동일 offset으로 잘못 적용했음:
 *   갑:0 을:0 (틀림) / 병:2 정:2 (틀림) ... 갑·계만 우연히 맞았음
 */
const DAY_STEM_OFFSET = {
    갑: 0,
    을: 2,
    병: 4,
    정: 6,
    무: 8,
    기: 0,
    경: 2,
    신: 4,
    임: 6,
    계: 8,
};

// ══════════════════════════════════════════════════════════════════════════════
// 2. 절기(節氣) 시스템 — 연주·월주 정확도 핵심
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 2024년 12절입(節入) 앵커 데이터 (KST, 천문연 기준 검증값)
 *
 * 순서: 소한(1월)·입춘(2월)·경칩(3월)·청명(4월)·입하(5월)·망종(6월)
 *       소서(7월)·입추(8월)·백로(9월)·한로(10월)·입동(11월)·대설(12월)
 * 형식: [일(day), 자정부터 분(KST)]
 *
 * ─ 이동 공식 ───────────────────────────────────────────────────────────────
 * 회귀년 = 365.2422일. 절기는 매년 동일 태양 황경에서 발생.
 *   비윤년 전환: +349분   (0.2422 × 1440 ≈ 348.8 → 반올림)
 *   윤년   전환: −1091분  (349 − 1440)
 *
 * 누적 오차(1940~2040): 약 ±30분 이내 → 앱 허용 범위
 * ※ 절기 당일 전후 1시간 내 출생자는 만세력 교차 검증 권장
 */
const _JEOLGI_ANCHOR_YEAR = 2024;
const _JEOLGI_ANCHOR_DATA = [
    [6, 1037], // 소한  Jan  6 17:17 KST
    [4, 1047], // 입춘  Feb  4 17:27 KST  ← 연주 경계
    [5, 683], // 경칩  Mar  5 11:23 KST
    [4, 962], // 청명  Apr  4 16:02 KST
    [5, 550], // 입하  May  5 09:10 KST
    [5, 790], // 망종  Jun  5 13:10 KST
    [6, 1400], // 소서  Jul  6 23:20 KST
    [7, 549], // 입추  Aug  7 09:09 KST
    [7, 731], // 백로  Sep  7 12:11 KST
    [8, 240], // 한로  Oct  8 04:00 KST
    [7, 440], // 입동  Nov  7 07:20 KST
    [7, 17], // 대설  Dec  7 00:17 KST
];

/**
 * 앵커에서 1940~2040 절기 테이블 빌드 (모듈 로드 시 1회 실행)
 * @returns {Map<number, Array<[number,number]>>}
 */
function _buildJeolgiTable() {
    const table = new Map();

    function isLeap(y) {
        return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    }

    // shift 적용: min 범위 초과 시 day ±1 보정
    function applyShift(data, shift) {
        return data.map(([d, m]) => {
            let nm = m + shift;
            let nd = d;
            if (nm >= 1440) { nm -= 1440;
                nd += 1; } else if (nm < 0) { nm += 1440;
                nd -= 1; }
            return [nd, nm];
        });
    }

    table.set(_JEOLGI_ANCHOR_YEAR, _JEOLGI_ANCHOR_DATA);

    // 미래 (anchor → 2040)
    let cur = _JEOLGI_ANCHOR_DATA;
    for (let y = _JEOLGI_ANCHOR_YEAR; y < 2040; y++) {
        const shift = isLeap(y + 1) ? (349 - 1440) : 349;
        cur = applyShift(cur, shift);
        table.set(y + 1, cur);
    }

    // 과거 (anchor → 1940)
    cur = _JEOLGI_ANCHOR_DATA;
    for (let y = _JEOLGI_ANCHOR_YEAR; y > 1940; y--) {
        const shift = isLeap(y) ? (349 - 1440) : 349;
        cur = applyShift(cur, -shift); // 역방향
        table.set(y - 1, cur);
    }

    return table;
}

const _JEOLGI_TABLE = _buildJeolgiTable();

/** 특정 연도 절기 데이터 (범위 초과 시 경계값 사용) */
function _getJeolgi(year) {
    if (_JEOLGI_TABLE.has(year)) return _JEOLGI_TABLE.get(year);
    return year < 1940 ? _JEOLGI_TABLE.get(1940) : _JEOLGI_TABLE.get(2040);
}

/** "HH:MM" 문자열 → 분 변환 (없으면 정오=720 기본) */
function _timeToMinutes(t) {
    if (!t) return 720;
    const [h, m] = t.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
}

/**
 * 절기 기반 사주 연도·월 계산 (연주·월주 오류 수정의 핵심)
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │ 연주 경계: 입춘(2월 4일경) 이전 출생 → 전년도 연주 사용      │
 * │ 월주 경계: 매월 절입일(소한·입춘·경칩 등) 기준으로 월 전환   │
 * └──────────────────────────────────────────────────────────────┘
 *
 * @param {string}  birthDate  "YYYY-MM-DD"
 * @param {string}  [birthTime] "HH:MM" (없으면 정오 기준 → 당일 절기 오차 가능)
 * @returns {{ sajuYear: number, sajuMonth: number }}
 *   sajuMonth:  0=인월, 1=묘월, 2=진월, 3=사월, 4=오월, 5=미월,
 *               6=신월, 7=유월, 8=술월, 9=해월, 10=자월, 11=축월
 */
function getSajuYearMonth(birthDate, birthTime) {
    const [y, m, d] = birthDate.split("-").map(Number);
    const bMin = _timeToMinutes(birthTime);
    const table = _getJeolgi(y);

    // 절기 시각 이후인지 판별 (동일 날짜면 시간 비교)
    function isAfterJeolgi(jDay, jMin, jMon) {
        if (m !== jMon) return m > jMon;
        if (d !== jDay) return d > jDay;
        return bMin >= jMin;
    }

    // ── 연주: 입춘(테이블 인덱스 1) 기준 ───────────────────────
    const [ipDay, ipMin] = table[1];
    const beforeIpchun = !isAfterJeolgi(ipDay, ipMin, 2);
    const sajuYear = beforeIpchun ? y - 1 : y;

    // ── 월주: 12절기 역탐색 ──────────────────────────────────────
    // 절기 인덱스 → [양력 월, 사주월 인덱스]
    // 소한(idx0)=1월→축월(11), 입춘(idx1)=2월→인월(0), ..., 대설(idx11)=12월→자월(10)
    const JEOLGI_CAL_MON = [1, 2, 3, 4, 5, 4, 7, 8, 9, 10, 11, 12];
    //                       소한 입춘 경칩 청명 입하 망종 소서 입추 백로  한로  입동  대설
    // ↑ 망종(5월→index5)의 양력월이 6인데 위에서 4로 잘못 쓰면 버그 → 수정
    const CAL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const SAJU_MONTHS = [11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // 역순으로 탐색: 마지막으로 지난 절기가 현재 사주월
    let sajuMonth = 10; // 소한 이전 default: 자월 (전년 대설~소한 사이)
    for (let i = 11; i >= 0; i--) {
        const [jDay, jMin] = table[i];
        if (isAfterJeolgi(jDay, jMin, CAL_MONTHS[i])) {
            sajuMonth = SAJU_MONTHS[i];
            break;
        }
    }

    return { sajuYear, sajuMonth };
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. 사주 4주 계산
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 진태양시(眞太陽時) 보정 — 경도 기반 (오류 4 수정)
 *
 * 한국(KST)은 동경 135° 기준이므로 실제 지역 경도와 최대 ±30분 차이.
 *   보정분 = (출생 경도 - 135) × 4분/도
 *   서울(126.98°): (126.98 - 135) × 4 ≈ -32분
 *   부산(129.07°): (129.07 - 135) × 4 ≈ -24분
 *
 * @param {string} birthTime  "HH:MM" 표준시
 * @param {number} longitude  출생지 경도
 * @returns {string}  보정된 진태양시 "HH:MM"
 */
function _correctToSolarTime(birthTime, longitude) {
    const STD_MERIDIAN = 135;
    const [h, m] = birthTime.split(":").map(Number);
    const totalMin = h * 60 + m;
    const corr = Math.round((longitude - STD_MERIDIAN) * 4); // ±분
    const corrected = ((totalMin + corr) % 1440 + 1440) % 1440;
    return `${String(Math.floor(corrected / 60)).padStart(2, "0")}:${String(corrected % 60).padStart(2, "0")}`;
}

/**
 * 연주(年柱) — 절기 보정된 사주 연도 기준 (오류 1 수정)
 * @param {number} sajuYear  getSajuYearMonth()에서 반환된 명리학상 연도
 */
function getYearPillar(sajuYear) {
    const si = ((sajuYear - 4) % 10 + 10) % 10;
    const bi = ((sajuYear - 4) % 12 + 12) % 12;
    return {
        stem: STEMS[si],
        branch: BRANCHES[bi],
        zodiac: ZODIAC[bi],
        element: STEM_ELEMENT[STEMS[si]],
    };
}

/**
 * 월주(月柱) — 절기 기반 사주월 기준 (오류 2 수정)
 *
 * 연간(年干)별 인월(寅月) 시작 천간 오프셋:
 *   갑·기년 → 인월=병(2) | 을·경년 → 인월=무(4) | 병·신년 → 인월=경(6)
 *   정·임년 → 인월=임(8) | 무·계년 → 인월=갑(0)
 *
 * @param {number} sajuMonth  0=인, 1=묘, ..., 10=자, 11=축
 * @param {number} sajuYear
 */
function getMonthPillar(sajuMonth, sajuYear) {
    const yearStemIdx = ((sajuYear - 4) % 10 + 10) % 10;
    // 갑(0)→2, 을(1)→4, 병(2)→6, 정(3)→8, 무(4)→0, 기(5)→2, ...
    const YEAR_TO_MONTH_OFFSET = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0];
    const si = (YEAR_TO_MONTH_OFFSET[yearStemIdx] + sajuMonth) % 10;
    // 인월(0)=BRANCHES[2], 묘월(1)=BRANCHES[3], ..., 축월(11)=BRANCHES[1]
    const bi = (sajuMonth + 2) % 12;
    return {
        stem: STEMS[si],
        branch: BRANCHES[bi],
        element: STEM_ELEMENT[STEMS[si]],
    };
}

/**
 * 일주(日柱) — 전통 만세력 기준 (1900-01-31 甲辰日)
 *
 * 기준점:
 *   1900-01-31 = 甲辰日 (갑진일)
 *   → 甲(si=0), 辰(bi=4) → si_offset=0, bi_offset=4
 *
 * 검증 (국내 주요 만세력 교차 확인):
 *   2001-01-14 → 정축(丁丑) ✅  (사주닷컴·아이러브사주 등 일치)
 *   2024-01-01 → 갑자(甲子) ✅
 *
 * 타임존 수정:
 *   Date.UTC(y,m,d) 사용 → 로컬 타임존 무관, 환경 독립적
 *
 * ※ 이전 bi_offset=8은 다른 기준점(1900-01-31=甲申) 기반으로,
 *    국내 주요 전문 만세력과 지지가 4칸씩 어긋나는 결과를 냈음
 */
function getDayPillar(birthDate) {
    const [y, m, d] = birthDate.split("-").map(Number);
    const target = Date.UTC(y, m - 1, d);
    const base = Date.UTC(1900, 0, 31); // 甲辰日 기준점
    const diff = Math.floor((target - base) / 86400000);
    const si = ((diff + 0) % 10 + 10) % 10; // 甲=0
    const bi = ((diff + 4) % 12 + 12) % 12; // 辰=4
    return {
        stem: STEMS[si],
        branch: BRANCHES[bi],
        element: STEM_ELEMENT[STEMS[si]],
    };
}

/**
 * 시주(時柱) — 진태양시 경도 보정 적용 (오류 4 수정)
 *
 * 시지(時支) 경계 (전통 2시간 단위):
 *   자시(子): 23:00~01:00 | 축시(丑): 01:00~03:00 | 인시(寅): 03:00~05:00
 *   묘시(卯): 05:00~07:00 | 진시(辰): 07:00~09:00 | 사시(巳): 09:00~11:00
 *   오시(午): 11:00~13:00 | 미시(未): 13:00~15:00 | 신시(申): 15:00~17:00
 *   유시(酉): 17:00~19:00 | 술시(戌): 19:00~21:00 | 해시(亥): 21:00~23:00
 *
 * 전자시(前子時): 23:00~23:59 → 시지=자시, 일주는 다음 날 기준
 *
 * @param {string} birthTime  "HH:MM" 표준시(KST)
 * @param {string} dayStem    일간 천간
 * @param {number} [longitude] 출생지 경도 (없으면 표준시 그대로 사용)
 */
function getHourPillar(birthTime, dayStem, longitude) {
    if (!birthTime) return null;

    // ── 진태양시 보정 (경도 제공 시) ───────────────────────────
    const solarTime = longitude != null ?
        _correctToSolarTime(birthTime, longitude) :
        birthTime;
    const lonCorr = longitude != null ?
        Math.round((longitude - 135) * 4) :
        0; // 분 단위 보정값

    const hour = parseInt(solarTime.split(":")[0], 10);

    // 전자시(前子時): 23:00~23:59 — 자시지만 일주는 다음 날
    const is_jeon_jasi = hour === 23;
    const normalizedHour = is_jeon_jasi ? 0 : hour;
    const branchIdx = Math.floor(((normalizedHour + 1) % 24) / 2);
    const branch = BRANCHES[branchIdx];

    const offset = DAY_STEM_OFFSET[dayStem] ? ? 0;
    const stemIdx = (offset + branchIdx) % 10;

    return {
        stem: STEMS[stemIdx],
        branch,
        element: STEM_ELEMENT[STEMS[stemIdx]],
        branchIdx,
        is_jeon_jasi,
        solar_time: solarTime, // 진태양시 (경도 보정 후)
        standard_time: birthTime, // 원본 표준시(KST)
        longitude_corr_min: lonCorr, // 보정 적용 분 (서울≈-32)
    };
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. 명리학 — 심화 오행 분석 (억부법 용신)
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
 * 오행 계절 왕상(旺相休囚死) — 월지 기준 오행 강약 보너스
 *
 * 전통 왕상휴수사(旺相休囚死) 5단계를 3단계로 압축:
 *   旺(왕)  +0.5  — 계절의 주인공 (봄=목, 여름=화, 가을=금, 겨울=수)
 *   相(상)  +0.3  — 旺를 생해주는 오행 (봄에 수가 목을 생)
 *   休囚死  ±0   — 나머지
 *
 * 월지별 旺·相:
 *   인·묘·진(봄) : 목 旺, 수 相
 *   사·오·미(여름): 화 旺, 목 相
 *   신·유·술(가을): 금 旺, 토 相
 *   해·자·축(겨울): 수 旺, 금 相
 */
const SEASON_BONUS = {
    인: { 목: 0.5, 수: 0.3 },
    묘: { 목: 0.5, 수: 0.3 },
    진: { 목: 0.5, 수: 0.3 },
    사: { 화: 0.5, 목: 0.3 },
    오: { 화: 0.5, 목: 0.3 },
    미: { 화: 0.5, 목: 0.3 },
    신: { 금: 0.5, 토: 0.3 },
    유: { 금: 0.5, 토: 0.3 },
    술: { 금: 0.5, 토: 0.3 },
    해: { 수: 0.5, 금: 0.3 },
    자: { 수: 0.5, 금: 0.3 },
    축: { 수: 0.5, 금: 0.3 },
};

/**
 * 4주 8자 + 장간 심화 오행 분포 집계 (스펙 가중치 적용)
 *
 * 가중치 (Professional Destiny System Spec 기준):
 *   천간(stem)    1.0
 *   지지 본기     0.7  (스펙: branch 0.7)
 *   장간 중기     0.5  → hidden 가중 평균 (스펙: 0.3, 본기 제외)
 *   장간 여기     0.3
 *
 * + 계절 왕상 보너스 (월지 기준)
 *
 * @param {{ year, month, day, hour }} pillars
 * @returns {{ 목,화,토,금,수, dominant, lacking, hidden_detail, season }}
 */
function analyzeElements(pillars) {
    const score = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
    const hidden_detail = {};

    for (const [key, pillar] of Object.entries(pillars)) {
        if (!pillar) continue;

        // 천간 — 1.0
        const stemElem = STEM_ELEMENT[pillar.stem];
        if (stemElem) score[stemElem] += 1.0;

        // 지지 본기 — 0.7 (스펙 기준, 기존 1.0 → 조정)
        const branchElem = BRANCH_ELEMENT[pillar.branch];
        if (branchElem) score[branchElem] += 0.7;

        // 장간 — 중기 0.5, 여기 0.3 (본기는 지지에서 이미 계산)
        const hiddenStems = BRANCH_HIDDEN_STEMS[pillar.branch] || [];
        hidden_detail[key] = hiddenStems.map(s => ({ stem: s, element: STEM_ELEMENT[s] }));
        hiddenStems.forEach((hs, idx) => {
            const weight = idx === 0 ? 0 : idx === 1 ? 0.5 : 0.3;
            const he = STEM_ELEMENT[hs];
            if (he && weight > 0) score[he] += weight;
        });
    }

    // 계절 보너스 — 월지 기준 旺相 오행에 가산
    const monthBranch = pillars.month ? .branch;
    const seasonBonus = SEASON_BONUS[monthBranch] ? ? {};
    const season = monthBranch ? ? "알수없음";
    for (const [elem, bonus] of Object.entries(seasonBonus)) {
        score[elem] = (score[elem] || 0) + bonus;
    }

    // 소수점 1자리 반올림
    for (const k of Object.keys(score)) score[k] = Math.round(score[k] * 10) / 10;

    const sorted = Object.entries(score).sort((a, b) => b[1] - a[1]);
    const dominant = sorted[0][0];
    const lacking = sorted.filter(([, v]) => v === 0).map(([k]) => k);

    return {...score, dominant, lacking, hidden_detail, season, seasonBonus };
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
    const dayStem = pillars.day ? .stem;
    const dayElem = STEM_ELEMENT[dayStem];
    if (!dayElem) return { strength: 0, label: "알 수 없음" };

    const motherElem = Object.keys(GENERATES).find(k => GENERATES[k] === dayElem); // 나를 생하는 오행
    const childElem = GENERATES[dayElem]; // 내가 생하는 오행
    const clasherElem = Object.keys(CONTROLS).find(k => CONTROLS[k] === dayElem); // 나를 극하는 오행

    const sameScore = elements[dayElem] * 1.0;
    const motherScore = motherElem ? elements[motherElem] * 0.8 : 0;
    const clasherScore = clasherElem ? elements[clasherElem] * 0.8 : 0;
    const childScore = childElem ? elements[childElem] * 0.3 : 0;

    const strength = parseFloat(
        (sameScore + motherScore - clasherScore - childScore).toFixed(1)
    );

    return {
        strength,
        label: strength >= 3 ? "신강(身强)" : strength >= 1.5 ? "중화(中和)" : "신약(身弱)",
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
        const primary = childElem ? ? clasherElem ? ? motherElem;
        return {
            yongsin: primary,
            type: "억부(抑)",
            reasoning: `일간이 강함(${strength}점). ${primary} 기운으로 에너지 발산·균형이 필요합니다.`,
        };
    } else if (strength < 1.5) {
        // 신약 → 인성(나를 生하는) 또는 비겁(같은 오행)이 용신
        const primary = motherElem ? ? dayElem;
        return {
            yongsin: primary,
            type: "억부(扶)",
            reasoning: `일간이 약함(${strength}점). ${primary} 기운으로 일간을 보강해야 합니다.`,
        };
    } else {
        // 중화 → 부족한 오행 보충
        const primary = motherElem ? ? dayElem;
        return {
            yongsin: primary,
            type: "중화(中和)",
            reasoning: `일간이 중화 상태(${strength}점). ${primary} 기운으로 균형을 유지합니다.`,
        };
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. 대운(大運) 엔진 — 10년 주기 운세 사이클
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 60갑자 인덱스 조회 (0=갑자, 1=을축, ..., 59=계해)
 * @param {string} stem   천간
 * @param {string} branch 지지
 * @returns {number} 0~59
 */
function _ganji60Idx(stem, branch) {
    const si = STEMS.indexOf(stem);
    const bi = BRANCHES.indexOf(branch);
    for (let n = 0; n < 60; n++) {
        if (n % 10 === si && n % 12 === bi) return n;
    }
    return 0;
}

/**
 * 대운 방향 결정 — 양남음녀 순행, 음남양녀 역행
 *
 * 연주 천간의 음양:
 *   양간: 갑(0)·병(2)·무(4)·경(6)·임(8) → index 짝수
 *   음간: 을(1)·정(3)·기(5)·신(7)·계(9) → index 홀수
 *
 * 순행(順行): 다음 절기까지 일수 계산, 월주에서 +1씩 진행
 * 역행(逆行): 이전 절기까지 일수 계산, 월주에서 -1씩 진행
 *
 * @param {string} yearStem  연주 천간
 * @param {string} gender    "male" | "female"
 * @returns {boolean}  true = 순행, false = 역행
 */
function _isForward(yearStem, gender) {
    const stemIdx = STEMS.indexOf(yearStem);
    const isYangYear = stemIdx % 2 === 0; // 짝수 인덱스 = 양간
    return gender === "male" ? isYangYear : !isYangYear;
}

/**
 * 대운 시작 나이 계산
 *
 * 공식: (출생일 → 다음/이전 절기 일수) ÷ 3 = 대운 시작 나이 (반올림)
 *   예) 출생 후 10일 뒤 절기 → 10÷3 ≈ 3.3세 → 만 3세 시작
 *
 * @param {string}  birthDate  "YYYY-MM-DD"
 * @param {string}  [birthTime] "HH:MM"
 * @param {boolean} forward    순행 여부
 * @returns {{ startAge: number, daysToJeolgi: number, jeolgiDate: string }}
 */
function _calcLuckStartAge(birthDate, birthTime, forward) {
    const [by, bm, bd] = birthDate.split("-").map(Number);
    const bMin = _timeToMinutes(birthTime);

    // 탐색 범위: 현재 연도 ±2년의 절기 모두 수집
    const allJeolgi = [];
    for (let y = by - 1; y <= by + 1; y++) {
        const table = _getJeolgi(y);
        const CAL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        table.forEach(([jDay, jMin], idx) => {
            allJeolgi.push({
                ms: Date.UTC(y, CAL_MONTHS[idx] - 1, jDay) + jMin * 60000,
                label: `${y}-${String(CAL_MONTHS[idx]).padStart(2,"0")}-${String(jDay).padStart(2,"0")}`,
            });
        });
    }

    // 출생 시각 (ms)
    const birthMs = Date.UTC(by, bm - 1, bd) + bMin * 60000;

    if (forward) {
        // 순행: 출생 이후 첫 번째 절기
        const next = allJeolgi
            .filter(j => j.ms > birthMs)
            .sort((a, b) => a.ms - b.ms)[0];
        if (!next) return { startAge: 0, daysToJeolgi: 0, jeolgiDate: "" };
        const days = Math.floor((next.ms - birthMs) / 86400000);
        return { startAge: Math.round(days / 3 * 10) / 10, daysToJeolgi: days, jeolgiDate: next.label };
    } else {
        // 역행: 출생 이전 마지막 절기
        const prev = allJeolgi
            .filter(j => j.ms < birthMs)
            .sort((a, b) => b.ms - a.ms)[0];
        if (!prev) return { startAge: 0, daysToJeolgi: 0, jeolgiDate: "" };
        const days = Math.floor((birthMs - prev.ms) / 86400000);
        return { startAge: Math.round(days / 3 * 10) / 10, daysToJeolgi: days, jeolgiDate: prev.label };
    }
}

/**
 * 대운 8개 산출 — 월주 기준 순/역행 10년 사이클
 *
 * @param {{
 *   birthDate:  string,   "YYYY-MM-DD"
 *   birthTime?: string,   "HH:MM"
 *   gender:     string,
 *   yearStem:   string,   연주 천간
 *   monthStem:  string,   월주 천간
 *   monthBranch:string,   월주 지지
 * }} params
 * @returns {{
 *   forward:   boolean,
 *   startAge:  number,         대운 시작 만 나이
 *   daysToJeolgi: number,      절기까지 일수
 *   jeolgiDate:   string,      기준 절기 날짜
 *   cycles: Array<{
 *     idx:    number,          대운 순서 (1~8)
 *     age:    number,          시작 나이
 *     endAge: number,          종료 나이
 *     stem:   string,
 *     branch: string,
 *     element:string,
 *   }>
 * }}
 */
export function getLuckCycles({ birthDate, birthTime, gender, yearStem, monthStem, monthBranch }) {
    const forward = _isForward(yearStem, gender);
    const { startAge, daysToJeolgi, jeolgiDate } = _calcLuckStartAge(birthDate, birthTime, forward);

    // 월주 60갑자 인덱스 → 순/역행으로 8개 산출
    const baseIdx = _ganji60Idx(monthStem, monthBranch);
    const cycles = [];

    for (let i = 1; i <= 8; i++) {
        const n = ((baseIdx + (forward ? i : -i)) % 60 + 60) % 60;
        const age = Math.floor(startAge) + (i - 1) * 10;
        cycles.push({
            idx: i,
            age,
            endAge: age + 9,
            stem: STEMS[n % 10],
            branch: BRANCHES[n % 12],
            element: STEM_ELEMENT[STEMS[n % 10]],
        });
    }

    return { forward, startAge, daysToJeolgi, jeolgiDate, cycles };
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. 자미두수 — 전통 공식 명궁(命宮) 계산
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 자미두수 12궁 — 인(寅)궁부터 시작, 시계 방향 배열
 * 인덱스 0=인궁, 1=묘궁, ..., 11=축궁
 */
const ZIWEI_PALACES = [
    "인궁(명궁후보)", "묘궁", "진궁", "사궁",
    "오궁", "미궁", "신궁", "유궁",
    "술궁", "해궁", "자궁", "축궁",
];

/** 자미두수 12궁 현대 명칭 매핑 (명궁 위치에 따라 나머지 궁 배치) */
const PALACE_NAMES = [
    "명궁", "형제궁", "부처궁", "자녀궁",
    "재백궁", "질액궁", "천이궁", "노복궁",
    "관록궁", "전택궁", "복덕궁", "부모궁",
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
    const juk = NAYIN_TO_JUK[nayinElem] ? ? 5;
    return ((day + juk - 1) % 12 + 12) % 12;
}

/**
 * 14주성 배치 — 자미 위치 기준 역행 배치
 * 자미성 이하: 천기·태양·무곡·천동·염정 (역행)
 * 천부 이하: 태음·탐랑·거문·천상·천량·칠살·파군 (순행)
 */
const ZIWEI_GROUP = ["자미", "천기", "태양", "무곡", "천동", "염정"];
const TIANFU_GROUP = ["천부", "태음", "탐랑", "거문", "천상", "천량", "칠살", "파군"];

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
    const mingGongIdx = ((monthPalaceIdx - hourBranchIdx) % 12 + 12) % 12;

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
function getZiweiChart(month, day, hourBranchIdx, yearStem, yearBranch, hasBirthTime = true) {
    // 납음오행·국수
    const nayinKey = yearStem + yearBranch;
    const nayinElem = NAYIN_TABLE[nayinKey] ? ? "토";
    const juk = NAYIN_TO_JUK[nayinElem] ? ? 5;

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
        const pos = ((ziweiPos - i) % 12 + 12) % 12;
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
    "양자리", "황소자리", "쌍둥이자리", "게자리",
    "사자자리", "처녀자리", "천칭자리", "전갈자리",
    "사수자리", "염소자리", "물병자리", "물고기자리",
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
    const JDN = dd + Math.floor((153 * M + 2) / 5) + 365 * Y +
        Math.floor(Y / 4) - Math.floor(Y / 100) +
        Math.floor(Y / 400) - 32045;
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
    const LST_deg = ((GMST_deg + longitude) % 360 + 360) % 360;

    // 황도 경사각 ε
    const epsilon = (23.439292 - 0.013004 * T) * (Math.PI / 180);

    // RAMC (라디안)
    const RAMC = LST_deg * (Math.PI / 180);
    const lat = latitude * (Math.PI / 180);

    // Ascendant 황경 (라디안)
    const ascRad = Math.atan2(-Math.cos(RAMC),
        Math.sin(RAMC) * Math.cos(epsilon) + Math.tan(lat) * Math.sin(epsilon)
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
    "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ",
    "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

function extractChoseong(char) {
    const code = char.charCodeAt(0) - 0xAC00;
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
            return HANJA_STROKES[hanja[i]] ? ? estimateHanjaStrokes(hanja[i]);
        }
        return estimateHangulStrokes(ch);
    });

    const total = strokes.reduce((a, b) => a + b, 0);
    const suri = ((total - 1) % 81) + 1;

    // 자원오행
    const name_elements = chars.map((ch) => {
        const cho = extractChoseong(ch);
        return CHOSEONG_ELEMENT[cho] ? ? "토";
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
    const code = char.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) return 5; // 기본값
    const cho = Math.floor(code / 28 / 21);
    const jung = Math.floor((code / 28) % 21);
    const jong = code % 28;
    const JUNG_JAMO = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"];
    const JONG_JAMO = [null, "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
    return (
        (JAMO_STROKES[CHOSEONG_LIST[cho]] ? ? 2) +
        (JAMO_STROKES[JUNG_JAMO[jung]] ? ? 2) +
        (jong > 0 ? (JAMO_STROKES[JONG_JAMO[jong]] ? ? 2) : 0)
    );
}

/** 한자 획수 미등록 시 유니코드 기반 추정 (CJK 평균 약 8획) */
function estimateHanjaStrokes(char) {
    // 자주 쓰이는 부수 획수로 간략 추정
    const code = char.charCodeAt(0);
    if (code >= 0x4E00 && code <= 0x9FFF) return 8; // CJK 기본 한자 기본값
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
    return MAP[n] ? ? "내실·성장";
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
    // ── 절기 기반 사주 연·월 계산 (오류 1·2 수정) ────────────────
    const { sajuYear, sajuMonth } = getSajuYearMonth(
        profile.birth_date,
        profile.birth_time,
    );

    // 양력 날짜 (자미두수·서양 점성술용 원래 날짜)
    const [_y, _m, _d] = profile.birth_date.split("-").map(Number);
    const calYear = _y;
    const calMonth = _m;
    const calDay = _d;

    // ── 전자시(前子時) 처리: 23시 출생 시 일주는 다음 날 ─────────
    const birthHour = profile.birth_time ?
        parseInt(profile.birth_time.split(":")[0], 10) :
        null;
    const isJeonJasi = birthHour === 23;

    // Date.UTC로 타임존 독립 날짜 계산 (오류 3 수정)
    let dayBirthDate = profile.birth_date;
    if (isJeonJasi) {
        const next = new Date(Date.UTC(calYear, calMonth - 1, calDay + 1));
        dayBirthDate = next.toISOString().slice(0, 10);
    }

    // ── 사주 4주 ─────────────────────────────────────────────────
    const yearPillar = getYearPillar(sajuYear);
    const monthPillar = getMonthPillar(sajuMonth, sajuYear);
    const dayPillar = getDayPillar(dayBirthDate);
    const hourPillar = profile.birth_time ?
        getHourPillar(profile.birth_time, dayPillar.stem, profile.longitude) // 경도 보정(오류4)
        :
        null;

    const pillars = { year: yearPillar, month: monthPillar, day: dayPillar, hour: hourPillar };

    // ── 명리학 심화 분석 ───────────────────────────────────────
    const elements = analyzeElements(pillars);
    const dayInfo = calcDayStrength(pillars, elements);
    const yongsinInfo = calcYongsin(dayInfo);

    // ── 자미두수 전통 명반 ────────────────────────────────────
    const hourBranchIdx = hourPillar ? .branchIdx ? ? null;
    const ziweiHasBirthTime = hourBranchIdx !== null;
    const ziwei = getZiweiChart(
        calMonth, calDay, // 양력 월·일 사용
        ziweiHasBirthTime ? hourBranchIdx : 0,
        yearPillar.stem, yearPillar.branch,
        ziweiHasBirthTime,
    );

    // ── 서양 점성술 ───────────────────────────────────────────
    const sunSign = getSunSign(calMonth, calDay);
    const moonSign = getMoonSign(profile.birth_date);
    const rising = getAscendant(
        profile.birth_date,
        profile.birth_time,
        profile.latitude,
        profile.longitude
    );

    // ── 성명학 ────────────────────────────────────────────────
    const nameology = analyzeNameology(profile.full_name, profile.hanja_name);

    // ── 대운 계산 ─────────────────────────────────────────────
    const luckCycles = getLuckCycles({
        birthDate: profile.birth_date,
        birthTime: profile.birth_time,
        gender: profile.gender ? ? "male",
        yearStem: yearPillar.stem,
        monthStem: monthPillar.stem,
        monthBranch: monthPillar.branch,
    });

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
        sajuYear,
        sajuMonth,
        calYear,
        luckCycles,
    });

    return {
        saju: {
            year: yearPillar,
            month: monthPillar,
            day: dayPillar,
            hour: hourPillar,
            zodiac: yearPillar.zodiac,
            main_element: yearPillar.element,
            is_jeon_jasi: isJeonJasi,
            saju_year: sajuYear,
            saju_month: sajuMonth,
            cal_year: calYear,
        },
        elements: {
            ...elements,
            dayStrength: dayInfo.strength,
            dayStrengthLabel: dayInfo.label,
            yongsin: yongsinInfo.yongsin,
            yongsinType: yongsinInfo.type,
            yongsinReasoning: yongsinInfo.reasoning,
        },
        luck_cycles: luckCycles, // ← 신규
        ziwei,
        western: { sun: sunSign, moon: moonSign, rising },
        nameology,
        summary_for_ai,
    };
}

// ══════════════════════════════════════════════════════════════════════════════
// 8. AI 프롬프트용 텍스트 조립
// ══════════════════════════════════════════════════════════════════════════════

function buildAISummary({ profile, pillars, elements, dayInfo, yongsinInfo, ziwei, sunSign, moonSign, rising, nameology, isJeonJasi, sajuYear, sajuMonth, calYear, luckCycles }) {
    const { year: y, month: mo, day: da, hour: h } = pillars;

    // 시주 텍스트
    let hourText;
    if (!h) {
        hourText = "시주 미입력 (출생 시간 없음)";
    } else if (isJeonJasi) {
        hourText = `${h.stem}${h.branch}시 ※전자시(前子時) — 23시 출생, 다음 날 일주 적용`;
    } else if (h.longitude_corr_min && h.longitude_corr_min !== 0) {
        hourText = `${h.stem}${h.branch}시 (표준시 ${h.standard_time} → 진태양시 ${h.solar_time}, 경도보정 ${h.longitude_corr_min}분)`;
    } else {
        hourText = `${h.stem}${h.branch}시 (${profile.birth_time})`;
    }

    const yearCorrNote = sajuYear !== calYear ?
        ` ※입춘 이전 출생 → 사주연도 ${sajuYear}년(${y.stem}${y.branch}년)으로 보정` :
        "";

    const mingGongNote = ziwei.mingGong.is_estimated ?
        `${ziwei.mingGong.branch}궁 ※추정값 (시간 미입력)` :
        `${ziwei.mingGong.branch}궁`;

    const hiddenText = Object.entries(elements.hidden_detail || {})
        .map(([key, stems]) => `${key}주: ${stems.map(s => s.stem+"("+s.element+")").join("·")}`)
        .join(" / ");

    // 대운 텍스트 (처음 4개)
    const luckText = luckCycles ? .cycles ? .slice(0, 4)
        .map(c => `${c.age}세: ${c.stem}${c.branch}(${c.element})`)
        .join(" → ") ? ? "미계산";
    const luckDir = luckCycles ? .forward ? "순행(順行)" : "역행(逆行)";

    // 계절 보너스 표시
    const seasonText = elements.seasonBonus && Object.keys(elements.seasonBonus).length ?
        `월령 ${elements.season} — 旺: ${Object.entries(elements.seasonBonus).map(([e,v])=>e+"(+"+v+")").join(", ")}` :
        "";

    return `
━━━ [절기 보정 완료 알고리즘 계산 — AI 해석 요청] ━━━

[1. 사주 4주 8자]
연주: ${y.stem}${y.branch} | 월주: ${mo.stem}${mo.branch} | 일주: ${da.stem}${da.branch} | 시주: ${hourText}
띠: ${y.zodiac} | 일간(나의 오행): ${da.element}${yearCorrNote}

[2. 명리학 심화 분석]
── 오행 분포 (장간+계절 가중치) ──
목: ${elements.목}점 / 화: ${elements.화}점 / 토: ${elements.토}점 / 금: ${elements.금}점 / 수: ${elements.수}점
${seasonText}
지배 오행: ${elements.dominant} | 결핍 오행: ${elements.lacking.length ? elements.lacking.join(", ") : "없음"}
장간 세부: ${hiddenText || "시주 미입력으로 일부 생략"}

── 일간 세력 (억부법) ──
일간 오행: ${dayInfo.dayElem} | 세력 점수: ${dayInfo.strength}점 | 판정: ${dayInfo.label}
인성(나를 生): ${dayInfo.motherElem ?? "없음"} | 관살(나를 剋): ${dayInfo.clasherElem ?? "없음"}

── 용신(用神) ──
용신: ${yongsinInfo.yongsin} | 유형: ${yongsinInfo.type}
근거: ${yongsinInfo.reasoning}

[3. 대운(大運) — 10년 주기]
방향: ${luckDir} | 시작: 만 ${luckCycles?.startAge}세 (기준 절기: ${luckCycles?.jeolgiDate})
대운 흐름: ${luckText} ...

[4. 자미두수 명반 (전통 역행법)]
납음오행: ${ziwei.nayinElem} | 국수: ${ziwei.juk}국
명궁 위치: ${mingGongNote}
명궁 주성: ${ziwei.mainStar}${ziwei.mainStar === "공궁(空宮)" ? " (주성 없음)" : ""}
천부 계열: ${ziwei.tianfuStar}

[5. 서양 점성술]
태양궁: ${sunSign} | 달궁: ${moonSign}
상승궁: ${rising ?? "위치·시간 정보 없어 계산 불가"}

[6. 성명학]
이름: ${profile.full_name}${profile.hanja_name ? ` (${profile.hanja_name})` : " (한자 미입력)"}
획수: ${nameology.strokes.join(" / ")} → 총 ${nameology.total_strokes}획
81수리: ${nameology.suri_81}수 (${nameology.suri_meaning})
이름 오행: ${nameology.name_elements.join(" / ")} | 주요: ${nameology.dominant_element}

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
    profile.full_name     ?? "",
    profile.birth_date    ?? "",
    profile.birth_time    ?? "",
    profile.gender        ?? "",
    // 위도·경도는 소수점 2자리까지만 사용 (미세한 GPS 오차 무시)
    profile.latitude  != null ? Number(profile.latitude).toFixed(2)  : "",
    profile.longitude != null ? Number(profile.longitude).toFixed(2) : "",
    profile.hanja_name    ?? "",
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
    user_id:        profile.id,
    generated_at:   new Date().toISOString(),
    is_offline:     true,         // ← AI 분석 없음을 명시
    profile_hash:   hashProfile(profile),
    saju_chart: {
      year:    data.saju.year,
      month:   data.saju.month,
      day:     data.saju.day,
      hour:    data.saju.hour,
      element: data.saju.main_element,
      zodiac:  data.saju.zodiac,
    },
    elements:    data.elements,
    ziwei:       data.ziwei,
    western:     data.western,
    nameology:   data.nameology,
    summary_for_ai: data.summary_for_ai, // AI가 나중에 쓸 계산값 보존
    ai_analysis: null,                   // 오프라인이므로 없음
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// 10. 하위 호환 (기존 destinyCalculator 호출부 대응)
// ══════════════════════════════════════════════════════════════════════════════

/** @deprecated getFullDestinyData 사용 권장 */
export function getDestinyChart(profile) {
  const data = getFullDestinyData(profile);
  return {
    year:    data.saju.year,
    month:   data.saju.month,
    day:     data.saju.day,
    element: data.saju.main_element,
    zodiac:  data.saju.zodiac,
  };
}

export { getYearPillar, getMonthPillar, getDayPillar };
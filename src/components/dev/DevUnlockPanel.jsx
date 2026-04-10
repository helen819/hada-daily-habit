/**
 * DevUnlockPanel.jsx
 *
 * 사용법:
 * 1. 아무 페이지나 최하단에 <DevUnlockPanel /> 추가
 * 2. 화면 우하단 [DEV] 버튼을 탭하면 패널이 올라옴
 * 3. 배포 전에 제거하거나 DEV_MODE = false 로 끄면 됨
 *
 * 예시 (Home.jsx 등):
 *   import DevUnlockPanel from "@/components/dev/DevUnlockPanel";
 *   ...
 *   return (
 *     <>
 *       ...기존 JSX...
 *       <DevUnlockPanel />
 *     </>
 *   );
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMaxCharmPicks,
  getMaxGoalAnalysis,
  getMaxCheeringLetter,
  getMaxGoalSlots,
  canViewHappinessVault,
  canViewFortune,
  canResetData,
  getNextUnlockMessage,
  getWeekKeyBySunday,
  UNLOCK_TABLE,
  LUCKY_LEVEL_THRESHOLD,
} from "@/config/unlockConfig";

// ▼ 배포 시 false 로 바꾸면 버튼 자체가 사라짐
const DEV_MODE = true;

// 해금 발생 레벨만 추린 프리셋
const LEVEL_PRESETS = [
  1, 2, 3, 5, 8, 13, 15, 21, 25, 34, 37, 42, 55, 58, 63, 67, 73, 83, 89, 91,
  100, 102, 103, 105, 108, 113, 115, 121, 125, 134, 137, 140,
];

function fmt(n) {
  return n === 999 ? "무제한" : String(n);
}
function StatusBadge({ ok, label }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold ${
        ok
          ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
          : "bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-400"
      }`}
    >
      {label ?? (ok ? "가능" : "잠금")}
    </span>
  );
}

function CountBadge({ text }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
      {text}
    </span>
  );
}

function Row({ label, right }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-purple-900/30 last:border-0">
      <span className="text-xs text-gray-500 dark:text-violet-200">
        {label}
      </span>
      <div>{right}</div>
    </div>
  );
}

function Counter({ value, onChange, max }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-[#2A2845] text-gray-600 dark:text-gray-300 flex items-center justify-center text-sm font-bold active:scale-90"
      >
        −
      </button>
      <span className="text-sm font-bold text-gray-800 dark:text-gray-100 min-w-[28px] text-center">
        {value}
      </span>
      <button
        onClick={() =>
          onChange(max === 999 ? value + 1 : Math.min(value + 1, max))
        }
        className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-[#2A2845] text-gray-600 dark:text-gray-300 flex items-center justify-center text-sm font-bold active:scale-90"
      >
        +
      </button>
      <span className="text-[11px] text-gray-400">/ {fmt(max)}</span>
    </div>
  );
}

export default function DevUnlockPanel() {
  if (!DEV_MODE) return null;

  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // 사용 횟수 시뮬레이터
  const [charmUsed, setCharmUsed] = useState(0);
  const [analysisUsed, setAnalysisUsed] = useState(0);
  const [letterUsed, setLetterUsed] = useState(0);

  const { data: profiles = [] } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => base44.entities.UserProfile.list(),
  });
  const profile = profiles[0];
  const level = profile?.level || 1;
  const weekKey = getWeekKeyBySunday();

  // 실제 스토리지에서 사용 횟수 로드
  useEffect(() => {
    if (!profile || !open) return;
    const load = async () => {
      const c = await base44.storage.get("pickCount");
      const a = await base44.storage.get(
        `analysis_used_${profile.id}_${weekKey}`,
      );
      const l = await base44.storage.get(
        `cheering_used_${profile.id}_${weekKey}`,
      );
      setCharmUsed(Number(c) || 0);
      setAnalysisUsed(Number(a) || 0);
      setLetterUsed(Number(l) || 0);
    };
    load();
  }, [profile?.id, open, weekKey]);

  if (!profile) return null;

  // ─── 계산값 ───────────────────────────────────────────────
  const maxCharm = getMaxCharmPicks(level);
  const maxAnalysis = getMaxGoalAnalysis(level);
  const maxLetter = getMaxCheeringLetter(level);
  const maxSlots = getMaxGoalSlots(level);
  const isLucky = level >= LUCKY_LEVEL_THRESHOLD;
  const nextMsg = getNextUnlockMessage(level);
  const nextUnlock = UNLOCK_TABLE.find((u) => u.level > level);

  // ─── 레벨 직접 변경 ────────────────────────────────────────
  const setLevel = async (lv) => {
    await base44.entities.UserProfile.update(profile.id, {
      level: lv,
      xp: (lv - 1) * 100,
    });
    queryClient.invalidateQueries({ queryKey: ["userProfile"] });
  };

  // ─── 사용 횟수 스토리지 직접 쓰기 ──────────────────────────
  const saveCharmUsed = async (v) => {
    setCharmUsed(v);
    await base44.storage.set("pickCount", v);
    await base44.storage.set(
      "lastPickDate",
      new Date().toISOString().split("T")[0],
    );
  };
  const saveAnalysisUsed = async (v) => {
    setAnalysisUsed(v);
    await base44.storage.set(`analysis_used_${profile.id}_${weekKey}`, v);
  };
  const saveLetterUsed = async (v) => {
    setLetterUsed(v);
    await base44.storage.set(`cheering_used_${profile.id}_${weekKey}`, v);
  };

  // ─── 버튼 상태 텍스트 ─────────────────────────────────────
  function btnStatus(locked, used, max) {
    if (locked) return <StatusBadge ok={false} label="잠금" />;
    if (max === 999) return <StatusBadge ok={true} label="무제한" />;
    if (used >= max)
      return <StatusBadge ok={false} label={`한도 초과 ${used}/${max}`} />;
    return <StatusBadge ok={true} label={`가능 ${used}/${max}`} />;
  }

  return (
    <>
      {/* ── 토글 버튼 ── */}
      <div style={{ position: "fixed", bottom: 90, right: 16, zIndex: 9999 }}>
        <button
          onClick={() => setOpen((p) => !p)}
          className="w-12 h-12 rounded-2xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[11px] font-black flex items-center justify-center shadow-lg active:scale-95"
        >
          {open ? <X className="w-4 h-4" /> : "DEV"}
        </button>
      </div>

      {/* ── 패널 시트 ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 9998,
            }}
            className="bg-white dark:bg-[#0F0E17] rounded-t-[28px] shadow-2xl border-t border-gray-200 dark:border-purple-900/30 max-h-[88vh] overflow-y-auto"
          >
            {/* 핸들 */}
            <div className="sticky top-0 bg-white dark:bg-[#0F0E17] pt-4 pb-2 px-5 z-10 border-b border-gray-100 dark:border-purple-900/30">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-700 mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">
                    DEV PANEL
                  </p>
                  <p className="text-base font-black text-gray-900 dark:text-white">
                    해금 테스트 도구
                  </p>
                </div>
                <span
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl ${
                    isLucky
                      ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                      : "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300"
                  }`}
                >
                  {isLucky ? "🍀 행운 레벨" : `레벨 ${level}`}
                </span>
              </div>
            </div>

            <div className="px-5 py-4 space-y-5">
              {/* ── 1. 레벨 슬라이더 ── */}
              <div>
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  레벨 조절
                </p>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="range"
                    min={1}
                    max={140}
                    step={1}
                    value={level}
                    onChange={(e) => setLevel(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-black text-gray-800 dark:text-gray-100 w-8 text-right">
                    {level}
                  </span>
                </div>

                {/* 프리셋 버튼 */}
                <div className="flex flex-wrap gap-1.5">
                  {LEVEL_PRESETS.map((lv) => (
                    <button
                      key={lv}
                      onClick={() => setLevel(lv)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                        lv === level
                          ? "bg-violet-500 text-white border-violet-500"
                          : "bg-gray-50 dark:bg-[#2A2845] text-gray-600 dark:text-violet-200 border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      {lv}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── 2. 사용 횟수 조작 ── */}
              <div>
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  사용 횟수 시뮬레이터
                </p>
                <div className="space-y-1">
                  <Row
                    label="행운 뽑기 (오늘 사용)"
                    right={
                      <Counter
                        value={charmUsed}
                        onChange={saveCharmUsed}
                        max={maxCharm}
                      />
                    }
                  />
                  <Row
                    label="HADA 분석 (이번 주 사용)"
                    right={
                      <Counter
                        value={analysisUsed}
                        onChange={saveAnalysisUsed}
                        max={maxAnalysis}
                      />
                    }
                  />
                  <Row
                    label="응원 메시지 (이번 주 사용)"
                    right={
                      <Counter
                        value={letterUsed}
                        onChange={saveLetterUsed}
                        max={maxLetter}
                      />
                    }
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-2">
                  ※ 실제 스토리지에 반영됩니다. 앱을 새로고침하면 바로 반영돼요.
                </p>
              </div>

              {/* ── 3. 현재 레벨 해금 상태 ── */}
              <div>
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  해금 상태
                </p>
                <div className="space-y-1">
                  <Row
                    label="행운 뽑기 한도"
                    right={<CountBadge text={`하루 ${fmt(maxCharm)}회`} />}
                  />
                  <Row
                    label="HADA 분석 한도"
                    right={<CountBadge text={`주 ${fmt(maxAnalysis)}회`} />}
                  />
                  <Row
                    label="응원 메시지 한도"
                    right={<CountBadge text={`주 ${fmt(maxLetter)}회`} />}
                  />
                  <Row
                    label="목표 슬롯"
                    right={<CountBadge text={`최대 ${fmt(maxSlots)}개`} />}
                  />
                  <Row
                    label="행복 보관함"
                    right={<StatusBadge ok={canViewHappinessVault(level)} />}
                  />
                  <Row label="오늘의 운세" right={<StatusBadge ok={true} />} />
                  <Row
                    label="재물운"
                    right={<StatusBadge ok={canViewFortune(level, "wealth")} />}
                  />
                  <Row
                    label="건강운"
                    right={<StatusBadge ok={canViewFortune(level, "health")} />}
                  />
                  <Row
                    label="애정운"
                    right={<StatusBadge ok={canViewFortune(level, "love")} />}
                  />
                  <Row
                    label="취업운"
                    right={<StatusBadge ok={canViewFortune(level, "career")} />}
                  />
                  <Row
                    label="종합운세"
                    right={
                      <StatusBadge ok={canViewFortune(level, "summary")} />
                    }
                  />
                  <Row
                    label="데이터 초기화"
                    right={<StatusBadge ok={canResetData(level)} />}
                  />
                  {isLucky && (
                    <Row
                      label="행운 레벨 모드"
                      right={<StatusBadge ok={true} label="활성" />}
                    />
                  )}
                </div>
              </div>

              {/* ── 4. 버튼 상태 미리보기 ── */}
              <div>
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  버튼 활성화 미리보기
                  <span className="ml-1 normal-case font-normal text-gray-300">
                    (현재 사용 횟수 기준)
                  </span>
                </p>
                <div className="space-y-1">
                  <Row
                    label="행운 뽑기 버튼"
                    right={btnStatus(maxCharm === 0, charmUsed, maxCharm)}
                  />
                  <Row
                    label="HADA 분석 버튼"
                    right={btnStatus(
                      maxAnalysis === 0,
                      analysisUsed,
                      maxAnalysis,
                    )}
                  />
                  <Row
                    label="응원 메시지 버튼"
                    right={btnStatus(maxLetter === 0, letterUsed, maxLetter)}
                  />
                  <Row
                    label="행복 보관함 버튼"
                    right={
                      <StatusBadge
                        ok={canViewHappinessVault(level)}
                        label={
                          canViewHappinessVault(level)
                            ? "사용 가능"
                            : "잠금 (Lv.15)"
                        }
                      />
                    }
                  />
                  <Row
                    label="초기화 버튼"
                    right={
                      <StatusBadge
                        ok={canResetData(level)}
                        label={
                          canResetData(level) ? "사용 가능" : "잠금 (Lv.89)"
                        }
                      />
                    }
                  />
                </div>
              </div>

              {/* ── 5. 다음 해금 안내 미리보기 ── */}
              <div>
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  프로필 화면 다음 해금 문구
                </p>
                <div className="bg-violet-50 dark:bg-violet-950/40 rounded-2xl p-4 border border-violet-100 dark:border-violet-900/40">
                  <p className="text-sm font-semibold text-violet-800 dark:text-violet-200 leading-relaxed">
                    {nextMsg}
                  </p>
                  {nextUnlock && !isLucky && (
                    <p className="text-[11px] text-violet-500 dark:text-violet-400 mt-2">
                      다음 해금: 레벨 {nextUnlock.level} — {nextUnlock.label}
                    </p>
                  )}
                </div>
              </div>

              {/* ── 6. 빠른 리셋 ── */}
              <div>
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  빠른 초기화
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      await saveCharmUsed(0);
                      await saveAnalysisUsed(0);
                      await saveLetterUsed(0);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-[#2A2845] text-gray-600 dark:text-gray-300 text-xs font-bold active:scale-95"
                  >
                    사용 횟수 초기화
                  </button>
                  <button
                    onClick={() => setLevel(1)}
                    className="flex-1 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 text-xs font-bold active:scale-95 border border-red-100 dark:border-red-900/40"
                  >
                    레벨 1로 리셋
                  </button>
                </div>
              </div>

              <div className="pb-4">
                <p className="text-[10px] text-center text-gray-300 dark:text-gray-700">
                  DEV_MODE = true 일 때만 표시됩니다
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

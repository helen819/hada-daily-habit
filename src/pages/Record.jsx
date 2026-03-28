import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Sparkles,
  X,
  CheckCircle2,
  Circle,
  Heart,
} from "lucide-react";

import MiniCalendar from "@/components/calendar/MiniCalendar";
import HappinessInput from "@/components/happiness/HappinessInput";
import HappinessCard from "@/components/happiness/HappinessCard";
import HappinessPoster from "@/components/happiness/HappinessPoster";
import FireworksEffect from "@/components/happiness/FireworksEffect";
import AdModal from "@/components/shop/AdModal";
import { getKSTDateString } from "@/utils/date";

// ─── 날짜 팝업: 배지 + 그날의 목표별 GoalTodo ──────────────────
function DayPopup({ date, badges, goalTodos, goals, onClose }) {
  const formattedDate = date
    ? `${parseInt(date.slice(5, 7))}월 ${parseInt(date.slice(8, 10))}일`
    : "";

  // 목표별로 그룹핑
  const byGoal = useMemo(() => {
    const map = {};
    (goalTodos || []).forEach((t) => {
      const gid = t.goal_id || "__none__";
      if (!map[gid]) map[gid] = [];
      map[gid].push(t);
    });
    return map;
  }, [goalTodos]);

  const BADGE_LABELS = {
    heart: { emoji: "💕", label: "행복 기록 있음" },
    fire: { emoji: "🔥", label: "할일 70% 이상 완료" },
    rest: { emoji: "😴", label: "할일 거의 미완료" },
    star: { emoji: "⭐", label: "일정 3개 이상" },
  };

  const hasTodos = goalTodos && goalTodos.length > 0;
  const hasBadges = badges && badges.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-[32px] px-6 pt-5 pb-10 shadow-2xl max-h-[70vh] overflow-y-auto"
      >
        {/* 핸들 */}
        <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto mb-5" />

        {/* 날짜 헤더 */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-0.5">
              HADA
            </p>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">
              {formattedDate}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 배지 */}
        {hasBadges && (
          <div className="flex flex-wrap gap-2 mb-5">
            {badges.map((badge) => {
              const b = BADGE_LABELS[badge];
              if (!b) return null;
              return (
                <div
                  key={badge}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                >
                  <span className="text-sm">{b.emoji}</span>
                  <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
                    {b.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* 할일 기록 */}
        {hasTodos ? (
          <div className="space-y-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              이날의 실천 기록
            </p>

            {Object.entries(byGoal).map(([gid, todos]) => {
              const goal = goals.find((g) => g.id === gid);
              const done = todos.filter((t) => t.completed);
              const pending = todos.filter((t) => !t.completed);

              return (
                <div
                  key={gid}
                  className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
                >
                  {/* 목표 라벨 */}
                  {goal && (
                    <div className="px-4 py-2.5 bg-purple-50 dark:bg-purple-900/20 border-b border-gray-100 dark:border-gray-800">
                      <p className="text-xs font-black text-purple-600 dark:text-purple-400">
                        🎯 {goal.title}
                      </p>
                    </div>
                  )}
                  {!goal && gid === "__none__" && (
                    <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800">
                      <p className="text-xs font-black text-gray-400">
                        목표 없음
                      </p>
                    </div>
                  )}

                  <div className="px-4 py-2 divide-y divide-gray-50 dark:divide-gray-800">
                    {/* 완료 */}
                    {done.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 py-2.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        <span className="text-sm line-through text-gray-400 flex-1">
                          {t.title}
                        </span>
                        <span className="text-[10px] font-bold text-purple-400">
                          완료
                        </span>
                      </div>
                    ))}
                    {/* 미완료 */}
                    {pending.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 py-2.5"
                      >
                        <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                        <span className="text-sm text-gray-600 dark:text-gray-300 flex-1">
                          {t.title}
                        </span>
                        <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600">
                          미완료
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-2xl mb-2">📋</p>
            <p className="text-sm font-bold text-gray-400">
              이날의 실천 기록이 없어요
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Record 메인
// ═══════════════════════════════════════════════════════════════════
export default function Record() {
  const queryClient = useQueryClient();
  const today = getKSTDateString();

  // ─── 캘린더 상태 ────────────────────────────────────────────
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDayPopup, setShowDayPopup] = useState(false);

  // ─── 행복 기록 상태 ─────────────────────────────────────────
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryLoaded, setSummaryLoaded] = useState(false); // 캐시 로드 완료 여부
  const [showAd, setShowAd] = useState(false);
  const [showPoster, setShowPoster] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);
  const [fullRecords, setFullRecords] = useState([]);
  const [isFetchingFull, setIsFetchingFull] = useState(false);

  // ─── 데이터 쿼리 ────────────────────────────────────────────
  const { data: profiles = [] } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => base44.entities.UserProfile.list(),
  });
  const profile = profiles[0];

  const { data: happinessRecords = [], isLoading: hapLoading } = useQuery({
    queryKey: ["happinessRecords"],
    queryFn: () => base44.entities.HappinessRecord.list("-created_at", 10),
  });

  // 전체 GoalTodo (날짜별 기록용)
  const { data: allGoalTodos = [] } = useQuery({
    queryKey: ["allGoalTodosEver", profile?.id],
    queryFn: async () => {
      const all = await base44.entities.GoalTodo.list();
      return all.filter((t) => t.user_profile_id === profile.id);
    },
    enabled: !!profile?.id,
  });

  // 목표 목록 (이름 표시용)
  const { data: goals = [] } = useQuery({
    queryKey: ["goals", profile?.id],
    queryFn: async () => {
      const all = await base44.entities.Goal.list();
      return all.filter((g) => g.user_profile_id === profile.id);
    },
    enabled: !!profile?.id,
  });

  // ─── 캘린더 배지 계산 (행복 기록 + GoalTodo) ────────────────
  const dateBadges = useMemo(() => {
    const map = {};

    // 행복 기록 → heart
    happinessRecords.forEach((r) => {
      if (!r.date) return;
      if (!map[r.date]) map[r.date] = new Set();
      map[r.date].add("heart");
    });

    // GoalTodo 완료율 → fire / rest
    const todosByDate = {};
    allGoalTodos.forEach((t) => {
      const date = t.date;
      if (!date) return;
      if (!todosByDate[date]) todosByDate[date] = { total: 0, done: 0 };
      todosByDate[date].total++;
      if (t.completed) todosByDate[date].done++;
    });
    Object.entries(todosByDate).forEach(([date, { total, done }]) => {
      if (!map[date]) map[date] = new Set();
      const ratio = total > 0 ? done / total : 0;
      if (total >= 2 && ratio >= 0.7) map[date].add("fire");
      else if (total > 0 && ratio <= 0.2) map[date].add("rest");
    });

    // Set → Array
    const result = {};
    Object.entries(map).forEach(([date, set]) => {
      result[date] = [...set];
    });
    return result;
  }, [happinessRecords, allGoalTodos]);

  // 날짜 클릭: 배지나 할일이 있는 날짜만 팝업
  const handleDateSelect = (date) => {
    const hasBadge = (dateBadges[date]?.length ?? 0) > 0;
    const hasTodo = allGoalTodos.some((t) => t.date === date);

    if (hasBadge || hasTodo) {
      setSelectedDate(date);
      setShowDayPopup(true);
    } else {
      setSelectedDate(null);
      setShowDayPopup(false);
    }
  };

  const handleMonthChange = (delta) => {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    if (m > 11) {
      m = 0;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  };

  // 선택 날짜의 GoalTodo
  const selectedDayTodos = useMemo(
    () => allGoalTodos.filter((t) => t.date === selectedDate),
    [allGoalTodos, selectedDate],
  );

  // ─── 행복 기록 ───────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.HappinessRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["happinessRecords"] });
      setShowFireworks(true);
      setTimeout(() => setShowFireworks(false), 1200);
      // 요약 재생성은 useEffect의 기록 개수 증가 감지로 자동 처리됨
    },
  });

  const handleOpenStorage = async () => {
    setShowAd(true);
    setIsFetchingFull(true);
    try {
      const allData = await base44.entities.HappinessRecord.list("created_at");
      setFullRecords(allData);
    } catch (e) {
      console.error("전체 기록 조회 실패:", e);
    } finally {
      setIsFetchingFull(false);
    }
  };

  const SUMMARY_CACHE_KEY = "happiness_summary_cache";

  // 캐시에서 요약 불러오기 (탭 복귀 시)
  React.useEffect(() => {
    if (summaryLoaded) return;
    const load = async () => {
      const cached = await base44.storage.get(SUMMARY_CACHE_KEY);
      if (cached) {
        try {
          setSummary(JSON.parse(cached));
        } catch {}
      }
      setSummaryLoaded(true);
    };
    load();
  }, []);

  // 새 기록이 추가된 경우에만 재생성 (기록 개수 증가 감지)
  const prevCountRef = React.useRef(null);
  React.useEffect(() => {
    if (!summaryLoaded) return;
    if (happinessRecords.length < 3) return;

    const currentCount = happinessRecords.length;

    // 최초 마운트 시 캐시가 없으면 생성, 있으면 스킵
    if (prevCountRef.current === null) {
      prevCountRef.current = currentCount;
      if (!summary) generateSummary();
      return;
    }

    // 기록 개수가 늘어난 경우에만 재생성
    if (currentCount > prevCountRef.current) {
      prevCountRef.current = currentCount;
      generateSummary();
    }
  }, [happinessRecords, summaryLoaded]);

  const generateSummary = async () => {
    if (happinessRecords.length < 3) return;
    setSummaryLoading(true);
    const texts = happinessRecords.slice(0, 10).map((r) => r.text);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `너는 사용자의 '행복 기록을 모아서'
                따뜻하게 요약하는 엔진이다.

                최근 기록 ${texts.length}개:
                ${JSON.stringify(texts)}

                [작성 규칙]
                - header_text: 25자 이내. 감정 담은 제목형 문구.
                  줄바꿈 금지.
                - encouragement: 50자 이내.
                  '지금도 충분히 잘하고 있다' 메시지 필수.
                  줄바꿈 금지. 비교·경쟁 표현 금지.
                - 기록에 없는 내용 추측 금지.`,
        response_json_schema: {
          type: "object",
          properties: {
            header_text: { type: "string" },
            encouragement: { type: "string" },
          },
        },
      });
      setSummary(res);
      // 스토리지에 캐싱
      await base44.storage.set(SUMMARY_CACHE_KEY, JSON.stringify(res));
    } catch (e) {
      console.error("요약 생성 실패:", e);
    } finally {
      setSummaryLoading(false);
    }
  };

  const latestRecords = useMemo(() => {
    return [...happinessRecords]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 3);
  }, [happinessRecords]);

  // 마킹된 날짜 목록 (배지 있는 날)
  const markedDates = useMemo(() => Object.keys(dateBadges), [dateBadges]);

  return (
    <div className="min-h-screen bg-[#FDFCFE] dark:bg-gray-950 pb-32 transition-colors duration-300">
      <FireworksEffect visible={showFireworks} />

      <AnimatePresence>
        {showPoster && (
          <HappinessPoster
            records={fullRecords}
            onClose={() => setShowPoster(false)}
          />
        )}
      </AnimatePresence>

      <AdModal
        visible={showAd}
        onClose={() => {
          setShowAd(false);
          setShowPoster(true);
        }}
      />

      {/* ── 헤더 ─────────────────────────────────────────────── */}
      <div className="px-6 pt-12 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em] mb-2">
            HADA
          </p>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
            기록
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-semibold">
            날짜를 눌러 그날의 기록을 확인해요
          </p>
        </motion.div>
      </div>

      <div className="px-5 space-y-5">
        {/* ── 캘린더 ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white dark:bg-gray-900 rounded-[32px] shadow-[0_8px_40px_rgba(120,50,255,0.06)] border border-purple-50 dark:border-gray-800 overflow-hidden"
        >
          <MiniCalendar
            year={year}
            month={month}
            selectedDate={selectedDate}
            markedDates={markedDates}
            dateKeywords={{}}
            categoryColors={{}}
            dateBadges={dateBadges}
            onDateSelect={handleDateSelect}
            onMonthChange={handleMonthChange}
          />
        </motion.div>

        {/* ── 행복 기록 입력 ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2.5 mb-3 px-1">
            <div className="w-2 h-6 bg-pink-400 rounded-full" />
            <p className="text-sm font-black text-gray-800 dark:text-gray-100">
              오늘의 행복 기록
            </p>
          </div>
          <HappinessInput
            onSubmit={(data) => createMutation.mutate(data)}
            isSubmitting={createMutation.isPending}
          />
        </motion.div>

        {/* ── AI 요약 ──────────────────────────────────────────── */}
        <AnimatePresence>
          {summaryLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 py-3"
            >
              <Loader2 className="w-4 h-4 animate-spin text-pink-400" />
              <span className="text-xs font-semibold text-gray-400">
                요약 생성 중...
              </span>
            </motion.div>
          )}

          {summary && !summaryLoading && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-[24px] p-5 border border-pink-50 dark:border-pink-900/30 shadow-[0_4px_20px_rgba(236,72,153,0.07)]"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-pink-500 dark:text-pink-400" />
                </div>
                <p className="text-[10px] font-black text-pink-500 dark:text-pink-400 uppercase tracking-widest">
                  HADA 요약
                </p>
              </div>
              <p className="text-sm font-bold text-gray-800 dark:text-white mb-1.5 leading-snug">
                {summary.header_text}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                {summary.encouragement}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 최근 행복 기록 3개 ──────────────────────────────── */}
        {latestRecords.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center gap-2.5 mb-3 px-1">
              <div className="w-2 h-6 bg-pink-300 rounded-full" />
              <p className="text-sm font-black text-gray-800 dark:text-gray-100">
                최근 기록
              </p>
            </div>
            <div className="space-y-3">
              {latestRecords.map((record, i) => (
                <HappinessCard key={record.id} record={record} index={i} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── 행복 보관함 버튼 ────────────────────────────────── */}
        {happinessRecords.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={handleOpenStorage}
            className="w-full bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/40 dark:to-rose-950/40 border border-pink-100 dark:border-pink-900/50 rounded-[28px] px-6 py-5 flex flex-col items-center gap-3 active:scale-[0.98] transition-transform shadow-sm"
          >
            <div className="text-4xl">✨</div>
            <div>
              <p className="text-sm font-black text-pink-700 dark:text-pink-400 text-center">
                행복 보관함
              </p>
              <p className="text-xs text-pink-500 dark:text-pink-500 text-center mt-0.5">
                모든 행복 기록 모아보기
              </p>
            </div>
          </motion.button>
        )}
      </div>

      {/* ── 날짜 팝업 ────────────────────────────────────────── */}
      <AnimatePresence>
        {showDayPopup && selectedDate && (
          <DayPopup
            key={selectedDate}
            date={selectedDate}
            badges={dateBadges[selectedDate] || []}
            goalTodos={selectedDayTodos}
            goals={goals}
            onClose={() => {
              setShowDayPopup(false);
              setSelectedDate(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

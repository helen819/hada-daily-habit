import React, { useState, useEffect, useMemo } from "react";
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
  CalendarDays,
  Lock,
} from "lucide-react";

import MiniCalendar from "@/components/calendar/MiniCalendar";
import HappinessInput from "@/components/happiness/HappinessInput";
import HappinessCard from "@/components/happiness/HappinessCard";
import HappinessPoster from "@/components/happiness/HappinessPoster";
import FireworksEffect from "@/components/happiness/FireworksEffect";
import AdModal from "@/components/shop/AdModal";
import { getKSTDateString } from "@/utils/date";

import { canViewHappinessVault } from "@/config/unlockConfig";

export default function Record() {
  const queryClient = useQueryClient();
  const today = getKSTDateString();

  const [activeTab, setActiveTab] = useState("calendar");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(null);

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryLoaded, setSummaryLoaded] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [showPoster, setShowPoster] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);
  const [fullRecords, setFullRecords] = useState([]);
  const [isFetchingFull, setIsFetchingFull] = useState(false);

  const { data: profiles = [] } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => base44.entities.UserProfile.list(),
  });
  const profile = profiles[0];
  const level = profile?.level || 1;
  const vaultUnlocked = canViewHappinessVault(level);

  const { data: happinessRecords = [], isLoading: hapLoading } = useQuery({
    queryKey: ["happinessRecords"],
    queryFn: () => base44.entities.HappinessRecord.list("-created_at", 10),
  });

  const { data: allGoalTodos = [] } = useQuery({
    queryKey: ["allGoalTodosEver", profile?.id],
    queryFn: async () => {
      const all = await base44.entities.GoalTodo.list();
      return all.filter((t) => t.user_profile_id === profile.id);
    },
    enabled: !!profile?.id,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["goals", profile?.id],
    queryFn: async () => {
      const all = await base44.entities.Goal.list();
      return all.filter((g) => g.user_profile_id === profile.id);
    },
    enabled: !!profile?.id,
  });

  const dateBadges = useMemo(() => {
    const map = {};
    happinessRecords.forEach((r) => {
      if (!r.date) return;
      if (!map[r.date]) map[r.date] = new Set();
      map[r.date].add("heart");
    });
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
    const result = {};
    Object.entries(map).forEach(([date, set]) => {
      result[date] = [...set];
    });
    return result;
  }, [happinessRecords, allGoalTodos]);

  const handleDateSelect = (date) => {
    setSelectedDate((prev) => (prev === date ? null : date));
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

  const selectedDayTodos = useMemo(
    () => allGoalTodos.filter((t) => t.date === selectedDate),
    [allGoalTodos, selectedDate],
  );

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.HappinessRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["happinessRecords"] });
      setShowFireworks(true);
      setTimeout(() => setShowFireworks(false), 1200);
    },
  });

  const handleOpenStorage = async () => {
    if (!vaultUnlocked) return;
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

  useEffect(() => {
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

  const prevCountRef = React.useRef(null);
  useEffect(() => {
    if (!summaryLoaded) return;
    if (happinessRecords.length < 3) return;
    const currentCount = happinessRecords.length;
    if (prevCountRef.current === null) {
      prevCountRef.current = currentCount;
      if (!summary) generateSummary();
      return;
    }
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

  const markedDates = useMemo(() => Object.keys(dateBadges), [dateBadges]);

  const TABS = [
    { key: "calendar", label: "캘린더", icon: CalendarDays },
    { key: "happiness", label: "행복", icon: Heart },
  ];

  return (
    <div className="min-h-screen bg-[#FDFCFE] dark:bg-[#0F0E17] pb-32 transition-colors duration-300">
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

      <div className="px-6 pt-12 pb-4">
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
        </motion.div>
      </div>

      <div className="px-5 mb-5">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex bg-gray-100 dark:bg-[#2A2845]/60 rounded-2xl p-1 gap-1"
        >
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all duration-200 ${
                activeTab === key
                  ? "bg-white dark:bg-[#1A1830] text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-400 dark:text-violet-300/70"
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  activeTab === key
                    ? key === "happiness"
                      ? "text-pink-400"
                      : "text-purple-500"
                    : ""
                }`}
              />
              {label}
            </button>
          ))}
        </motion.div>
      </div>

      <div className="px-5">
        <AnimatePresence mode="wait">
          {/* ── 캘린더 탭 ── */}
          {activeTab === "calendar" && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div className="bg-white dark:bg-[#1A1830] rounded-[32px] shadow-[0_8px_40px_rgba(120,50,255,0.06)] border border-purple-50 dark:border-purple-900/30 overflow-hidden">
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
              </div>

              <AnimatePresence>
                {selectedDate && (
                  <motion.div
                    key={selectedDate}
                    initial={{ opacity: 0, height: 0, y: -8 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -8 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white dark:bg-[#1A1830] rounded-[28px] border border-gray-100 dark:border-purple-900/30 shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 dark:border-purple-900/30">
                        <div>
                          <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-0.5">
                            HADA
                          </p>
                          <p className="text-base font-black text-gray-900 dark:text-white">
                            {selectedDate
                              ? `${parseInt(
                                  selectedDate.slice(5, 7),
                                )}월 ${parseInt(selectedDate.slice(8, 10))}일`
                              : ""}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedDate(null)}
                          className="p-2 rounded-xl bg-gray-100 dark:bg-[#2A2845] text-gray-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {(dateBadges[selectedDate]?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-2 px-5 pt-4">
                          {dateBadges[selectedDate].map((badge) => {
                            const BADGE_LABELS = {
                              heart: { emoji: "💕", label: "행복 기록 있음" },
                              fire: {
                                emoji: "🔥",
                                label: "할일 70% 이상 완료",
                              },
                              rest: { emoji: "😴", label: "할일 거의 미완료" },
                              star: { emoji: "⭐", label: "일정 3개 이상" },
                            };
                            const b = BADGE_LABELS[badge];
                            if (!b) return null;
                            return (
                              <div
                                key={badge}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-[#2A2845] border border-gray-100 dark:border-gray-700"
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

                      <div className="px-5 py-4">
                        {selectedDayTodos.length > 0 ? (
                          <div className="space-y-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              이날의 실천 기록
                            </p>
                            {Object.entries(
                              selectedDayTodos.reduce((map, t) => {
                                const gid = t.goal_id || "__none__";
                                if (!map[gid]) map[gid] = [];
                                map[gid].push(t);
                                return map;
                              }, {}),
                            ).map(([gid, todos]) => {
                              const goal = goals.find((g) => g.id === gid);
                              const done = todos.filter((t) => t.completed);
                              const pending = todos.filter((t) => !t.completed);
                              return (
                                <div
                                  key={gid}
                                  className="rounded-2xl border border-gray-100 dark:border-purple-900/30 overflow-hidden"
                                >
                                  {goal && (
                                    <div className="px-4 py-2.5 bg-purple-50 dark:bg-purple-900/20 border-b border-gray-100 dark:border-purple-900/30">
                                      <p className="text-xs font-black text-purple-600 dark:text-purple-400 break-keep">
                                        🎯 {goal.title}
                                      </p>
                                    </div>
                                  )}
                                  <div className="px-4 py-1 divide-y divide-gray-50 dark:divide-gray-800">
                                    {done.map((t) => (
                                      <div
                                        key={t.id}
                                        className="flex items-center gap-3 py-2.5"
                                      >
                                        <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                        <span className="text-sm text-gray-400 flex-1 break-keep">
                                          {t.title}
                                        </span>
                                        <span className="text-[10px] font-bold text-purple-400">
                                          완료
                                        </span>
                                      </div>
                                    ))}
                                    {pending.map((t) => (
                                      <div
                                        key={t.id}
                                        className="flex items-center gap-3 py-2.5"
                                      >
                                        <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                                        <span className="text-sm text-gray-600 dark:text-gray-300 flex-1 break-keep">
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
                          <div className="py-6 text-center">
                            <p className="text-2xl mb-2">📋</p>
                            <p className="text-sm font-bold text-gray-400">
                              이날의 실천 기록이 없어요
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!selectedDate && (
                <p className="text-xs text-gray-400 dark:text-violet-300/70 text-center font-semibold">
                  날짜를 눌러 그날의 기록을 확인해요
                </p>
              )}
            </motion.div>
          )}

          {/* ── 행복 탭 ── */}
          {activeTab === "happiness" && (
            <motion.div
              key="happiness"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div>
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
              </div>

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
                    className="bg-white dark:bg-[#1A1830] rounded-[24px] p-5 border border-pink-50 dark:border-pink-900/30 shadow-[0_4px_20px_rgba(236,72,153,0.07)]"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-pink-500 dark:text-pink-400" />
                      </div>
                      <p className="text-[10px] font-black text-pink-500 dark:text-pink-400 uppercase tracking-widest">
                        HADA 요약
                      </p>
                    </div>
                    <p className="text-sm font-bold text-gray-800 dark:text-white mb-1.5 leading-snug break-keep">
                      {summary.header_text}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-violet-200 leading-relaxed break-keep">
                      {summary.encouragement}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {latestRecords.length > 0 && (
                <div>
                  <div className="flex items-center gap-2.5 mb-3 px-1">
                    <div className="w-2 h-6 bg-pink-300 rounded-full" />
                    <p className="text-sm font-black text-gray-800 dark:text-gray-100">
                      최근 기록
                    </p>
                  </div>
                  <div className="space-y-3">
                    {latestRecords.map((record, i) => (
                      <HappinessCard
                        key={record.id}
                        record={record}
                        index={i}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 행복 보관함 버튼 */}
              {happinessRecords.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  onClick={handleOpenStorage}
                  disabled={!vaultUnlocked}
                  className={`w-full rounded-[28px] px-6 py-5 flex flex-col items-center gap-3 active:scale-[0.98] transition-transform shadow-sm ${
                    vaultUnlocked
                      ? "bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/40 dark:to-rose-950/40 border border-pink-100 dark:border-pink-900/50"
                      : "bg-gray-50 dark:bg-[#2A2845]/50 border border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-70"
                  }`}
                >
                  <div className="text-4xl">{vaultUnlocked ? "✨" : "🔒"}</div>
                  <div>
                    <p
                      className={`text-sm font-black text-center ${
                        vaultUnlocked
                          ? "text-pink-700 dark:text-pink-400"
                          : "text-gray-500 dark:text-violet-200"
                      }`}
                    >
                      행복 보관함
                    </p>
                    <p
                      className={`text-xs text-center mt-0.5 ${
                        vaultUnlocked
                          ? "text-pink-500 dark:text-pink-500"
                          : "text-gray-400 dark:text-violet-300/70"
                      }`}
                    >
                      {vaultUnlocked
                        ? "모든 행복 기록 모아보기"
                        : "레벨 15에서 이용 가능합니다"}
                    </p>
                  </div>
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

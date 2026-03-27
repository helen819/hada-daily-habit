import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Clock,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import OnboardingStep from "@/components/onboarding/OnboardingStep";
import GenderSelector from "@/components/onboarding/GenderSelector";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  format,
  addMonths,
  subMonths,
  setYear,
  setMonth as setDateMonth,
} from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Preferences } from "@capacitor/preferences";
import { getFullDestinyData } from "@/components/services/calculator/destinyCalculator";

const TOTAL_STEPS = 4;
const MAX_GOALS = 3;

// ─── 일요일 기준 주 식별자 반환 (예: "2025-W12") ──────────────
// 매주 일요일이 새 주의 시작 → 값이 바뀌면 xp 초기화 트리거로 사용
function getWeekKey() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=일, 1=월 ... 6=토
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - dayOfWeek);
  const year = sunday.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekNum = Math.ceil(
    ((sunday - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7,
  );
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

// ─── 목표 항목 컴포넌트 ───────────────────────────────────────
function GoalItem({ goal, index, onChange, onDelete, canDelete, isFirst }) {
  const titleCount = goal.title.length;
  const isTitleOver = titleCount > 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-2"
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Input
            value={goal.title}
            onChange={(e) => onChange(index, "title", e.target.value)}
            placeholder="목표 제목 (예: 꾸준히 운동하기)"
            maxLength={12}
            className={`rounded-xl h-12 bg-gray-50 border text-base pr-12 transition-colors ${
              isTitleOver
                ? "border-red-300 focus:border-red-400"
                : "border-gray-200 focus:border-purple-400"
            }`}
          />
          <span
            className={`absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium tabular-nums ${
              isTitleOver ? "text-red-400" : "text-gray-300"
            }`}
          >
            {titleCount}/10
          </span>
        </div>
        {canDelete && (
          <button
            onClick={() => onDelete(index)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition-colors flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <Textarea
        value={goal.description}
        onChange={(e) => onChange(index, "description", e.target.value)}
        placeholder="이 목표에 대해 설명해주세요. 왜 이루고 싶은지, 어떻게 실천할지 등..."
        rows={3}
        className="rounded-xl bg-gray-50 border-gray-200 focus:border-purple-400 text-sm resize-none transition-colors"
      />

      {isTitleOver && (
        <p className="text-xs text-red-400 ml-1">
          제목은 10자 이내로 입력해주세요
        </p>
      )}
    </motion.div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const isStrictKorean = (name) => /^[가-힣]+$/.test(name);
  const isLooseHangul = (name) => /^[가-힣ㄱ-ㅎㅏ-ㅣ]+$/.test(name);

  const [form, setForm] = useState({
    full_name: "",
    birth_date: format(new Date(2000, 0, 1), "yyyy-MM-dd"),
    birth_time: "",
    gender: "",
    location: "",
  });

  // ─── 목표 목록 ────────────────────────────────────────────
  const [goals, setGoals] = useState([{ title: "", description: "" }]);

  const [date, setDate] = useState(new Date(2000, 0, 1));
  const [currentMonth, setCurrentMonth] = useState(new Date(2000, 0, 1));
  const [useTime, setUseTime] = useState(false);
  const [timeState, setTimeState] = useState({
    ampm: "오전",
    hour: "12",
    minute: "00",
  });

  useEffect(() => {
    if (date) {
      update("birth_date", format(date, "yyyy-MM-dd"));
    }
  }, [date]);

  useEffect(() => {
    if (useTime) {
      let h = parseInt(timeState.hour);
      if (timeState.ampm === "오후" && h < 12) h += 12;
      if (timeState.ampm === "오전" && h === 12) h = 0;
      update("birth_time", `${String(h).padStart(2, "0")}:${timeState.minute}`);
    } else {
      update("birth_time", "");
    }
  }, [timeState, useTime]);

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  // ─── 목표 유효성: 첫 번째 목표는 제목+설명 모두 필수 ──────
  const isFirstGoalValid =
    goals[0].title.trim().length > 0 &&
    goals[0].title.trim().length <= 10 &&
    goals[0].description.trim().length > 0;

  const areAllGoalsValid = goals.every(
    (g) =>
      g.title.trim().length > 0 &&
      g.title.trim().length <= 10 &&
      g.description.trim().length > 0,
  );

  const canNext =
    (step === 0 && isStrictKorean(form.full_name) && form.gender) ||
    (step === 1 && form.birth_date) ||
    step === 2 ||
    (step === 3 && isFirstGoalValid && areAllGoalsValid);

  useEffect(() => {
    base44.entities.UserProfile.list().then((profiles) => {
      if (profiles && profiles.length > 0) {
        navigate("/Home", { replace: true });
      } else {
        setChecking(false);
      }
    });
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400 dark:text-purple-300" />
      </div>
    );
  }

  // ─── 목표 핸들러 ──────────────────────────────────────────
  const handleGoalChange = (index, field, value) => {
    setGoals((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddGoal = () => {
    if (goals.length < MAX_GOALS) {
      setGoals((prev) => [...prev, { title: "", description: "" }]);
    }
  };

  const handleDeleteGoal = (index) => {
    setGoals((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const primaryGoal = goals[0].title;

      // ── 1. UserProfile 생성 (goal 필드는 기존 코드 호환용) ──
      const newProfile = await base44.entities.UserProfile.create({
        full_name: form.full_name,
        birth_date: form.birth_date,
        birth_time: form.birth_time || "미입력",
        gender: form.gender,
        latitude: 37.5665,
        longitude: 126.978,
        location: form.location || "미입력",
        hanja_name: "",
        goal: primaryGoal,   // Home·Shop 등 기존 profile.goal 참조 호환
        level: 1,
        xp: 0,
        current_mode: "action",
        onboarding_complete: true,
      });

      // ── 2. Goal 엔티티에 각 목표 개별 저장 ──────────────
      // order       : 정렬 순서 (0 = 대표 목표)
      // is_primary  : profile.goal 과 동기화된 대표 목표 여부
      // xp          : 이번 주 획득 경험치 (일요일 기준 초기화)
      // xp_reset_week : 마지막 초기화 기준 주 식별자 (YYYY-WW)
      const currentWeekKey = getWeekKey();
      await Promise.all(
        goals.map((g, i) =>
          base44.entities.Goal.create({
            user_profile_id: newProfile.id,
            title: g.title,
            description: g.description,
            order: i,
            is_primary: i === 0,
            is_completed: false,
            xp: 0,
            xp_reset_week: currentWeekKey,
          }),
        ),
      );

      // ── 3. destiny summary_for_ai 계산 후 저장 ──────────
      try {
        const destinyData = getFullDestinyData(newProfile);
        await Preferences.set({
          key: "local-app_setting_destiny_summary",
          value: JSON.stringify(destinyData.summary_for_ai),
        });
      } catch (e) {
        console.error("destiny 저장 실패:", e);
      }

      await queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      await queryClient.invalidateQueries({ queryKey: ["goals"] });
      navigate("/Home", { replace: true });
    } catch (error) {
      console.error("오류 발생:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-white via-purple-50/30 to-white"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 100px)",
      }}
    >
      <AnimatePresence mode="wait">
        {step === 0 && (
          <OnboardingStep
            key="s0"
            step={0}
            totalSteps={TOTAL_STEPS}
            title="반가워요! 😊"
            subtitle="당신의 이름과 성별을 알려주세요."
          >
            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                  성명
                </label>
                <Input
                  value={form.full_name}
                  onChange={(e) => update("full_name", e.target.value)}
                  placeholder="홍길동 (한글만 입력 가능)"
                  className={`rounded-xl h-12 bg-gray-50 border-gray-200 text-base transition-colors ${
                    form.full_name && !isLooseHangul(form.full_name)
                      ? "border-red-300 focus:border-red-400"
                      : "focus:border-purple-400"
                  }`}
                />
                {form.full_name && !isLooseHangul(form.full_name) && (
                  <p className="text-xs text-red-400 mt-1 ml-1">
                    성함은 한글로만 입력해주세요 (공백/숫자 제외)
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                  성별
                </label>
                <GenderSelector
                  value={form.gender}
                  onChange={(v) => update("gender", v)}
                />
              </div>
            </div>
          </OnboardingStep>
        )}

        {step === 1 && (
          <OnboardingStep
            key="s1"
            step={1}
            totalSteps={TOTAL_STEPS}
            title="생년월일을 알려주세요"
            subtitle="시간까지 입력하면 더 정확해요."
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-purple-400 ml-1 uppercase">
                  생년월일
                </label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-14 justify-start text-left font-normal rounded-2xl border-purple-100 bg-white shadow-sm hover:bg-white active:scale-[0.98]"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-purple-500" />
                      {date ? (
                        format(date, "yyyy년 MM월 dd일", { locale: ko })
                      ) : (
                        <span>날짜 선택</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[260px] p-0 rounded-3xl shadow-2xl border-none overflow-hidden"
                    align="center"
                  >
                    <div className="p-4 bg-white">
                      <div className="flex items-center justify-between mb-4 px-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-purple-500"
                          onClick={() =>
                            setCurrentMonth(subMonths(currentMonth, 1))
                          }
                        >
                          <ChevronLeft size={20} />
                        </Button>
                        <div className="flex gap-1">
                          <select
                            value={currentMonth.getFullYear()}
                            onChange={(e) =>
                              setCurrentMonth(
                                setYear(currentMonth, parseInt(e.target.value)),
                              )
                            }
                            className="bg-purple-50 text-purple-700 font-bold text-sm rounded-lg px-2 py-1 border-none focus:ring-0 appearance-none cursor-pointer"
                          >
                            {Array.from(
                              { length: 100 },
                              (_, i) => 2025 - i,
                            ).map((y) => (
                              <option key={y} value={y}>
                                {y}년
                              </option>
                            ))}
                          </select>
                          <select
                            value={currentMonth.getMonth()}
                            onChange={(e) =>
                              setCurrentMonth(
                                setDateMonth(
                                  currentMonth,
                                  parseInt(e.target.value),
                                ),
                              )
                            }
                            className="bg-purple-50 text-purple-700 font-bold text-sm rounded-lg px-2 py-1 border-none focus:ring-0 appearance-none cursor-pointer"
                          >
                            {Array.from({ length: 12 }, (_, i) => i).map(
                              (m) => (
                                <option key={m} value={m}>
                                  {m + 1}월
                                </option>
                              ),
                            )}
                          </select>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-purple-500"
                          onClick={() =>
                            setCurrentMonth(addMonths(currentMonth, 1))
                          }
                        >
                          <ChevronRight size={20} />
                        </Button>
                      </div>

                      <style>{`
      .rdp-vhidden, .rdp-caption_label, .rdp-caption { display: none !important; }
      .rdp { margin: 0 !important; width: 100% !important; }
      .rdp-months { justify-content: center !important; width: 100% !important; }
      .rdp-month { width: 100% !important; }
      .rdp-table { width: 100% !important; max-width: none !important; }
      .rdp-cell { text-align: center !important; padding: 0 !important; }
      .rdp-day { width: 40px !important; height: 40px !important; margin: auto !important; display: flex !important; align-items: center !important; justify-content: center !important; }
      .rdp-day_selected { background-color: #a855f7 !important; color: white !important; border-radius: 12px !important; }
    `}</style>

                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(newDate) => {
                          if (newDate) setDate(newDate);
                        }}
                        month={currentMonth}
                        onMonthChange={setCurrentMonth}
                        locale={ko}
                        disableNavigation
                        className="p-0 border-none"
                        classNames={{
                          caption_label: "hidden",
                          caption:
                            "flex justify-center relative items-center h-0",
                        }}
                      />

                      <Button
                        onClick={() => setCalendarOpen(false)}
                        className="w-full h-12 mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-lg"
                      >
                        선택 완료
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[11px] font-bold text-purple-400 uppercase">
                    출생 시간
                  </label>
                  <button
                    onClick={() => setUseTime(!useTime)}
                    className={`text-[10px] px-2 py-1 rounded-md font-bold transition-colors ${
                      useTime
                        ? "bg-purple-100 text-purple-600"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {useTime ? "입력 중" : "시간 모름"}
                  </button>
                </div>

                {useTime ? (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-3 gap-2"
                  >
                    <select
                      value={timeState.ampm}
                      onChange={(e) =>
                        setTimeState((p) => ({ ...p, ampm: e.target.value }))
                      }
                      className="h-14 bg-white border border-purple-100 rounded-2xl text-center font-bold text-purple-700 shadow-sm appearance-none focus:ring-2 focus:ring-purple-200"
                    >
                      <option>오전</option>
                      <option>오후</option>
                    </select>
                    <select
                      value={timeState.hour}
                      onChange={(e) =>
                        setTimeState((p) => ({ ...p, hour: e.target.value }))
                      }
                      className="h-14 bg-white border border-purple-100 rounded-2xl text-center font-bold text-gray-800 shadow-sm appearance-none"
                    >
                      {Array.from({ length: 12 }, (_, i) =>
                        String(i + 1).padStart(2, "0"),
                      ).map((h) => (
                        <option key={h} value={h}>
                          {h}시
                        </option>
                      ))}
                    </select>
                    <select
                      value={timeState.minute}
                      onChange={(e) =>
                        setTimeState((p) => ({ ...p, minute: e.target.value }))
                      }
                      className="h-14 bg-white border border-purple-100 rounded-2xl text-center font-bold text-gray-800 shadow-sm appearance-none"
                    >
                      {[
                        "00","05","10","15","20","25",
                        "30","35","40","45","50","55",
                      ].map((m) => (
                        <option key={m} value={m}>
                          {m}분
                        </option>
                      ))}
                    </select>
                  </motion.div>
                ) : (
                  <Button
                    onClick={() => setUseTime(true)}
                    variant="outline"
                    className="w-full h-14 justify-start text-gray-400 rounded-2xl border-dashed border-gray-200 bg-gray-50/30"
                  >
                    <Clock className="mr-2 h-4 w-4 opacity-50" />
                    시간을 모르면 비워두셔도 됩니다
                  </Button>
                )}
              </div>
            </div>
          </OnboardingStep>
        )}

        {step === 2 && (
          <OnboardingStep
            key="s2"
            step={2}
            totalSteps={TOTAL_STEPS}
            title="지금 어디에 계세요?"
            subtitle="도시 이름을 알려주시면 더 정확해요. (선택사항)"
          >
            <Input
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="서울, 부산 등 (건너뛰기 가능)"
              className="rounded-xl h-12 bg-gray-50 border-gray-200 text-base"
            />
          </OnboardingStep>
        )}

        {step === 3 && (
          <OnboardingStep
            key="s3"
            step={3}
            totalSteps={TOTAL_STEPS}
            title="이루고 싶은 목표는? 🎯"
            subtitle="제목 10자 이내, 설명도 함께 적어주세요."
          >
            <div className="space-y-4">
              <AnimatePresence>
                {goals.map((goal, index) => (
                  <GoalItem
                    key={index}
                    goal={goal}
                    index={index}
                    onChange={handleGoalChange}
                    onDelete={handleDeleteGoal}
                    canDelete={goals.length > 1}
                    isFirst={index === 0}
                  />
                ))}
              </AnimatePresence>

              {/* 목표 추가 버튼 */}
              {goals.length < MAX_GOALS && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={handleAddGoal}
                  disabled={!areAllGoalsValid}
                  className={`w-full h-11 rounded-xl border-2 border-dashed text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                    areAllGoalsValid
                      ? "border-purple-300 text-purple-500 hover:bg-purple-50"
                      : "border-gray-200 text-gray-300 cursor-not-allowed"
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  목표 추가 ({goals.length}/{MAX_GOALS})
                </motion.button>
              )}

              {/* 첫 번째 목표 미완성 안내 */}
              {!isFirstGoalValid && (goals[0].title || goals[0].description) && (
                <p className="text-xs text-amber-500 text-center">
                  첫 번째 목표의 제목과 설명을 모두 입력해주세요
                </p>
              )}
            </div>
          </OnboardingStep>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div
        className="fixed bottom-0 left-0 right-0 p-6 z-50"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex gap-3 max-w-md mx-auto">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              className="rounded-xl h-12 px-6 border-gray-200"
            >
              이전
            </Button>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="flex-1 rounded-xl h-12 bg-purple-500 hover:bg-purple-600 text-sm font-semibold disabled:opacity-40"
            >
              다음
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canNext || loading}
              className="flex-1 rounded-xl h-12 bg-purple-500 hover:bg-purple-600 text-sm font-semibold disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {loading ? "저장 중..." : "시작하기 ✨"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

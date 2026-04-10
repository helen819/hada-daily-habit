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
  endOfMonth,
  endOfYear,
  addMonths as addM,
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
import { getWeekKeyBySunday } from "@/config/unlockConfig";

const TOTAL_STEPS = 4;

const DURATION_TYPES = [
  { value: "no_limit", label: "꾸준히" },
  { value: "this_month", label: "이번 달" },
  { value: "this_year", label: "올해" },
  { value: "monthly", label: "N개월" },
  { value: "custom", label: "날짜 입력" },
];

function calcDeadline(durationType, durationMonths, customDate) {
  const now = new Date();
  switch (durationType) {
    case "no_limit":
      return null;
    case "this_month":
      return format(endOfMonth(now), "yyyy-MM-dd");
    case "this_year":
      return format(endOfYear(now), "yyyy-MM-dd");
    case "monthly":
      return format(
        endOfMonth(addM(now, parseInt(durationMonths || 1))),
        "yyyy-MM-dd",
      );
    case "custom":
      return customDate || null;
    default:
      return null;
  }
}

function DurationSelector({ value, durationMonths, customDate, onChange }) {
  const [customCalOpen, setCustomCalOpen] = useState(false);
  const [customMonth, setCustomMonth] = useState(new Date());

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <select
            value={value}
            onChange={(e) => onChange("durationType", e.target.value)}
            className="w-full h-10 pl-3 pr-7 rounded-xl bg-gray-50 border-gray-200 border text-sm font-semibold text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-purple-200 cursor-pointer"
          >
            {DURATION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-purple-400 rotate-90 pointer-events-none" />
        </div>

        {value === "monthly" && (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative flex-1"
          >
            <select
              value={durationMonths}
              onChange={(e) => onChange("durationMonths", e.target.value)}
              className="w-full h-10 pl-3 pr-7 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-purple-200 cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={String(m)}>
                  {m}개월
                </option>
              ))}
            </select>
            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 rotate-90 pointer-events-none" />
          </motion.div>
        )}

        {value === "custom" && (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1"
          >
            <Popover open={customCalOpen} onOpenChange={setCustomCalOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-10 justify-start text-left font-semibold rounded-xl border-gray-200 bg-gray-50 text-sm px-3 gap-1.5"
                >
                  <CalendarIcon className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
                  <span
                    className={customDate ? "text-gray-700" : "text-gray-400"}
                  >
                    {customDate
                      ? format(new Date(customDate), "yyyy.MM.dd", {
                          locale: ko,
                        })
                      : "날짜 선택"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[260px] p-0 rounded-3xl shadow-2xl border-none overflow-hidden"
                align="end"
              >
                <div className="p-4 bg-white">
                  <div className="flex items-center justify-between mb-4 px-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-purple-500"
                      onClick={() => setCustomMonth(subMonths(customMonth, 1))}
                    >
                      <ChevronLeft size={20} />
                    </Button>
                    <div className="flex gap-1">
                      <select
                        value={customMonth.getFullYear()}
                        onChange={(e) =>
                          setCustomMonth(
                            setYear(customMonth, parseInt(e.target.value)),
                          )
                        }
                        className="bg-purple-50 text-purple-700 font-bold text-sm rounded-lg px-2 py-1 border-none focus:ring-0 appearance-none cursor-pointer"
                      >
                        {Array.from(
                          { length: 10 },
                          (_, i) => new Date().getFullYear() + i,
                        ).map((y) => (
                          <option key={y} value={y}>
                            {y}년
                          </option>
                        ))}
                      </select>
                      <select
                        value={customMonth.getMonth()}
                        onChange={(e) =>
                          setCustomMonth(
                            setDateMonth(customMonth, parseInt(e.target.value)),
                          )
                        }
                        className="bg-purple-50 text-purple-700 font-bold text-sm rounded-lg px-2 py-1 border-none focus:ring-0 appearance-none cursor-pointer"
                      >
                        {Array.from({ length: 12 }, (_, i) => i).map((m) => (
                          <option key={m} value={m}>
                            {m + 1}월
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-purple-500"
                      onClick={() => setCustomMonth(addMonths(customMonth, 1))}
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
                    selected={customDate ? new Date(customDate) : undefined}
                    onSelect={(d) => {
                      if (d) onChange("customDate", format(d, "yyyy-MM-dd"));
                    }}
                    month={customMonth}
                    onMonthChange={setCustomMonth}
                    locale={ko}
                    disableNavigation
                    disabled={{ before: new Date() }}
                    className="p-0 border-none"
                    classNames={{
                      caption_label: "hidden",
                      caption: "flex justify-center relative items-center h-0",
                    }}
                  />
                  <Button
                    onClick={() => setCustomCalOpen(false)}
                    className="w-full h-12 mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-lg"
                  >
                    선택 완료
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </motion.div>
        )}
      </div>

      {value !== "no_limit" && (
        <p className="text-[11px] text-gray-400 ml-1">
          {value === "this_month" &&
            `마감 ${format(endOfMonth(new Date()), "yyyy.MM.dd")}`}
          {value === "this_year" &&
            `마감 ${format(endOfYear(new Date()), "yyyy.MM.dd")}`}
          {value === "monthly" &&
            durationMonths &&
            `마감 ${format(
              endOfMonth(addM(new Date(), parseInt(durationMonths))),
              "yyyy.MM.dd",
            )}`}
          {value === "custom" &&
            customDate &&
            `마감 ${customDate.replace(/-/g, ".")}`}
          {value === "custom" && !customDate && "날짜를 선택해주세요"}
        </p>
      )}
    </div>
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

  const [goal, setGoal] = useState({
    title: "",
    description: "",
    durationType: "no_limit",
    durationMonths: "3",
    customDate: "",
  });

  const [date, setDate] = useState(new Date(2000, 0, 1));
  const [currentMonth, setCurrentMonth] = useState(new Date(2000, 0, 1));
  const [useTime, setUseTime] = useState(false);
  const [timeState, setTimeState] = useState({
    ampm: "오전",
    hour: "12",
    minute: "00",
  });

  useEffect(() => {
    if (date) update("birth_date", format(date, "yyyy-MM-dd"));
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
  const updateGoal = (field, val) => setGoal((p) => ({ ...p, [field]: val }));

  const isGoalValid =
    goal.title.trim().length > 0 &&
    goal.title.trim().length <= 10 &&
    goal.description.trim().length > 0 &&
    !(goal.durationType === "custom" && !goal.customDate);

  const canNext =
    (step === 0 && isStrictKorean(form.full_name) && form.gender) ||
    (step === 1 && form.birth_date) ||
    step === 2 ||
    (step === 3 && isGoalValid);

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

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const currentWeekKey = getWeekKeyBySunday();

      const newProfile = await base44.entities.UserProfile.create({
        full_name: form.full_name,
        birth_date: form.birth_date,
        birth_time: form.birth_time || "미입력",
        gender: form.gender,
        latitude: 37.5665,
        longitude: 126.978,
        location: form.location || "미입력",
        hanja_name: "",
        goal: goal.title,
        level: 1,
        xp: 0,
        current_mode: "action",
        onboarding_complete: true,
      });

      const deadline = calcDeadline(
        goal.durationType,
        goal.durationMonths,
        goal.customDate,
      );
      await base44.entities.Goal.create({
        user_profile_id: newProfile.id,
        title: goal.title,
        description: goal.description,
        order: 0,
        is_primary: true,
        is_completed: false,
        duration_type: goal.durationType,
        duration_months:
          goal.durationType === "monthly"
            ? parseInt(goal.durationMonths)
            : null,
        deadline,
        xp: 0,
        xp_reset_week: currentWeekKey,
      });

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
                        "00",
                        "05",
                        "10",
                        "15",
                        "20",
                        "25",
                        "30",
                        "35",
                        "40",
                        "45",
                        "50",
                        "55",
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
            subtitle="제목 10자 이내, 기간도 함께 설정해주세요."
          >
            <div className="space-y-2 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <div className="relative">
                <Input
                  value={goal.title}
                  onChange={(e) => updateGoal("title", e.target.value)}
                  placeholder="목표 제목 (예: 꾸준히 운동하기)"
                  maxLength={12}
                  className={`rounded-xl h-12 bg-gray-50 border text-base pr-12 transition-colors ${
                    goal.title.length > 10
                      ? "border-red-300 focus:border-red-400"
                      : "border-gray-200 focus:border-purple-400"
                  }`}
                />
                <span
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium tabular-nums ${
                    goal.title.length > 10 ? "text-red-400" : "text-gray-300"
                  }`}
                >
                  {goal.title.length}/10
                </span>
              </div>

              {goal.title.length > 10 && (
                <p className="text-xs text-red-400 ml-1">
                  제목은 10자 이내로 입력해주세요
                </p>
              )}

              <Textarea
                value={goal.description}
                onChange={(e) => updateGoal("description", e.target.value)}
                placeholder="이 목표에 대해 설명해주세요. 왜 이루고 싶은지, 어떻게 실천할지 등..."
                rows={3}
                className="rounded-xl bg-gray-50 border-gray-200 focus:border-purple-400 text-sm resize-none transition-colors break-keep"
              />

              <DurationSelector
                value={goal.durationType}
                durationMonths={goal.durationMonths}
                customDate={goal.customDate}
                onChange={updateGoal}
              />
            </div>

            {!isGoalValid && (goal.title || goal.description) && (
              <p className="text-xs text-amber-500 text-center mt-2">
                {goal.durationType === "custom" && !goal.customDate
                  ? "목표 날짜를 선택해주세요"
                  : "목표 제목과 설명을 모두 입력해주세요"}
              </p>
            )}
          </OnboardingStep>
        )}
      </AnimatePresence>

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

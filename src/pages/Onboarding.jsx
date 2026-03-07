import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const TOTAL_STEPS = 4;

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // 이미 프로필이 있으면 홈으로 리다이렉트
  useEffect(() => {
    base44.entities.UserProfile.list().then((profiles) => {
      if (profiles && profiles.length > 0) {
        navigate("/Home", { replace: true });
      }
    });
  }, [navigate]);

  const [form, setForm] = useState({
    full_name: "",
    birth_date: format(new Date(2000, 0, 1), "yyyy-MM-dd"),
    birth_time: "",
    gender: "",
    location: "",
    goal: "",
  });

  // --- 날짜/시간 관리를 위한 상태 ---
  const [date, setDate] = useState(new Date(2000, 0, 1)); // 기본값 1995년 1월 1일
  const [currentMonth, setCurrentMonth] = useState(new Date(2000, 0, 1)); // 달력 화면 위치
  const [useTime, setUseTime] = useState(false);
  const [timeState, setTimeState] = useState({
    ampm: "오전",
    hour: "12",
    minute: "00",
  });

  // 날짜 선택 시 form 업데이트
  useEffect(() => {
    if (date) {
      update("birth_date", format(date, "yyyy-MM-dd"));
    }
  }, [date]);

  // 시간 상태 변경 시 form.birth_time 업데이트
  useEffect(() => {
    if (useTime) {
      let h = parseInt(timeState.hour);
      if (timeState.ampm === "오후" && h < 12) h += 12;
      if (timeState.ampm === "오전" && h === 12) h = 0;
      update("birth_time", `${String(h).padStart(2, "0")}:${timeState.minute}`);
    } else {
      update("birth_time", ""); // 시간 모름일 경우 빈 값
    }
  }, [timeState, useTime]);

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const canNext =
    (step === 0 && form.full_name && form.gender) ||
    (step === 1 && form.birth_date) ||
    (step === 2 && form.location) ||
    (step === 3 && form.goal);

  const handleSubmit = async () => {
    setLoading(true);

    // Generate comprehensive analysis via LLM
    const prompt = `너는 'HADA' 앱의 온보딩 종합 분석 엔진이다.
사용자 기본 정보:
- 성명: ${form.full_name}
- 생년월일: ${form.birth_date}
- 출생시간: ${form.birth_time || "미입력"}
- 성별: ${form.gender}
- 위치: ${form.location}

아래 6가지 학문을 종합 분석하되, 전문 용어는 절대 드러내지 마라:
1. 사주 (사계절/십간십이지/오행)
2. 명리학 (음양오행)
3. 자미두수 (12궁위 운세)
4. 점성술의 명식/명반 (행성 배치)
5. 서양 점성술 (태양/달/상승점)
6. 성명학 (획수/글자 의미)

결과를 반드시 JSON으로만 답하라.`;

    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            analysis_data: {
              type: "object",
              properties: {
                sasoo: { type: "string", description: "사주 분석" },
                myungri: { type: "string", description: "명리학 분석" },
                jamidusoo: { type: "string", description: "자미두수 분석" },
                astrology_명식: {
                  type: "string",
                  description: "점성술 명식 분석",
                },
                western_astrology: {
                  type: "string",
                  description: "서양 점성술 분석",
                },
                seongmyung: { type: "string", description: "성명학 분석" },
                overall_insight: { type: "string", description: "종합 통찰" },
              },
            },
            base_stats: {
              type: "object",
              properties: {
                work_efficiency: { type: "number" },
                creativity: { type: "number" },
                communication: { type: "number" },
                focus: { type: "number" },
                fortune: { type: "number" },
              },
            },
            traits: {
              type: "object",
              properties: {
                strengths: { type: "array", items: { type: "string" } },
                weaknesses: { type: "array", items: { type: "string" } },
                potentials: { type: "array", items: { type: "string" } },
              },
            },
            fortune_stats: {
              type: "object",
              properties: {
                strengths: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      value: { type: "number" },
                    },
                  },
                },
                weakness: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    value: { type: "number" },
                  },
                },
                potentials: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      value: { type: "number" },
                    },
                  },
                },
              },
            },
            recommended_mode: { type: "string" },
            welcome_title: { type: "string" },
            welcome_subtitle: { type: "string" },
            today_hint: { type: "string" },
          },
        },
      });

      // Build fortune_stats map from LLM output
      const fortune_stats = res.fortune_stats
        ? {
            strengths: Object.fromEntries(
              (res.fortune_stats.strengths || []).map((s) => [s.name, s.value]),
            ),
            weakness: res.fortune_stats.weakness
              ? {
                  [res.fortune_stats.weakness.name]:
                    res.fortune_stats.weakness.value,
                }
              : {},
            potentials: Object.fromEntries(
              (res.fortune_stats.potentials || []).map((p) => [
                p.name,
                p.value,
              ]),
            ),
          }
        : null;

      // Save profile
      await base44.entities.UserProfile.create({
        full_name: form.full_name,
        birth_date: form.birth_date,
        birth_time: form.birth_time,
        gender: form.gender,
        location: form.location,
        goal: form.goal,
        level: 1,
        xp: 0,
        current_mode: res.recommended_mode || "action",
        base_stats: res.base_stats,
        traits: { ...res.traits, fortune_stats },
        analysis_data: res.analysis_data,
        onboarding_complete: true,
      });

      // Save daily reading
      const today = new Date().toISOString().split("T")[0];
      await base44.entities.DailyReading.create({
        date: today,
        welcome_title: res.welcome_title,
        welcome_subtitle: res.welcome_subtitle,
        today_hint: res.today_hint,
        recommended_mode: res.recommended_mode,
        base_stats: res.base_stats,
      });

      await queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      await queryClient.invalidateQueries({ queryKey: ["dailyReading"] });

      navigate("/Home", { replace: true });
    } catch (error) {
      console.error("오류 발생:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-purple-50/30 to-white">
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
                  placeholder="홍길동"
                  className="rounded-xl h-12 bg-gray-50 border-gray-200 text-base"
                />
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
              {/* --- 커스텀 캘린더 섹션 --- */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-purple-400 ml-1 uppercase">
                  생년월일
                </label>
                <Popover>
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
                      {/* 헤더 부분 (기존과 동일) */}
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

                      {/* 🔥 수정된 스타일 정의 🔥 */}
                      <style>{`
      /* 1. 상단 'n월 YYYY' 텍스트 완전 제거 */
      .rdp-vhidden, .rdp-caption_label, .rdp-caption { 
        display: none !important; 
      }
      
      /* 2. 달력 본체 가로 꽉 채우기 및 중앙 정렬 */
      .rdp {
        margin: 0 !important;
        width: 100% !important;
      }
      .rdp-months {
        justify-content: center !important;
        width: 100% !important;
      }
      .rdp-month {
        width: 100% !important;
      }
      .rdp-table {
        width: 100% !important;
        max-width: none !important;
      }
      
      /* 3. 각 날짜 셀 크기 균등 배분 */
      .rdp-cell {
        text-align: center !important;
        padding: 0 !important;
      }
      .rdp-day {
        width: 40px !important;
        height: 40px !important;
        margin: auto !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      /* 4. 선택된 날짜 보라색 배경 */
      .rdp-day_selected { 
        background-color: #a855f7 !important; 
        color: white !important; 
        border-radius: 12px !important; 
      }
    `}</style>

                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(newDate) => {
                          if (newDate) {
                            // 선택된 날짜가 있을 때만 상태를 업데이트함 (null이면 무시)
                            setDate(newDate);
                          }
                        }}
                        month={currentMonth}
                        onMonthChange={setCurrentMonth}
                        locale={ko}
                        disableNavigation
                        className="p-0 border-none"
                        classNames={{
                          caption_label: "hidden",
                          caption:
                            "flex justify-center relative items-center h-0", // 높이를 0으로 만들어 공간 제거
                        }}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              {/* 시간 입력 (3개 블록 가득 찬 스타일) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[11px] font-bold text-purple-400 uppercase">
                    출생 시간
                  </label>
                  <button
                    onClick={() => setUseTime(!useTime)}
                    className={`text-[10px] px-2 py-1 rounded-md font-bold transition-colors ${useTime ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-400"}`}
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
                      {["00", "10", "20", "30", "40", "50"].map((m) => (
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
            subtitle="도시 이름을 입력해 주세요."
          >
            <Input
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="서울"
              className="rounded-xl h-12 bg-gray-50 border-gray-200 text-base"
            />
          </OnboardingStep>
        )}

        {step === 3 && (
          <OnboardingStep
            key="s3"
            step={3}
            totalSteps={TOTAL_STEPS}
            title="요즘 이루고 싶은 것은?"
            subtitle="한 줄로 적어주세요."
          >
            <Input
              value={form.goal}
              onChange={(e) => update("goal", e.target.value)}
              placeholder="꾸준히 운동하기, 사이드 프로젝트 시작..."
              className="rounded-xl h-12 bg-gray-50 border-gray-200 text-base"
            />
          </OnboardingStep>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent">
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
              {loading ? "분석 중..." : "시작하기 ✨"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

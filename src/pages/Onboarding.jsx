import React, { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import OnboardingStep from "@/components/onboarding/OnboardingStep";
import GenderSelector from "@/components/onboarding/GenderSelector";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

const TOTAL_STEPS = 4;

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const queryClient = useQueryClient();

  // 이미 프로필이 있으면 홈으로 리다이렉트
  useEffect(() => {
    base44.entities.UserProfile.list().then((profiles) => {
      if (profiles && profiles.length > 0) {
        navigate("/");
      }
    });
  }, []);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    birth_date: "",
    birth_time: "",
    gender: "",
    location: "",
    goal: "",
  });

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
            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                  생년월일
                </label>
                <Input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => update("birth_date", e.target.value)}
                  className="rounded-xl h-12 bg-gray-50 border-gray-200 text-base"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                  출생 시간 (선택)
                </label>
                <Input
                  type="time"
                  value={form.birth_time}
                  onChange={(e) => update("birth_time", e.target.value)}
                  className="rounded-xl h-12 bg-gray-50 border-gray-200 text-base"
                />
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

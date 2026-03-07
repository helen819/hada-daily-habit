export const MODE_CONFIGS = {
  action: {
    mode: "action",
    name: "성과와 성취 🔥",
    weights: {
      saju_myeongri: "high_priority (전장 파악 - 일진으로 방향 결정)",
      jamidusu: "medium_priority (전략 무기 - 명궁/관록궁 주성)",
      western_astrology: "low_priority (위험 회피 - 수성역행/Void of Course만)",
      name_analysis: "bonus (부적 - 초성/색상)",
    },
    tone_keywords: ["효율", "결과", "리더십", "집중", "실행", "타이밍"],
    goal_focus: ["비즈니스", "시험", "자기계발", "재물", "승진"],
    temperature: 0.3,
  },
  restore: {
    mode: "restore",
    name: "휴식과 치유 🌙",
    weights: {
      western_astrology: "high_priority (내면 날씨 - 달위상/행성각도)",
      saju_myeongri: "medium_priority (에너지 잔량 - 일간 강약)",
      jamidusu: "low_priority (관계성 - 복덕궁/노복궁)",
      name_analysis: "bonus (치유음 - 편안한 소리)",
    },
    tone_keywords: ["편안함", "공감", "회복", "통찰", "자기이해"],
    goal_focus: ["심리 케어", "우울 완화", "스트레스 해소", "관계 회복"],
    temperature: 0.5,
  },
};
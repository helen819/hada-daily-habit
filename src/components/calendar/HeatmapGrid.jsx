import React from "react";

const getLevelColor = (count, max) => {
  if (count === 0) return "bg-gray-100";
  const ratio = count / max;
  if (ratio >= 0.75) return "bg-purple-600";
  if (ratio >= 0.5) return "bg-purple-400";
  if (ratio >= 0.25) return "bg-purple-200";
  return "bg-purple-100";
};

export default function HeatmapGrid({ completionData }) {
  const today = new Date();
  const days = [];

  // 최근 35일
  for (let i = 34; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split("T")[0];
    days.push({ date: key, count: completionData[key] || 0 });
  }

  const max = Math.max(...days.map((d) => d.count), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">달성률 히트맵</p>
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <div className="w-2.5 h-2.5 rounded-sm bg-gray-100" />
          <span>없음</span>
          <div className="w-2.5 h-2.5 rounded-sm bg-purple-200" />
          <div className="w-2.5 h-2.5 rounded-sm bg-purple-400" />
          <div className="w-2.5 h-2.5 rounded-sm bg-purple-600" />
          <span>많음</span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map(({ date, count }) => (
          <div
            key={date}
            title={`${date}: ${count}개 완료`}
            className={`w-full aspect-square rounded-sm ${getLevelColor(count, max)}`}
          />
        ))}
      </div>
    </div>
  );
}
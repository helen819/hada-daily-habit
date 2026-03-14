import React, { useState, useEffect } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

// 파일 상단에 훅 추가
function useIsDark() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

const statLabels = {
  work_efficiency: "업무효율",
  creativity: "창의력",
  communication: "소통력",
  focus: "집중력",
  fortune: "행운",
};

// 5-point polygon positions for constellation lines (normalized 0-1 in 200x200 space)
// Angles: top, upper-right, lower-right, lower-left, upper-left
function getPolygonPoints(cx, cy, r, n = 5) {
  const points = [];
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    points.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    });
  }
  return points;
}

// Constellation line pairs (connect non-adjacent for star pattern)
const CONSTELLATION_PAIRS = [
  [0, 2],
  [1, 3],
  [2, 4],
  [3, 0],
  [4, 1],
];

// Star positions for background sparkles
const STAR_POSITIONS = [
  { x: 15, y: 18 },
  { x: 85, y: 12 },
  { x: 95, y: 55 },
  { x: 10, y: 70 },
  { x: 50, y: 5 },
  { x: 90, y: 82 },
  { x: 20, y: 88 },
  { x: 75, y: 92 },
  { x: 5, y: 42 },
  { x: 92, y: 28 },
  { x: 45, y: 95 },
  { x: 30, y: 8 },
];

function ConstellationOverlay({ stats, width = 200, height = 200, isDark }) {
  const cx = width / 2;
  const cy = height / 2;
  const outerR = Math.min(width, height) * 0.44; // 0.38 → 0.44 더 크게

  const statKeys = Object.keys(statLabels);
  const values = statKeys.map((k) => (stats?.[k] || 0) / 100);
  const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
  const constellationOpacity = Math.min(0.9, 0.3 + avgValue * 0.75); // 0.15 → 0.3 더 선명

  // 다크모드에서 더 밝고 선명한 색상
  const starColor = isDark ? "#e9d5ff" : "#c4b5fd";
  const lineColor = isDark ? "#c4b5fd" : "#a78bfa";
  const sparkleColor = isDark ? "#f3e8ff" : "#e9d5ff";
  const starOpacity = isDark ? 0.55 : 0.35;

  const outerPoints = getPolygonPoints(cx, cy, outerR);
  const dataPoints = statKeys.map((k, i) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const r = (outerR * (stats?.[k] || 0)) / 100;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={starColor} stopOpacity="1" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </radialGradient>
        <filter id="starBlur">
          <feGaussianBlur stdDeviation="0.6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 배경 별 */}
      {STAR_POSITIONS.map((s, i) => (
        <circle
          key={i}
          cx={(s.x / 100) * width}
          cy={(s.y / 100) * height}
          r={i % 3 === 0 ? 1.0 : 0.7}
          fill={starColor}
          opacity={starOpacity + (i % 4) * 0.08}
        />
      ))}

      {/* 외곽 별자리 선 */}
      {CONSTELLATION_PAIRS.map(([a, b], i) => (
        <line
          key={`cline-${i}`}
          x1={outerPoints[a].x}
          y1={outerPoints[a].y}
          x2={outerPoints[b].x}
          y2={outerPoints[b].y}
          stroke={lineColor}
          strokeWidth={isDark ? 1.0 : 0.8}
          strokeOpacity={constellationOpacity * (isDark ? 0.65 : 0.5)}
          strokeDasharray="2 3"
        />
      ))}

      {/* 데이터 별자리 선 */}
      {CONSTELLATION_PAIRS.map(([a, b], i) => {
        const va = values[a];
        const vb = values[b];
        const lineOpacity = Math.min(constellationOpacity, (va + vb) / 2);
        return (
          <line
            key={`dline-${i}`}
            x1={dataPoints[a].x}
            y1={dataPoints[a].y}
            x2={dataPoints[b].x}
            y2={dataPoints[b].y}
            stroke={starColor}
            strokeWidth={isDark ? 1.5 : 1.2}
            strokeOpacity={lineOpacity * (isDark ? 0.9 : 0.8)}
          />
        );
      })}

      {/* 꼭짓점 별 노드 */}
      {outerPoints.map((p, i) => (
        <g key={`star-${i}`}>
          <circle
            cx={p.x}
            cy={p.y}
            r={3.5}
            fill="none"
            stroke={lineColor}
            strokeWidth={isDark ? 1.5 : 1.2}
            strokeOpacity={constellationOpacity * (isDark ? 0.85 : 0.7)}
          />
          <circle
            cx={p.x}
            cy={p.y}
            r={values[i] * (isDark ? 5 : 4)}
            fill={starColor}
            opacity={constellationOpacity * values[i] * (isDark ? 1.2 : 1.0)}
            filter="url(#starBlur)"
          />
          <line
            x1={p.x - 4}
            y1={p.y}
            x2={p.x + 4}
            y2={p.y}
            stroke={sparkleColor}
            strokeWidth={isDark ? 1.0 : 0.8}
            strokeOpacity={
              constellationOpacity * values[i] * (isDark ? 1.0 : 0.9)
            }
          />
          <line
            x1={p.x}
            y1={p.y - 4}
            x2={p.x}
            y2={p.y + 4}
            stroke={sparkleColor}
            strokeWidth={isDark ? 1.0 : 0.8}
            strokeOpacity={
              constellationOpacity * values[i] * (isDark ? 1.0 : 0.9)
            }
          />
        </g>
      ))}

      {avgValue > 0.5 && (
        <circle
          cx={cx}
          cy={cy}
          r={outerR * 0.18}
          fill="url(#starGlow)"
          opacity={(avgValue - 0.5) * (isDark ? 2.2 : 1.8)}
        />
      )}
    </svg>
  );
}

export default function StatsRadar({ stats }) {
  const isDark = useIsDark();
  if (!stats) return null;

  const data = Object.entries(statLabels).map(([key, label]) => ({
    stat: label,
    value: stats[key] || 0,
  }));

  return (
    <div className="w-full h-64 relative">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid
            stroke={isDark ? "#6D5AE0" : "#d4cff0"}
            strokeWidth={isDark ? 1.2 : 1.0}
          />
          <PolarAngleAxis
            dataKey="stat"
            tick={{
              fill: isDark ? "#c4b5fd" : "#6d5fa8",
              fontSize: 11,
              fontWeight: 600,
            }}
          />
          <Radar
            dataKey="value"
            stroke={isDark ? "#a78bfa" : "#8b5cf6"}
            fill="url(#radarGradient)"
            fillOpacity={isDark ? 0.6 : 0.5}
            strokeWidth={isDark ? 2.5 : 2.0}
          />
          <defs>
            <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={isDark ? "#c4b5fd" : "#c4b5fd"}
                stopOpacity={isDark ? 0.9 : 0.75}
              />
              <stop
                offset="100%"
                stopColor="#7c3aed"
                stopOpacity={isDark ? 0.5 : 0.3}
              />
            </linearGradient>
          </defs>
        </RadarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div style={{ width: "75%", height: "75%", position: "relative" }}>
          <ConstellationOverlay
            stats={stats}
            width={200}
            height={200}
            isDark={isDark}
          />
        </div>
      </div>
    </div>
  );
}

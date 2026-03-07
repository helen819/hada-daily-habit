import React, { useMemo } from "react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";

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
  [0, 2], [1, 3], [2, 4], [3, 0], [4, 1],
];

// Star positions for background sparkles
const STAR_POSITIONS = [
  { x: 15, y: 18 }, { x: 85, y: 12 }, { x: 95, y: 55 },
  { x: 10, y: 70 }, { x: 50, y: 5 }, { x: 90, y: 82 },
  { x: 20, y: 88 }, { x: 75, y: 92 }, { x: 5, y: 42 },
  { x: 92, y: 28 }, { x: 45, y: 95 }, { x: 30, y: 8 },
];

function ConstellationOverlay({ stats, width = 200, height = 200 }) {
  const cx = width / 2;
  const cy = height / 2;
  const outerR = Math.min(width, height) * 0.38;

  const statKeys = Object.keys(statLabels);
  const values = statKeys.map((k) => (stats?.[k] || 0) / 100);
  const avgValue = values.reduce((a, b) => a + b, 0) / values.length;

  // Constellation opacity based on avg stat value
  const constellationOpacity = Math.min(0.9, 0.15 + avgValue * 0.75);

  const outerPoints = getPolygonPoints(cx, cy, outerR);
  const dataPoints = statKeys.map((k, i) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const r = outerR * (stats?.[k] || 0) / 100;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });

  return (
    <svg
      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity="1" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
        </radialGradient>
        <filter id="starBlur">
          <feGaussianBlur stdDeviation="0.6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Background twinkling stars */}
      {STAR_POSITIONS.map((s, i) => (
        <g key={i}>
          <circle
            cx={(s.x / 100) * width}
            cy={(s.y / 100) * height}
            r={i % 3 === 0 ? 0.8 : 0.5}
            fill="#c4b5fd"
            opacity={0.25 + (i % 4) * 0.07}
          />
        </g>
      ))}

      {/* Constellation lines connecting outer vertices */}
      {CONSTELLATION_PAIRS.map(([a, b], i) => (
        <line
          key={`cline-${i}`}
          x1={outerPoints[a].x}
          y1={outerPoints[a].y}
          x2={outerPoints[b].x}
          y2={outerPoints[b].y}
          stroke="#a78bfa"
          strokeWidth={0.5}
          strokeOpacity={constellationOpacity * 0.35}
          strokeDasharray="2 3"
        />
      ))}

      {/* Data-driven constellation lines */}
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
            stroke="#c4b5fd"
            strokeWidth={0.8}
            strokeOpacity={lineOpacity * 0.6}
          />
        );
      })}

      {/* Star nodes at outer vertices */}
      {outerPoints.map((p, i) => (
        <g key={`star-${i}`}>
          <circle
            cx={p.x}
            cy={p.y}
            r={2.5}
            fill="none"
            stroke="#a78bfa"
            strokeWidth={0.8}
            strokeOpacity={constellationOpacity * 0.5}
          />
          <circle
            cx={p.x}
            cy={p.y}
            r={values[i] * 3}
            fill="#c4b5fd"
            opacity={constellationOpacity * values[i]}
            filter="url(#starBlur)"
          />
          {/* Cross sparkle */}
          <line x1={p.x - 3} y1={p.y} x2={p.x + 3} y2={p.y}
            stroke="#e9d5ff" strokeWidth={0.6} strokeOpacity={constellationOpacity * values[i] * 0.8} />
          <line x1={p.x} y1={p.y - 3} x2={p.x} y2={p.y + 3}
            stroke="#e9d5ff" strokeWidth={0.6} strokeOpacity={constellationOpacity * values[i] * 0.8} />
        </g>
      ))}

      {/* Completion glow at center when avg is high */}
      {avgValue > 0.6 && (
        <circle
          cx={cx}
          cy={cy}
          r={outerR * 0.15}
          fill="url(#starGlow)"
          opacity={(avgValue - 0.6) * 1.5}
        />
      )}
    </svg>
  );
}

export default function StatsRadar({ stats }) {
  if (!stats) return null;

  const data = Object.entries(statLabels).map(([key, label]) => ({
    stat: label,
    value: stats[key] || 0,
  }));

  return (
    <div className="w-full h-56 relative">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#e9e5f5" strokeWidth={0.8} />
          <PolarAngleAxis
            dataKey="stat"
            tick={{ fill: "#8b7fb0", fontSize: 11, fontWeight: 500 }}
          />
          <Radar
            dataKey="value"
            stroke="#a78bfa"
            fill="url(#radarGradient)"
            fillOpacity={0.45}
            strokeWidth={1.5}
          />
          <defs>
            <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c4b5fd" stopOpacity={0.7} />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.25} />
            </linearGradient>
          </defs>
        </RadarChart>
      </ResponsiveContainer>
      {/* Constellation overlay positioned over the chart */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div style={{ width: "70%", height: "70%", position: "relative" }}>
          <ConstellationOverlay stats={stats} width={200} height={200} />
        </div>
      </div>
    </div>
  );
}
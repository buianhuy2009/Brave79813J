import React, { useState } from 'react';

/**
 * TrendChart.jsx - Pure SVG Match-by-Match & Season Score Progression Trend Line
 * 
 * Features:
 * - Responsive SVG with viewBox and fluid container scaling
 * - Monotonic Cubic Bezier smooth spline curve
 * - Translucent Cyan area fill under trend line
 * - Dotted horizontal grid lines with score scale
 * - Dashed horizontal Average Score reference line with badge
 * - Highlighted Min (amber) and Max (emerald) score markers
 * - Interactive hover tooltip with match info, score, partner, and +/- vs average
 * - Dark/light theme support
 * - WCAG AA accessible with screen-reader table and ARIA
 * - Zero external math/chart libraries (pure React + SVG).
 */
export default function TrendChart({
  data = [],
  metricKey = 'score',
  metricLabel = 'Score',
  showAverage = true,
  showMinMax = true,
  showArea = true,
  height = 220,
  className = '',
  lang = 'en'
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const isVi = lang === 'vi';
  const labelAvg = isVi ? 'Điểm TB' : 'Avg';
  const labelHigh = isVi ? 'Kỷ lục' : 'High';
  const labelLow = isVi ? 'Thấp nhất' : 'Low';
  const labelMatch = isVi ? 'Trận' : 'Match';
  const labelPartner = isVi ? 'Đồng đội' : 'Partner';

  const svgW = 500;
  const svgH = 220;
  const pad = { top: 25, right: 35, bottom: 35, left: 45 };
  const plotW = svgW - pad.left - pad.right;
  const plotH = svgH - pad.top - pad.bottom;

  if (!data || data.length === 0) {
    return (
      <div className={`p-8 text-center text-slate-400 text-xs rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 ${className}`}>
        <p>{isVi ? 'Chưa có dữ liệu trận đấu.' : 'No match data recorded yet.'}</p>
      </div>
    );
  }

  const scores = data.map(d => Number(d[metricKey]) || 0);
  const minVal = Math.min(...scores);
  const maxVal = Math.max(...scores);
  const avgVal = scores.reduce((a, b) => a + b, 0) / scores.length;

  const yMin = Math.max(0, Math.floor(Math.max(0, minVal - 10) / 10) * 10);
  const yMax = Math.max(yMin + 20, Math.ceil((maxVal + 10) / 10) * 10);
  const yRange = yMax - yMin || 1;

  function getY(val) {
    return pad.top + plotH - ((val - yMin) / yRange) * plotH;
  }

  function getX(i) {
    if (data.length <= 1) return pad.left + plotW / 2;
    return pad.left + (i / (data.length - 1)) * plotW;
  }

  const points = data.map((d, i) => ({
    x: getX(i),
    y: getY(Number(d[metricKey]) || 0),
    val: Number(d[metricKey]) || 0,
    label: d.label || d.matchnum || `M${i + 1}`,
    partner: d.partner || '',
    isHigh: Number(d[metricKey]) === maxVal,
    isLow: Number(d[metricKey]) === minVal && minVal !== maxVal
  }));

  // Build monotonic smooth Bezier spline
  let pathD = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = (p1.x - p0.x) * 0.45;
    pathD += ` C ${(p0.x + dx).toFixed(1)} ${p0.y.toFixed(1)} ${(p1.x - dx).toFixed(1)} ${p1.y.toFixed(1)} ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }

  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${(pad.top + plotH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(pad.top + plotH).toFixed(1)} Z`;

  const yTicks = [yMin, Math.round(yMin + yRange * 0.33), Math.round(yMin + yRange * 0.66), yMax];
  const avgY = getY(avgVal);

  return (
    <div className={`space-y-2 select-none w-full ${className}`}>
      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full h-auto overflow-visible"
          role="img"
          aria-label={`Match score trend progression for ${data.length} matches, average ${avgVal.toFixed(1)} points`}
        >
          <defs>
            <linearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yTicks.map((tick, i) => {
            const ty = getY(tick);
            return (
              <g key={i}>
                <line
                  x1={pad.left}
                  y1={ty.toFixed(1)}
                  x2={pad.left + plotW}
                  y2={ty.toFixed(1)}
                  className="stroke-slate-200 dark:stroke-slate-800"
                  strokeDasharray="2 3"
                />
                <text
                  x={pad.left - 8}
                  y={ty.toFixed(1)}
                  textAnchor="end"
                  dy="0.3em"
                  className="text-[10px] font-mono fill-slate-400 font-bold"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Average Reference Line */}
          {showAverage && (
            <g>
              <line
                x1={pad.left}
                y1={avgY.toFixed(1)}
                x2={pad.left + plotW}
                y2={avgY.toFixed(1)}
                className="stroke-amber-500/80 dark:stroke-amber-400/80"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text
                x={pad.left + plotW}
                y={avgY - 6}
                textAnchor="end"
                className="text-[10px] font-mono font-black fill-amber-600 dark:fill-amber-400"
              >
                {labelAvg}: {avgVal.toFixed(1)}
              </text>
            </g>
          )}

          {/* Area Fill */}
          {showArea && points.length > 1 && (
            <path d={areaD} fill="url(#trendAreaGrad)" />
          )}

          {/* Trend Polyline / Spline */}
          {points.length > 1 && (
            <path
              d={pathD}
              fill="none"
              className="stroke-cyan-500 dark:stroke-cyan-400"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Active Hover Cursor Guide */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <line
              x1={points[hoveredIndex].x.toFixed(1)}
              y1={pad.top}
              x2={points[hoveredIndex].x.toFixed(1)}
              y2={pad.top + plotH}
              className="stroke-cyan-500/50"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}

          {/* Data Points */}
          {points.map((pt, i) => (
            <g key={i}>
              <circle
                cx={pt.x.toFixed(1)}
                cy={pt.y.toFixed(1)}
                r={hoveredIndex === i ? 6 : (pt.isHigh ? 5.5 : 4)}
                className={
                  pt.isHigh 
                    ? "fill-emerald-500 stroke-white dark:stroke-slate-900 shadow-md" 
                    : pt.isLow
                    ? "fill-amber-500 stroke-white dark:stroke-slate-900 shadow-md"
                    : "fill-cyan-500 dark:fill-cyan-400 stroke-white dark:stroke-slate-900"
                }
                strokeWidth="2"
              />
              {/* Invisible large touch/hover target */}
              <circle
                cx={pt.x.toFixed(1)}
                cy={pt.y.toFixed(1)}
                r="16"
                className="fill-transparent cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                tabIndex={0}
                onFocus={() => setHoveredIndex(i)}
                onBlur={() => setHoveredIndex(null)}
              />
              {/* X Axis Label */}
              <text
                x={pt.x.toFixed(1)}
                y={pad.top + plotH + 16}
                textAnchor="middle"
                className={`text-[9px] font-mono font-bold transition-colors ${
                  hoveredIndex === i ? 'fill-cyan-600 dark:fill-cyan-400 font-extrabold' : 'fill-slate-400'
                }`}
              >
                {pt.label}
              </text>
            </g>
          ))}
        </svg>

        {/* Floating Tooltip Card */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div 
            className="absolute -top-12 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-mono shadow-xl border border-slate-700 pointer-events-none -translate-x-1/2 z-10 whitespace-nowrap"
            style={{
              left: `${(points[hoveredIndex].x / svgW) * 100}%`
            }}
          >
            <div className="flex items-center gap-1.5 font-bold">
              <span className="text-cyan-400">{labelMatch} {points[hoveredIndex].label}:</span>
              <span>{points[hoveredIndex].val} pts</span>
              {points[hoveredIndex].val > avgVal ? (
                <span className="text-emerald-400 text-[10px]">(+{(points[hoveredIndex].val - avgVal).toFixed(1)})</span>
              ) : points[hoveredIndex].val < avgVal ? (
                <span className="text-rose-400 text-[10px]">(-{(avgVal - points[hoveredIndex].val).toFixed(1)})</span>
              ) : null}
            </div>
            {points[hoveredIndex].partner && (
              <p className="text-[10px] text-slate-300 font-normal">
                {labelPartner}: {points[hoveredIndex].partner}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Screen Reader Table */}
      <table className="sr-only">
        <caption>Match score progression history</caption>
        <thead>
          <tr>
            <th>{labelMatch}</th>
            <th>{metricLabel}</th>
            <th>{labelPartner}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <td>{d.label || `Match ${i + 1}`}</td>
              <td>{d[metricKey]}</td>
              <td>{d.partner || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

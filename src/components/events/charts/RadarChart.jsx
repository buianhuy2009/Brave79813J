import React, { useState } from 'react';

/**
 * RadarChart.jsx - Pure SVG 6-Axis Percentile Radar Chart
 * 
 * Compares a team's multi-dimensional performance against the event/division median.
 * 6 Axes:
 * 1. Avg Score (Average match score)
 * 2. Max Score (High score)
 * 3. OPR (Cooperative Mean OPR)
 * 4. Skills Score (Driver + Programming)
 * 5. Auto Ratio (Autonomous Coding / Total Skills %)
 * 6. Win Rate (Win percentage %)
 * 
 * Zero external math/chart libraries (pure trigonometry + SVG).
 */
export default function RadarChart({
  teamMetrics = {},
  medianMetrics = {},
  maxMetrics = {},
  teamNumber = '79813J',
  divisionName = '',
  size = 340,
  className = '',
  lang = 'en'
}) {
  const [hoveredAxis, setHoveredAxis] = useState(null);

  const isVi = lang === 'vi';
  const axisDefs = [
    { key: 'avgScore', en: 'Avg Score', vi: 'Điểm TB', defaultMax: 120, unit: 'pts' },
    { key: 'maxScore', en: 'Max Score', vi: 'Kỷ lục', defaultMax: 140, unit: 'pts' },
    { key: 'opr', en: 'OPR', vi: 'OPR', defaultMax: 70, unit: '' },
    { key: 'skillsScore', en: 'Skills', vi: 'Skills', defaultMax: 150, unit: 'pts' },
    { key: 'autoRatio', en: 'Auto Ratio', vi: 'Tỉ lệ Auto', defaultMax: 100, unit: '%' },
    { key: 'winRate', en: 'Win Rate', vi: 'Tỉ lệ Thắng', defaultMax: 100, unit: '%' }
  ];

  const cx = 170;
  const cy = 170;
  const R = 105;
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  function getAngle(index) {
    return -Math.PI / 2 + (index * 2 * Math.PI) / 6;
  }

  function normalize(val, key, defMax) {
    const num = Math.max(0, Number(val) || 0);
    const maxVal = maxMetrics[key] || defMax;
    const pct = Math.min(100, Math.max(0, (num / maxVal) * 100));
    return Math.max(6, pct); // clamp to 6% min so zero points don't vanish into center
  }

  const teamPoints = axisDefs.map((axis, i) => {
    const angle = getAngle(i);
    const pct = normalize(teamMetrics[axis.key], axis.key, axis.defaultMax);
    const r = (pct / 100) * R;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      pct: Math.round(pct),
      rawVal: teamMetrics[axis.key] ?? 0,
      label: isVi ? axis.vi : axis.en,
      unit: axis.unit
    };
  });

  const medianPoints = axisDefs.map((axis, i) => {
    const angle = getAngle(i);
    const pct = normalize(medianMetrics[axis.key] ?? axis.defaultMax * 0.5, axis.key, axis.defaultMax);
    const r = (pct / 100) * R;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      pct: Math.round(pct),
      rawVal: medianMetrics[axis.key] ?? '-'
    };
  });

  const teamPolygon = teamPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const medianPolygon = medianPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <div className={`flex flex-col items-center select-none w-full ${className}`}>
      <div className="relative w-full max-w-[340px] aspect-square">
        <svg
          viewBox="0 0 340 340"
          className="w-full h-full overflow-visible"
          role="img"
          aria-label={`Radar chart comparing team ${teamNumber} to division median across 6 metrics`}
        >
          {/* Concentric Hexagonal Grid */}
          {levels.map((lvl, lvlIdx) => {
            const r = lvl * R;
            const pts = [0, 1, 2, 3, 4, 5].map(i => {
              const a = getAngle(i);
              return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
            }).join(' ');
            return (
              <polygon
                key={lvlIdx}
                points={pts}
                className="fill-none stroke-slate-200 dark:stroke-slate-700/60"
                strokeWidth="1"
              />
            );
          })}

          {/* Radial Spokes */}
          {[0, 1, 2, 3, 4, 5].map(i => {
            const a = getAngle(i);
            const x2 = cx + R * Math.cos(a);
            const y2 = cy + R * Math.sin(a);
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={x2.toFixed(1)}
                y2={y2.toFixed(1)}
                className="stroke-slate-200 dark:stroke-slate-700/60"
                strokeWidth="1"
              />
            );
          })}

          {/* Division Median Polygon */}
          <polygon
            points={medianPolygon}
            className="fill-slate-400/10 stroke-slate-400 dark:stroke-slate-500"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />

          {/* Team Shape Polygon */}
          <polygon
            points={teamPolygon}
            className="fill-cyan-500/25 dark:fill-cyan-400/20 stroke-cyan-500 dark:stroke-cyan-400"
            strokeWidth="2.5"
          />

          {/* Team Vertices with touch/hover hit zones */}
          {teamPoints.map((pt, i) => (
            <g key={i}>
              <circle
                cx={pt.x.toFixed(1)}
                cy={pt.y.toFixed(1)}
                r={hoveredAxis === i ? 6 : 4}
                className="fill-cyan-500 dark:fill-cyan-400 stroke-white dark:stroke-slate-900 transition-all duration-150"
                strokeWidth="2"
              />
              <circle
                cx={pt.x.toFixed(1)}
                cy={pt.y.toFixed(1)}
                r="16"
                className="fill-transparent cursor-pointer"
                onMouseEnter={() => setHoveredAxis(i)}
                onMouseLeave={() => setHoveredAxis(null)}
                tabIndex={0}
                onFocus={() => setHoveredAxis(i)}
                onBlur={() => setHoveredAxis(null)}
                role="button"
                aria-label={`${pt.label}: ${pt.rawVal}${pt.unit}`}
              />
            </g>
          ))}

          {/* Axis Labels */}
          {axisDefs.map((axis, i) => {
            const a = getAngle(i);
            const labelR = R + 24;
            const lx = cx + labelR * Math.cos(a);
            const ly = cy + labelR * Math.sin(a);
            let textAnchor = 'middle';
            let dy = '0.3em';
            if (i === 0) dy = '-0.4em';
            else if (i === 3) dy = '0.9em';
            else if (i === 1 || i === 2) textAnchor = 'start';
            else if (i === 4 || i === 5) textAnchor = 'end';

            const isHovered = hoveredAxis === i;

            return (
              <text
                key={i}
                x={lx.toFixed(1)}
                y={ly.toFixed(1)}
                textAnchor={textAnchor}
                dy={dy}
                className={`text-[10px] font-black tracking-tight transition-colors ${
                  isHovered ? 'fill-cyan-600 dark:fill-cyan-400 font-extrabold' : 'fill-slate-600 dark:fill-slate-300'
                }`}
              >
                {isVi ? axis.vi : axis.en}
              </text>
            );
          })}
        </svg>

        {/* Hover Tooltip Card */}
        {hoveredAxis !== null && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-slate-900/90 dark:bg-slate-800/95 backdrop-blur-sm text-white text-xs font-mono shadow-xl border border-slate-700 pointer-events-none text-center z-10">
            <p className="font-bold text-cyan-400 text-[11px]">{teamPoints[hoveredAxis].label}</p>
            <p className="font-black text-sm">{teamPoints[hoveredAxis].rawVal} {teamPoints[hoveredAxis].unit}</p>
            <p className="text-[10px] text-slate-400">{isVi ? 'Trung vị' : 'Median'}: {medianPoints[hoveredAxis].rawVal}</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-cyan-500 inline-block border border-cyan-400 shadow-sm" />
          <span>{teamNumber}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-1 border-b-2 border-dashed border-slate-400 dark:border-slate-500 inline-block" />
          <span>{isVi ? 'Trung vị bảng' : 'Division Median'}</span>
        </span>
      </div>

      {/* Screen Reader Accessible Table */}
      <table className="sr-only">
        <caption>{`Radar metrics comparison for Team ${teamNumber}`}</caption>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Team Value</th>
            <th>Division Median</th>
          </tr>
        </thead>
        <tbody>
          {axisDefs.map((axis, i) => (
            <tr key={axis.key}>
              <td>{isVi ? axis.vi : axis.en}</td>
              <td>{teamPoints[i].rawVal}</td>
              <td>{medianPoints[i].rawVal}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

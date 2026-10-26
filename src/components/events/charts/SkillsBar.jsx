import React, { useState, useId } from 'react';

/**
 * SkillsBar.jsx - Pure SVG Horizontal Stacked Skills Split Bar
 * 
 * Displays Driver Skills (Blue/Indigo) vs Programming/Autonomous Coding (Cyan/Sky)
 * proportions with responsive SVG, smooth rounded capsule styling, theme support,
 * interactive tooltips, and WCAG AA accessibility.
 * 
 * Zero external charting dependencies (pure React + SVG).
 */
export default function SkillsBar({
  driverScore = 0,
  programmingScore = 0,
  totalScore = null,
  maxScore = null,
  height = 20,
  compact = false,
  showLabels = true,
  showBadge = true,
  showPercentages = true,
  className = '',
  lang = 'en'
}) {
  const [activeTooltip, setActiveTooltip] = useState(null);
  const reactId = useId();
  const clipId = `skills-clip-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const safeDriver = Math.max(0, Number(driverScore) || 0);
  const safeProg = Math.max(0, Number(programmingScore) || 0);
  const sum = safeDriver + safeProg;
  const computedTotal = (totalScore !== null && totalScore !== undefined) 
    ? Math.max(0, Number(totalScore) || 0) 
    : sum;

  const driverPct = computedTotal > 0 ? (safeDriver / computedTotal) * 100 : 0;
  const progPct = computedTotal > 0 ? (safeProg / computedTotal) * 100 : 0;

  const formattedDriverPct = Math.round(driverPct);
  const formattedProgPct = Math.round(progPct);

  const isVi = lang === 'vi';
  const labelDriver = isVi ? 'Lái tay' : 'Driver';
  const labelProg = isVi ? 'Lập trình' : 'Programming';
  const labelTotal = isVi ? 'Tổng' : 'Total';
  const labelEmpty = isVi ? 'Chưa có điểm' : 'No skills recorded';

  // SVG dimensions
  const svgWidth = 400;
  const barHeight = compact ? 10 : (height || 20);
  const radius = barHeight / 2;

  // Segment widths
  const driverWidth = computedTotal > 0 ? (driverPct / 100) * svgWidth : 0;
  const progWidth = computedTotal > 0 ? (progPct / 100) * svgWidth : 0;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 w-full ${className}`}>
        <div className="relative flex-1 min-w-[60px]">
          <svg 
            viewBox={`0 0 ${svgWidth} ${barHeight}`}
            className="w-full h-auto overflow-hidden"
            role="img"
            aria-label={`${labelTotal}: ${computedTotal} pts (${labelDriver}: ${safeDriver}, ${labelProg}: ${safeProg})`}
          >
            <title>{`${labelDriver}: ${safeDriver} (${formattedDriverPct}%) | ${labelProg}: ${safeProg} (${formattedProgPct}%)`}</title>
            <defs>
              <clipPath id={clipId}>
                <rect x="0" y="0" width={svgWidth} height={barHeight} rx={radius} ry={radius} />
              </clipPath>
            </defs>
            {computedTotal === 0 ? (
              <rect x="0" y="0" width={svgWidth} height={barHeight} rx={radius} ry={radius} className="fill-slate-200 dark:fill-slate-700/60" />
            ) : (
              <g clipPath={`url(#${clipId})`}>
                <rect x="0" y="0" width={driverWidth} height={barHeight} className="fill-blue-600 dark:fill-blue-500" />
                <rect x={driverWidth} y="0" width={progWidth} height={barHeight} className="fill-cyan-500 dark:fill-cyan-400" />
              </g>
            )}
          </svg>
        </div>
        <span className="font-mono font-bold text-[11px] text-slate-700 dark:text-slate-200 shrink-0">
          {computedTotal}
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 w-full ${className}`}>
      {showLabels && (
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-500 inline-block" />
              <span>{labelDriver}: <strong className="font-mono text-slate-900 dark:text-white">{safeDriver}</strong></span>
              {showPercentages && computedTotal > 0 && (
                <span className="text-[11px] text-slate-400 font-mono">({formattedDriverPct}%)</span>
              )}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 dark:bg-cyan-400 inline-block" />
              <span>{labelProg}: <strong className="font-mono text-slate-900 dark:text-white">{safeProg}</strong></span>
              {showPercentages && computedTotal > 0 && (
                <span className="text-[11px] text-slate-400 font-mono">({formattedProgPct}%)</span>
              )}
            </span>
          </div>
          {showBadge && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-mono font-black">
              <span>{labelTotal}:</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-black">{computedTotal}</span>
            </div>
          )}
        </div>
      )}

      <div className="relative">
        <svg
          viewBox={`0 0 ${svgWidth} ${barHeight}`}
          className="w-full h-auto overflow-hidden drop-shadow-sm"
          role="img"
          aria-label={`${labelTotal}: ${computedTotal} pts. ${labelDriver}: ${safeDriver} pts (${formattedDriverPct}%), ${labelProg}: ${safeProg} pts (${formattedProgPct}%)`}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x="0" y="0" width={svgWidth} height={barHeight} rx={radius} ry={radius} />
            </clipPath>
            <linearGradient id={`${clipId}-driverGrad`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id={`${clipId}-progGrad`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
          {computedTotal === 0 ? (
            <g>
              <rect x="0" y="0" width={svgWidth} height={barHeight} rx={radius} ry={radius} className="fill-slate-100 dark:fill-slate-800 stroke border-slate-200 dark:stroke-slate-700" />
              <text x={svgWidth / 2} y={barHeight / 2 + 3} textAnchor="middle" className="text-[10px] font-bold fill-slate-400">
                {labelEmpty}
              </text>
            </g>
          ) : (
            <g clipPath={`url(#${clipId})`}>
              {driverWidth > 0 && (
                <rect 
                  x="0" 
                  y="0" 
                  width={driverWidth} 
                  height={barHeight} 
                  fill={`url(#${clipId}-driverGrad)`}
                  className="cursor-pointer transition-opacity hover:opacity-90"
                  onMouseEnter={() => setActiveTooltip('driver')}
                  onMouseLeave={() => setActiveTooltip(null)}
                />
              )}
              {progWidth > 0 && (
                <rect 
                  x={driverWidth} 
                  y="0" 
                  width={progWidth} 
                  height={barHeight} 
                  fill={`url(#${clipId}-progGrad)`}
                  className="cursor-pointer transition-opacity hover:opacity-90"
                  onMouseEnter={() => setActiveTooltip('prog')}
                  onMouseLeave={() => setActiveTooltip(null)}
                />
              )}
              {driverWidth > 0 && progWidth > 0 && (
                <line x1={driverWidth} y1="0" x2={driverWidth} y2={barHeight} stroke="white" strokeWidth="2" opacity="0.6" />
              )}
            </g>
          )}
        </svg>

        {activeTooltip && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-mono shadow-md whitespace-nowrap z-10 pointer-events-none">
            {activeTooltip === 'driver' 
              ? `${labelDriver}: ${safeDriver} pts (${formattedDriverPct}%)` 
              : `${labelProg}: ${safeProg} pts (${formattedProgPct}%)`}
          </div>
        )}
      </div>

      <div className="sr-only">
        {labelTotal}: {computedTotal} points. {labelDriver}: {safeDriver} ({formattedDriverPct}%). {labelProg}: {safeProg} ({formattedProgPct}%).
      </div>
    </div>
  );
}

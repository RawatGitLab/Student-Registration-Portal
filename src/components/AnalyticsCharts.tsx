import React from 'react';
import { Award, CalendarCheck, TrendingUp, BarChart3, AlertCircle } from 'lucide-react';

// 1. Attendance Circular Progress Ring
interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

export function AttendanceProgressRing({ percentage, size = 120, strokeWidth = 10 }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let colorClass = 'stroke-emerald-500';
  let bgClass = 'text-slate-100';
  let textClass = 'text-slate-800';

  if (percentage < 75) {
    colorClass = 'stroke-rose-500';
  } else if (percentage < 85) {
    colorClass = 'stroke-amber-500';
  }

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          className="stroke-slate-100 fill-transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress bar with smooth dash array */}
        <circle
          className={`${colorClass} fill-transparent transition-all duration-500 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {/* Central percentage indicator */}
      <div className="absolute flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-extrabold tracking-tight text-slate-800">
          {percentage.toFixed(0)}%
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Present
        </span>
      </div>
    </div>
  );
}

// 2. Custom SVG Performance Trend Line Chart
interface TrendPoint {
  label: string; // "Unit Test" | "Half-Yearly" | "Final"
  score: number; // percentage (0 - 100)
}

interface TrendLineProps {
  data: TrendPoint[];
}

export function PerformanceTrendLine({ data }: TrendLineProps) {
  if (!data || data.length === 0) return null;

  // Chart configuration
  const width = 500;
  const height = 200;
  const padding = 40;

  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Map scores to chart coordinates
  const points = data.map((d, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - (d.score / 100) * chartHeight;
    return { x, y, label: d.label, score: d.score };
  });

  // Create path command
  let pathD = '';
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      // Draw smooth quadratic curves instead of sharp lines
      const prev = points[i - 1];
      const curr = points[i];
      const cpX1 = prev.x + (curr.x - prev.x) / 2;
      const cpY1 = prev.y;
      const cpX2 = prev.x + (curr.x - prev.x) / 2;
      const cpY2 = curr.y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
    }
  }

  // Path background for gradient fill under the line
  const fillD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    : '';

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-500" />
          <h3 className="font-display font-bold text-slate-800">Academic Growth Profile</h3>
        </div>
        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600">
          Exam History
        </span>
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[320px]">
          {/* Defs for gradient */}
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((gridVal) => {
            const y = padding + chartHeight - (gridVal / 100) * chartHeight;
            return (
              <g key={gridVal}>
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  className="stroke-slate-100"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <text
                  x={padding - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 font-mono text-[10px] font-medium"
                >
                  {gridVal}%
                </text>
              </g>
            );
          })}

          {/* Shaded Area under Curve */}
          {fillD && <path d={fillD} fill="url(#areaGradient)" />}

          {/* Main Curve Path */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth={3}
              className="transition-all duration-500"
            />
          )}

          {/* Data Nodes */}
          {points.map((pt, i) => (
            <g key={i} className="group cursor-pointer">
              {/* Outer halo */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={8}
                className="fill-indigo-100 opacity-0 group-hover:opacity-100 transition-all duration-300"
              />
              {/* Core point */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={5}
                className="fill-indigo-600 stroke-white"
                strokeWidth={2}
              />
              {/* Text tooltip-like */}
              <text
                x={pt.x}
                y={pt.y - 12}
                textAnchor="middle"
                className="fill-slate-800 font-sans font-bold text-xs"
              >
                {pt.score.toFixed(0)}%
              </text>
              {/* X axis labels */}
              <text
                x={pt.x}
                y={height - padding + 18}
                textAnchor="middle"
                className="fill-slate-500 font-sans font-semibold text-[11px]"
              >
                {pt.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

// 3. Custom Subject Averages Bar Chart
interface SubjectBarData {
  name: string;
  score: number; // Average score %
}

interface SubjectBarChartProps {
  data: SubjectBarData[];
}

export function SubjectBarChart({ data }: SubjectBarChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="w-full rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-500" />
          <h3 className="font-display font-bold text-slate-800">Subject Breakdown</h3>
        </div>
        <span className="text-xs font-semibold text-slate-400 font-mono">Scores Average</span>
      </div>

      <div className="space-y-4">
        {data.map((item, index) => {
          // Color based on performance tier
          let barColor = 'bg-indigo-500';
          let textColor = 'text-indigo-700 bg-indigo-50';

          if (item.score >= 85) {
            barColor = 'bg-emerald-500';
            textColor = 'text-emerald-700 bg-emerald-50';
          } else if (item.score < 60) {
            barColor = 'bg-rose-500';
            textColor = 'text-rose-700 bg-rose-50';
          } else if (item.score < 75) {
            barColor = 'bg-amber-500';
            textColor = 'text-amber-700 bg-amber-50';
          }

          return (
            <div key={index} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700">{item.name}</span>
                <span className={`rounded px-1.5 py-0.5 font-mono text-[11px] ${textColor}`}>
                  {item.score.toFixed(0)}%
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-100">
                <div
                  style={{ width: `${Math.max(3, Math.min(100, item.score))}%` }}
                  className={`h-full rounded-full ${barColor} transition-all duration-700 ease-out`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper to determine Grade from a average mark percentage
export function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}

// Helper to calculate Grade Points
export function calculateGPA(percentage: number): number {
  if (percentage >= 90) return 4.0;
  if (percentage >= 80) return 3.5;
  if (percentage >= 70) return 3.0;
  if (percentage >= 60) return 2.5;
  if (percentage >= 50) return 2.0;
  return 0.0;
}

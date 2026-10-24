'use client';

import React, { useId } from 'react';
import { ChevronDown, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';

export type ProgressRange = 'week' | 'month';

interface WeeklyProgressChartProps {
  data: {
    labels: string[];
    created: number[];
    completed: number[];
  };
  range: ProgressRange;
  onRangeChange: (range: ProgressRange) => void;
}

const RANGES: { value: ProgressRange; label: string }[] = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'Last 4 Weeks' },
];

const selectClass =
  'appearance-none rounded-xl border border-slate-200/80 bg-white/80 py-1 pl-2.5 pr-7 text-[11px] font-medium text-slate-600 shadow-[inset_2px_2px_4px_rgba(148,163,199,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.85)] outline-none transition-colors hover:border-indigo-300 focus:border-indigo-400 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.03)] dark:hover:border-white/20';

type Point = { x: number; y: number };

/** Smooth cubic path that passes through every point. */
function toSmoothLine(points: Point[]) {
  if (points.length === 0) return '';
  let path = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    path += ` C${midX},${current.y} ${midX},${next.y} ${next.x},${next.y}`;
  }
  return path;
}

function toArea(points: Point[]) {
  if (points.length === 0) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `${toSmoothLine(points)} L${last.x},100 L${first.x},100 Z`;
}

export function WeeklyProgressChart({ data, range, onRangeChange }: WeeklyProgressChartProps) {
  const createdGradient = useId().replace(/:/g, '');
  const completedGradient = useId().replace(/:/g, '');

  const totalCreated = data.created.reduce((a, b) => a + b, 0);
  const totalCompleted = data.completed.reduce((a, b) => a + b, 0);
  const completionRate = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;

  // Round the scale up to a tidy step so the axis reads 0 / 20 / 40 / 60 / 80.
  const rawMax = Math.max(...data.created, ...data.completed, 4);
  const step = rawMax <= 4 ? 1 : Math.ceil(rawMax / 20) * 5;
  const max = step * 4;
  const yTicks = [4, 3, 2, 1, 0].map((i) => Math.round(step * i));
  const count = data.created.length;

  // Points sit at the centre of each column so labels line up exactly underneath.
  const toPoints = (values: number[]): Point[] =>
    values.map((value, i) => ({
      x: ((i + 0.5) / Math.max(values.length, 1)) * 100,
      y: 100 - (value / max) * 100,
    }));

  const createdPoints = toPoints(data.created);
  const completedPoints = toPoints(data.completed);
  // With an empty week a row of baseline dots adds noise instead of information.
  const showDots = (totalCreated > 0 || totalCompleted > 0) && count <= 7;

  // Keep at most 7 x-axis ticks regardless of the window length.
  const stepX = Math.max(1, Math.ceil(count / 7));
  const ticks = data.labels
    .map((label, i) => ({ label, x: ((i + 0.5) / Math.max(count, 1)) * 100 }))
    .filter((_, i) => i % stepX === 0);

  return (
    <Card className="flex h-full min-h-[250px] flex-col overflow-hidden rounded-2xl border-slate-200/80 bg-white/70 p-5 shadow-[6px_6px_14px_rgba(148,163,199,0.35),-6px_-6px_14px_rgba(255,255,255,0.95)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[6px_6px_14px_rgba(0,0,0,0.55),-6px_-6px_14px_rgba(255,255,255,0.04)]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[15px] font-semibold text-slate-900 dark:text-white">
          <TrendingUp className="h-4 w-4 text-indigo-500/70" />
          Weekly Progress
        </h3>
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <select
              value={range}
              onChange={(e) => onRangeChange(e.target.value as ProgressRange)}
              className={selectClass}
              aria-label="Progress time range"
            >
              {RANGES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-600 ring-1 ring-inset ring-amber-200/70 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            {completionRate}% completion
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col pt-4">
        <div className="flex flex-1 gap-2">
          <div className="flex w-6 shrink-0 flex-col justify-between py-0 text-right text-[10px] leading-none text-gray-400 dark:text-gray-500">
            {yTicks.map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>

          <div className="relative min-h-[140px] flex-1">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
              role="img"
              aria-label={`Weekly progress chart: ${totalCreated} tasks created and ${totalCompleted} completed`}
            >
              <defs>
                <linearGradient id={createdGradient} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
                <linearGradient id={completedGradient} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>

              {[0, 25, 50, 75, 100].map((y) => (
                <line
                  key={`h-${y}`}
                  x1="0"
                  x2="100"
                  y1={y}
                  y2={y}
                  className="stroke-gray-100 dark:stroke-gray-800"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {createdPoints.map((point, i) => (
                <line
                  key={`v-${i}`}
                  x1={point.x}
                  x2={point.x}
                  y1="0"
                  y2="100"
                  className="stroke-gray-50 dark:stroke-gray-800/60"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              <path d={toArea(createdPoints)} fill={`url(#${createdGradient})`} />
              <path d={toArea(completedPoints)} fill={`url(#${completedGradient})`} />

              <path
                d={toSmoothLine(createdPoints)}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={toSmoothLine(completedPoints)}
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {showDots && (
              <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                {createdPoints.map((point, i) => (
                  <span
                    key={`dot-created-${i}`}
                    className="absolute h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500 ring-2 ring-white/80 dark:ring-[#0B1430]"
                    style={{ left: `${point.x}%`, top: `${point.y}%` }}
                  />
                ))}
                {completedPoints.map((point, i) => (
                  <span
                    key={`dot-completed-${i}`}
                    className="absolute h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500 ring-2 ring-white/80 dark:ring-[#0B1430]"
                    style={{ left: `${point.x}%`, top: `${point.y}%` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* x-axis: absolute ticks aligned with each data point */}
        <div className="relative ml-8 mt-2 h-4">
          {ticks.map((tick) => (
            <span
              key={`${tick.label}-${tick.x}`}
              className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[10px] leading-none text-gray-400 dark:text-gray-500"
              style={{ left: `${tick.x}%` }}
            >
              {tick.label}
            </span>
          ))}
        </div>

        <div className="mt-3 flex shrink-0 items-center justify-start gap-5 border-t border-white/60 pt-2.5 dark:border-white/10">
          <span className="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Created
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Completed
          </span>
        </div>
      </div>
    </Card>
  );
}

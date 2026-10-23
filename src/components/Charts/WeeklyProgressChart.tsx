'use client';

import React, { useId } from 'react';
import { TrendingUp } from 'lucide-react';
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
  'rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-dark dark:text-gray-300';

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

  const max = Math.max(...data.created, ...data.completed, 4);
  const mid = Math.round(max / 2);
  const count = data.created.length;

  // Points sit at the centre of each column so labels line up exactly underneath.
  const toPoints = (values: number[]): Point[] =>
    values.map((value, i) => ({
      x: ((i + 0.5) / Math.max(values.length, 1)) * 100,
      y: 100 - (value / max) * 100,
    }));

  const createdPoints = toPoints(data.created);
  const completedPoints = toPoints(data.completed);

  // Keep at most 7 x-axis ticks regardless of the window length.
  const step = Math.max(1, Math.ceil(count / 7));
  const ticks = data.labels
    .map((label, i) => ({ label, x: ((i + 0.5) / Math.max(count, 1)) * 100 }))
    .filter((_, i) => i % step === 0);

  return (
    <Card className="flex h-full min-h-[250px] flex-col overflow-hidden rounded-2xl border-gray-100/80 p-5 shadow-sm dark:border-gray-800">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[15px] font-semibold text-gray-900 dark:text-white">
          <TrendingUp className="h-4 w-4 text-gray-400" />
          Weekly Progress
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {completionRate}% completion
          </span>
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
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col pt-4">
        <div className="flex flex-1 gap-2">
          <div className="flex w-6 shrink-0 flex-col justify-between text-right text-[10px] leading-none text-gray-400 dark:text-gray-500">
            <span>{max}</span>
            <span>{mid}</span>
            <span>0</span>
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

              {[0, 50, 100].map((y) => (
                <line
                  key={y}
                  x1="0"
                  x2="100"
                  y1={y}
                  y2={y}
                  className="stroke-gray-100 dark:stroke-gray-800"
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

        <div className="mt-3 flex shrink-0 items-center justify-center gap-5 border-t border-gray-100 pt-2.5 dark:border-gray-800">
          <span className="flex items-center gap-1.5 text-[10px] text-gray-600 dark:text-gray-400">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Created
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-gray-600 dark:text-gray-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Completed
          </span>
        </div>
      </div>
    </Card>
  );
}

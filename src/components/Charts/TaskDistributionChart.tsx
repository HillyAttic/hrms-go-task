import React from 'react';
import { ChevronDown, PieChart } from 'lucide-react';
import { Card } from '@/components/ui/card';

export type DistributionRange = 'week' | 'month' | 'all';

interface TaskDistributionChartProps {
  completed: number;
  inProgress: number;
  todo: number;
  total: number;
  range: DistributionRange;
  onRangeChange: (range: DistributionRange) => void;
}

const RANGES: { value: DistributionRange; label: string }[] = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
];

const selectClass =
  'appearance-none rounded-xl border border-slate-200/80 bg-white/80 py-1 pl-2.5 pr-7 text-[11px] font-medium text-slate-600 shadow-[inset_2px_2px_4px_rgba(148,163,199,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.85)] outline-none transition-colors hover:border-indigo-300 focus:border-indigo-400 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.03)] dark:hover:border-white/20';

export function TaskDistributionChart({
  completed,
  inProgress,
  todo,
  total,
  range,
  onRangeChange,
}: TaskDistributionChartProps) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const gap = 3;

  const segments = [
    {
      label: 'Completed',
      value: completed,
      color: '#10b981',
      row: 'bg-emerald-50/80 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
      dot: 'bg-emerald-500',
    },
    {
      label: 'In Progress',
      value: inProgress,
      color: '#f59e0b',
      row: 'bg-orange-50/80 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300',
      dot: 'bg-orange-500',
    },
    {
      label: 'To Do',
      value: todo,
      color: '#ef4444',
      row: 'bg-red-50/80 text-red-600 dark:bg-red-500/10 dark:text-red-300',
      dot: 'bg-red-500',
    },
  ];

  const pct = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

  let offset = 0;

  return (
    <Card className="flex h-full min-h-[250px] flex-col overflow-hidden rounded-2xl border-slate-200/80 bg-white/70 p-5 shadow-[6px_6px_14px_rgba(148,163,199,0.35),-6px_-6px_14px_rgba(255,255,255,0.95)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[6px_6px_14px_rgba(0,0,0,0.55),-6px_-6px_14px_rgba(255,255,255,0.04)]">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[15px] font-semibold text-slate-900 dark:text-white">
          <PieChart className="h-4 w-4 text-indigo-500/70" />
          Task Distribution
        </h3>
        <div className="relative shrink-0">
          <select
            value={range}
            onChange={(e) => onRangeChange(e.target.value as DistributionRange)}
            className={selectClass}
            aria-label="Task distribution time range"
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
      </div>

      <div className="mt-4 flex flex-1 flex-wrap items-center justify-center gap-3 2xl:flex-nowrap 2xl:gap-5">
        <div className="relative h-28 w-28 shrink-0 2xl:h-36 2xl:w-36">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
            <defs>
              <linearGradient id="task-distribution-track" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#C7D2FE" />
                <stop offset="55%" stopColor="#DDD6FE" />
                <stop offset="100%" stopColor="#BBF7D0" />
              </linearGradient>
            </defs>
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="12"
              className={total > 0 ? 'stroke-gray-100 dark:stroke-gray-800' : ''}
              stroke={total > 0 ? undefined : 'url(#task-distribution-track)'}
            />
            {total > 0 &&
              segments.map((segment) => {
                const length = (segment.value / total) * circumference;
                const dashOffset = -offset;
                offset += length;
                if (length === 0) return null;
                const visible = length > gap * 2 ? length - gap : length;
                return (
                  <circle
                    key={segment.label}
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth="12"
                    strokeDasharray={`${visible} ${circumference - visible}`}
                    strokeDashoffset={dashOffset}
                  />
                );
              })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold leading-none text-slate-900 dark:text-white">{total}</span>
            <span className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Total</span>
          </div>
        </div>

        <ul className="min-w-[132px] flex-1 space-y-2">
          {segments.map((segment) => (
            <li
              key={segment.label}
              className={`flex items-center justify-between gap-2 rounded-lg px-2 py-2 2xl:px-3 ${segment.row}`}
            >
              <span className="flex min-w-0 items-center gap-2 truncate text-[11.5px] font-medium 2xl:text-[12px]">
                <span className={`h-2 w-2 shrink-0 rounded-full ${segment.dot}`} />
                <span className="truncate">{segment.label}</span>
              </span>
              <span className="shrink-0 text-[11.5px] font-semibold text-gray-900 2xl:text-[12px] dark:text-white">
                {segment.value}{' '}
                <span className="font-normal text-gray-400 dark:text-gray-500">
                  ({pct(segment.value)}%)
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

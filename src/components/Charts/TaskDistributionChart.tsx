import React from 'react';
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
  'rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-dark dark:text-gray-300';

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
    <Card className="flex h-full min-h-[250px] flex-col overflow-hidden rounded-2xl border-gray-100/80 p-5 shadow-sm dark:border-gray-800">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">Task Distribution</h3>
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
      </div>

      <div className="mt-4 flex flex-1 flex-wrap items-center justify-center gap-3 2xl:flex-nowrap 2xl:gap-5">
        <div className="relative h-24 w-24 shrink-0 2xl:h-32 2xl:w-32">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="12"
              className="stroke-gray-100 dark:stroke-gray-800"
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
            <span className="text-2xl font-bold leading-none text-gray-900 dark:text-white">{total}</span>
            <span className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Total</span>
          </div>
        </div>

        <ul className="min-w-[132px] flex-1 space-y-2">
          {segments.map((segment) => (
            <li
              key={segment.label}
              className={`flex items-center justify-between gap-2 rounded-lg px-2 py-2 2xl:px-3 ${segment.row}`}
            >
              <span className="flex min-w-0 items-center gap-2 truncate text-[11px] font-medium 2xl:text-[12px]">
                <span className={`h-2 w-2 shrink-0 rounded-full ${segment.dot}`} />
                <span className="truncate">{segment.label}</span>
              </span>
              <span className="shrink-0 text-[11px] font-semibold text-gray-900 2xl:text-[12px] dark:text-white">
                {segment.value}{' '}
                {/* Percentages only when the card is wide enough to show them in full. */}
                <span className="hidden font-normal text-gray-400 sm:inline xl:hidden 2xl:inline dark:text-gray-500">
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

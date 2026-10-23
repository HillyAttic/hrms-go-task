'use client';

/**
 * Compact stat card: icon badge, value, week-over-week trend and sparkline.
 */

import React, { useId } from 'react';
import { Card } from '@/components/ui/card';

interface SimpleStatCardProps {
  title: string;
  mobileTitle?: string;
  value: number | string;
  icon: React.ReactNode;
  onClick?: () => void;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  subtitle?: string;
  compact?: boolean;
  trend?: { change: number; spark: number[] };
}

const colorMap = {
  blue: {
    wash: 'from-blue-100/60 via-blue-50/25 to-white dark:from-blue-500/15 dark:via-blue-500/5 dark:to-transparent',
    badge: 'bg-blue-50/90 text-blue-600 ring-1 ring-inset ring-blue-200/70 dark:bg-blue-500/15 dark:text-blue-400 dark:ring-blue-500/20',
    stroke: '#2563eb',
  },
  green: {
    wash: 'from-emerald-100/60 via-emerald-50/25 to-white dark:from-emerald-500/15 dark:via-emerald-500/5 dark:to-transparent',
    badge: 'bg-emerald-50/90 text-emerald-600 ring-1 ring-inset ring-emerald-200/70 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/20',
    stroke: '#10b981',
  },
  orange: {
    wash: 'from-orange-100/60 via-orange-50/25 to-white dark:from-orange-500/15 dark:via-orange-500/5 dark:to-transparent',
    badge: 'bg-orange-50/90 text-orange-500 ring-1 ring-inset ring-orange-200/70 dark:bg-orange-500/15 dark:text-orange-400 dark:ring-orange-500/20',
    stroke: '#f59e0b',
  },
  red: {
    wash: 'from-red-100/60 via-red-50/25 to-white dark:from-red-500/15 dark:via-red-500/5 dark:to-transparent',
    badge: 'bg-red-50/90 text-red-500 ring-1 ring-inset ring-red-200/70 dark:bg-red-500/15 dark:text-red-400 dark:ring-red-500/20',
    stroke: '#ef4444',
  },
  purple: {
    wash: 'from-violet-100/60 via-violet-50/25 to-white dark:from-violet-500/15 dark:via-violet-500/5 dark:to-transparent',
    badge: 'bg-violet-50/90 text-violet-600 ring-1 ring-inset ring-violet-200/70 dark:bg-violet-500/15 dark:text-violet-400 dark:ring-violet-500/20',
    stroke: '#8b5cf6',
  },
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const gradientId = useId().replace(/:/g, '');
  if (data.length < 2) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const span = max - min || 1;

  // Reserve a small vertical margin so the stroke never clips.
  const points = data.map((value, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 36 - ((value - min) / span) * 30,
  }));

  // Smooth the line with quadratic segments through the midpoints.
  let line = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    line += ` C${midX},${current.y} ${midX},${next.y} ${next.x},${next.y}`;
  }
  const area = `${line} L100,40 L0,40 Z`;

  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className="h-10 w-[84px] shrink-0 overflow-visible sm:w-[96px] 2xl:h-11 2xl:w-[110px]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function SimpleStatCard({
  title,
  mobileTitle,
  value,
  icon,
  onClick,
  color = 'blue',
  subtitle,
  trend,
}: SimpleStatCardProps) {
  const colors = colorMap[color];
  const displayTitle = mobileTitle ? (
    <>
      <span className="sm:hidden">{mobileTitle}</span>
      <span className="hidden sm:inline">{title}</span>
    </>
  ) : (
    title
  );

  const change = trend?.change ?? 0;
  const positive = change >= 0;

  return (
    <Card
      onClick={onClick}
      className={`group relative h-full overflow-hidden rounded-2xl border-gray-100/90 p-4 shadow-sm transition-all duration-200 dark:border-gray-800 ${
        onClick
          ? 'cursor-pointer hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:hover:border-blue-800'
          : ''
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${colors.wash}`}
        aria-hidden="true"
      />

      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.badge}`}>
            <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
          </div>
        </div>

        <p className="mt-3 truncate text-[12.5px] font-medium text-gray-600 dark:text-gray-400">
          {displayTitle}
        </p>

        <div className="mt-auto pt-1">
          <div className="flex items-end justify-between gap-2">
            <span className="block text-[26px] font-bold leading-none tracking-tight text-gray-900 2xl:text-[28px] dark:text-white">
              {value}
            </span>
            {trend && <Sparkline data={trend.spark} color={colors.stroke} />}
          </div>

          {trend ? (
            <p
              className={`mt-2 flex flex-wrap items-center gap-x-1 text-[11px] font-semibold leading-none ${
                positive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-500 dark:text-red-400'
              }`}
            >
              <span aria-hidden="true">{positive ? '↑' : '↓'}</span>
              <span>
                {positive ? '+' : '-'}
                {Math.abs(change)}%
              </span>
              <span className="font-normal text-gray-400 dark:text-gray-500">from last week</span>
            </p>
          ) : (
            <p className="mt-2 text-[11px] leading-none text-gray-400 dark:text-gray-500">
              {subtitle || 'No change'}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

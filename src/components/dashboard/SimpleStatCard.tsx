'use client';

/**
 * Compact stat card: value, week-over-week trend and sparkline.
 */

import React, { useId } from 'react';
import { Card } from '@/components/ui/card';

interface SimpleStatCardProps {
  title: string;
  mobileTitle?: string;
  value: number | string;
  onClick?: () => void;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  subtitle?: string;
  trend?: { change: number; spark: number[] };
  variant?: 'default' | 'glass';
}

const colorMap = {
  blue: {
    wash: 'from-blue-100/70 via-blue-50/30 to-white dark:from-blue-500/15 dark:via-blue-500/5 dark:to-transparent',
    stroke: '#2563eb',
  },
  green: {
    wash: 'from-emerald-100/70 via-emerald-50/30 to-white dark:from-emerald-500/15 dark:via-emerald-500/5 dark:to-transparent',
    stroke: '#10b981',
  },
  orange: {
    wash: 'from-orange-100/70 via-orange-50/30 to-white dark:from-orange-500/15 dark:via-orange-500/5 dark:to-transparent',
    stroke: '#f59e0b',
  },
  red: {
    wash: 'from-red-100/70 via-red-50/30 to-white dark:from-red-500/15 dark:via-red-500/5 dark:to-transparent',
    stroke: '#ef4444',
  },
  purple: {
    wash: 'from-violet-100/70 via-violet-50/30 to-white dark:from-violet-500/15 dark:via-violet-500/5 dark:to-transparent',
    stroke: '#8b5cf6',
  },
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const gradientId = useId().replace(/:/g, '');
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min;

  const points = data.map((value, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: span === 0 ? 22 : 36 - ((value - min) / span) * 30,
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
      className="hidden h-14 w-20 shrink-0 self-end overflow-visible sm:block 2xl:h-16 2xl:w-28"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
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
  onClick,
  color = 'blue',
  subtitle,
  trend,
  variant = 'default',
}: SimpleStatCardProps) {
  const glass = variant === 'glass';
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
      className={glass
        ? `group relative h-full overflow-hidden rounded-2xl border-slate-200/80 bg-white/70 p-4 shadow-[6px_6px_14px_rgba(148,163,199,0.35)] backdrop-blur-xl transition-all duration-200 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[6px_6px_14px_rgba(0,0,0,0.55)] ${
            onClick
              ? 'cursor-pointer hover:-translate-y-1 hover:border-indigo-300/70 hover:shadow-[10px_16px_28px_-10px_rgba(148,163,199,0.6)] dark:hover:border-indigo-400/40 dark:hover:shadow-[10px_16px_28px_-10px_rgba(0,0,0,0.7)]'
              : ''
          }`
        : `group relative h-full overflow-hidden rounded-2xl border-gray-100/90 p-4 shadow-sm transition-all duration-200 dark:border-gray-800 ${
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
        <p className="truncate text-[12.5px] font-medium text-gray-600 dark:text-gray-400">
          {displayTitle}
        </p>

        <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
          <span className="block text-[28px] font-bold leading-none tracking-tight text-gray-900 dark:text-white">
            {value}
          </span>
          {trend && <Sparkline data={trend.spark} color={colors.stroke} />}
        </div>

        {trend ? (
          <p
            className={`mt-1.5 flex flex-wrap items-center gap-x-1 text-[11px] font-semibold leading-none ${
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
          <p className="mt-1.5 text-[11px] leading-none text-gray-400 dark:text-gray-500">
            {subtitle || 'No change'}
          </p>
        )}
      </div>
    </Card>
  );
}

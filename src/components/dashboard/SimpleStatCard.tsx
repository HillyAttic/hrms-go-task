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
    wash: 'from-blue-50 via-blue-50/50 to-transparent dark:from-blue-500/10 dark:via-blue-500/5 dark:to-transparent',
    badge: 'bg-blue-100/80 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
    stroke: '#2563eb',
  },
  green: {
    wash: 'from-emerald-50 via-emerald-50/50 to-transparent dark:from-emerald-500/10 dark:via-emerald-500/5 dark:to-transparent',
    badge: 'bg-emerald-100/80 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
    stroke: '#10b981',
  },
  orange: {
    wash: 'from-orange-50 via-orange-50/50 to-transparent dark:from-orange-500/10 dark:via-orange-500/5 dark:to-transparent',
    badge: 'bg-orange-100/80 text-orange-500 dark:bg-orange-500/15 dark:text-orange-400',
    stroke: '#f59e0b',
  },
  red: {
    wash: 'from-red-50 via-red-50/50 to-transparent dark:from-red-500/10 dark:via-red-500/5 dark:to-transparent',
    badge: 'bg-red-100/80 text-red-500 dark:bg-red-500/15 dark:text-red-400',
    stroke: '#ef4444',
  },
  purple: {
    wash: 'from-violet-50 via-violet-50/50 to-transparent dark:from-violet-500/10 dark:via-violet-500/5 dark:to-transparent',
    badge: 'bg-violet-100/80 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
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
    y: 30 - ((value - min) / span) * 24,
  }));

  // Smooth the line with quadratic segments through the midpoints.
  let line = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    line += ` C${midX},${current.y} ${midX},${next.y} ${next.x},${next.y}`;
  }
  const area = `${line} L100,32 L0,32 Z`;

  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      className="h-7 w-14 shrink-0 overflow-visible sm:w-16 2xl:w-[72px]"
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
        strokeWidth="2"
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

        <p className="mt-3 truncate text-[13px] font-medium text-gray-600 dark:text-gray-400">
          {displayTitle}
        </p>

        <div className="mt-auto pt-1">
          <div className="flex items-end justify-between gap-2">
            <span className="block text-[26px] font-bold leading-none tracking-tight text-gray-900 2xl:text-[28px] dark:text-white">
              {value}
            </span>
            {trend && (
              <div className="pb-0.5">
                <Sparkline data={trend.spark} color={colors.stroke} />
              </div>
            )}
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

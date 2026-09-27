/**
 * Adapter over the shared StatsCard for the dashboard / analytics grids.
 *
 * Kept as a thin shim so the existing call sites don't churn. New code should
 * use `StatsCard` from '@/components/ui/stats-card' directly.
 *
 * `color` no longer maps to a rainbow of tints — the icon tile is the lime brand
 * accent for every card, with only genuine status cards tinted semantically.
 */

import React from 'react';
import { StatsCard } from '@/components/ui/stats-card';

interface SimpleStatCardProps {
  title: React.ReactNode;
  mobileTitle?: string; // Optional shorter title for mobile
  value: number | string;
  icon: React.ReactNode;
  onClick?: () => void;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  subtitle?: string;
  compact?: boolean;
}

/** Only the semantically meaningful states get a tint; the rest stay lime. */
const statusIconClass: Partial<Record<NonNullable<SimpleStatCardProps['color']>, string>> = {
  blue: 'bg-info/15 text-info',
  green: 'bg-success/15 text-success',
  orange: 'bg-warning/15 text-warning',
  red: 'bg-destructive/15 text-destructive',
};

export function SimpleStatCard({
  title,
  mobileTitle,
  value,
  icon,
  onClick,
  color,
  subtitle,
  compact = false,
}: SimpleStatCardProps) {
  // Use mobile title on small screens if provided, otherwise use regular title
  const displayTitle = mobileTitle ? (
    <>
      <span className="sm:hidden">{mobileTitle}</span>
      <span className="hidden sm:inline">{title}</span>
    </>
  ) : (
    title
  );

  return (
    <StatsCard
      label={displayTitle}
      value={value}
      change={subtitle}
      icon={icon}
      iconClassName={color ? statusIconClass[color] : undefined}
      onClick={onClick}
      compact={compact}
    />
  );
}

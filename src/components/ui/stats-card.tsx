import * as React from 'react';
import { cn } from '@/lib/utils';

export interface StatsCardProps {
  /** Usually a string; accepts nodes so callers can do responsive label swaps. */
  label: React.ReactNode;
  /** Pre-formatted. Pass a string so currency/locale formatting stays at the call site. */
  value: React.ReactNode;
  /** Small contextual line under the value. */
  change?: string;
  /** Direction of `change` — colours the indicator. Omit for a neutral line. */
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  /** Tint classes for the icon tile. Defaults to the lime brand accent. */
  iconClassName?: string;
  href?: string;
  onClick?: () => void;
  /** Tighter padding for dense grids. */
  compact?: boolean;
  className?: string;
}

/**
 * The single metric tile. Replaces the competing stat-card implementations
 * (dashboard/StatCard, dashboard/SimpleStatCard, attendance/AttendanceStatsCard,
 * employees/EmployeeStatsCard, tasks/TaskStatsCard).
 *
 * `text-2xl` on the value is asserted by src/__tests__/task-stats-card.test.tsx —
 * keep it.
 */
export function StatsCard({
  label,
  value,
  change,
  trend,
  icon,
  iconClassName,
  href,
  onClick,
  compact = false,
  className,
}: StatsCardProps) {
  const trendClass =
    trend === 'up'
      ? 'text-success'
      : trend === 'down'
        ? 'text-destructive'
        : 'text-muted-foreground';

  const interactive = href || onClick;

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            'font-bold uppercase tracking-wider text-muted-foreground',
            compact ? 'text-[10px]' : 'text-[11px]'
          )}
        >
          {label}
        </p>
        {icon && (
          <span
            className={cn(
              'flex shrink-0 items-center justify-center rounded-md border-2 border-border',
              compact ? 'h-7 w-7' : 'h-9 w-9',
              iconClassName ?? 'bg-accent text-accent-foreground'
            )}
          >
            {icon}
          </span>
        )}
      </div>

      <p
        className={cn(
          'font-display font-semibold tracking-tight text-foreground',
          compact ? 'mt-2 text-xl sm:text-2xl' : 'mt-3 text-2xl'
        )}
      >
        {value}
      </p>

      {change && (
        <p className={cn('mt-1 text-[13px] font-medium', trend ? trendClass : 'text-muted-foreground')}>
          {change}
        </p>
      )}
    </>
  );

  const base = cn(
    'block rounded-lg border-2 border-border bg-card text-card-foreground shadow-hard transition-transform',
    compact ? 'p-3 sm:p-4' : 'p-5',
    interactive &&
      'cursor-pointer text-left hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45',
    className
  );

  if (href) {
    return (
      <a href={href} className={base}>
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={base}>
        {content}
      </button>
    );
  }

  return <div className={base}>{content}</div>;
}

export default StatsCard;

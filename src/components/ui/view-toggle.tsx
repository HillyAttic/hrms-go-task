'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ViewToggleProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
  'aria-label'?: string;
}

/**
 * The shared grid/list (or any two-or-more mode) toggle.
 *
 * This markup was duplicated verbatim across clients, employees, tasks/recurring,
 * tasks/non-recurring, projects and TaskManagement/SortComponent — each with its
 * own blue active state. Consolidated here so the active style is defined once.
 */
export function ViewToggle<T extends string = string>({
  value,
  onChange,
  options,
  className,
  'aria-label': ariaLabel = 'Change view',
}: ViewToggleProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-md border-2 border-border bg-card p-1',
        className
      )}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default ViewToggle;

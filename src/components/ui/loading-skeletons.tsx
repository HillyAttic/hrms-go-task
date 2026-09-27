import { Skeleton } from './skeleton';

/**
 * Card Layout Skeleton
 * Used for loading states in card-based layouts (clients, tasks, teams, employees)
 */
export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-stroke bg-card p-6 shadow-sm dark:border-dark-3">
      {/* Avatar/Icon */}
      <div className="mb-4 flex items-start justify-between">
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="h-8 w-20" />
      </div>

      {/* Title */}
      <Skeleton className="mb-2 h-6 w-3/4" />

      {/* Description lines */}
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="mb-4 h-4 w-5/6" />

      {/* Action buttons */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  );
}

/**
 * Card Grid Skeleton
 * Displays multiple card skeletons in a responsive grid
 */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * List Layout Skeleton
 * Used for loading states in list-based layouts
 */
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-stroke bg-card p-4 dark:border-dark-3">
      {/* Avatar */}
      <Skeleton className="size-12 shrink-0 rounded-full" />

      {/* Content */}
      <div className="flex-1">
        <Skeleton className="mb-2 h-5 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </div>
  );
}

/**
 * List Skeleton
 * Displays multiple list item skeletons
 */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <ListItemSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * Form Skeleton
 * Used for loading states in forms and modals
 */
export function FormSkeleton() {
  return (
    <div className="space-y-6">
      {/* Form field 1 */}
      <div>
        <Skeleton className="mb-2 h-4 w-24" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>

      {/* Form field 2 */}
      <div>
        <Skeleton className="mb-2 h-4 w-32" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>

      {/* Form field 3 */}
      <div>
        <Skeleton className="mb-2 h-4 w-28" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>

      {/* Form field 4 (textarea) */}
      <div>
        <Skeleton className="mb-2 h-4 w-36" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-3">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Table Skeleton
 * Used for loading states in table layouts
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-lg border border-stroke bg-card dark:border-dark-3">
      {/* Table header */}
      <div className="grid gap-4 border-b border-stroke p-4 dark:border-dark-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-5 w-full" />
        ))}
      </div>

      {/* Table rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-4 border-b border-stroke p-4 last:border-b-0 dark:border-dark-3"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Stats Card Skeleton
 * Used for loading states in statistics/metrics cards
 */
export function StatsCardSkeleton() {
  return (
    <div className="rounded-lg border border-stroke bg-card p-6 shadow-sm dark:border-dark-3">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="size-12 rounded-full" />
      </div>
    </div>
  );
}

/**
 * Stats Grid Skeleton
 * Displays multiple stats card skeletons in a grid
 */
export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <StatsCardSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * Page Skeleton
 * Complete page loading skeleton with header, stats, and content
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="mb-2 h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Stats cards */}
      <StatsGridSkeleton />

      {/* Filters */}
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Content grid */}
      <CardGridSkeleton />
    </div>
  );
}

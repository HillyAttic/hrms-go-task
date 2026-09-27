/**
 * Dashboard loading skeleton
 * Provides instant visual feedback while data loads
 */

export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-sm border border-stroke bg-card p-6 shadow-hard dark:border-border">
            <div className="h-12 w-12 rounded-full bg-muted mb-4" />
            <div className="h-8 bg-muted rounded mb-2" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 2xl:gap-7.5 mb-6">
        <div className="rounded-sm border border-stroke bg-card p-6 shadow-hard dark:border-border">
          <div className="h-6 bg-muted rounded w-1/3 mb-4" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>

      {/* Task Overview Skeleton */}
      <div className="rounded-sm border border-stroke bg-card p-6 shadow-hard dark:border-border">
        <div className="h-6 bg-muted rounded w-1/4 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

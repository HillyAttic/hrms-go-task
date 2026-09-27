/**
 * Progressive Hydration Component
 * Defers hydration of non-critical components to improve initial load performance
 */

'use client';

import { ReactNode, useEffect, useState } from 'react';

interface ProgressiveHydrationProps {
  children: ReactNode;
  delay?: number;
  fallback?: ReactNode;
  priority?: 'high' | 'medium' | 'low';
}

export function ProgressiveHydration({
  children,
  delay = 0,
  fallback = null,
  priority = 'medium',
}: ProgressiveHydrationProps) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Adjust delay based on priority
    const priorityDelays = {
      high: delay,
      medium: delay + 100,
      low: delay + 300,
    };

    const actualDelay = priorityDelays[priority];

    if ('requestIdleCallback' in window) {
      const handle = requestIdleCallback(
        () => setShouldRender(true),
        { timeout: actualDelay + 1000 }
      );
      return () => cancelIdleCallback(handle);
    } else {
      const timer = setTimeout(() => setShouldRender(true), actualDelay);
      return () => clearTimeout(timer);
    }
  }, [delay, priority]);

  if (!shouldRender) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Skeleton loader for deferred components
 */
export function SkeletonLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-muted rounded ${className}`}>
      <div className="h-full w-full" />
    </div>
  );
}

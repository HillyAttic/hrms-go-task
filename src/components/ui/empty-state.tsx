import React from 'react';
import { Button } from './button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * EmptyState Component
 * Displays a helpful message when no data is available
 * Validates Requirements: 8.5
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted p-12 text-center ${className}`}
      role="status"
      aria-live="polite"
    >
      {icon && (
        <div className="mb-4 text-muted-foreground dark:text-muted-foreground" aria-hidden="true">
          {icon}
        </div>
      )}
      
      <h3 className="mb-2 text-lg font-semibold text-foreground">
        {title}
      </h3>
      
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
      
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// Preset empty states for common scenarios
export function NoResultsEmptyState({ onClearFilters }: { onClearFilters?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg
          className="h-16 w-16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      }
      title="No results found"
      description="We couldn't find any items matching your search criteria. Try adjusting your filters or search terms."
      actionLabel={onClearFilters ? "Clear filters" : undefined}
      onAction={onClearFilters}
    />
  );
}

export function NoDataEmptyState({
  entityName,
  onAdd,
}: {
  entityName: string;
  onAdd?: () => void;
}) {
  return (
    <EmptyState
      icon={
        <svg
          className="h-16 w-16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      }
      title={`No ${entityName} yet`}
      description={`Get started by creating your first ${entityName.toLowerCase()}. You can add more later.`}
      actionLabel={onAdd ? `Add ${entityName}` : undefined}
      onAction={onAdd}
    />
  );
}

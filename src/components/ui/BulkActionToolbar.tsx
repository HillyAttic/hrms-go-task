"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { TrashIcon, ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface BulkActionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkExport?: () => void;
  className?: string;
}

export type { BulkActionToolbarProps };

/**
 * BulkActionToolbar Component
 * Displays when multiple items are selected, providing bulk operations
 * Validates Requirements: 10.1, 10.4
 */
export function BulkActionToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  onBulkExport,
  className,
}: BulkActionToolbarProps) {
  const allSelected = selectedCount === totalCount;

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'bg-card border border-border rounded-lg shadow-xl',
        'px-6 py-4 flex items-center gap-4',
        'animate-in slide-in-from-bottom-4 duration-300',
        className
      )}
      role="toolbar"
      aria-label="Bulk actions toolbar"
    >
      {/* Selection Info */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">
          {selectedCount} selected
        </span>
        
        {/* Select All / Clear Selection */}
        {!allSelected ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={onSelectAll}
            className="text-blue-600 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30"
            aria-label={`Select all ${totalCount} items`}
          >
            Select all ({totalCount})
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
            className="text-muted-foreground hover:text-muted-foreground hover:bg-muted"
            aria-label="Clear selection"
          >
            <XMarkIcon className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-muted" />

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Export Button - Optional */}
        {onBulkExport && (
          <Button
            size="sm"
            variant="outline"
            onClick={onBulkExport}
            className="flex items-center gap-2"
            aria-label={`Export ${selectedCount} items`}
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export
          </Button>
        )}

        {/* Delete Button */}
        <Button
          size="sm"
          variant="danger"
          onClick={onBulkDelete}
          className="flex items-center gap-2"
          aria-label={`Delete ${selectedCount} items`}
        >
          <TrashIcon className="w-4 h-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}

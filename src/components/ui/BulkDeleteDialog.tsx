"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemCount: number;
  itemType: string;
  onConfirm: () => void;
  loading?: boolean;
}

/**
 * BulkDeleteDialog Component
 * Confirmation dialog for bulk delete operations
 * Validates Requirements: 10.2
 */
export function BulkDeleteDialog({
  open,
  onOpenChange,
  itemCount,
  itemType,
  onConfirm,
  loading = false,
}: BulkDeleteDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle>Confirm Bulk Delete</DialogTitle>
          </div>
          <DialogDescription className="pt-3">
            Are you sure you want to delete <strong>{itemCount}</strong> {itemType}
            {itemCount !== 1 ? 's' : ''}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleConfirm}
            loading={loading}
            disabled={loading}
          >
            Delete {itemCount} {itemType}
            {itemCount !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { BulkDeleteDialogProps };

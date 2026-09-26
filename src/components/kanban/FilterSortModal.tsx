'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { KanbanFilters, KanbanSort } from '@/types/kanban.types';

interface FilterSortModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: KanbanFilters, sort: KanbanSort) => void;
  currentFilters: KanbanFilters;
  currentSort: KanbanSort;
}

export function FilterSortModal({
  isOpen,
  onClose,
  onApply,
  currentFilters,
  currentSort,
}: FilterSortModalProps) {
  const [filters, setFilters] = useState<KanbanFilters>(currentFilters);
  const [sort, setSort] = useState<KanbanSort>(currentSort);

  const handleApply = () => {
    onApply(filters, sort);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: KanbanFilters = {
      status: undefined,
      assignee: undefined,
      dueDate: 'all',
    };
    const resetSort: KanbanSort = {
      field: 'createdAt',
      direction: 'desc',
    };
    setFilters(resetFilters);
    setSort(resetSort);
    onApply(resetFilters, resetSort);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Filter & Sort Tasks</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Filters Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Filters</h3>

            {/* Due Date Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Due Date
              </label>
              <select
                value={filters.dueDate || 'all'}
                onChange={(e) => setFilters({ ...filters, dueDate: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All</option>
                <option value="today">Today</option>
                <option value="this-week">This Week</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          {/* Sort Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Sort</h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Sort Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sort By
                </label>
                <select
                  value={sort.field}
                  onChange={(e) => setSort({ ...sort, field: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="dueDate">Due Date</option>
                  <option value="priority">Priority</option>
                  <option value="createdAt">Created Date</option>
                </select>
              </div>

              {/* Sort Direction */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Direction
                </label>
                <select
                  value={sort.direction}
                  onChange={(e) => setSort({ ...sort, direction: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <DialogFooter className="gap-2 sm:gap-0 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="w-full sm:w-auto"
          >
            Reset
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            className="w-full sm:w-auto bg-foreground hover:bg-foreground/90 text-background"
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

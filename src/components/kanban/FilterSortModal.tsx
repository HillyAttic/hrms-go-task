'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { KanbanFilters, KanbanSort } from '@/types/kanban.types';

const FIELD =
  'w-full rounded-xl border border-slate-200/80 bg-white/70 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-white/5 dark:text-white';

const LABEL = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200';

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
      <DialogContent className="sm:max-w-[500px] rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0B1430]/90">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Filter & Sort Tasks</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Filters Section */}
          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-200">Filters</h3>

            {/* Due Date Filter */}
            <div className="mb-4">
              <label className={LABEL}>
                Due Date
              </label>
              <select
                value={filters.dueDate || 'all'}
                onChange={(e) => setFilters({ ...filters, dueDate: e.target.value as any })}
                className={FIELD}
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
            <h3 className="mb-4 text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-200">Sort</h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Sort Field */}
              <div>
                <label className={LABEL}>
                  Sort By
                </label>
                <select
                  value={sort.field}
                  onChange={(e) => setSort({ ...sort, field: e.target.value as any })}
                  className={FIELD}
                >
                  <option value="dueDate">Due Date</option>
                  <option value="priority">Priority</option>
                  <option value="createdAt">Created Date</option>
                </select>
              </div>

              {/* Sort Direction */}
              <div>
                <label className={LABEL}>
                  Direction
                </label>
                <select
                  value={sort.direction}
                  onChange={(e) => setSort({ ...sort, direction: e.target.value as any })}
                  className={FIELD}
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <DialogFooter className="gap-2 mt-6 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="w-full rounded-xl border-slate-200/80 bg-white/60 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 sm:w-auto"
          >
            Reset
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            className="w-full rounded-xl bg-gradient-to-r from-[#0447FD] to-[#7F1BFF] text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 sm:w-auto"
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

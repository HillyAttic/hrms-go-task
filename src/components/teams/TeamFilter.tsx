import React from 'react';
import { FunnelIcon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export interface TeamFilterState {
  status: string;
  department: string;
}

interface TeamFilterProps {
  filters: TeamFilterState;
  onFilterChange: (filters: TeamFilterState) => void;
  onClearFilters: () => void;
  availableDepartments?: string[];
}

/**
 * TeamFilter Component
 * Provides status and department filter dropdowns for team management.
 *
 * The `Filter by status` / `Filter by department` aria-labels, the option
 * values, the `Clear All` label and the `Remove … filter` button labels are
 * asserted by src/__tests__/team-filter.test.tsx — keep them.
 */
export function TeamFilter({
  filters,
  onFilterChange,
  onClearFilters,
  availableDepartments = []
}: TeamFilterProps) {
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      status: e.target.value,
    });
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      department: e.target.value,
    });
  };

  const hasActiveFilters = filters.status !== 'all' || filters.department !== 'all';

  const selectClass =
    'w-full appearance-none px-3 py-2.5 pr-10 text-sm border-2 border-border rounded-md bg-input text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45 transition-colors';

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border-2 border-border bg-accent text-accent-foreground">
            <FunnelIcon className="w-3.5 h-3.5" />
          </span>
          <h3 className="font-display text-sm font-semibold text-foreground">Filters</h3>
        </div>

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <XMarkIcon className="w-3.5 h-3.5" />
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Status Filter */}
        <div>
          <label htmlFor="status-filter" className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Status
          </label>
          <div className="relative">
            <select
              id="status-filter"
              value={filters.status}
              onChange={handleStatusChange}
              className={selectClass}
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Department Filter */}
        <div>
          <label htmlFor="department-filter" className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Department
          </label>
          <div className="relative">
            <select
              id="department-filter"
              value={filters.department}
              onChange={handleDepartmentChange}
              className={selectClass}
              aria-label="Filter by department"
            >
              <option value="all">All Departments</option>
              {availableDepartments.length > 0 ? (
                availableDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))
              ) : (
                <>
                  <option value="Engineering">Engineering</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                  <option value="Operations">Operations</option>
                  <option value="Product">Product</option>
                  <option value="Design">Design</option>
                </>
              )}
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Active Filter Indicators */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t-2 border-border">
          <div className="flex flex-wrap gap-2">
            {filters.status !== 'all' && (
              <Badge variant="info" className="gap-1">
                Status: {filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}
                <button
                  onClick={() => onFilterChange({ ...filters, status: 'all' })}
                  className="ml-0.5 hover:opacity-70 transition-opacity"
                  aria-label="Remove status filter"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {filters.department !== 'all' && (
              <Badge variant="success" className="gap-1">
                Department: {filters.department}
                <button
                  onClick={() => onFilterChange({ ...filters, department: 'all' })}
                  className="ml-0.5 hover:opacity-70 transition-opacity"
                  aria-label="Remove department filter"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

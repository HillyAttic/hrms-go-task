import React from 'react';
import { FunnelIcon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';

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
 * TeamFilter Component - Redesigned with modern styling
 * Provides status and department filter dropdowns for team management
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

  return (
    <div className="bg-white dark:bg-gray-dark rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <FunnelIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filters</h3>
        </div>

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-3.5 h-3.5" />
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Status Filter */}
        <div>
          <label htmlFor="status-filter" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Status
          </label>
          <div className="relative">
            <select
              id="status-filter"
              value={filters.status}
              onChange={handleStatusChange}
              className="w-full appearance-none px-3 py-2.5 pr-10 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring dark:focus:ring-ring bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all"
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Department Filter */}
        <div>
          <label htmlFor="department-filter" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Department
          </label>
          <div className="relative">
            <select
              id="department-filter"
              value={filters.department}
              onChange={handleDepartmentChange}
              className="w-full appearance-none px-3 py-2.5 pr-10 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring dark:focus:ring-ring bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all"
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
            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Active Filter Indicators */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex flex-wrap gap-2">
            {filters.status !== 'all' && (
              <Badge variant="info" className="gap-1">
                Status: {filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}
                <button
                  onClick={() => onFilterChange({ ...filters, status: 'all' })}
                  className="ml-0.5 hover:text-blue-200 transition-colors"
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
                  className="ml-0.5 hover:text-green-200 transition-colors"
                  aria-label="Remove department filter"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

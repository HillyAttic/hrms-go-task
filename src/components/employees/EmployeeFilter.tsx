import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FunnelIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

export interface EmployeeFilterState {
  status: string;
  search: string;
}

interface EmployeeFilterProps {
  filters: EmployeeFilterState;
  onFilterChange: (filters: EmployeeFilterState) => void;
  onClearFilters: () => void;
}

/**
 * EmployeeFilter Component
 * Provides status filter dropdown and search input for employee management
 * Validates Requirements: 5.7, 5.8
 */
export function EmployeeFilter({ 
  filters, 
  onFilterChange, 
  onClearFilters
}: EmployeeFilterProps) {
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      status: e.target.value,
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filters,
      search: e.target.value,
    });
  };

  const hasActiveFilters = filters.status !== 'all' || filters.search !== '';

  return (
    <div className="bg-white dark:bg-gray-dark rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filters</h3>
        </div>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <XMarkIcon className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {/* Search Input - Requirement 5.8 */}
        <div>
          <Label htmlFor="search-input" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Search Employees
          </Label>
          <div className="relative mt-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 dark:text-gray-400" />
            </div>
            <input
              id="search-input"
              type="text"
              value={filters.search}
              onChange={handleSearchChange}
              placeholder="Search by name, email, position, or employee ID..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 dark:text-gray-400"
              aria-label="Search employees"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          {/* Status Filter - Requirement 5.7 */}
          <div>
            <Label htmlFor="status-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </Label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={handleStatusChange}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="on-leave">On Leave</option>
              <option value="resigned">Resigned</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filter Indicators */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {filters.search && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 text-xs font-medium rounded-full">
                Search: "{filters.search}"
                <button
                  onClick={() => onFilterChange({ ...filters, search: '' })}
                  className="ml-1 hover:text-purple-600 dark:hover:text-purple-300"
                  aria-label="Clear search"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}
            
            {filters.status !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-foreground dark:bg-blue-500 text-background text-xs font-medium rounded-full">
                Status: {filters.status === 'on-leave' ? 'On Leave' : filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}
                <button
                  onClick={() => onFilterChange({ ...filters, status: 'all' })}
                  className="ml-1 hover:text-blue-200"
                  aria-label="Remove status filter"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
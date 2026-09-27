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
    <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Filters</h3>
        </div>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-foreground hover:underline"
          >
            <XMarkIcon className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {/* Search Input - Requirement 5.8 */}
        <div>
          <Label htmlFor="search-input" className="text-sm font-medium text-muted-foreground">
            Search Employees
          </Label>
          <div className="relative mt-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
            </div>
            <input
              id="search-input"
              type="text"
              value={filters.search}
              onChange={handleSearchChange}
              placeholder="Search by name, email, position, or employee ID..."
              className="w-full pl-10 pr-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground text-sm placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
              aria-label="Search employees"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          {/* Status Filter - Requirement 5.7 */}
          <div>
            <Label htmlFor="status-filter" className="text-sm font-medium text-muted-foreground">
              Status
            </Label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={handleStatusChange}
              className="mt-1 w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground text-sm"
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
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex flex-wrap gap-2">
            {filters.search && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-muted text-foreground text-xs font-medium rounded-full">
                Search: "{filters.search}"
                <button
                  onClick={() => onFilterChange({ ...filters, search: '' })}
                  className="ml-1 hover:text-foreground/70"
                  aria-label="Clear search"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}
            
            {filters.status !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-foreground text-background text-xs font-medium rounded-full">
                Status: {filters.status === 'on-leave' ? 'On Leave' : filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}
                <button
                  onClick={() => onFilterChange({ ...filters, status: 'all' })}
                  className="ml-1 hover:text-background/70"
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
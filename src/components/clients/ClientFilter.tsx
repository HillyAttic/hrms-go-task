import React from 'react';
import { Label } from '@/components/ui/label';
import Select from '@/components/ui/select';

export interface ClientFilterState {
  status: string;
  filterBy: string;
}

interface ClientFilterProps {
  filters: ClientFilterState;
  onFilterChange: (filters: ClientFilterState) => void;
  onClearFilters: () => void;
}

/**
 * ClientFilter Component
 * Provides filtering options for clients
 */
export function ClientFilter({
  filters,
  onFilterChange,
  onClearFilters,
}: ClientFilterProps) {
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      status: e.target.value,
    });
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      filterBy: e.target.value,
    });
  };

  const hasActiveFilters = filters.status !== 'all' || filters.filterBy !== 'all';

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Filter */}
        <div>
          <Label htmlFor="status-filter">Status</Label>
          <Select
            id="status-filter"
            value={filters.status}
            onChange={handleStatusChange}
            className="mt-1"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>

        {/* Filter By Field */}
        <div>
          <Label htmlFor="filter-by">Show Only Rows With</Label>
          <Select
            id="filter-by"
            value={filters.filterBy}
            onChange={handleFilterChange}
            className="mt-1"
          >
            <option value="all">All Rows</option>
            <option value="roc">ROC</option>
            <option value="gstr1">GSTR1</option>
            <option value="gst3b">GST3B</option>
            <option value="iff">IFF</option>
            <option value="itr">ITR</option>
            <option value="itrAudit">ITR Audit</option>
            <option value="taxAudit">Tax Audit</option>
            <option value="accounting">Accounting</option>
            <option value="clientVisit">Client Visit</option>
            <option value="bank">Bank</option>
            <option value="tcs">TCS</option>
            <option value="tds">TDS</option>
            <option value="statutoryAudit">Statutory Audit</option>
          </Select>
        </div>

        {/* Clear Filters Button */}
        <div className="flex items-end">
          <button
            onClick={onClearFilters}
            disabled={!hasActiveFilters}
            className={`w-full px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              hasActiveFilters
                ? 'bg-muted text-muted-foreground hover:bg-muted dark:hover:bg-gray-600'
                : 'bg-muted text-muted-foreground cursor-not-allowed dark:text-muted-foreground'
            }`}
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  );
}

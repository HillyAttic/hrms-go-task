import React from 'react';
import { Label } from '@/components/ui/label';
import Select from '@/components/ui/select';

export interface ProjectFilterState {
  status: string;
  teamMember: string;
}

interface ProjectFilterProps {
  filters: ProjectFilterState;
  onFilterChange: (filters: ProjectFilterState) => void;
  onClearFilters: () => void;
  teamMembers?: Array<{ uid: string; name: string }>;
}

export function ProjectFilter({
  filters,
  onFilterChange,
  onClearFilters,
  teamMembers = [],
}: ProjectFilterProps) {
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, status: e.target.value });
  };

  const handleTeamMemberChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, teamMember: e.target.value });
  };

  const hasActiveFilters = filters.status !== 'all' || filters.teamMember !== 'all';

  return (
    <div className="bg-white dark:bg-gray-dark rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Filter */}
        <div>
          <Label htmlFor="project-status-filter">Status</Label>
          <Select
            id="project-status-filter"
            value={filters.status}
            onChange={handleStatusChange}
            className="mt-1"
          >
            <option value="all">All Status</option>
            <option value="wip">WIP</option>
            <option value="completed">Completed</option>
            <option value="pending_approval">Pending Approval</option>
          </Select>
        </div>

        {/* Team Member Filter */}
        <div>
          <Label htmlFor="project-team-filter">Team Member</Label>
          <Select
            id="project-team-filter"
            value={filters.teamMember}
            onChange={handleTeamMemberChange}
            className="mt-1"
          >
            <option value="all">All Members</option>
            {teamMembers.map((m) => (
              <option key={m.uid} value={m.uid}>
                {m.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Clear Filters Button */}
        <div className="flex items-end">
          <button
            onClick={onClearFilters}
            disabled={!hasActiveFilters}
            className={`w-full px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              hasActiveFilters
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500'
            }`}
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  );
}

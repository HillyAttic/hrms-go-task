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
    <div className="bg-card rounded-lg border border-border p-4">
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

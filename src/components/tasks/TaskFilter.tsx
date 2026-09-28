import React, { useState, useRef, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Employee } from '@/services/employee.service';
import { Client } from '@/services/client.service';

export interface TaskFilterState {
  status: string;
  priority: string;
  assignedTo?: string;
  clientId?: string;
}

interface TaskFilterProps {
  filters: TaskFilterState;
  onFilterChange: (filters: TaskFilterState) => void;
  onClearFilters: () => void;
  employees?: Employee[];
  clients?: Client[];
}

/**
 * TaskFilter Component
 * Provides status, priority, team member, and client filter dropdowns for task management
 * Validates Requirements: 2.7, 2.8
 */
export function TaskFilter({ filters, onFilterChange, onClearFilters, employees = [], clients = [] }: TaskFilterProps) {
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const memberDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(event.target as Node)) {
        setIsMemberDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredEmployees = employees.filter((e) =>
    e.name.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  const selectedEmployee = employees.find((e) => e.id === filters.assignedTo);

  const handleMemberSelect = (employeeId: string | undefined, employeeName?: string) => {
    onFilterChange({ ...filters, assignedTo: employeeId });
    setMemberSearchQuery(employeeName || '');
    setIsMemberDropdownOpen(false);
  };
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      status: e.target.value,
    });
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      priority: e.target.value,
    });
  };

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      clientId: e.target.value || undefined,
    });
  };

  const hasActiveFilters = filters.status !== 'all' || filters.priority !== 'all' || filters.assignedTo || filters.clientId;

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
            className="text-foreground"
          >
            <XMarkIcon className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Filter - Requirement 2.7 */}
        <div>
          <Label htmlFor="status-filter" className="text-sm font-medium text-muted-foreground">
            Status
          </Label>
          <select
            id="status-filter"
            value={filters.status}
            onChange={handleStatusChange}
            className="mt-1 w-full px-3 py-2 border border-border rounded-md focus:outline-none bg-card text-foreground text-sm"
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Priority Filter - Requirement 2.8 */}
        <div>
          <Label htmlFor="priority-filter" className="text-sm font-medium text-muted-foreground">
            Priority
          </Label>
          <select
            id="priority-filter"
            value={filters.priority}
            onChange={handlePriorityChange}
            className="mt-1 w-full px-3 py-2 border border-border rounded-md focus:outline-none bg-card text-foreground text-sm"
            aria-label="Filter by priority"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        {/* Team Member Filter - Searchable */}
        <div ref={memberDropdownRef} className="relative">
          <Label htmlFor="assignedTo-filter" className="text-sm font-medium text-muted-foreground">
            Team Member
          </Label>
          <input
            id="assignedTo-filter"
            type="text"
            value={isMemberDropdownOpen ? memberSearchQuery : selectedEmployee?.name || ''}
            onChange={(e) => {
              setMemberSearchQuery(e.target.value);
              setIsMemberDropdownOpen(true);
            }}
            onFocus={() => setIsMemberDropdownOpen(true)}
            placeholder="Search team member..."
            autoComplete="off"
            className="mt-1 w-full px-3 py-2 border border-border rounded-md focus:outline-none bg-card text-foreground text-sm"
            aria-label="Search team member"
          />
          {isMemberDropdownOpen && (
            <ul className="absolute z-50 mt-1 w-full max-h-48 overflow-auto bg-card border border-border rounded-md shadow-lg">
              <li
                onClick={() => handleMemberSelect(undefined)}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 ${
                  !filters.assignedTo ? 'bg-muted font-medium' : ''
                }`}
              >
                All Team Members
              </li>
              {filteredEmployees.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">No results</li>
              ) : (
                filteredEmployees.map((emp) => (
                  <li
                    key={emp.id}
                    onClick={() => handleMemberSelect(emp.id, emp.name)}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 ${
                      filters.assignedTo === emp.id ? 'bg-muted font-medium' : ''
                    }`}
                  >
                    {emp.name}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        {/* Client Filter */}
        <div>
          <Label htmlFor="client-filter" className="text-sm font-medium text-muted-foreground">
            Client
          </Label>
          <select
            id="client-filter"
            value={filters.clientId || ''}
            onChange={handleClientChange}
            className="mt-1 w-full px-3 py-2 border border-border rounded-md focus:outline-none bg-card text-foreground text-sm"
            aria-label="Filter by client"
          >
            <option value="">All Clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.clientName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filter Indicators */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex flex-wrap gap-2">
            {filters.status !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-foreground text-background text-xs font-medium rounded-full">
                Status: {filters.status.split('-').map(word =>
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
                <button
                  onClick={() => onFilterChange({ ...filters, status: 'all' })}
                  className="ml-1 hover:text-background/70"
                  aria-label="Remove status filter"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.priority !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-muted text-foreground text-xs font-medium rounded-full">
                Priority: {filters.priority.charAt(0).toUpperCase() + filters.priority.slice(1)}
                <button
                  onClick={() => onFilterChange({ ...filters, priority: 'all' })}
                  className="ml-1 hover:text-foreground/70"
                  aria-label="Remove priority filter"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.assignedTo && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-success/15 text-success text-xs font-medium rounded-full">
                Team Member: {employees.find(e => e.id === filters.assignedTo)?.name || 'Unknown'}
                <button
                  onClick={() => onFilterChange({ ...filters, assignedTo: undefined })}
                  className="ml-1 hover:text-success/70"
                  aria-label="Remove team member filter"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.clientId && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-warning/15 text-warning text-xs font-medium rounded-full">
                Client: {clients.find(c => c.id === filters.clientId)?.clientName || 'Unknown'}
                <button
                  onClick={() => onFilterChange({ ...filters, clientId: undefined })}
                  className="ml-1 hover:text-warning/70"
                  aria-label="Remove client filter"
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

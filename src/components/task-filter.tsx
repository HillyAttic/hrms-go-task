'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import Select from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  FunnelIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { TaskStatus, TaskPriority } from '@/types/task.types';

interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  assignee?: string;
}

interface TaskFilterProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  onClearFilters: () => void;
  taskCount?: number;
}

export function TaskFilter({ filters, onFiltersChange, onClearFilters, taskCount }: TaskFilterProps) {
  const [showFilters, setShowFilters] = useState(false);

  const handleFilterChange = (key: keyof TaskFilters, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value as any
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== ''
  );

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-foreground">Tasks</h2>
          {taskCount !== undefined && (
            <span className="px-3 py-1 text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
              {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center"
          >
            <FunnelIcon className="w-4 h-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full"></span>
            )}
          </Button>
          
          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={onClearFilters}
              className="flex items-center"
            >
              <XMarkIcon className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="mt-4 p-4 bg-card border border-border rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Search
              </label>
              <Input
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search tasks..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Status
              </label>
              <Select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
              >
                <option value="">All Statuses</option>
                <option value={TaskStatus.TODO}>To Do</option>
                <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                <option value={TaskStatus.COMPLETED}>Completed</option>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Priority
              </label>
              <Select
                value={filters.priority || ''}
                onChange={(e) => handleFilterChange('priority', e.target.value || undefined)}
              >
                <option value="">All Priorities</option>
                <option value={TaskPriority.LOW}>Low</option>
                <option value={TaskPriority.MEDIUM}>Medium</option>
                <option value={TaskPriority.HIGH}>High</option>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Assignee
              </label>
              <Input
                value={filters.assignee || ''}
                onChange={(e) => handleFilterChange('assignee', e.target.value)}
                placeholder="Filter by assignee..."
              />
            </div>
          </div>
          
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex flex-wrap gap-2">
                {filters.search && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-foreground text-background">
                    Search: {filters.search}
                    <button
                      onClick={() => handleFilterChange('search', undefined)}
                      className="ml-2 text-blue-600 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.status && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                    Status: {filters.status.replace('-', ' ')}
                    <button
                      onClick={() => handleFilterChange('status', undefined)}
                      className="ml-2 text-green-600 hover:text-green-800 dark:hover:text-green-300"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.priority && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                    Priority: {filters.priority}
                    <button
                      onClick={() => handleFilterChange('priority', undefined)}
                      className="ml-2 text-yellow-600 hover:text-yellow-800 dark:hover:text-yellow-300"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.assignee && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                    Assignee: {filters.assignee}
                    <button
                      onClick={() => handleFilterChange('assignee', undefined)}
                      className="ml-2 text-purple-600 hover:text-purple-800 dark:hover:text-purple-300"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
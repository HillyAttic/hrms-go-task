import React, { useState, useId } from 'react';
import { TaskStatus, TaskPriority } from '@/types/task.types';

interface FiltersProps {
  onFilterChange: (filters: {
    status?: TaskStatus;
    priority?: TaskPriority;
    search?: string;
    category?: string;
  }) => void;
}

export const Filters: React.FC<FiltersProps> = ({ onFilterChange }) => {
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [priority, setPriority] = useState<TaskPriority | ''>('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const statusId = useId();
  const priorityId = useId();
  const categoryId = useId();
  const searchId = useId();

  const handleApplyFilters = () => {
    onFilterChange({
      status: status || undefined,
      priority: priority || undefined,
      search: search || undefined,
      category: category || undefined,
    });
  };

  const handleResetFilters = () => {
    setStatus('');
    setPriority('');
    setSearch('');
    setCategory('');
    
    onFilterChange({});
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-stroke dark:border-gray-700 p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Status Filter */}
        <div>
          <label htmlFor={statusId} className="block text-sm font-medium text-black dark:text-white mb-2">
            Status
          </label>
          <select
            id={statusId}
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus || '')}
            className="w-full rounded-lg border border-stroke bg-transparent py-2 px-4 text-black dark:text-white outline-none transition focus-visible:border-primary dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="">All Statuses</option>
            <option value={TaskStatus.TODO}>To Do</option>
            <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
            <option value={TaskStatus.COMPLETED}>Completed</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div>
          <label htmlFor={priorityId} className="block text-sm font-medium text-black dark:text-white mb-2">
            Priority
          </label>
          <select
            id={priorityId}
            name="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority || '')}
            className="w-full rounded-lg border border-stroke bg-transparent py-2 px-4 text-black dark:text-white outline-none transition focus-visible:border-primary dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="">All Priorities</option>
            <option value={TaskPriority.LOW}>Low</option>
            <option value={TaskPriority.MEDIUM}>Medium</option>
            <option value={TaskPriority.HIGH}>High</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label htmlFor={categoryId} className="block text-sm font-medium text-black dark:text-white mb-2">
            Category
          </label>
          <input
            id={categoryId}
            type="text"
            name="category"
            autoComplete="off"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Enter category…"
            className="w-full rounded-lg border border-stroke bg-transparent py-2 px-4 text-black dark:text-white outline-none transition focus-visible:border-primary dark:border-gray-700 dark:bg-gray-800"
          />
        </div>

        {/* Search Filter */}
        <div>
          <label htmlFor={searchId} className="block text-sm font-medium text-black dark:text-white mb-2">
            Search
          </label>
          <input
            id={searchId}
            type="text"
            name="search"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="w-full rounded-lg border border-stroke bg-transparent py-2 px-4 text-black dark:text-white outline-none transition focus-visible:border-primary dark:border-gray-700 dark:bg-gray-800"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-end space-x-2">
          <button
            onClick={handleApplyFilters}
            className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-opacity-90 transition"
          >
            Apply
          </button>
          <button
            onClick={handleResetFilters}
            className="w-full bg-gray-200 dark:bg-gray-800 text-black dark:text-white py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};
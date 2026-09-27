import React, { useState } from 'react';

type SortOption = 'dueDate' | 'priority' | 'title' | 'status' | 'createdAt';
type SortOrder = 'asc' | 'desc';

interface SortComponentProps {
  onSortChange: (sortOption: SortOption, sortOrder: SortOrder) => void;
}

export const SortComponent: React.FC<SortComponentProps> = ({ onSortChange }) => {
  const [selectedOption, setSelectedOption] = useState<SortOption>('dueDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleOptionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const option = e.target.value as SortOption;
    setSelectedOption(option);
    onSortChange(option, sortOrder);
  };

  const handleOrderChange = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
    onSortChange(selectedOption, newOrder);
  };

  return (
    <div className="flex items-center space-x-4 mb-6">
      <div>
        <label className="block text-sm font-medium text-black dark:text-white mb-2">
          Sort By
        </label>
        <select
          value={selectedOption}
          onChange={handleOptionChange}
          className="rounded-lg border border-stroke bg-transparent py-2 px-4 text-black dark:text-white outline-none transition focus:border-primary active:border-primary dark:border-border dark:bg-input"
        >
          <option value="dueDate">Due Date</option>
          <option value="priority">Priority</option>
          <option value="title">Title</option>
          <option value="status">Status</option>
          <option value="createdAt">Created At</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-black dark:text-white mb-2">
          Order
        </label>
        <div className="flex items-center">
          <button
            onClick={handleOrderChange}
            className={`px-4 py-2 rounded-lg ${
              sortOrder === 'asc'
                ? 'bg-accent text-accent-foreground'
                : 'bg-muted text-black'
            }`}
          >
            {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          </button>
        </div>
      </div>
    </div>
  );
};
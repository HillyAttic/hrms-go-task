import React, { useState, useId } from 'react';

type SortOption = 'dueDate' | 'priority' | 'title' | 'status' | 'createdAt';
type SortOrder = 'asc' | 'desc';

interface SortComponentProps {
  onSortChange: (sortOption: SortOption, sortOrder: SortOrder) => void;
}

export const SortComponent: React.FC<SortComponentProps> = ({ onSortChange }) => {
  const [selectedOption, setSelectedOption] = useState<SortOption>('dueDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const sortById = useId();

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
        <label htmlFor={sortById} className="block text-sm font-medium text-black dark:text-white mb-2">
          Sort By
        </label>
        <select
          id={sortById}
          name="sortBy"
          value={selectedOption}
          onChange={handleOptionChange}
          className="rounded-lg border border-stroke bg-transparent py-2 px-4 text-black dark:text-white outline-none transition focus-visible:border-primary dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="dueDate">Due Date</option>
          <option value="priority">Priority</option>
          <option value="title">Title</option>
          <option value="status">Status</option>
          <option value="createdAt">Created At</option>
        </select>
      </div>
      
      <div>
        <span className="block text-sm font-medium text-black dark:text-white mb-2">
          Order
        </span>
        <div className="flex items-center">
          <button
            onClick={handleOrderChange}
            aria-pressed={sortOrder === 'desc'}
            aria-label={`Order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
            className={`px-4 py-2 rounded-lg ${
              sortOrder === 'asc'
                ? 'bg-primary text-white'
                : 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white'
            }`}
          >
            {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          </button>
        </div>
      </div>
    </div>
  );
};
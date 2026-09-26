'use client';

import React from 'react';

export type DateFilterValue = 'today' | 'yesterday' | 'this-week' | 'this-month' | 'all-time';

interface AnalyticsDateFilterProps {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
}

const filterOptions: { value: DateFilterValue; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this-week', label: 'This Week' },
  { value: 'this-month', label: 'This Month' },
  { value: 'all-time', label: 'All Time' },
];

export function AnalyticsDateFilter({ value, onChange }: AnalyticsDateFilterProps) {
  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2">
      {filterOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
            value === option.value
              ? 'bg-foreground text-background shadow-sm'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export interface User {
  uid: string;
  displayName: string;
  email: string;
  role?: string;
}

interface UserMultiSelectProps {
  users: User[];
  selectedUserIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  label?: string;
  placeholder?: string;
}

export default function UserMultiSelect({
  users,
  selectedUserIds,
  onSelectionChange,
  label = 'Select Users',
  placeholder = 'Search by name or email...',
}: UserMultiSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = users.filter(
        (user) =>
          user.displayName.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }

    // Sort: selected users first, then unselected
    return filtered.sort((a, b) => {
      const aSelected = selectedUserIds.includes(a.uid);
      const bSelected = selectedUserIds.includes(b.uid);

      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;

      // If both selected or both unselected, sort alphabetically by name
      return a.displayName.localeCompare(b.displayName);
    });
  }, [users, searchQuery, selectedUserIds]);

  const toggleUser = (uid: string) => {
    if (selectedUserIds.includes(uid)) {
      onSelectionChange(selectedUserIds.filter((id) => id !== uid));
    } else {
      onSelectionChange([...selectedUserIds, uid]);
    }
  };

  const toggleAll = () => {
    if (selectedUserIds.length === users.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(users.map((u) => u.uid));
    }
  };

  const selectedCount = selectedUserIds.length;
  const totalCount = users.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {selectedCount} of {totalCount} selected
        </span>
      </div>

      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
        <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-2">
          <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 -mx-2 px-2 py-1 rounded">
            <input
              type="checkbox"
              checked={selectedCount === totalCount && totalCount > 0}
              onChange={toggleAll}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Select All
            </span>
          </label>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No users found matching your search' : 'No users available'}
            </div>
          ) : (
            filteredUsers.map((user) => (
              <label
                key={user.uid}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={selectedUserIds.includes(user.uid)}
                  onChange={() => toggleUser(user.uid)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.displayName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>
                  {user.role && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {user.role}
                    </span>
                  )}
                </div>
              </label>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { authenticatedFetch } from '@/lib/api-client';
import { format } from 'date-fns';
import { useModal } from '@/contexts/modal-context';

interface SubmissionUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userIds: string[];
  category: 'submitted' | 'not-submitted' | 'zero-response';
  formTitle: string;
  dateFilter: string;
  fieldLabel?: string;
  submissionsWithTimestamps?: Record<string, string>;
}

interface UserProfile {
  uid: string;
  displayName: string;
  email?: string;
}

export function SubmissionUsersModal({
  isOpen,
  onClose,
  userIds,
  category,
  formTitle,
  dateFilter,
  fieldLabel,
  submissionsWithTimestamps,
}: SubmissionUsersModalProps) {
  const [users, setUsers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const { openModal, closeModal } = useModal();
  useEffect(() => {
    if (isOpen) openModal();
    else closeModal();
  }, [isOpen, openModal, closeModal]);

  useEffect(() => {
    if (isOpen && userIds.length > 0) {
      fetchUserNames();
    }
  }, [isOpen, userIds]);

  const fetchUserNames = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch('/api/users/names');
      if (response.ok) {
        const nameMap = await response.json();
        setUsers(nameMap);
      }
    } catch (error) {
      console.error('Error fetching user names:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryConfig = () => {
    const dateLabel = dateFilter === 'today' ? 'today' :
                      dateFilter === 'yesterday' ? 'yesterday' :
                      dateFilter === 'this-week' ? 'this week' :
                      dateFilter === 'this-month' ? 'this month' : '';

    switch (category) {
      case 'submitted':
        return {
          title: `Users who submitted ${dateLabel}`,
          color: 'green',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          textColor: 'text-green-900 dark:text-green-100',
          iconBg: 'bg-green-100 dark:bg-green-900',
          iconColor: 'text-green-600 dark:text-green-400',
        };
      case 'not-submitted':
        return {
          title: `Users who haven't submitted ${dateLabel}`,
          color: 'orange',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          borderColor: 'border-orange-200 dark:border-orange-800',
          textColor: 'text-orange-900 dark:text-orange-100',
          iconBg: 'bg-orange-100 dark:bg-orange-900',
          iconColor: 'text-orange-600 dark:text-orange-400',
        };
      case 'zero-response':
        return {
          title: `Users who answered 0 to "${fieldLabel}"`,
          color: 'purple',
          bgColor: 'bg-purple-50 dark:bg-purple-900/20',
          borderColor: 'border-purple-200 dark:border-purple-800',
          textColor: 'text-purple-900 dark:text-purple-100',
          iconBg: 'bg-purple-100 dark:bg-purple-900',
          iconColor: 'text-purple-600 dark:text-purple-400',
        };
    }
  };

  const config = getCategoryConfig();

  const getUserInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return format(date, 'MMM d, yyyy h:mm a');
    } catch {
      return timestamp;
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[calc(100%-2rem)] sm:w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] bg-white dark:bg-gray-800 rounded-lg shadow-lg focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] max-h-[90vh] sm:max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className={`px-4 sm:px-6 py-3 sm:py-4 border-b ${config.borderColor} ${config.bgColor}`}>
            <div className="flex items-start sm:items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <Dialog.Title className={`text-base sm:text-lg font-semibold ${config.textColor} leading-tight`}>
                  {config.title}
                </Dialog.Title>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                  {formTitle} • {userIds.length} {userIds.length === 1 ? 'user' : 'users'}
                </p>
              </div>
              <Dialog.Close className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Dialog.Close>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : userIds.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No users in this category</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {userIds.map((uid) => {
                  const userName = users[uid] || `Unknown User (${uid})`;
                  const timestamp = submissionsWithTimestamps?.[uid];

                  return (
                    <div
                      key={uid}
                      className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full ${config.iconBg} ${config.iconColor} flex items-center justify-center font-semibold text-sm sm:text-base`}>
                        {getUserInitial(userName)}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white truncate">
                          {userName}
                        </p>
                        {timestamp && category === 'submitted' && (
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                            Submitted at {formatTimestamp(timestamp)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 sm:py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors text-sm sm:text-base"
            >
              Close
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

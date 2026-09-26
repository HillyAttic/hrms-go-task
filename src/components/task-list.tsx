'use client';

import React, { useState, useEffect } from 'react';
import { Task } from '@/types/task.types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface TaskListProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  showStatus?: boolean;
}

export function TaskList({ tasks, onTaskClick, showStatus = true }: TaskListProps) {
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Fetch user names for all assigned users
  useEffect(() => {
    const fetchUserNames = async () => {
      try {
        setLoadingUsers(true);
        
        // Get authentication token
        const { auth } = await import('@/lib/firebase');
        const user = auth.currentUser;
        
        if (!user) {
          console.error('User not authenticated');
          setUserNames({});
          setLoadingUsers(false);
          return;
        }

        const token = await user.getIdToken();
        
        // Fetch user names from API endpoint
        const response = await fetch('/api/users/names', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user names');
        }

        const nameMap = await response.json();
        setUserNames(nameMap);
      } catch (error) {
        console.error('Error fetching user names:', error);
        setUserNames({});
      } finally {
        setLoadingUsers(false);
      }
    };

    if (tasks.length > 0) {
      fetchUserNames();
    } else {
      setLoadingUsers(false);
      setUserNames({});
    }
  }, [tasks]);

  const getUserName = (userId: string) => {
    if (loadingUsers) {
      return 'Loading...';
    }
    return userNames[userId] || userId;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'in-progress':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'todo':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'in-progress':
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'todo':
        return <ClockIcon className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No tasks found</h3>
        <p className="text-gray-500 dark:text-gray-400">Get started by creating a new task.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <Card 
          key={task.id} 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onTaskClick?.(task)}
        >
          <CardContent className="p-3 md:p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-start md:items-center flex-col md:flex-row gap-1.5 md:gap-2 mb-2">
                  <h3 className="text-sm md:text-base font-medium text-gray-900 dark:text-white break-words">
                    {task.title}
                  </h3>
                  {showStatus && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium ${getStatusColor(task.status)} flex-shrink-0`}>
                      {getStatusIcon(task.status)}
                      <span className="ml-1 capitalize">{task.status.replace('-', ' ')}</span>
                    </span>
                  )}
                </div>
                
                {task.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm mb-2 md:mb-3 line-clamp-2">
                    {task.description}
                  </p>
                )}
                
                <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                  {task.createdBy && (
                    <div className="flex items-center">
                      <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center mr-1.5 md:mr-2 flex-shrink-0">
                        <span className="text-[10px] md:text-xs font-medium text-gray-700 dark:text-gray-200">
                          {getUserName(task.createdBy).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 mr-1">Assigned by:</span>
                      <span className="truncate max-w-[120px] md:max-w-none">{getUserName(task.createdBy)}</span>
                    </div>
                  )}
                  
                  {task.assignedTo && task.assignedTo.length > 0 && (
                    <div className="flex items-center">
                      <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-blue-300 dark:bg-foreground flex items-center justify-center mr-1.5 md:mr-2 flex-shrink-0">
                        <span className="text-[10px] md:text-xs font-medium text-blue-700 dark:text-blue-200">
                          {getUserName(task.assignedTo[0]).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 mr-1">Assigned to:</span>
                      <span className="truncate max-w-[120px] md:max-w-none">
                        {task.assignedTo.map(userId => getUserName(userId)).join(', ')}
                      </span>
                    </div>
                  )}
                  
                  {task.dueDate && (
                    <div className="flex items-center flex-shrink-0">
                      <CalendarIcon className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1" />
                      <span className="whitespace-nowrap">{formatDate(task.dueDate)}</span>
                    </div>
                  )}
                  
                  {task.priority && (
                    <div className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-medium flex-shrink-0 ${
                      task.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {task.priority}
                    </div>
                  )}
                </div>
              </div>
              
              {task.commentCount !== undefined && task.commentCount > 0 && (
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium bg-foreground text-background">
                    {task.commentCount}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { Task } from '@/types/task.types';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { RecurringTaskClientModal } from '@/components/recurring-tasks/RecurringTaskClientModal';
import { RecurringTask } from '@/services/recurring-task.service';
import { useModal } from '@/contexts/modal-context';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { auth } from '@/lib/firebase';  
import { authenticatedFetch } from '@/lib/api-client';

interface CalendarTask extends Task {
  isRecurring?: boolean;
  recurringTaskId?: string;
  recurrencePattern?: string;
}

interface CalendarViewProps {
  tasks: CalendarTask[];
  onTaskClick?: (task: CalendarTask) => void;
}

interface DailyStats {
  orange: number;
  yellow: number;
  green: number;
  total: number;
}

export function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [fullRecurringTask, setFullRecurringTask] = useState<RecurringTask | null>(null);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const { openModal, closeModal } = useModal();
  const { isAdmin, isManager } = useEnhancedAuth();
  const [rosterStats, setRosterStats] = useState<Record<number, DailyStats>>({});
  const [loadingStats, setLoadingStats] = useState(false);

  const canViewRosterStats = isAdmin;

  // Fetch roster stats when month changes
  useEffect(() => {
    const fetchRosterStats = async () => {
      if (!canViewRosterStats) {
        console.log('[Calendar] User cannot view roster stats (not admin/manager)');
        return;
      }

      try {
        setLoadingStats(true);
        const user = auth.currentUser;
        if (!user) {
          console.log('[Calendar] No authenticated user');
          return;
        }

        const token = await user.getIdToken();
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();

        console.log('[Calendar] Fetching roster stats for:', { month, year });

        const response = await fetch(
          `/api/roster/daily-stats?month=${month}&year=${year}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log('[Calendar] Roster stats received:', data);
          setRosterStats(data.stats || {});
        } else {
          console.error('[Calendar] Failed to fetch roster stats:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('[Calendar] Error fetching roster stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchRosterStats();
  }, [currentDate.getMonth(), currentDate.getFullYear(), canViewRosterStats]);

  const getDaysInMonth = React.useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }, []);

  const getTasksForDate = React.useCallback((date: Date): CalendarTask[] => {
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      );
    });
  }, [tasks]);

  const getRecurrenceLabel = (pattern?: string) => {
    if (!pattern) return '';
    const labels: Record<string, string> = {
      'monthly': 'M',
      'quarterly': 'Q',
      'half-yearly': 'H',
      'yearly': 'Y'
    };
    return labels[pattern] || '';
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'prev' ? -1 : 1));
      return newDate;
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleTaskClick = async (task: CalendarTask, e: React.MouseEvent, taskDate?: Date) => {
    e.stopPropagation();

    // If it's a recurring task, open the client modal
    if (task.isRecurring && task.recurringTaskId) {
      // Prevent double-click while loading
      if (loadingTaskId === task.id) return;

      setLoadingTaskId(task.id);
      setSelectedTask(task);

      // Fetch the full recurring task to get contactIds and team member mappings
      try {
        const response = await authenticatedFetch(`/api/recurring-tasks/${task.recurringTaskId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch recurring task');
        }
        const recurringTask = await response.json();
        setFullRecurringTask(recurringTask);

        // Collect all client IDs from both contactIds and team member mappings
        const contactIds = recurringTask.contactIds || [];
        const teamMemberMappings = recurringTask.teamMemberMappings || [];

        // Get all unique client IDs from team member mappings
        const mappedClientIds = new Set<string>();
        teamMemberMappings.forEach((mapping: any) => {
          if (mapping.clientIds && Array.isArray(mapping.clientIds)) {
            mapping.clientIds.forEach((clientId: string) => mappedClientIds.add(clientId));
          }
        });

        // Combine contactIds and mapped client IDs
        const allClientIds = [...new Set([...contactIds, ...Array.from(mappedClientIds)])];

        console.log('[Calendar] Loading clients for task:', {
          taskId: recurringTask.id,
          taskTitle: recurringTask.title,
          contactIds: contactIds.length,
          teamMemberMappings: teamMemberMappings.length,
          mappedClientIds: mappedClientIds.size,
          totalClientIds: allClientIds.length
        });

        // Fetch only the clients assigned to this task (either directly or via team member mappings)
        if (allClientIds.length > 0) {
          const clientsResponse = await authenticatedFetch('/api/clients');
          const clientsData = await clientsResponse.json();
          const allClients = clientsData.data || [];

          // Filter to only show assigned clients
          const assignedClients = allClients.filter((client: any) =>
            allClientIds.includes(client.id)
          );

          console.log('[Calendar] Loaded clients:', {
            totalClients: allClients.length,
            assignedClients: assignedClients.length,
            clientNames: assignedClients.map((c: any) => c.clientName)
          });

          setClients(assignedClients);
        } else {
          console.log('[Calendar] No clients assigned to task');
          setClients([]);
        }
      } catch (error) {
        console.error('Error fetching task clients:', error);
        setClients([]);
        setFullRecurringTask(null);
      } finally {
        setLoadingTaskId(null);
      }

      setIsClientModalOpen(true);
      openModal(); // Hide header when modal opens
    } else if (onTaskClick) {
      onTaskClick(task);
    }
  };

  const handleCloseModal = () => {
    setIsClientModalOpen(false);
    setSelectedTask(null);
    setFullRecurringTask(null);
    setClients([]);
    closeModal(); // Show header when modal closes
  };

  const days = React.useMemo(() => getDaysInMonth(currentDate), [currentDate, getDaysInMonth]);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Render roster stats bar for a specific day
  const renderRosterStatsBar = (day: Date) => {
    const dayNumber = day.getDate();
    const stats = rosterStats[dayNumber];

    console.log('[Calendar] Rendering stats bar for day:', dayNumber, 'stats:', stats);

    if (!stats || stats.total === 0) return null;

    const { orange, yellow, green, total } = stats;
    const orangePercent = (orange / total) * 100;
    const yellowPercent = (yellow / total) * 100;
    const greenPercent = (green / total) * 100;

    return (
      <div
        className="mt-auto pt-1"
        title={`${orange} employees with 8+ hour tasks, ${yellow} with <8 hour tasks, ${green} with no tasks`}
      >
        <div className="flex h-2 rounded-full overflow-hidden bg-gray-200">
          {orange > 0 && (
            <div
              className="bg-orange-500 hover:bg-orange-600 transition-colors"
              style={{ width: `${orangePercent}%` }}
            />
          )}
          {yellow > 0 && (
            <div
              className="bg-yellow-500 hover:bg-yellow-600 transition-colors"
              style={{ width: `${yellowPercent}%` }}
            />
          )}
          {green > 0 && (
            <div
              className="bg-green-500 hover:bg-green-600 transition-colors"
              style={{ width: `${greenPercent}%` }}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-dark rounded-lg shadow">
      <div className="p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 rounded-full hover:bg-gray-100 dark:bg-gray-700"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              Today
            </button>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 rounded-full hover:bg-gray-100 dark:bg-gray-700"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Legend - Responsive */}
        <div className="mb-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <ArrowPathIcon className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Recurring Task</span>
          </div>
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <span className="font-semibold">M</span> = Monthly
            <span className="font-semibold">Q</span> = Quarterly
            <span className="font-semibold">H</span> = Half-Yearly
            <span className="font-semibold">Y</span> = Yearly
          </div>
          {canViewRosterStats && (
            <>
              <div className="hidden md:block border-l border-gray-300 dark:border-gray-600 h-4 mx-2"></div>
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                <span className="font-semibold">Employee Status:</span>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  <span>8+ hrs</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>&lt;8 hrs</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>No tasks</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Weekday Headers - Desktop only */}
        <div className="hidden md:grid grid-cols-7 gap-1 mb-2">
          {weekdays.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid - Desktop: 7 columns, Mobile: Vertical list */}
        <div className="md:grid md:grid-cols-7 md:gap-1 space-y-2 md:space-y-0">
          {days.map((day, index) => {
            const dayTasks = day ? getTasksForDate(day) : [];
            const isToday = day &&
              day.getDate() === new Date().getDate() &&
              day.getMonth() === new Date().getMonth() &&
              day.getFullYear() === new Date().getFullYear();
            const isSelected = selectedDate && day &&
              day.getDate() === selectedDate.getDate() &&
              day.getMonth() === selectedDate.getMonth() &&
              day.getFullYear() === selectedDate.getFullYear();

            // Skip rendering empty days on mobile (days from prev/next month)
            if (!day) {
              return <div key={index} className="hidden md:block border-transparent" />;
            }

            return (
              <div
                key={index}
                className={`min-h-24 p-3 md:p-1 border rounded flex flex-col ${
                  day ? 'border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer' : 'border-transparent'
                } ${isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300' : ''} ${
                  isSelected ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400' : ''
                }`}
                onClick={() => day && setSelectedDate(day)}
              >
                {/* Mobile: Show full date with day name */}
                <div className="md:hidden flex items-center justify-between mb-2">
                  <div className={`text-base font-semibold ${isToday ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                    {day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  {isToday && (
                    <span className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded-full">Today</span>
                  )}
                </div>

                {/* Desktop: Show just day number */}
                <div className={`hidden md:block text-sm font-medium ${isToday ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                  {day.getDate()}
                </div>

                {/* Tasks */}
                <div className="mt-1 space-y-1 md:max-h-20 overflow-y-auto flex-1">
                  {dayTasks.slice(0, 3).map(task => {
                    const isLoading = loadingTaskId === task.id;
                    return (
                      <div
                        key={task.id}
                        onClick={(e) => handleTaskClick(task, e, day)}
                        className={`text-xs md:text-[11px] p-2 md:p-1 rounded flex items-center gap-1 transition-opacity ${
                          isLoading
                            ? 'opacity-70 cursor-wait'
                            : 'cursor-pointer hover:opacity-80'
                        } ${
                          task.priority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                          task.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        }`}
                        title={`${task.title}${task.isRecurring ? ` (${task.recurrencePattern})` : ''}`}
                      >
                        {isLoading ? (
                          <svg className="animate-spin h-3 w-3 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          task.isRecurring && (
                            <span className="font-bold text-[10px]">
                              {getRecurrenceLabel(task.recurrencePattern)}
                            </span>
                          )
                        )}
                        <span className="truncate md:truncate">{task.title}</span>
                      </div>
                    );
                  })}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 px-2 md:px-0">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
                {canViewRosterStats && renderRosterStatsBar(day)}
              </div>
            );
          })}
        </div>

        {/* Selected Date Details */}
        {selectedDate && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              Tasks for {formatDate(selectedDate)}
            </h3>
            {getTasksForDate(selectedDate).length > 0 ? (
              <div className="space-y-2">
                {getTasksForDate(selectedDate).map(task => {
                  const isLoading = loadingTaskId === task.id;
                  return (
                    <div
                      key={task.id}
                      className={`p-3 bg-white dark:bg-gray-dark rounded border transition-colors ${
                        isLoading
                          ? 'cursor-wait opacity-70'
                          : 'cursor-pointer hover:bg-gray-50 dark:bg-gray-800'
                      }`}
                      onClick={(e) => handleTaskClick(task, e, selectedDate)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {isLoading && (
                              <svg className="animate-spin h-4 w-4 shrink-0 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            )}
                            <h4 className="font-medium">{task.title}</h4>
                            {task.isRecurring && !isLoading && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                                <ArrowPathIcon className="w-3 h-3" />
                                {task.recurrencePattern?.replace('-', ' ')}
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{task.description}</p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ml-2 ${task.status === 'completed' ? 'bg-green-100 text-green-800' :
                            task.status === 'in-progress' ? 'bg-orange-100 text-orange-800' :
                              'bg-yellow-100 text-yellow-800'
                          }`}>
                          {task.status.replace('-', ' ')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No tasks scheduled for this day.</p>
            )}
          </div>
        )}
      </div>

      {/* Client Tracking Modal */}
      {selectedTask && fullRecurringTask && (
        <RecurringTaskClientModal
          isOpen={isClientModalOpen}
          onClose={handleCloseModal}
          task={fullRecurringTask}
          clients={clients}
          viewingMonth={currentDate}
        />
      )}
    </div>
  );
}
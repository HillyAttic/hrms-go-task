'use client';

import React, { useState, useEffect } from 'react';
import { Task } from '@/types/task.types';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
  Bars3Icon,
  CalendarIcon,
  ArrowPathIcon,
  XMarkIcon
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

interface MobileCalendarViewProps {
  tasks: CalendarTask[];
  onTaskClick?: (task: CalendarTask) => void;
}

export function MobileCalendarView({ tasks, onTaskClick }: MobileCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [fullRecurringTask, setFullRecurringTask] = useState<RecurringTask | null>(null);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const { openModal, closeModal } = useModal();
  const calendarGridRef = React.useRef<HTMLDivElement>(null);

  // Scroll to today's date when component mounts or month changes
  useEffect(() => {
    const scrollToToday = () => {
      if (!calendarGridRef.current) return;

      const today = new Date();
      const isCurrentMonth =
        today.getMonth() === currentDate.getMonth() &&
        today.getFullYear() === currentDate.getFullYear();

      if (isCurrentMonth) {
        // Find today's date element
        const todayElement = calendarGridRef.current.querySelector('[data-today="true"]');
        if (todayElement) {
          todayElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
          });
        }
      }
    };

    // Small delay to ensure DOM is rendered
    const timeoutId = setTimeout(scrollToToday, 100);
    return () => clearTimeout(timeoutId);
  }, [currentDate]);

  const getDaysInMonth = React.useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const days = [];

    // Add previous month's trailing days for context
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, prevMonthDays - i), isCurrentMonth: false });
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ date: new Date(year, month, day), isCurrentMonth: true });
    }

    // Add next month's leading days to fill the last row
    const remainingCells = 7 - (days.length % 7);
    if (remainingCells < 7) {
      for (let day = 1; day <= remainingCells; day++) {
        days.push({ date: new Date(year, month + 1, day), isCurrentMonth: false });
      }
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

  const formatShortDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleTaskClick = async (task: CalendarTask, e: React.MouseEvent) => {
    e.stopPropagation();

    // If it's a recurring task, open the client modal
    if (task.isRecurring && task.recurringTaskId) {
      // Prevent double-click while loading
      if (loadingTaskId === task.id) return;

      setLoadingTaskId(task.id);
      setSelectedTask(task);

      try {
        const response = await authenticatedFetch(`/api/recurring-tasks/${task.recurringTaskId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch recurring task');
        }
        const recurringTask = await response.json();
        setFullRecurringTask(recurringTask);

        const contactIds = recurringTask.contactIds || [];
        const teamMemberMappings = recurringTask.teamMemberMappings || [];

        const mappedClientIds = new Set<string>();
        teamMemberMappings.forEach((mapping: any) => {
          if (mapping.clientIds && Array.isArray(mapping.clientIds)) {
            mapping.clientIds.forEach((clientId: string) => mappedClientIds.add(clientId));
          }
        });

        const allClientIds = [...new Set([...contactIds, ...Array.from(mappedClientIds)])];

        if (allClientIds.length > 0) {
          const clientsResponse = await authenticatedFetch('/api/clients');
          const clientsData = await clientsResponse.json();
          const allClients = clientsData.data || [];

          const assignedClients = allClients.filter((client: any) =>
            allClientIds.includes(client.id)
          );

          setClients(assignedClients);
        } else {
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
      openModal();
    } else if (onTaskClick) {
      onTaskClick(task);
    }
  };

  const handleCloseModal = () => {
    setIsClientModalOpen(false);
    setSelectedTask(null);
    setFullRecurringTask(null);
    setClients([]);
    closeModal();
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowBottomSheet(true);
    // Don't call openModal() here - bottom sheet should not hide the bottom nav
  };

  const days = React.useMemo(() => getDaysInMonth(currentDate), [currentDate, getDaysInMonth]);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isTodayWeekday = (dayIndex: number) => {
    const today = new Date();
    return today.getDay() === dayIndex &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear();
  };

  const getTaskLabelColor = (task: CalendarTask) => {
    if (task.status === 'completed') return 'bg-emerald-600/80 text-emerald-100';
    if (task.priority === 'urgent') return 'bg-red-500/80 text-red-100';
    if (task.priority === 'high') return 'bg-orange-500/80 text-orange-100';
    if (task.priority === 'medium') return 'bg-amber-500/80 text-amber-100';
    return 'bg-teal-600/80 text-teal-100';
  };

  const getTaskLabelColorLight = (task: CalendarTask) => {
    if (task.status === 'completed') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-600/80 dark:text-emerald-100';
    if (task.priority === 'urgent') return 'bg-red-100 text-red-800 dark:bg-red-500/80 dark:text-red-100';
    if (task.priority === 'high') return 'bg-orange-100 text-orange-800 dark:bg-orange-500/80 dark:text-orange-100';
    if (task.priority === 'medium') return 'bg-amber-100 text-amber-800 dark:bg-amber-500/80 dark:text-amber-100';
    return 'bg-teal-100 text-teal-800 dark:bg-teal-600/80 dark:text-teal-100';
  };

  // Get rows for the calendar
  const calendarRows = React.useMemo(() => {
    const rows = [];
    for (let i = 0; i < days.length; i += 7) {
      rows.push(days.slice(i, i + 7));
    }
    return rows;
  }, [days]);

  return (
    <div className="bg-white dark:bg-[#1a1a2e] rounded-2xl shadow-lg max-w-md mx-auto overflow-hidden border border-gray-200 dark:border-gray-800">
      {/* Mobile Header - Google Calendar Style */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[#1a1a2e]">
        <div className="flex items-center gap-3">
          <Bars3Icon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          <div className="flex items-center gap-1">
            <h1 className="text-lg font-medium text-gray-900 dark:text-white">
              {currentDate.toLocaleDateString('en-US', { month: 'long' })}
            </h1>
            <ChevronRightIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 rotate-90" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold border-2 border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            {new Date().getDate()}
          </button>
          <CalendarIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <EllipsisVerticalIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </div>
      </div>

      {/* Weekday Headers - Google Calendar Style with colored underline for today */}
      <div className="grid grid-cols-7 px-1">
        {weekdays.map((day, index) => (
          <div
            key={index}
            className={`py-2 text-center text-xs font-semibold tracking-wide ${
              isTodayWeekday(index)
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-500'
            }`}
          >
            {day}
            {isTodayWeekday(index) && (
              <div className="mt-1 mx-auto w-6 h-0.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            )}
          </div>
        ))}
      </div>

      {/* Month Navigation - Compact */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-[#16162a]">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button
          onClick={() => navigateMonth('next')}
          className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronRightIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Calendar Grid - Google Calendar Monthly View Style */}
      <div ref={calendarGridRef}>
        {calendarRows.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-7 border-t border-gray-100 dark:border-gray-800/60">
            {row.map((dayObj, colIndex) => {
              const { date: day, isCurrentMonth } = dayObj;
              const dayTasks = getTasksForDate(day);
              const todayHighlight = isToday(day);
              const isSelected = selectedDate &&
                day.getDate() === selectedDate.getDate() &&
                day.getMonth() === selectedDate.getMonth() &&
                day.getFullYear() === selectedDate.getFullYear();

              return (
                <div
                  key={colIndex}
                  className={`min-h-[80px] py-1.5 px-0.5 relative cursor-pointer transition-colors
                    ${!isCurrentMonth ? 'opacity-40' : ''}
                    ${isSelected ? 'bg-blue-50 dark:bg-blue-900/15' : 'hover:bg-gray-50 dark:hover:bg-white/5'}
                  `}
                  onClick={() => handleDateClick(day)}
                  data-today={todayHighlight ? 'true' : 'false'}
                >
                  {/* Day Number */}
                  <div className="flex justify-center mb-1">
                    <div className={`w-7 h-7 flex items-center justify-center text-sm font-medium rounded-full transition-colors ${
                      todayHighlight
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                        : isCurrentMonth
                          ? 'text-gray-800 dark:text-gray-200'
                          : 'text-gray-400 dark:text-gray-600'
                    }`}>
                      {day.getDate()}
                    </div>
                  </div>

                  {/* Task Labels - Google Calendar Style */}
                  <div className="space-y-0.5 overflow-hidden">
                    {dayTasks.length === 1 && (() => {
                      const task = dayTasks[0];
                      const isLoading = loadingTaskId === task.id;
                      return (
                        <div
                          onClick={(e) => handleTaskClick(task, e)}
                          className={`text-[10px] leading-tight px-1 py-0.5 rounded-sm transition-opacity truncate ${
                            isLoading ? 'opacity-70 cursor-wait' : 'cursor-pointer hover:opacity-90'
                          } ${getTaskLabelColorLight(task)}`}
                          title={task.title}
                        >
                          {isLoading ? (
                            <span className="inline-flex items-center gap-0.5">
                              <svg className="animate-spin h-2.5 w-2.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              {task.title}
                            </span>
                          ) : task.title}
                        </div>
                      );
                    })()}
                    {dayTasks.length === 2 && (
                      <>
                        {dayTasks.slice(0, 2).map((task) => {
                          const isLoading = loadingTaskId === task.id;
                          return (
                            <div
                              key={task.id}
                              onClick={(e) => handleTaskClick(task, e)}
                              className={`text-[10px] leading-tight px-1 py-0.5 rounded-sm transition-opacity truncate ${
                                isLoading ? 'opacity-70 cursor-wait' : 'cursor-pointer hover:opacity-90'
                              } ${getTaskLabelColorLight(task)}`}
                              title={task.title}
                            >
                              {isLoading ? (
                                <span className="inline-flex items-center gap-0.5">
                                  <svg className="animate-spin h-2.5 w-2.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  {task.title}
                                </span>
                              ) : task.title}
                            </div>
                          );
                        })}
                      </>
                    )}
                    {dayTasks.length >= 3 && (
                      <>
                        {(() => {
                          const task = dayTasks[0];
                          const isLoading = loadingTaskId === task.id;
                          return (
                            <div
                              onClick={(e) => handleTaskClick(task, e)}
                              className={`text-[10px] leading-tight px-1 py-0.5 rounded-sm transition-opacity truncate ${
                                isLoading ? 'opacity-70 cursor-wait' : 'cursor-pointer hover:opacity-90'
                              } ${getTaskLabelColorLight(task)}`}
                              title={task.title}
                            >
                              {isLoading ? (
                                <span className="inline-flex items-center gap-0.5">
                                  <svg className="animate-spin h-2.5 w-2.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  {task.title}
                                </span>
                              ) : task.title}
                            </div>
                          );
                        })()}
                        <div className="text-[10px] leading-tight px-1 text-blue-600 dark:text-blue-400 font-medium">
                          ● {dayTasks.length} pending
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Sheet for Selected Date Tasks */}
      {showBottomSheet && selectedDate && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40 transition-opacity"
            onClick={() => { setShowBottomSheet(false); }}
          />
          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#1e1e36] rounded-t-2xl shadow-2xl max-h-[60vh] animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Tasks for {formatShortDate(selectedDate)}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {getTasksForDate(selectedDate).length} task{getTasksForDate(selectedDate).length !== 1 ? 's' : ''} scheduled
                </p>
              </div>
              <button
                onClick={() => { setShowBottomSheet(false); }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Tasks List */}
            <div className="overflow-y-auto max-h-[45vh] px-4 py-3">
              {getTasksForDate(selectedDate).length > 0 ? (
                <div className="space-y-2">
                  {getTasksForDate(selectedDate).map(task => {
                    const isLoading = loadingTaskId === task.id;
                    return (
                      <div
                        key={task.id}
                        className={`flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-700/50 transition-all active:scale-[0.98] ${
                          isLoading
                            ? 'cursor-wait opacity-70'
                            : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10'
                        }`}
                        onClick={(e) => {
                          if (!isLoading) {
                            setShowBottomSheet(false);
                            handleTaskClick(task, e);
                          }
                        }}
                      >
                        {/* Color indicator */}
                        <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${
                          task.status === 'completed' ? 'bg-emerald-500' :
                          task.priority === 'urgent' ? 'bg-red-500' :
                          task.priority === 'high' ? 'bg-orange-500' :
                          task.priority === 'medium' ? 'bg-amber-500' :
                          'bg-teal-500'
                        }`} />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {isLoading && (
                              <svg className="animate-spin h-4 w-4 shrink-0 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            )}
                            <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">{task.title}</h4>
                            {task.isRecurring && !isLoading && (
                              <ArrowPathIcon className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 flex-shrink-0" />
                            )}
                          </div>
                        {task.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            task.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                            task.status === 'in-progress' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                          }`}>
                            {task.status.replace('-', ' ')}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            task.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                            task.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                            task.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                            'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                          }`}>
                            {task.priority}
                          </span>
                          {task.isRecurring && task.recurrencePattern && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 font-medium">
                              {task.recurrencePattern.replace('-', ' ')}
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRightIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-1" />
                    </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10">
                  <CalendarIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No tasks scheduled for this day</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}


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
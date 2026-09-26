'use client';

import React, { useState } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
  Bars3Icon,
  CalendarIcon,
  PlusCircleIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { RosterEntry, MONTHS } from '@/types/roster.types';
import { NonRecurringTask } from '@/services/nonrecurring-task.service';
import { useModal } from '@/contexts/modal-context';

interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  tasks: RosterEntry[];
  nonRecurringTasks: NonRecurringTask[];
}

interface RosterMobileCalendarViewProps {
  calendarDays: CalendarDay[];
  currentMonth: number;
  currentYear: number;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onDateClick: (date: Date) => void;
  onTaskClick: (task: RosterEntry, e: React.MouseEvent) => void;
  onAddTask: (date: Date, taskType: 'single' | 'multi') => void;
  getTaskColorClass: (task: RosterEntry) => string;
}

export function RosterMobileCalendarView({
  calendarDays,
  currentMonth,
  currentYear,
  onPreviousMonth,
  onNextMonth,
  onDateClick,
  onTaskClick,
  onAddTask,
  getTaskColorClass
}: RosterMobileCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const { openModal, closeModal } = useModal();

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const isToday = (date: Date) => {
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
      (currentMonth - 1) === today.getMonth() &&
      currentYear === today.getFullYear();
  };

  const handleDateClick = (day: CalendarDay) => {
    if (day.isCurrentMonth) {
      setSelectedDate(day.date);
      setShowBottomSheet(true);
      openModal();
      onDateClick(day.date);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getSelectedDayData = () => {
    if (!selectedDate) return null;
    return calendarDays.find(d =>
      d.isCurrentMonth &&
      d.date.getDate() === selectedDate.getDate() &&
      d.date.getMonth() === selectedDate.getMonth() &&
      d.date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const getSelectedDayTasks = () => {
    const day = getSelectedDayData();
    if (!day) return [];
    return [...day.tasks, ...day.nonRecurringTasks.map(nrt => ({
      id: `nrt-${nrt.id}`,
      taskType: 'single' as const,
      userId: '',
      userName: '',
      taskDetail: nrt.title,
      clientName: nrt.title,
      timeStart: nrt.dueDate,
      timeEnd: nrt.dueDate,
      createdBy: '',
      isNonRecurringTask: true
    }))];
  };

  // Get the task label for a cell
  const getTaskLabel = (task: RosterEntry | NonRecurringTask) => {
    if ('title' in task) {
      return (task as NonRecurringTask).title;
    }
    const rosterTask = task as RosterEntry;
    if (rosterTask.taskDetail?.startsWith('OFF:')) {
      return rosterTask.taskDetail;
    }
    return rosterTask.clientName || rosterTask.taskDetail || rosterTask.activityName || 'Task';
  };

  // Get the label color for a task in the calendar grid
  const getTaskLabelColor = (task: RosterEntry | NonRecurringTask) => {
    if ('title' in task) {
      // Non-recurring task - indigo
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-600/80 dark:text-indigo-100';
    }
    const rosterTask = task as RosterEntry;
    if (rosterTask.taskDetail?.startsWith('OFF:')) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-600/80 dark:text-yellow-100';
    }
    const colorClass = getTaskColorClass(rosterTask);
    if (colorClass.includes('orange')) {
      return 'bg-orange-100 text-orange-800 dark:bg-orange-500/80 dark:text-orange-100';
    }
    if (colorClass.includes('green')) {
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-600/80 dark:text-emerald-100';
    }
    return 'bg-teal-100 text-teal-800 dark:bg-teal-600/80 dark:text-teal-100';
  };

  // Get color indicator for bottom sheet task items
  const getTaskIndicatorColor = (task: any) => {
    if (task.isNonRecurringTask) return 'bg-indigo-500';
    const rosterTask = task as RosterEntry;
    if (rosterTask.taskDetail?.startsWith('OFF:')) return 'bg-yellow-500';
    const colorClass = getTaskColorClass(rosterTask);
    if (colorClass.includes('orange')) return 'bg-orange-500';
    if (colorClass.includes('green')) return 'bg-emerald-500';
    return 'bg-teal-500';
  };

  // Group calendar days into rows
  const calendarRows = React.useMemo(() => {
    const rows = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      rows.push(calendarDays.slice(i, i + 7));
    }
    return rows;
  }, [calendarDays]);

  return (
    <div className="bg-white dark:bg-card rounded-2xl shadow-lg max-w-md mx-auto overflow-hidden border border-gray-200 dark:border-gray-800">
      {/* Mobile Header - Google Calendar Style */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-card">
        <div className="flex items-center gap-3">
          <Bars3Icon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          <div className="flex items-center gap-1">
            <h1 className="text-lg font-medium text-gray-900 dark:text-white">
              {MONTHS[currentMonth - 1]}
            </h1>
            <ChevronRightIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 rotate-90" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              // Navigate to current month if not already there
              const today = new Date();
              if (currentMonth !== today.getMonth() + 1 || currentYear !== today.getFullYear()) {
                // This will be handled by the parent
              }
            }}
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
              <div className="mt-1 mx-auto w-6 h-0.5 rounded-full bg-foreground dark:bg-blue-400" />
            )}
          </div>
        ))}
      </div>

      {/* Month Navigation - Compact */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-muted">
        <button
          onClick={onPreviousMonth}
          className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {MONTHS[currentMonth - 1]} {currentYear}
        </span>
        <button
          onClick={onNextMonth}
          className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronRightIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Calendar Grid - Google Calendar Monthly View Style */}
      <div>
        {calendarRows.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-7 border-t border-gray-100 dark:border-gray-800/60">
            {row.map((calDay, colIndex) => {
              const todayHighlight = calDay.isCurrentMonth && isToday(calDay.date);
              const allTasks = [...calDay.tasks, ...calDay.nonRecurringTasks];
              const isSelected = selectedDate &&
                calDay.date.getDate() === selectedDate.getDate() &&
                calDay.date.getMonth() === selectedDate.getMonth() &&
                calDay.date.getFullYear() === selectedDate.getFullYear();

              return (
                <div
                  key={colIndex}
                  className={`min-h-[80px] py-1.5 px-0.5 relative cursor-pointer transition-colors
                    ${!calDay.isCurrentMonth ? 'opacity-40' : ''}
                    ${isSelected ? 'bg-blue-50 dark:bg-blue-900/15' : 'hover:bg-gray-50 dark:hover:bg-white/5'}
                  `}
                  onClick={() => handleDateClick(calDay)}
                >
                  {/* Day Number */}
                  <div className="flex justify-center mb-1">
                    <div className={`w-7 h-7 flex items-center justify-center text-sm font-medium rounded-full transition-colors ${
                      todayHighlight
                        ? 'bg-foreground text-background shadow-sm shadow-blue-600/30'
                        : calDay.isCurrentMonth
                          ? 'text-gray-800 dark:text-gray-200'
                          : 'text-gray-400 dark:text-gray-600'
                    }`}>
                      {calDay.day}
                    </div>
                  </div>

                  {/* Task Labels - Google Calendar Style */}
                  {calDay.isCurrentMonth && (
                    <div className="space-y-0.5 overflow-hidden">
                      {allTasks.length === 1 && (
                        <div
                          className={`text-[10px] leading-tight px-1 py-0.5 rounded-sm cursor-pointer hover:opacity-90 transition-opacity truncate ${getTaskLabelColor(allTasks[0])}`}
                          title={getTaskLabel(allTasks[0])}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!('title' in allTasks[0]) && !(allTasks[0] as RosterEntry).taskDetail?.startsWith('OFF:')) {
                              onTaskClick(allTasks[0] as RosterEntry, e);
                            }
                          }}
                        >
                          {getTaskLabel(allTasks[0])}
                        </div>
                      )}
                      {allTasks.length === 2 && (
                        <>
                          <div
                            className={`text-[10px] leading-tight px-1 py-0.5 rounded-sm cursor-pointer hover:opacity-90 transition-opacity truncate ${getTaskLabelColor(allTasks[0])}`}
                            title={getTaskLabel(allTasks[0])}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!('title' in allTasks[0]) && !(allTasks[0] as RosterEntry).taskDetail?.startsWith('OFF:')) {
                                onTaskClick(allTasks[0] as RosterEntry, e);
                              }
                            }}
                          >
                            {getTaskLabel(allTasks[0])}
                          </div>
                          <div
                            className={`text-[10px] leading-tight px-1 py-0.5 rounded-sm cursor-pointer hover:opacity-90 transition-opacity truncate ${getTaskLabelColor(allTasks[1])}`}
                            title={getTaskLabel(allTasks[1])}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!('title' in allTasks[1]) && !(allTasks[1] as RosterEntry).taskDetail?.startsWith('OFF:')) {
                                onTaskClick(allTasks[1] as RosterEntry, e);
                              }
                            }}
                          >
                            {getTaskLabel(allTasks[1])}
                          </div>
                        </>
                      )}
                      {allTasks.length >= 3 && (
                        <>
                          <div
                            className={`text-[10px] leading-tight px-1 py-0.5 rounded-sm cursor-pointer hover:opacity-90 transition-opacity truncate ${getTaskLabelColor(allTasks[0])}`}
                            title={getTaskLabel(allTasks[0])}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!('title' in allTasks[0]) && !(allTasks[0] as RosterEntry).taskDetail?.startsWith('OFF:')) {
                                onTaskClick(allTasks[0] as RosterEntry, e);
                              }
                            }}
                          >
                            {getTaskLabel(allTasks[0])}
                          </div>
                          <div className="text-[10px] leading-tight px-1 text-blue-600 dark:text-blue-400 font-medium">
                            ● {allTasks.length} pending
                          </div>
                        </>
                      )}
                    </div>
                  )}
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
            onClick={() => { setShowBottomSheet(false); closeModal(); }}
          />
          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-card rounded-t-2xl shadow-2xl max-h-[60vh] animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Tasks for {formatDate(selectedDate)}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {getSelectedDayTasks().length} task{getSelectedDayTasks().length !== 1 ? 's' : ''} scheduled
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBottomSheet(false);
                    closeModal();
                    onAddTask(selectedDate, 'single');
                  }}
                  className="p-2 bg-foreground text-background rounded-full hover:bg-foreground/90 transition-colors"
                  title="Add Task"
                >
                  <PlusCircleIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { setShowBottomSheet(false); closeModal(); }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Tasks List */}
            <div className="overflow-y-auto max-h-[45vh] px-4 py-3">
              {getSelectedDayTasks().length > 0 ? (
                <div className="space-y-2">
                  {getSelectedDayTasks().map((task) => {
                    const isNonRecurring = 'isNonRecurringTask' in task && task.isNonRecurringTask;
                    const isLeave = !isNonRecurring && (task as RosterEntry).taskDetail?.startsWith('OFF:');

                    return (
                      <div
                        key={task.id}
                        className={`flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-700/50 transition-all active:scale-[0.98] ${
                          isLeave ? 'cursor-default' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10'
                        }`}
                        onClick={(e) => {
                          if (!isLeave && !isNonRecurring) {
                            setShowBottomSheet(false);
                            closeModal();
                            onTaskClick(task as RosterEntry, e);
                          }
                        }}
                      >
                        {/* Color indicator */}
                        <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${getTaskIndicatorColor(task)}`} />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                              {isNonRecurring ? task.taskDetail : (task as RosterEntry).clientName || (task as RosterEntry).taskDetail}
                            </h4>
                          </div>
                          {!isNonRecurring && (task as RosterEntry).timeStart && (task as RosterEntry).timeEnd && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {new Date((task as RosterEntry).timeStart!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {new Date((task as RosterEntry).timeEnd!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              isNonRecurring
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                                : isLeave
                                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                            }`}>
                              {isNonRecurring ? 'Assigned' : isLeave ? 'Leave' : 'Task'}
                            </span>
                          </div>
                        </div>

                        {!isLeave && (
                          <ChevronRightIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-1" />
                        )}
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

      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-4 z-30">
        <button
          onClick={() => {
            const today = new Date();
            setSelectedDate(today);
            onAddTask(today, 'single');
          }}
          className="w-14 h-14 rounded-2xl bg-foreground dark:bg-blue-500 text-background shadow-lg shadow-blue-600/30 dark:shadow-blue-500/30 flex items-center justify-center hover:bg-foreground/90 dark:hover:bg-foreground transition-all active:scale-95"
        >
          <PlusIcon className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
}

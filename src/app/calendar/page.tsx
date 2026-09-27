'use client';

import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority } from '@/types/task.types';
import { taskApi } from '@/services/task.api';
import { recurringTaskService, RecurringTask } from '@/services/recurring-task.service';
import { calculateAllOccurrences } from '@/utils/recurrence-scheduler';
import { CalendarView } from '@/components/calendar-view';
import { MobileCalendarView } from '@/components/mobile-calendar-view';
import { Button } from '@/components/ui/button';
import { PlusCircleIcon, DevicePhoneMobileIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { TaskCreationModal } from '@/components/task-creation-modal';
import { auth } from '@/lib/firebase';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';

// Extended task type to include recurring task occurrences
interface CalendarTask extends Task {
  isRecurring?: boolean;
  recurringTaskId?: string;
  recurrencePattern?: string;
}

export default function CalendarPage() {
  const { isAdmin } = useEnhancedAuth();
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [nonRecurringTasks, setNonRecurringTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? 'mobile' : 'desktop';
    }
    return 'desktop';
  });

  useEffect(() => {
    loadTasks();
  }, []);

  /**
   * Generate calendar task occurrences from recurring tasks
   * Creates individual task entries for each occurrence based on recurrence pattern
   * Optimized to only generate occurrences for the visible calendar range
   */
  const generateRecurringTaskOccurrences = React.useCallback((recurringTasks: RecurringTask[]): CalendarTask[] => {
    const calendarTasks: CalendarTask[] = [];

    // Optimize: Only generate occurrences for current year ± 1 year (3 years total instead of 7)
    const calendarStartDate = new Date();
    calendarStartDate.setFullYear(calendarStartDate.getFullYear() - 1);
    calendarStartDate.setMonth(0); // January
    calendarStartDate.setDate(1);

    const calendarEndDate = new Date();
    calendarEndDate.setFullYear(calendarEndDate.getFullYear() + 1);
    calendarEndDate.setMonth(11); // December
    calendarEndDate.setDate(31);

    recurringTasks.forEach(recurringTask => {
      // Skip paused tasks
      if (recurringTask.isPaused) return;

      // For recurring tasks, use dueDate as the starting point for occurrences
      // This ensures the calendar shows when tasks are actually due, not when they started
      const taskDueDate = new Date(recurringTask.dueDate);
      const taskEndDate = calendarEndDate; // Recurring tasks don't have an end date

      // Only generate occurrences within the calendar range
      const occurrenceStartDate = taskDueDate > calendarStartDate ? taskDueDate : calendarStartDate;
      const occurrenceEndDate = taskEndDate < calendarEndDate ? taskEndDate : calendarEndDate;

      // Skip if task is completely outside the calendar range
      if (occurrenceStartDate > calendarEndDate || occurrenceEndDate < calendarStartDate) {
        return;
      }

      try {
        const occurrences = calculateAllOccurrences(
          occurrenceStartDate,
          occurrenceEndDate,
          recurringTask.recurrencePattern
        );

        // Create a calendar task for each occurrence
        occurrences.forEach(occurrenceDate => {
          // Check if this occurrence was completed
          const wasCompleted = recurringTask.completionHistory.some(completion => {
            const completionDate = new Date(completion.date);
            return (
              completionDate.getDate() === occurrenceDate.getDate() &&
              completionDate.getMonth() === occurrenceDate.getMonth() &&
              completionDate.getFullYear() === occurrenceDate.getFullYear()
            );
          });

          calendarTasks.push({
            id: `${recurringTask.id}-${occurrenceDate.getTime()}`,
            title: recurringTask.title,
            description: recurringTask.description,
            dueDate: occurrenceDate,
            priority: recurringTask.priority as TaskPriority,
            status: wasCompleted ? TaskStatus.COMPLETED : recurringTask.status as TaskStatus,
            assignedTo: recurringTask.contactIds || [],
            category: recurringTask.categoryId,
            createdAt: recurringTask.createdAt || new Date(),
            updatedAt: recurringTask.updatedAt || new Date(),
            isRecurring: true,
            recurringTaskId: recurringTask.id,
            recurrencePattern: recurringTask.recurrencePattern,
          });
        });
      } catch (error) {
        console.error(`Error generating occurrences for task ${recurringTask.id}:`, error);
      }
    });

    return calendarTasks;
  }, []);

  // Memoize the generation of recurring task occurrences to avoid recalculation
  const recurringCalendarTasks = React.useMemo(() => {
    return generateRecurringTaskOccurrences(recurringTasks);
  }, [recurringTasks, generateRecurringTaskOccurrences]);

  // Memoize the combined tasks array - exclude non-recurring tasks and leaves
  const allTasks = React.useMemo(() => {
    return recurringCalendarTasks;
  }, [recurringCalendarTasks]);

  // Update tasks when allTasks changes
  useEffect(() => {
    setTasks(allTasks);
  }, [allTasks]);

  const loadTasks = async () => {
    try {
      setLoading(true);

      const currentUser = auth.currentUser;

      if (!currentUser) {
        // If auth is not ready or user not logged in, we might want to wait or just return
        // But since this is a protected page usually, we can assume auth will be ready soon or redirect
        // For now, let's just log and continue
        console.log('Waiting for user authentication...');
        // We could use onAuthStateChanged here but typically the provider handles it.
        // Let's try to get the user from the context if we were using it, but here we depend on firebase auth directly in this function
      }

      // Fetch both task types in parallel for better performance
      // If user is not logged in, some of these might fail or return empty

      const fetchRecurring = async () => {
        if (!currentUser) return [];
        const token = await currentUser.getIdToken();
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        };

        const recurringResponse = await fetch('/api/recurring-tasks?view=calendar', { headers });
        if (!recurringResponse.ok) {
          throw new Error('Failed to fetch recurring tasks');
        }
        return await recurringResponse.json();
      };

      const [nonRecurringTasksData, recurringTasksData] = await Promise.all([
        taskApi.getTasks().catch(e => { console.error(e); return []; }),
        fetchRecurring().catch(e => { console.error(e); return []; })
      ]);

      // Store in separate state to enable memoization
      setNonRecurringTasks(nonRecurringTasksData);
      setRecurringTasks(recurringTasksData);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCreated = (newTask: Task) => {
    setTasks(prev => [...prev, { ...newTask, isRecurring: false }]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Compliance Calendar</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">View your recurring compliance tasks</p>
        </div>
        
        {/* View Toggle */}
        <div className="flex items-center space-x-2 bg-muted rounded-lg p-1">
          <button
            onClick={() => setViewMode('desktop')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'desktop'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground dark:hover:text-white'
            }`}
          >
            <ComputerDesktopIcon className="w-4 h-4" />
            <span>Desktop</span>
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'mobile'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground dark:hover:text-white'
            }`}
          >
            <DevicePhoneMobileIcon className="w-4 h-4" />
            <span>Mobile</span>
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'desktop' ? (
        <CalendarView tasks={tasks} />
      ) : (
        <MobileCalendarView tasks={tasks} />
      )}

      {/* Create Task Modal */}
      <TaskCreationModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { useRouter } from 'next/navigation';
import { useModal } from '@/contexts/modal-context';
import { rosterService, getTaskColor } from '@/services/roster.service';
import { clientService, Client } from '@/services/client.service';
import { leaveService } from '@/services/leave.service';
import { nonRecurringTaskService, NonRecurringTask } from '@/services/nonrecurring-task.service';
import { LeaveRequest } from '@/types/attendance.types';
import { RosterEntry, MONTHS, getDaysInMonth, TaskType } from '@/types/roster.types';
import { Button } from '@/components/ui/button';
import { PlusCircleIcon, TrashIcon, PencilIcon, XMarkIcon, DevicePhoneMobileIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { RosterMobileCalendarView } from '@/components/roster-mobile-calendar-view';

interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  tasks: RosterEntry[];
  nonRecurringTasks: NonRecurringTask[];
}

export default function UpdateSchedulePage() {
  const { user, loading: authLoading, userProfile } = useEnhancedAuth();
  const router = useRouter();
  const { openModal, closeModal } = useModal();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [entries, setEntries] = useState<RosterEntry[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTaskTable, setShowTaskTable] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateTasks, setSelectedDateTasks] = useState<RosterEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<RosterEntry | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [taskType, setTaskType] = useState<TaskType>('multi');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? 'mobile' : 'desktop';
    }
    return 'desktop';
  });
  const [formData, setFormData] = useState({
    activityName: '',
    startDate: '',
    endDate: '',
    notes: '',
    clientId: '',
    clientName: '',
    taskDetail: '',
    taskDate: '', // Store the date separately
    timeStart: '', // Now stores only time (HH:MM)
    timeEnd: '', // Now stores only time (HH:MM)
  });
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [assignedTasks, setAssignedTasks] = useState<NonRecurringTask[]>([]);
  const [selectedNonRecurringTask, setSelectedNonRecurringTask] = useState<NonRecurringTask | null>(null);
  const [nonRecurringTaskClientName, setNonRecurringTaskClientName] = useState<string | null>(null);
  const [showTaskActionMenu, setShowTaskActionMenu] = useState(false);
  const [selectedTaskForAction, setSelectedTaskForAction] = useState<RosterEntry | null>(null);
  const [showTaskViewModal, setShowTaskViewModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/sign-in');
    }
  }, [user, authLoading, router]);

  // Fetch client name when a non-recurring task is selected
  useEffect(() => {
    const fetchClientName = async () => {
      if (selectedNonRecurringTask?.contactId) {
        try {
          const client = await clientService.getById(selectedNonRecurringTask.contactId);
          setNonRecurringTaskClientName(client?.clientName || null);
        } catch {
          setNonRecurringTaskClientName(null);
        }
      } else {
        setNonRecurringTaskClientName(null);
      }
    };
    fetchClientName();
  }, [selectedNonRecurringTask]);

  useEffect(() => {
    if (user) {
      loadRosterEntries();
      loadClients();
      loadLeaveRequests();
      loadAssignedTasks();
    }
  }, [user, currentMonth, currentYear]);

  const loadRosterEntries = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await rosterService.getUserCalendarEvents(user.uid, currentMonth, currentYear);
      setEntries(data);
    } catch (error) {
      console.error('Error loading roster entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const data = await clientService.getAll({ status: 'active' });
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadLeaveRequests = async () => {
    if (!user) return;

    try {
      const allLeaves = await leaveService.getLeaveRequests({
        employeeId: user.uid,
      });
      // Filter for approved leaves only
      const approvedLeaves = allLeaves.filter(leave => leave.status === 'approved');
      setLeaveRequests(approvedLeaves);
    } catch (error) {
      console.error('Error loading leave requests:', error);
    }
  };

  const loadAssignedTasks = async () => {
    if (!user) return;
    try {
      const tasks = await nonRecurringTaskService.getAssignedToUser(user.uid, currentMonth, currentYear);
      setAssignedTasks(tasks);
    } catch (error) {
      console.error('Error loading assigned tasks:', error);
    }
  };

  // Helper function to format date for datetime-local input (avoids timezone issues)
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to format datetime for datetime-local input (avoids timezone issues)
  const formatDateTimeForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const generateCalendarDays = (): CalendarDay[] => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const days: CalendarDay[] = [];

    // Previous month days
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const daysInPrevMonth = getDaysInMonth(prevMonth, prevYear);

    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      days.push({
        date: new Date(prevYear, prevMonth - 1, day),
        day,
        isCurrentMonth: false,
        tasks: [],
        nonRecurringTasks: [],
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth - 1, day);
      date.setHours(0, 0, 0, 0);
      
      const dayTasks = entries.filter(entry => {
        if (entry.taskType === 'multi') {
          const entryStart = new Date(entry.startDate!);
          entryStart.setHours(0, 0, 0, 0);
          const entryEnd = new Date(entry.endDate!);
          entryEnd.setHours(0, 0, 0, 0);
          return date >= entryStart && date <= entryEnd;
        } else {
          const taskStart = new Date(entry.timeStart!);
          taskStart.setHours(0, 0, 0, 0);
          return date.getTime() === taskStart.getTime();
        }
      });

      // Check if there's a leave on this day
      const hasLeave = leaveRequests.some(leave => {
        if (!leave.startDate || !leave.endDate) return false;

        const startDate = leave.startDate instanceof Date
          ? leave.startDate
          : (leave.startDate as any).toDate ? (leave.startDate as any).toDate() : new Date((leave.startDate as any).seconds * 1000);

        const endDate = leave.endDate instanceof Date
          ? leave.endDate
          : (leave.endDate as any).toDate ? (leave.endDate as any).toDate() : new Date((leave.endDate as any).seconds * 1000);

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        return date >= startDate && date <= endDate;
      });

      // Add leave indicator to tasks if there's a leave
      if (hasLeave) {
        const leaveOnDay = leaveRequests.find(leave => {
          if (!leave.startDate || !leave.endDate) return false;

          const startDate = leave.startDate instanceof Date
            ? leave.startDate
            : (leave.startDate as any).toDate ? (leave.startDate as any).toDate() : new Date((leave.startDate as any).seconds * 1000);

          const endDate = leave.endDate instanceof Date
            ? leave.endDate
            : (leave.endDate as any).toDate ? (leave.endDate as any).toDate() : new Date((leave.endDate as any).seconds * 1000);

          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(0, 0, 0, 0);

          return date >= startDate && date <= endDate;
        });

        if (leaveOnDay) {
          // Create a pseudo-task for the leave
          dayTasks.push({
            id: `leave-${leaveOnDay.id}-${date.getTime()}`,
            taskType: 'single',
            userId: user!.uid,
            userName: userProfile?.displayName || userProfile?.email || 'Unknown',
            taskDetail: `OFF: ${leaveOnDay.leaveTypeName}`,
            timeStart: date,
            timeEnd: date,
            createdBy: user!.uid,
          } as RosterEntry);
        }
      }

      const dayNonRecurringTasks = assignedTasks.filter(task => {
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        return date.getTime() === due.getTime();
      });

      days.push({
        date,
        day,
        isCurrentMonth: true,
        tasks: dayTasks,
        nonRecurringTasks: dayNonRecurringTasks,
      });
    }

    // Next month days
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      days.push({
        date: new Date(nextYear, nextMonth - 1, day),
        day,
        isCurrentMonth: false,
        tasks: [],
        nonRecurringTasks: [],
      });
    }

    return days;
  };

  const handlePreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleAddTask = (date: Date, type: TaskType) => {
    setEditingEntry(null);
    setTaskType(type);
    const dateStr = formatDateForInput(date);
    
    setFormData({
      activityName: '',
      startDate: dateStr,
      endDate: dateStr,
      notes: '',
      clientId: '',
      clientName: '',
      taskDetail: '',
      taskDate: dateStr, // Store the selected date
      timeStart: '09:00', // Only time
      timeEnd: '17:00', // Only time
    });
    setShowModal(true);
    openModal();
  };

  const handleTaskClick = (task: RosterEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    // Don't show menu for leave tasks
    if (task.taskDetail?.startsWith('OFF:')) {
      return;
    }
    setSelectedTaskForAction(task);
    setShowTaskActionMenu(true);
    openModal();
  };

  const handleViewTask = () => {
    setShowTaskActionMenu(false);
    setShowTaskViewModal(true);
  };

  const handleEditTaskFromMenu = () => {
    setShowTaskActionMenu(false);
    if (selectedTaskForAction) {
      handleEditTask(selectedTaskForAction);
    }
  };

  const handleCloseTaskActionMenu = () => {
    setShowTaskActionMenu(false);
    setSelectedTaskForAction(null);
    closeModal();
  };

  const handleCloseTaskViewModal = () => {
    setShowTaskViewModal(false);
    setSelectedTaskForAction(null);
    closeModal();
  };

  const handleEditTask = (entry: RosterEntry) => {
    setEditingEntry(entry);
    setTaskType(entry.taskType);
    
    if (entry.taskType === 'multi') {
      setFormData({
        activityName: entry.activityName || '',
        startDate: entry.startDate ? formatDateForInput(new Date(entry.startDate)) : '',
        endDate: entry.endDate ? formatDateForInput(new Date(entry.endDate)) : '',
        notes: entry.notes || '',
        clientId: '',
        clientName: '',
        taskDetail: '',
        taskDate: '',
        timeStart: '',
        timeEnd: '',
      });
    } else {
      const startDateTime = entry.timeStart ? new Date(entry.timeStart) : null;
      const endDateTime = entry.timeEnd ? new Date(entry.timeEnd) : null;
      
      setFormData({
        activityName: '',
        startDate: '',
        endDate: '',
        notes: '',
        clientId: entry.clientId || '',
        clientName: entry.clientName || '',
        taskDetail: entry.taskDetail || '',
        taskDate: startDateTime ? formatDateForInput(startDateTime) : '',
        timeStart: startDateTime ? `${String(startDateTime.getHours()).padStart(2, '0')}:${String(startDateTime.getMinutes()).padStart(2, '0')}` : '',
        timeEnd: endDateTime ? `${String(endDateTime.getHours()).padStart(2, '0')}:${String(endDateTime.getMinutes()).padStart(2, '0')}` : '',
      });
    }
    
    setShowModal(true);
    openModal();
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await rosterService.deleteRosterEntry(id);
      // Update the selectedDateTasks to remove the deleted task immediately
      setSelectedDateTasks(prev => prev.filter(task => task.id !== id));
      await loadRosterEntries();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !userProfile) return;

    try {
      if (taskType === 'multi') {
        const startDate = new Date(formData.startDate);
        const endDate = new Date(formData.endDate);

        if (startDate > endDate) {
          alert('Start date must be before end date');
          return;
        }

        const data: Omit<RosterEntry, 'id' | 'createdAt' | 'updatedAt'> = {
          taskType: 'multi',
          userId: user.uid,
          userName: userProfile.displayName || userProfile.email || 'Unknown',
          activityName: formData.activityName,
          startDate,
          endDate,
          month: startDate.getMonth() + 1,
          year: startDate.getFullYear(),
          notes: formData.notes,
          createdBy: user.uid,
        };

        if (editingEntry) {
          await rosterService.updateRosterEntry(editingEntry.id!, data);
        } else {
          await rosterService.createRosterEntry(data);
        }
      } else {
        // Combine date with time for single tasks
        const [startHours, startMinutes] = formData.timeStart.split(':').map(Number);
        const [endHours, endMinutes] = formData.timeEnd.split(':').map(Number);
        
        const timeStart = new Date(formData.taskDate);
        timeStart.setHours(startHours, startMinutes, 0, 0);
        
        const timeEnd = new Date(formData.taskDate);
        timeEnd.setHours(endHours, endMinutes, 0, 0);

        if (timeStart > timeEnd) {
          alert('Start time must be before end time');
          return;
        }

        const selectedClient = clients.find(c => c.id === formData.clientId);

        const data: Omit<RosterEntry, 'id' | 'createdAt' | 'updatedAt'> = {
          taskType: 'single',
          userId: user.uid,
          userName: userProfile.displayName || userProfile.email || 'Unknown',
          clientId: formData.clientId || undefined,
          clientName: selectedClient?.clientName || formData.clientName || undefined,
          taskDetail: formData.taskDetail,
          timeStart,
          timeEnd,
        };

        if (editingEntry) {
          await rosterService.updateRosterEntry(editingEntry.id!, data);
        } else {
          await rosterService.createRosterEntry(data);
        }
      }

      setShowModal(false);
      closeModal();
      await loadRosterEntries();
    } catch (error: any) {
      console.error('Error saving task:', error);
      alert(error.message || 'Failed to save task');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    closeModal();
    setClientSearchQuery('');
  };

  // Filter clients based on search query
  const filteredClients = clients.filter(client =>
    client.clientName.toLowerCase().includes(clientSearchQuery.toLowerCase())
  );

  const handleDateClick = async (date: Date) => {
    if (!user) return;
    
    try {
      const tasks = await rosterService.getTasksForDate(user.uid, date);
      setSelectedDate(date);
      setSelectedDateTasks(tasks);
      // Only show the task table modal in desktop view
      // Mobile view has its own built-in bottom sheet for task details
      if (viewMode === 'desktop') {
        setShowTaskTable(true);
        openModal();
      }
    } catch (error) {
      console.error('Error loading tasks for date:', error);
    }
  };

  const handleCloseTaskTable = () => {
    setShowTaskTable(false);
    closeModal();
  };

  const getTaskColorClass = (task: RosterEntry): string => {
    // Check if it's a leave task
    if (task.taskDetail?.startsWith('OFF:')) {
      return 'bg-warning/15 text-warning border-warning/30';
    }

    const color = getTaskColor(task);
    if (color === 'green') return 'bg-success/15 text-success border-success/30';
    if (color === 'yellow') return 'bg-warning/15 text-warning border-warning/30';
    return 'bg-warning/15 text-warning border-warning/30';
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground"></div>
      </div>
    );
  }

  if (!user) return null;

  const calendarDays = generateCalendarDays();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Update Schedule</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage your personal schedule and activities
          </p>
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

      {/* Color Legend */}
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold mb-2">Task Duration Legend:</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-warning/15 border border-warning/30 rounded"></div>
            <span>Less than 8 hours</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-warning/15 border border-warning/30 rounded"></div>
            <span>8 hours or more</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-muted border border-border rounded"></div>
            <span>Assigned Task (due date)</span>
          </div>
        </div>
      </div>

      {/* Calendar */}
      {viewMode === 'desktop' ? (
        <div className="bg-card rounded-xl border border-border p-4 md:p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl font-semibold">
              {MONTHS[currentMonth - 1]} {currentYear}
            </h2>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Calendar Grid - Desktop: 7 columns, Mobile: Vertical list */}
        <div className="md:grid md:grid-cols-7 md:gap-1 space-y-2 md:space-y-0">
          {/* Day Headers - Desktop only */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="hidden md:block text-center font-semibold text-sm text-muted-foreground py-2">
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {calendarDays.map((calDay, index) => {
            // Skip rendering days from prev/next month on mobile
            if (!calDay.isCurrentMonth) {
              return <div key={index} className="hidden md:block bg-muted border border-border min-h-[100px]" />;
            }

            return (
              <div
                key={index}
                className={`relative min-h-[100px] border border-border p-3 md:p-2 ${
                  calDay.isCurrentMonth ? 'bg-card hover:bg-muted cursor-pointer' : ''
                } transition-colors group`}
                onMouseEnter={() => calDay.isCurrentMonth && setHoveredDay(index)}
                onMouseLeave={() => setHoveredDay(null)}
                onClick={() => calDay.isCurrentMonth && handleDateClick(calDay.date)}
              >
                {/* Mobile: Show full date with day name */}
                <div className="md:hidden flex items-center justify-between mb-2">
                  <div className="text-base font-semibold text-foreground">
                    {calDay.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  {calDay.date.toDateString() === new Date().toDateString() && (
                    <span className="text-xs px-2 py-0.5 bg-foreground text-background rounded-full">Today</span>
                  )}
                </div>

                {/* Desktop: Show just day number */}
                <div className="hidden md:block text-sm font-medium text-foreground">
                  {calDay.day}
                </div>

                {/* Add Task Button - Right aligned on mobile */}
                {calDay.isCurrentMonth && (
                  <div className="md:hidden flex justify-end mb-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddTask(calDay.date, 'single');
                      }}
                      className="p-1.5 bg-foreground text-background rounded hover:bg-foreground/90 transition-colors flex items-center justify-center"
                      title="Add Client Task"
                    >
                      <PlusCircleIcon className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {/* Add Task Button - Desktop hover */}
                {calDay.isCurrentMonth && (
                  <div 
                    className={`hidden md:block absolute top-1 right-1 z-10 ${
                      hoveredDay === index ? 'opacity-100' : 'opacity-0'
                    } transition-opacity`} 
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleAddTask(calDay.date, 'single')}
                      className="p-1 bg-foreground text-background rounded hover:bg-foreground/90 transition-colors flex items-center justify-center"
                      title="Add Client Task"
                    >
                      <PlusCircleIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Tasks */}
                <div className="mt-1 space-y-1">
                  {calDay.tasks.slice(0, 3).map(task => (
                    <div
                      key={task.id}
                      className={`text-xs md:text-[11px] px-2 py-1.5 md:px-1 md:py-0.5 rounded border ${getTaskColorClass(task)} ${
                        task.taskDetail?.startsWith('OFF:') ? 'cursor-default' : 'cursor-pointer hover:opacity-80 transition-opacity'
                      }`}
                      title={task.taskType === 'multi' ? task.activityName : (task.clientName || task.taskDetail)}
                      onClick={(e) => {
                        if (!task.taskDetail?.startsWith('OFF:')) {
                          handleTaskClick(task, e);
                        }
                      }}
                    >
                      {task.taskType === 'multi' ? task.activityName : (task.clientName || task.taskDetail)}
                    </div>
                  ))}
                  {calDay.tasks.length > 3 && (
                    <div className="text-xs text-muted-foreground px-2 md:px-1">
                      +{calDay.tasks.length - 3} more
                    </div>
                  )}
                  {calDay.nonRecurringTasks.slice(0, 2).map(task => (
                    <div
                      key={`nrt-${task.id}`}
                      className="text-xs md:text-[11px] px-2 py-1.5 md:px-1 md:py-0.5 rounded border bg-muted text-foreground border-border cursor-pointer hover:opacity-80 transition-opacity"
                      title={task.title}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNonRecurringTask(task);
                        openModal();
                      }}
                    >
                      {task.title}
                    </div>
                  ))}
                  {calDay.nonRecurringTasks.length > 2 && (
                    <div className="text-xs text-muted-foreground px-2 md:px-1">
                      +{calDay.nonRecurringTasks.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      ) : (
        <RosterMobileCalendarView
          calendarDays={calendarDays}
          currentMonth={currentMonth}
          currentYear={currentYear}
          onPreviousMonth={handlePreviousMonth}
          onNextMonth={handleNextMonth}
          onDateClick={handleDateClick}
          onTaskClick={handleTaskClick}
          onAddTask={handleAddTask}
          getTaskColorClass={getTaskColorClass}
        />
      )}
      {/* Task Form Modal */}
      {showModal && createPortal(
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCloseModal}
        >
          <div
            className="bg-card rounded-lg shadow-xl w-full max-w-md m-2 sm:m-4 mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">
              {editingEntry ? 'Edit Task' : 'Add Task'}
            </h3>

            {/* Task Type Selector (only for new tasks) */}
            {!editingEntry && (
              <div className="mb-3 sm:mb-4">
                <label className="block text-sm font-medium text-muted-foreground mb-2">Task Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTaskType('single')}
                    className={`flex-1 py-2 px-3 sm:px-4 text-sm sm:text-base rounded-lg border ${
                      taskType === 'single'
                        ? 'bg-foreground text-background border-border'
                        : 'bg-card text-muted-foreground border-border hover:bg-muted/50'
                    }`}
                  >
                    Client Task
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskType('multi')}
                    className={`flex-1 py-2 px-3 sm:px-4 text-sm sm:text-base rounded-lg border ${
                      taskType === 'multi'
                        ? 'bg-foreground text-background border-border'
                        : 'bg-card text-muted-foreground border-border hover:bg-muted/50'
                    }`}
                  >
                    <span className="hidden sm:inline">Activity</span>
                    <span className="sm:hidden">Activity</span>
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              {taskType === 'multi' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Activity Name *
                    </label>
                    <input
                      type="text"
                      value={formData.activityName}
                      onChange={(e) => setFormData({ ...formData, activityName: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg"
                      required
                      placeholder="e.g., Project planning, Sprint review, Team sync"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg"
                      rows={3}
                      placeholder="Additional details..."
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Task Detail *
                    </label>
                    <input
                      type="text"
                      value={formData.taskDetail}
                      onChange={(e) => setFormData({ ...formData, taskDetail: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg"
                      required
                      placeholder="e.g., Client visit, Project work, HR meeting"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={formData.taskDate}
                      onChange={(e) => setFormData({ ...formData, taskDate: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={formData.timeStart}
                      onChange={(e) => setFormData({ ...formData, timeStart: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      End Time *
                    </label>
                    <input
                      type="time"
                      value={formData.timeEnd}
                      onChange={(e) => setFormData({ ...formData, timeEnd: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg"
                      required
                    />
                  </div>
                </>
              )}

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 pb-4 sm:pb-2">
                <Button type="submit" className="w-full sm:flex-1 text-white min-h-[44px] sm:min-h-[40px]">
                  {editingEntry ? 'Update' : 'Create'}
                </Button>
                <Button
                  type="button"
                  onClick={handleCloseModal}
                  variant="outline"
                  className="w-full sm:flex-1 min-h-[44px] sm:min-h-[40px]"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Non-Recurring Task Details Modal */}
      {selectedNonRecurringTask && createPortal(
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => { setSelectedNonRecurringTask(null); closeModal(); }}
        >
          <div
            className="bg-card rounded-lg shadow-xl w-full max-w-md m-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-foreground">Assigned Task</h3>
              <button
                onClick={() => { setSelectedNonRecurringTask(null); closeModal(); }}
                className="text-muted-foreground hover:text-muted-foreground"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Title</p>
                <p className="text-sm text-foreground">{selectedNonRecurringTask.title}</p>
              </div>
              {selectedNonRecurringTask.description && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Description</p>
                  <p className="text-sm text-foreground">{selectedNonRecurringTask.description}</p>
                </div>
              )}
              <div className="flex gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Priority</p>
                  <p className="text-sm capitalize text-foreground">{selectedNonRecurringTask.priority}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Status</p>
                  <p className="text-sm capitalize text-foreground">{selectedNonRecurringTask.status}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Due Date</p>
                <p className="text-sm text-foreground">
                  {new Date(selectedNonRecurringTask.dueDate).toLocaleDateString()}
                </p>
              </div>
              {nonRecurringTaskClientName && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Client</p>
                  <p className="text-sm text-foreground">{nonRecurringTaskClientName}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      , document.body)}

      {/* Task Action Menu Modal */}
      {showTaskActionMenu && selectedTaskForAction && createPortal(
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCloseTaskActionMenu}
        >
          <div
            className="bg-card rounded-lg shadow-xl w-full max-w-sm m-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-foreground">Task Options</h3>
              <button
                onClick={handleCloseTaskActionMenu}
                className="text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleViewTask}
                className="w-full flex items-center gap-3 px-4 py-3 text-left bg-muted hover:bg-muted rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-foreground">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <div className="font-medium text-foreground">View Task</div>
                  <div className="text-xs text-muted-foreground">See task details</div>
                </div>
              </button>

              <button
                onClick={handleEditTaskFromMenu}
                className="w-full flex items-center gap-3 px-4 py-3 text-left bg-muted hover:bg-muted rounded-lg transition-colors"
              >
                <PencilIcon className="w-5 h-5 text-foreground" />
                <div>
                  <div className="font-medium text-foreground">Edit Task</div>
                  <div className="text-xs text-muted-foreground">Modify task details</div>
                </div>
              </button>

              <button
                onClick={async () => {
                  setShowTaskActionMenu(false);
                  closeModal();
                  if (selectedTaskForAction?.id) {
                    await handleDeleteTask(selectedTaskForAction.id);
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left bg-destructive/10 hover:bg-destructive/10 rounded-lg transition-colors"
              >
                <TrashIcon className="w-5 h-5 text-destructive" />
                <div>
                  <div className="font-medium text-foreground">Delete Task</div>
                  <div className="text-xs text-muted-foreground">Remove this task</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Task View Modal */}
      {showTaskViewModal && selectedTaskForAction && createPortal(
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCloseTaskViewModal}
        >
          <div
            className="bg-card rounded-lg shadow-xl w-full max-w-md m-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-foreground">Task Details</h3>
              <button
                onClick={handleCloseTaskViewModal}
                className="text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {selectedTaskForAction.taskType === 'multi' ? (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Activity Name</p>
                    <p className="text-sm text-foreground">{selectedTaskForAction.activityName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Start Date</p>
                      <p className="text-sm text-foreground">
                        {selectedTaskForAction.startDate ? new Date(selectedTaskForAction.startDate).toLocaleDateString() : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">End Date</p>
                      <p className="text-sm text-foreground">
                        {selectedTaskForAction.endDate ? new Date(selectedTaskForAction.endDate).toLocaleDateString() : '—'}
                      </p>
                    </div>
                  </div>
                  {selectedTaskForAction.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Notes</p>
                      <p className="text-sm text-foreground">{selectedTaskForAction.notes}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {selectedTaskForAction.clientName && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Client Name</p>
                      <p className="text-sm text-foreground">{selectedTaskForAction.clientName}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Task Detail</p>
                    <p className="text-sm text-foreground">{selectedTaskForAction.taskDetail}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Start Time</p>
                      <p className="text-sm text-foreground">
                        {selectedTaskForAction.timeStart ? new Date(selectedTaskForAction.timeStart).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">End Time</p>
                      <p className="text-sm text-foreground">
                        {selectedTaskForAction.timeEnd ? new Date(selectedTaskForAction.timeEnd).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Date</p>
                    <p className="text-sm text-foreground">
                      {selectedTaskForAction.timeStart ? new Date(selectedTaskForAction.timeStart).toLocaleDateString() : '—'}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  handleCloseTaskViewModal();
                  handleEditTask(selectedTaskForAction);
                }}
                className="flex-1 px-4 py-2 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors"
              >
                Edit Task
              </button>
              <button
                onClick={handleCloseTaskViewModal}
                className="flex-1 px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-muted/50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Task Table Modal */}
      {showTaskTable && selectedDate && createPortal(
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCloseTaskTable}
        >
          <div
            className="bg-card rounded-lg shadow-xl max-w-4xl w-full m-4 p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 gap-2">
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-foreground flex-1 min-w-0">
                <span className="block sm:inline">Tasks for </span>
                <span className="block sm:inline">{selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTaskTable();
                    handleAddTask(selectedDate, 'single');
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors text-sm font-medium"
                >
                  <PlusCircleIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Task</span>
                </button>
                <button
                  onClick={handleCloseTaskTable}
                  className="p-2 hover:bg-muted/50 rounded-lg transition-colors flex-shrink-0"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {selectedDateTasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No tasks assigned for this day</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTaskTable();
                    handleAddTask(selectedDate, 'single');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors text-sm font-medium"
                >
                  <PlusCircleIcon className="w-5 h-5" />
                  Add Your First Task
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-sm text-muted-foreground">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-muted-foreground">Client Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-muted-foreground">Task Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-muted-foreground">Start Time</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-muted-foreground">End Time</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDateTasks
                      .sort((a, b) => {
                        const aStart = a.timeStart || a.startDate;
                        const bStart = b.timeStart || b.startDate;
                        return (aStart?.getTime() || 0) - (bStart?.getTime() || 0);
                      })
                      .map((task) => {
                        const start = task.timeStart || task.startDate;
                        const end = task.timeEnd || task.endDate;
                        const isMulti = task.taskType === 'multi';
                        
                        return (
                          <tr key={task.id} className="border-b border-border hover:bg-muted">
                            <td className="py-3 px-4 text-sm text-foreground">
                              {start?.toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-sm text-foreground">
                              {task.clientName || '—'}
                            </td>
                            <td className="py-3 px-4 text-sm text-foreground">
                              {task.taskDetail || task.activityName}
                            </td>
                            <td className="py-3 px-4 text-sm text-foreground">
                              {isMulti ? '09:00 AM' : start ? start.toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              }) : '—'}
                            </td>
                            <td className="py-3 px-4 text-sm text-foreground">
                              {isMulti ? '05:00 PM' : end ? end.toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              }) : '—'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedTaskForAction(task);
                                    setShowTaskViewModal(true);
                                    openModal();
                                  }}
                                  className="p-1 text-foreground hover:bg-muted rounded transition-colors"
                                  title="View"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => {
                                    handleCloseTaskTable();
                                    handleEditTask(task);
                                  }}
                                  className="p-1 text-foreground hover:bg-muted rounded transition-colors"
                                  title="Edit"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id!)}
                                  className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                                  title="Delete"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      , document.body)}
    </div>
  );
}

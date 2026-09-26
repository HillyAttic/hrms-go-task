'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { useRouter } from 'next/navigation';
import { useModal } from '@/contexts/modal-context';
import { rosterService, getTaskColor } from '@/services/roster.service';
import { leaveService } from '@/services/leave.service';
import { LeaveRequest } from '@/types/attendance.types';
import { RosterEntry, MONTHS, getDaysInMonth, MonthlyRosterView } from '@/types/roster.types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function ViewSchedulePage() {
  const { user, loading: authLoading, isAdmin, isManager } = useEnhancedAuth();
  const router = useRouter();
  const { openModal, closeModal } = useModal();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [entries, setEntries] = useState<RosterEntry[]>([]);
  const [monthlyView, setMonthlyView] = useState<MonthlyRosterView | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showUserCalendarModal, setShowUserCalendarModal] = useState(false);
  const [userCalendarEntries, setUserCalendarEntries] = useState<RosterEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateTasks, setSelectedDateTasks] = useState<RosterEntry[]>([]);
  const [showDayTasksModal, setShowDayTasksModal] = useState(false);
  const [selectedDayInUserCalendar, setSelectedDayInUserCalendar] = useState<number | null>(null);
  const [tasksForSelectedDay, setTasksForSelectedDay] = useState<RosterEntry[]>([]);
  const [userCalendarViewMode, setUserCalendarViewMode] = useState<'calendar' | 'table'>('calendar');

  const canViewAllSchedules = isAdmin || isManager;

  // Helper function to get color classes based on task duration
  const getTaskColorClass = (task: RosterEntry): string => {
    // Check if it's a leave task
    if (task.taskDetail?.startsWith('OFF:')) {
      return 'bg-purple-100 text-purple-800 border-purple-400 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-600 dark:hover:bg-purple-900/50';
    }

    const color = getTaskColor(task);
    if (color === 'green') return 'bg-emerald-100 text-emerald-800 border-emerald-400 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-600 dark:hover:bg-emerald-900/50';
    if (color === 'yellow') return 'bg-amber-100 text-amber-800 border-amber-400 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-600 dark:hover:bg-amber-900/50';
    return 'bg-orange-100 text-orange-800 border-orange-400 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-600 dark:hover:bg-orange-900/50';
  };

  // Helper function to get Excel cell color classes
  const getExcelCellColorClass = (task: RosterEntry): string => {
    // Check if it's a leave task
    if (task.taskDetail?.startsWith('OFF:')) {
      return 'bg-purple-500 hover:bg-purple-600';
    }
    
    const color = getTaskColor(task);
    if (color === 'green') return 'bg-emerald-400 hover:bg-emerald-500';
    if (color === 'yellow') return 'bg-amber-400 hover:bg-amber-500';
    return 'bg-orange-600 hover:bg-orange-700';
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/sign-in');
    } else if (!authLoading && user && !canViewAllSchedules) {
      // Redirect employees to their own update-schedule page
      router.push('/roster/update-schedule');
    }
  }, [user, authLoading, router, canViewAllSchedules]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, currentMonth, currentYear, canViewAllSchedules]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      if (canViewAllSchedules) {
        // Load all users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        let usersData = usersSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || data.displayName || data.email || 'Unknown User',
            email: data.email || '',
            role: data.role || 'employee',
          };
        }) as UserProfile[];

        // For managers, filter users to only show assigned employees
        if (isManager && !isAdmin) {
          const { authenticatedFetch } = await import('@/lib/api-client');
          const hierarchyRes = await authenticatedFetch(`/api/manager-hierarchy?managerId=${user.uid}`);
          
          if (hierarchyRes.ok) {
            const hierarchies = await hierarchyRes.json();
            if (hierarchies.length > 0) {
              const assignedEmployeeIds = hierarchies[0].employeeIds || [];
              usersData = usersData.filter(u => assignedEmployeeIds.includes(u.id));
            } else {
              // Manager has no assigned employees
              usersData = [];
            }
          }
        }

        setUsers(usersData);

        // Load monthly roster view using the new API endpoint
        const { authenticatedFetch } = await import('@/lib/api-client');
        const viewRes = await authenticatedFetch(`/api/roster/monthly-view?month=${currentMonth}&year=${currentYear}`);
        
        let view;
        if (viewRes.ok) {
          view = await viewRes.json();
          // Convert ISO date strings back to Date objects after JSON parse.
          // NextResponse.json() serialises Date fields to strings; calculateDuration()
          // later calls .getTime() on them, which throws in production where real
          // activity data exists.
          view?.employees?.forEach((emp: any) => {
            emp?.activities?.forEach((act: any) => {
              if (act.startDate) act.startDate = new Date(act.startDate);
              if (act.endDate)   act.endDate   = new Date(act.endDate);
            });
          });
        } else {
          // Fallback to empty view
          view = { month: currentMonth, year: currentYear, employees: [] };
        }
        
        // Load all approved leave requests for the month
        const allLeaves = await leaveService.getLeaveRequests();
        const approvedLeaves = allLeaves.filter(leave => leave.status === 'approved');
        setLeaveRequests(approvedLeaves);
        
        // Integrate leaves into the monthly view
        if (view && approvedLeaves.length > 0) {
          approvedLeaves.forEach(leave => {
            if (!leave.startDate || !leave.endDate) return;

            const startDate = leave.startDate instanceof Date
              ? leave.startDate
              : (leave.startDate as any).toDate ? (leave.startDate as any).toDate() : new Date((leave.startDate as any).seconds * 1000);

            const endDate = leave.endDate instanceof Date
              ? leave.endDate
              : (leave.endDate as any).toDate ? (leave.endDate as any).toDate() : new Date((leave.endDate as any).seconds * 1000);

            // Skip leaves that don't overlap with the current month at all
            const monthStart = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
            const monthEnd = new Date(Date.UTC(currentYear, currentMonth - 1, getDaysInMonth(currentMonth, currentYear), 23, 59, 59, 999));
            if (endDate < monthStart || startDate > monthEnd) return;

            // Calculate which days of the month this leave spans
            const leaveStartDay = startDate.getUTCMonth() + 1 === currentMonth && startDate.getUTCFullYear() === currentYear
              ? startDate.getUTCDate()
              : 1;
            
            const leaveEndDay = endDate.getUTCMonth() + 1 === currentMonth && endDate.getUTCFullYear() === currentYear
              ? endDate.getUTCDate()
              : getDaysInMonth(currentMonth, currentYear);

            // Find or create employee entry
            let employeeData = view.employees.find((e: any) => e.userId === leave.employeeId);
            if (!employeeData) {
              const user = usersData.find((u: UserProfile) => u.id === leave.employeeId);
              if (user) {
                employeeData = {
                  userId: leave.employeeId,
                  userName: user.name,
                  activities: []
                };
                view.employees.push(employeeData);
              }
            }

            // Add leave as an activity
            if (employeeData) {
              employeeData.activities.push({
                id: `leave-${leave.id}-${leaveStartDay}`,
                startDay: leaveStartDay,
                endDay: leaveEndDay,
                taskType: 'single',
                taskDetail: `OFF: ${leave.leaveTypeName}`,
                startDate: startDate,
                endDate: endDate,
              });
            }
          });
        }
        
        setMonthlyView(view);
      } else {
        // Load only user's own entries
        const data = await rosterService.getUserCalendarEvents(user.uid, currentMonth, currentYear);
        setEntries(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
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

  const handleActivityClick = async (activity: any, userName: string, userId: string, day: number) => {
    try {
      // Create the date for the clicked day
      const clickedDate = new Date(currentYear, currentMonth - 1, day);
      
      // Fetch all tasks for this user on this specific day
      const allUserTasks = await rosterService.getUserCalendarEvents(userId, currentMonth, currentYear);
      
      // Filter tasks that occur on the clicked day
      const tasksForDay = allUserTasks.filter(task => {
        if (task.taskType === 'multi' && task.startDate && task.endDate) {
          const taskStart = new Date(task.startDate);
          taskStart.setHours(0, 0, 0, 0);
          const taskEnd = new Date(task.endDate);
          taskEnd.setHours(0, 0, 0, 0);
          const checkDate = new Date(clickedDate);
          checkDate.setHours(0, 0, 0, 0);
          return checkDate >= taskStart && checkDate <= taskEnd;
        } else if (task.taskType === 'single' && task.timeStart) {
          const taskStart = new Date(task.timeStart);
          taskStart.setHours(0, 0, 0, 0);
          const checkDate = new Date(clickedDate);
          checkDate.setHours(0, 0, 0, 0);
          return taskStart.getTime() === checkDate.getTime();
        }
        return false;
      });

      setSelectedDate(clickedDate);
      setSelectedDateTasks(tasksForDay);
      setSelectedUser({ id: userId, name: userName, email: '', role: '' });
      setShowDayTasksModal(true);
      openModal();
    } catch (error) {
      console.error('Error loading tasks for day:', error);
    }
  };

  const handleCloseDayTasksModal = () => {
    setShowDayTasksModal(false);
    setSelectedDate(null);
    setSelectedDateTasks([]);
    setSelectedUser(null);
    closeModal();
  };

  const handleCloseActivityModal = () => {
    setShowActivityModal(false);
    setSelectedActivity(null);
    closeModal(); // Close modal context to show header again
  };

  const handleUserNameClick = async (user: UserProfile) => {
    try {
      setSelectedUser(user);
      // Load user's calendar entries for the current month
      const entries = await rosterService.getUserCalendarEvents(user.id, currentMonth, currentYear);
      
      // Load user's approved leaves
      const userLeaves = leaveRequests.filter(leave => leave.employeeId === user.id);
      
      // Add leaves to entries
      const leaveEntries: RosterEntry[] = [];
      userLeaves.forEach(leave => {
        if (!leave.startDate || !leave.endDate) return;

        const startDate = leave.startDate instanceof Date
          ? leave.startDate
          : (leave.startDate as any).toDate ? (leave.startDate as any).toDate() : new Date((leave.startDate as any).seconds * 1000);

        const endDate = leave.endDate instanceof Date
          ? leave.endDate
          : (leave.endDate as any).toDate ? (leave.endDate as any).toDate() : new Date((leave.endDate as any).seconds * 1000);

        const current = new Date(startDate);
        while (current <= endDate) {
          // Only add if it's in the current month
          if (current.getMonth() + 1 === currentMonth && current.getFullYear() === currentYear) {
            leaveEntries.push({
              id: `leave-${leave.id}-${current.getTime()}`,
              taskType: 'single',
              userId: user.id,
              userName: user.name,
              taskDetail: `OFF: ${leave.leaveTypeName}`,
              timeStart: new Date(current),
              timeEnd: new Date(current),
              createdBy: user.id,
            } as RosterEntry);
          }
          current.setDate(current.getDate() + 1);
        }
      });
      
      setUserCalendarEntries([...entries, ...leaveEntries]);
      setShowUserCalendarModal(true);
      openModal(); // Open modal context to hide header
    } catch (error) {
      console.error('Error loading user calendar:', error);
    }
  };

  const handleCloseUserCalendarModal = () => {
    setShowUserCalendarModal(false);
    setSelectedUser(null);
    setUserCalendarEntries([]);
    setSelectedDayInUserCalendar(null);
    setTasksForSelectedDay([]);
    setUserCalendarViewMode('calendar');
    closeModal(); // Close modal context to show header again
  };

  // Helper function to check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  // Handle clicking on a task in the user calendar modal
  const handleTaskClickInUserCalendar = (day: number) => {
    const clickedDate = new Date(currentYear, currentMonth - 1, day);
    
    // Filter tasks that occur on the clicked day
    const tasksForDay = userCalendarEntries.filter(task => {
      if (task.taskType === 'multi' && task.startDate && task.endDate) {
        const taskStart = new Date(task.startDate);
        taskStart.setHours(0, 0, 0, 0);
        const taskEnd = new Date(task.endDate);
        taskEnd.setHours(0, 0, 0, 0);
        const checkDate = new Date(clickedDate);
        checkDate.setHours(0, 0, 0, 0);
        return checkDate >= taskStart && checkDate <= taskEnd;
      } else if (task.taskType === 'single' && task.timeStart) {
        const taskStart = new Date(task.timeStart);
        taskStart.setHours(0, 0, 0, 0);
        const checkDate = new Date(clickedDate);
        checkDate.setHours(0, 0, 0, 0);
        return taskStart.getTime() === checkDate.getTime();
      }
      return false;
    });

    setSelectedDayInUserCalendar(day);
    setTasksForSelectedDay(tasksForDay);
  };

  const renderUserCalendarInModal = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const days: any[] = [];

    // Previous month days
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const daysInPrevMonth = getDaysInMonth(prevMonth, prevYear);

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        activities: [],
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth - 1, day);
      date.setHours(0, 0, 0, 0); // Normalize to midnight
      
      const dayActivities = userCalendarEntries.filter(entry => {
        if (entry.taskType === 'multi' && entry.startDate && entry.endDate) {
          const entryStart = new Date(entry.startDate);
          entryStart.setHours(0, 0, 0, 0);
          const entryEnd = new Date(entry.endDate);
          entryEnd.setHours(0, 0, 0, 0);
          return date >= entryStart && date <= entryEnd;
        } else if (entry.taskType === 'single' && entry.timeStart) {
          const taskStart = new Date(entry.timeStart);
          taskStart.setHours(0, 0, 0, 0);
          return date.getTime() === taskStart.getTime();
        }
        return false;
      });

      days.push({
        day,
        isCurrentMonth: true,
        activities: dayActivities,
      });
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-semibold text-sm text-gray-600 dark:text-gray-400 py-2">
            {day}
          </div>
        ))}
        {days.map((calDay, index) => (
          <div
            key={index}
            className={`min-h-[80px] border border-gray-200 dark:border-gray-700 p-1 ${
              !calDay.isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-dark'
            }`}
          >
            <div className={`text-sm ${!calDay.isCurrentMonth ? 'text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
              {calDay.day}
            </div>
            <div className="mt-1 space-y-1">
              {calDay.activities.map((activity: RosterEntry) => {
                const displayName = activity.taskType === 'multi'
                  ? activity.activityName
                  : (activity.clientName || activity.taskDetail);
                return (
                  <div
                    key={activity.id}
                    className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer border transition-colors ${getTaskColorClass(activity)}`}
                    title={displayName}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTaskClickInUserCalendar(calDay.day);
                    }}
                  >
                    {displayName}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderUserCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const days: any[] = [];

    // Previous month days
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const daysInPrevMonth = getDaysInMonth(prevMonth, prevYear);

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        activities: [],
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth - 1, day);
      date.setHours(0, 0, 0, 0); // Normalize to midnight
      
      const dayActivities = entries.filter(entry => {
        if (entry.taskType === 'multi' && entry.startDate && entry.endDate) {
          const entryStart = new Date(entry.startDate);
          entryStart.setHours(0, 0, 0, 0);
          const entryEnd = new Date(entry.endDate);
          entryEnd.setHours(0, 0, 0, 0);
          return date >= entryStart && date <= entryEnd;
        } else if (entry.taskType === 'single' && entry.timeStart) {
          const taskStart = new Date(entry.timeStart);
          taskStart.setHours(0, 0, 0, 0);
          return date.getTime() === taskStart.getTime();
        }
        return false;
      });

      days.push({
        day,
        isCurrentMonth: true,
        activities: dayActivities,
      });
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-semibold text-sm text-gray-600 dark:text-gray-400 py-2">
            {day}
          </div>
        ))}
        {days.map((calDay, index) => (
          <div
            key={index}
            className={`min-h-[80px] border border-gray-200 p-1 ${
              !calDay.isCurrentMonth ? 'bg-gray-50' : 'bg-white'
            }`}
          >
            <div className={`text-sm ${!calDay.isCurrentMonth ? 'text-gray-400' : 'text-gray-900'}`}>
              {calDay.day}
            </div>
            <div className="mt-1 space-y-1">
              {calDay.activities.map((activity: RosterEntry) => {
                const displayName = activity.taskType === 'multi' 
                  ? activity.activityName 
                  : (activity.clientName || activity.taskDetail);
                return (
                  <div
                    key={activity.id}
                    className={`text-xs px-1 py-0.5 rounded truncate border ${getTaskColorClass(activity)}`}
                    title={displayName}
                  >
                    {displayName}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderExcelView = () => {
    if (!monthlyView) return null;

    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div className="w-full overflow-x-auto">
        <table className="border-collapse border border-gray-300 dark:border-gray-600">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700">
              <th className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-left font-semibold bg-gray-100 dark:bg-gray-700 whitespace-nowrap" style={{ width: '150px', minWidth: '150px' }}>
                EMP NAME
              </th>
              {days.map(day => (
                <th key={day} className="border border-gray-300 dark:border-gray-600 text-center font-semibold text-xs" style={{ width: '40px', minWidth: '40px', maxWidth: '40px', height: '40px', padding: '0' }}>
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const employeeData = monthlyView.employees.find(e => e.userId === user.id);
              const activities = employeeData?.activities || [];

              return (
                <tr key={user.id} className="hover:bg-gray-50 dark:bg-gray-800" style={{ height: '40px' }}>
                  <td 
                    className="border border-gray-300 dark:border-gray-600 px-2 font-medium bg-white dark:bg-gray-dark whitespace-nowrap cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors text-sm"
                    onClick={() => handleUserNameClick(user)}
                    title="Click to view full calendar"
                    style={{ width: '150px', minWidth: '150px', height: '40px' }}
                  >
                    <div className="truncate">{user.name?.trim() || user.name}</div>
                  </td>
                  {days.map(day => {
                    // Find activities that span this day
                    const dayActivities = activities.filter(
                      activity => day >= activity.startDay && day <= activity.endDay
                    );

                    // Check if this is the start of an activity
                    const startingActivity = dayActivities.find(a => a.startDay === day);

                    if (startingActivity) {
                      const span = startingActivity.endDay - startingActivity.startDay + 1;
                      const cellWidth = span * 40;
                      const displayName = startingActivity.activityName 
                        || startingActivity.clientName 
                        || startingActivity.taskDetail 
                        || 'Task';
                      
                      // Create a temporary RosterEntry object for color calculation
                      const taskForColor: RosterEntry = {
                        taskType: startingActivity.taskType || 'multi',
                        userId: user.id,
                        userName: user.name,
                        startDate: startingActivity.startDate,
                        endDate: startingActivity.endDate,
                        activityName: startingActivity.activityName,
                        clientName: startingActivity.clientName,
                        taskDetail: startingActivity.taskDetail,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      };
                      
                      return (
                        <td
                          key={day}
                          colSpan={span}
                          className={`border border-gray-300 text-center font-medium cursor-pointer transition-colors overflow-hidden ${getExcelCellColorClass(taskForColor)}`}
                          title={displayName}
                          onClick={() => handleActivityClick(startingActivity, user.name, user.id, day)}
                          style={{ width: `${cellWidth}px`, minWidth: `${cellWidth}px`, maxWidth: `${cellWidth}px`, height: '40px', padding: '0' }}
                        >
                        </td>
                      );
                    } else if (dayActivities.length > 0) {
                      // This day is part of a spanning activity, skip rendering
                      return null;
                    } else {
                      // Empty day - show vibrant green background to indicate no task assigned
                      return (
                        <td 
                          key={day} 
                          className="border border-gray-300 dark:border-gray-600 bg-emerald-400"
                          style={{ width: '40px', minWidth: '40px', maxWidth: '40px', height: '40px', padding: '0' }}
                        ></td>
                      );
                    }
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !canViewAllSchedules) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">View Schedule</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            {canViewAllSchedules
              ? 'Organization-wide roster view'
              : 'Your personal schedule'}
          </p>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="bg-white dark:bg-gray-dark rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePreviousMonth}
            className="p-2 hover:bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-semibold">
            Monthly ({MONTHS[currentMonth - 1]} {currentYear})
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-dark rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        {canViewAllSchedules ? renderExcelView() : renderUserCalendar()}
      </div>

      {/* Legend for Excel View */}
      {canViewAllSchedules && (
        <div className="bg-white dark:bg-gray-dark rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Task Duration Legend</h3>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-emerald-400 border border-emerald-500 rounded"></div>
              <span>No task assigned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-400 border border-amber-500 rounded"></div>
              <span>Task: Less than 8 hours</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-600 border border-orange-700 rounded"></div>
              <span>Task: 8 hours or more</span>
            </div>
          </div>
        </div>
      )}

      {/* Day Tasks Table Modal */}
      {showDayTasksModal && selectedDate && selectedUser && createPortal(
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[9999] p-4 pt-4 overflow-y-auto"
          onClick={handleCloseDayTasksModal}
        >
          <div
            className="bg-white dark:bg-gray-dark rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-gray-dark border-b border-gray-200 dark:border-gray-700 p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedUser.name}'s Tasks
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                <button
                  onClick={handleCloseDayTasksModal}
                  className="p-2 hover:bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {selectedDateTasks.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400 text-lg">No tasks assigned for this day</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                          Date
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                          Client Name
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                          Task Name
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                          Start Time
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                          End Time
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDateTasks
                        .sort((a, b) => {
                          const aStart = a.timeStart || a.startDate;
                          const bStart = b.timeStart || b.startDate;
                          return (aStart?.getTime() || 0) - (bStart?.getTime() || 0);
                        })
                        .map((task, index) => {
                          const start = task.timeStart || task.startDate;
                          const end = task.timeEnd || task.endDate;
                          const isMulti = task.taskType === 'multi';
                          
                          return (
                            <tr key={task.id || index} className="hover:bg-gray-50 dark:bg-gray-800">
                              <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white">
                                {start ? start.toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                }) : '—'}
                              </td>
                              <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white">
                                {task.clientName || '—'}
                              </td>
                              <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white">
                                {task.taskDetail || task.activityName || '—'}
                              </td>
                              <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white">
                                {isMulti ? '09:00 AM' : start ? start.toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                }) : '—'}
                              </td>
                              <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white">
                                {isMulti ? '05:00 PM' : end ? end.toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                }) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6">
              <button
                onClick={handleCloseDayTasksModal}
                className="w-full px-4 py-2 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Activity Detail Modal */}
      {showActivityModal && selectedActivity && createPortal(
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
          onClick={handleCloseActivityModal}
        >
          <div
            className="bg-white dark:bg-gray-dark rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Activity Details</h3>
              <button
                onClick={handleCloseActivityModal}
                className="p-2 hover:bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Employee
                </label>
                <p className="text-base text-gray-900 dark:text-white font-medium">
                  {selectedActivity.userName}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {selectedActivity.taskType === 'multi' ? 'Activity Name' : 'Client Name'}
                </label>
                <p className="text-base text-gray-900 dark:text-white font-medium">
                  {selectedActivity.taskType === 'multi' ? selectedActivity.activityName : selectedActivity.clientName}
                </p>
              </div>

              {selectedActivity.taskType === 'single' && selectedActivity.taskDetail && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Task Detail
                  </label>
                  <p className="text-base text-gray-900 dark:text-white">
                    {selectedActivity.taskDetail}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {selectedActivity.taskType === 'multi' ? 'Start Date' : 'Start Time'}
                  </label>
                  <p className="text-base text-gray-900 dark:text-white">
                    {selectedActivity.taskType === 'multi' && selectedActivity.startDate
                      ? new Date(selectedActivity.startDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : selectedActivity.timeStart
                      ? new Date(selectedActivity.timeStart).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'N/A'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {selectedActivity.taskType === 'multi' ? 'End Date' : 'End Time'}
                  </label>
                  <p className="text-base text-gray-900 dark:text-white">
                    {selectedActivity.taskType === 'multi' && selectedActivity.endDate
                      ? new Date(selectedActivity.endDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : selectedActivity.timeEnd
                      ? new Date(selectedActivity.timeEnd).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {selectedActivity.startDay && selectedActivity.endDay && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Duration
                  </label>
                  <p className="text-base text-gray-900 dark:text-white">
                    {selectedActivity.endDay - selectedActivity.startDay + 1} day(s)
                  </p>
                </div>
              )}

              {selectedActivity.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Notes
                  </label>
                  <p className="text-base text-gray-900 dark:text-white whitespace-pre-wrap">
                    {selectedActivity.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6">
              <button
                onClick={handleCloseActivityModal}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* User Calendar Modal */}
      {showUserCalendarModal && selectedUser && createPortal(
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[9999] p-4 pt-4 overflow-y-auto"
          onClick={handleCloseUserCalendarModal}
        >
          <div
            className="bg-white dark:bg-gray-dark rounded-lg shadow-xl max-w-4xl w-full max-h-[calc(100vh-2rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-gray-dark border-b border-gray-200 dark:border-gray-700 p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedUser.name}'s Schedule</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {MONTHS[currentMonth - 1]} {currentYear}
                  </p>
                </div>
                <button
                  onClick={handleCloseUserCalendarModal}
                  className="p-2 hover:bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* View Toggle - Desktop Only */}
              <div className="hidden md:flex justify-center mb-6">
                <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 p-1">
                  <button
                    onClick={() => setUserCalendarViewMode('calendar')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      userCalendarViewMode === 'calendar'
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 inline-block mr-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    Calendar View
                  </button>
                  <button
                    onClick={() => setUserCalendarViewMode('table')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      userCalendarViewMode === 'table'
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 inline-block mr-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
                    </svg>
                    Table View
                  </button>
                </div>
              </div>

              {/* Calendar View - Desktop Only */}
              {userCalendarViewMode === 'calendar' && (
                <div className="hidden md:block">
                  {renderUserCalendarInModal()}
                  
                  {/* Task Details Table - Shows below calendar when a day is selected */}
                  {selectedDayInUserCalendar !== null && tasksForSelectedDay.length > 0 && (
                    <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Tasks for {MONTHS[currentMonth - 1]} {selectedDayInUserCalendar}, {currentYear}
                        </h4>
                        <button
                          onClick={() => {
                            setSelectedDayInUserCalendar(null);
                            setTasksForSelectedDay([]);
                          }}
                          className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                        >
                          Clear selection
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                          <thead>
                            <tr className="bg-gray-100 dark:bg-gray-700">
                              <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                Date
                              </th>
                              <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                                Client Name
                              </th>
                              <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                                Task Name
                              </th>
                              <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                Start Time
                              </th>
                              <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                End Time
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {tasksForSelectedDay
                              .sort((a, b) => {
                                const aStart = a.timeStart || a.startDate;
                                const bStart = b.timeStart || b.startDate;
                                return (aStart?.getTime() || 0) - (bStart?.getTime() || 0);
                              })
                              .map((task, index) => {
                                const start = task.timeStart || task.startDate;
                                const end = task.timeEnd || task.endDate;
                                const isMulti = task.taskType === 'multi';
                                
                                return (
                                  <tr key={task.id || index} className="hover:bg-gray-50 dark:bg-gray-800">
                                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white text-xs whitespace-nowrap">
                                      {start ? start.toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      }) : '—'}
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white text-sm">
                                      {task.clientName || '—'}
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white text-sm">
                                      {task.taskDetail || task.activityName || '—'}
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white text-xs whitespace-nowrap">
                                      {isMulti ? '09:00 AM' : start ? start.toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                      }) : '—'}
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white text-xs whitespace-nowrap">
                                      {isMulti ? '05:00 PM' : end ? end.toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                      }) : '—'}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Table View - Always visible on mobile, toggle on desktop */}
              {(userCalendarViewMode === 'table' || true) && (
                <div className={userCalendarViewMode === 'calendar' ? 'md:hidden' : ''}>
                  {userCalendarEntries.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 dark:text-gray-400 text-lg">No tasks scheduled for this month</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto -mx-6 md:mx-0">
                      <div className="inline-block min-w-full align-middle">
                        <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                          <thead>
                            <tr className="bg-gray-100 dark:bg-gray-700">
                              <th className="border border-gray-300 dark:border-gray-600 px-2 md:px-4 py-2 md:py-3 text-left font-semibold text-gray-700 dark:text-gray-300 text-xs md:text-sm whitespace-nowrap">
                                Date
                              </th>
                              <th className="border border-gray-300 dark:border-gray-600 px-2 md:px-4 py-2 md:py-3 text-left font-semibold text-gray-700 dark:text-gray-300 text-xs md:text-sm">
                                Client Name
                              </th>
                              <th className="border border-gray-300 dark:border-gray-600 px-2 md:px-4 py-2 md:py-3 text-left font-semibold text-gray-700 dark:text-gray-300 text-xs md:text-sm">
                                Task Name
                              </th>
                              <th className="border border-gray-300 dark:border-gray-600 px-2 md:px-4 py-2 md:py-3 text-left font-semibold text-gray-700 dark:text-gray-300 text-xs md:text-sm whitespace-nowrap">
                                Start
                              </th>
                              <th className="border border-gray-300 dark:border-gray-600 px-2 md:px-4 py-2 md:py-3 text-left font-semibold text-gray-700 dark:text-gray-300 text-xs md:text-sm whitespace-nowrap">
                                End
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {userCalendarEntries
                              .sort((a, b) => {
                                const aStart = a.timeStart || a.startDate;
                                const bStart = b.timeStart || b.startDate;
                                return (aStart?.getTime() || 0) - (bStart?.getTime() || 0);
                              })
                              .map((task, index) => {
                                const start = task.timeStart || task.startDate;
                                const end = task.timeEnd || task.endDate;
                                const isMulti = task.taskType === 'multi';
                                
                                return (
                                  <tr key={task.id || index} className="hover:bg-gray-50 dark:bg-gray-800">
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 md:px-4 py-2 md:py-3 text-gray-900 dark:text-white text-xs whitespace-nowrap">
                                      {start ? start.toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric'
                                      }) : '—'}
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 md:px-4 py-2 md:py-3 text-gray-900 dark:text-white text-xs md:text-sm">
                                      <div className="max-w-[100px] md:max-w-[150px] truncate">
                                        {task.clientName || '—'}
                                      </div>
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 md:px-4 py-2 md:py-3 text-gray-900 dark:text-white text-xs md:text-sm">
                                      <div className="max-w-[120px] md:max-w-[200px] truncate">
                                        {task.taskDetail || task.activityName || '—'}
                                      </div>
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 md:px-4 py-2 md:py-3 text-gray-900 dark:text-white text-xs whitespace-nowrap">
                                      {isMulti ? '09:00 AM' : start ? start.toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                      }) : '—'}
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 md:px-4 py-2 md:py-3 text-gray-900 dark:text-white text-xs whitespace-nowrap">
                                      {isMulti ? '05:00 PM' : end ? end.toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                      }) : '—'}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-gray-dark border-t border-gray-200 dark:border-gray-700 p-4">
              <button
                onClick={handleCloseUserCalendarModal}
                className="w-full px-4 py-2 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

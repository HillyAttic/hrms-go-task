'use client';

import { useState, useEffect } from 'react';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { useRouter } from 'next/navigation';
import { rosterService, getTaskColor } from '@/services/roster.service';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { ViewToggle } from '@/components/ui/view-toggle';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
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

  /**
   * Duration → status hue. These are data-encoding colours in a Gantt-style
   * grid, so they stay a 4-way distinction, but mapped onto the semantic
   * status tokens instead of raw palette classes so they invert with the theme.
   *
   * "No task assigned" was previously a loud emerald, which read as a positive
   * status for what is really an absence of data — it is neutral now.
   * Keep this map and the legend below in sync.
   */
  const TASK_CHIP_COLOR = {
    none: 'bg-muted text-muted-foreground border-border',
    short: 'bg-warning/15 text-warning border-warning/40',
    long: 'bg-info/15 text-info border-info/40',
    leave: 'bg-accent/30 text-foreground border-border',
  } as const;

  const TASK_BLOCK_COLOR = {
    none: 'bg-muted hover:bg-muted/80',
    short: 'bg-warning hover:bg-warning/90',
    long: 'bg-info hover:bg-info/90',
    leave: 'bg-accent hover:bg-accent/90',
  } as const;

  const getTaskKind = (task: RosterEntry): keyof typeof TASK_CHIP_COLOR => {
    if (task.taskDetail?.startsWith('OFF:')) return 'leave';
    const color = getTaskColor(task);
    if (color === 'green') return 'none';
    if (color === 'yellow') return 'short';
    return 'long';
  };

  const getTaskColorClass = (task: RosterEntry): string =>
    TASK_CHIP_COLOR[getTaskKind(task)];

  const getExcelCellColorClass = (task: RosterEntry): string =>
    TASK_BLOCK_COLOR[getTaskKind(task)];

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
    } catch (error) {
      console.error('Error loading tasks for day:', error);
    }
  };

  const handleCloseDayTasksModal = () => {
    setShowDayTasksModal(false);
    setSelectedDate(null);
    setSelectedDateTasks([]);
    setSelectedUser(null);
  };

  const handleCloseActivityModal = () => {
    setShowActivityModal(false);
    setSelectedActivity(null);
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
          <div key={day} className="text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground py-2">
            {day}
          </div>
        ))}
        {days.map((calDay, index) => (
          <div
            key={index}
            className={`min-h-[80px] border-2 border-border p-1 ${
              !calDay.isCurrentMonth ? 'bg-muted/50' : 'bg-card'
            }`}
          >
            <div className={`text-[13px] font-medium ${!calDay.isCurrentMonth ? 'text-muted-foreground' : 'text-foreground'}`}>
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
                    className={`text-[11px] px-1 py-0.5 rounded border-2 truncate cursor-pointer transition-colors ${getTaskColorClass(activity)}`}
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
          <div key={day} className="text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground py-2">
            {day}
          </div>
        ))}
        {days.map((calDay, index) => (
          <div
            key={index}
            className={`min-h-[80px] border-2 border-border p-1 ${
              !calDay.isCurrentMonth ? 'bg-muted/50' : 'bg-card'
            }`}
          >
            <div className={`text-[13px] font-medium ${!calDay.isCurrentMonth ? 'text-muted-foreground' : 'text-foreground'}`}>
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
                    className={`text-[11px] px-1 py-0.5 rounded border-2 truncate ${getTaskColorClass(activity)}`}
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
      <div className="custom-scrollbar w-full overflow-x-auto">
        <table className="border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground bg-muted whitespace-nowrap" style={{ width: '150px', minWidth: '150px' }}>
                EMP NAME
              </th>
              {days.map(day => (
                <th key={day} className="border border-border text-center text-[11px] font-bold text-muted-foreground" style={{ width: '40px', minWidth: '40px', maxWidth: '40px', height: '40px', padding: '0' }}>
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
                <tr key={user.id} className="hover:bg-muted transition-colors" style={{ height: '40px' }}>
                  <td 
                    className="border border-border px-2 font-medium bg-card whitespace-nowrap cursor-pointer hover:bg-accent/40 hover:text-foreground transition-colors text-[13px]"
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
                          className={`border border-border ${TASK_BLOCK_COLOR.none}`}
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ring"></div>
      </div>
    );
  }

  if (!user || !canViewAllSchedules) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow="Time"
        title="View Schedule"
        description={
          canViewAllSchedules
            ? 'Organization-wide roster view.'
            : 'Your personal schedule.'
        }
      />

      {/* Month Navigation */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePreviousMonth}
            aria-label="Previous month"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </Button>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Monthly ({MONTHS[currentMonth - 1]} {currentYear})
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextMonth}
            aria-label="Next month"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </Button>
        </div>
      </Card>

      {/* Content */}
      <Card className="p-4 md:p-6">
        {canViewAllSchedules ? renderExcelView() : renderUserCalendar()}
      </Card>

      {/* Legend for Excel View */}
      {canViewAllSchedules && (
        <Card className="p-4">
          <h3 className="font-display text-sm font-semibold text-foreground mb-2">Task Duration Legend</h3>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded border-2 border-border ${TASK_BLOCK_COLOR.none}`} />
              <span>No task assigned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded border-2 border-border ${TASK_BLOCK_COLOR.short}`} />
              <span>Task: Less than 8 hours</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded border-2 border-border ${TASK_BLOCK_COLOR.long}`} />
              <span>Task: 8 hours or more</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded border-2 border-border ${TASK_BLOCK_COLOR.leave}`} />
              <span>Approved leave</span>
            </div>
          </div>
        </Card>
      )}

      {/* Day Tasks Table Modal */}
      <Dialog
        open={showDayTasksModal && !!selectedDate && !!selectedUser}
        onOpenChange={(open) => !open && handleCloseDayTasksModal()}
      >
        <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="border-b-2 border-border p-6 sticky top-0 bg-card z-10">
            <DialogTitle>{selectedUser?.name}'s Tasks</DialogTitle>
            <DialogDescription>
              {selectedDate?.toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="p-6">
            {selectedDateTasks.length === 0 ? (
              <p className="py-12 text-center text-lg text-muted-foreground">
                No tasks assigned for this day
              </p>
            ) : (
              <div className="custom-scrollbar overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted border-b-2 border-border">
                      <th className="border-b-2 border-border px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Date</th>
                      <th className="border-b-2 border-border px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Client Name</th>
                      <th className="border-b-2 border-border px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Task Name</th>
                      <th className="border-b-2 border-border px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Start Time</th>
                      <th className="border-b-2 border-border px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">End Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-border">
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
                          <tr key={task.id || index} className="hover:bg-muted transition-colors">
                            <td className="px-4 py-3 text-[13px] text-foreground whitespace-nowrap">
                              {start ? start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </td>
                            <td className="px-4 py-3 text-[13px] text-foreground">{task.clientName || '—'}</td>
                            <td className="px-4 py-3 text-[13px] text-foreground">{task.taskDetail || task.activityName || '—'}</td>
                            <td className="px-4 py-3 text-[13px] text-foreground whitespace-nowrap">
                              {isMulti ? '09:00 AM' : start ? start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                            </td>
                            <td className="px-4 py-3 text-[13px] text-foreground whitespace-nowrap">
                              {isMulti ? '05:00 PM' : end ? end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 border-t-2 border-border bg-card p-6">
            <Button onClick={handleCloseDayTasksModal} className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Activity Detail Modal */}
      <Dialog
        open={showActivityModal && !!selectedActivity}
        onOpenChange={(open) => !open && handleCloseActivityModal()}
      >
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Activity Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Employee</label>
              <p className="text-base font-medium text-foreground">{selectedActivity?.userName}</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                {selectedActivity?.taskType === 'multi' ? 'Activity Name' : 'Client Name'}
              </label>
              <p className="text-base font-medium text-foreground">
                {selectedActivity?.taskType === 'multi' ? selectedActivity?.activityName : selectedActivity?.clientName}
              </p>
            </div>

            {selectedActivity?.taskType === 'single' && selectedActivity?.taskDetail && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Task Detail</label>
                <p className="text-base text-foreground">{selectedActivity.taskDetail}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {selectedActivity?.taskType === 'multi' ? 'Start Date' : 'Start Time'}
                </label>
                <p className="text-base text-foreground">
                  {selectedActivity?.taskType === 'multi' && selectedActivity?.startDate
                    ? new Date(selectedActivity.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : selectedActivity?.timeStart
                    ? new Date(selectedActivity.timeStart).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'N/A'}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {selectedActivity?.taskType === 'multi' ? 'End Date' : 'End Time'}
                </label>
                <p className="text-base text-foreground">
                  {selectedActivity?.taskType === 'multi' && selectedActivity?.endDate
                    ? new Date(selectedActivity.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : selectedActivity?.timeEnd
                    ? new Date(selectedActivity.timeEnd).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'N/A'}
                </p>
              </div>
            </div>

            {selectedActivity?.startDay && selectedActivity?.endDay && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Duration</label>
                <p className="text-base text-foreground">
                  {selectedActivity.endDay - selectedActivity.startDay + 1} day(s)
                </p>
              </div>
            )}

            {selectedActivity?.notes && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Notes</label>
                <p className="text-base text-foreground whitespace-pre-wrap">{selectedActivity.notes}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleCloseActivityModal} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Calendar Modal */}
      <Dialog
        open={showUserCalendarModal && !!selectedUser}
        onOpenChange={(open) => !open && handleCloseUserCalendarModal()}
      >
        <DialogContent size="xl" className="max-h-[calc(100vh-2rem)] overflow-y-auto p-0 gap-0">
          <DialogHeader className="border-b-2 border-border p-6 sticky top-0 bg-card z-10">
            <DialogTitle>{selectedUser?.name}'s Schedule</DialogTitle>
            <DialogDescription>
              {MONTHS[currentMonth - 1]} {currentYear}
            </DialogDescription>
          </DialogHeader>

          <div className="p-6">
            {/* View Toggle */}
            <div className="flex justify-center mb-6">
              <ViewToggle
                value={userCalendarViewMode}
                onChange={setUserCalendarViewMode}
                aria-label="Change schedule view"
                options={[
                  { value: 'calendar', label: 'Calendar View' },
                  { value: 'table', label: 'Table View' },
                ]}
              />
            </div>

            {/* Calendar View - Desktop Only */}
            {userCalendarViewMode === 'calendar' && (
              <div className="hidden md:block">
                {renderUserCalendarInModal()}

                {/* Task Details Table - Shows below calendar when a day is selected */}
                {selectedDayInUserCalendar !== null && tasksForSelectedDay.length > 0 && (
                  <div className="mt-6 border-t-2 border-border pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-display text-lg font-semibold text-foreground">
                        Tasks for {MONTHS[currentMonth - 1]} {selectedDayInUserCalendar}, {currentYear}
                      </h4>
                      <button
                        onClick={() => {
                          setSelectedDayInUserCalendar(null);
                          setTasksForSelectedDay([]);
                        }}
                        className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                      >
                        Clear selection
                      </button>
                    </div>
                    <div className="custom-scrollbar overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-muted border-b-2 border-border">
                            <th className="border-b-2 border-border px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Date</th>
                            <th className="border-b-2 border-border px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Client Name</th>
                            <th className="border-b-2 border-border px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Task Name</th>
                            <th className="border-b-2 border-border px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Start Time</th>
                            <th className="border-b-2 border-border px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">End Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-border">
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
                                <tr key={task.id || index} className="hover:bg-muted transition-colors">
                                  <td className="px-4 py-3 text-[13px] text-foreground whitespace-nowrap">
                                    {start ? start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                  </td>
                                  <td className="px-4 py-3 text-[13px] text-foreground">{task.clientName || '—'}</td>
                                  <td className="px-4 py-3 text-[13px] text-foreground">{task.taskDetail || task.activityName || '—'}</td>
                                  <td className="px-4 py-3 text-[13px] text-foreground whitespace-nowrap">
                                    {isMulti ? '09:00 AM' : start ? start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                                  </td>
                                  <td className="px-4 py-3 text-[13px] text-foreground whitespace-nowrap">
                                    {isMulti ? '05:00 PM' : end ? end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
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
            <div className={userCalendarViewMode === 'calendar' ? 'md:hidden' : ''}>
              {userCalendarEntries.length === 0 ? (
                <p className="py-12 text-center text-lg text-muted-foreground">
                  No tasks scheduled for this month
                </p>
              ) : (
                <div className="custom-scrollbar overflow-x-auto">
                  <table className="w-full min-w-full border-collapse">
                    <thead>
                      <tr className="bg-muted border-b-2 border-border">
                        <th className="border-b-2 border-border px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Date</th>
                        <th className="border-b-2 border-border px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Client Name</th>
                        <th className="border-b-2 border-border px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Task Name</th>
                        <th className="border-b-2 border-border px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Start</th>
                        <th className="border-b-2 border-border px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">End</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-border">
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
                            <tr key={task.id || index} className="hover:bg-muted transition-colors">
                              <td className="px-3 py-2.5 text-[13px] text-foreground whitespace-nowrap">
                                {start ? start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                              </td>
                              <td className="px-3 py-2.5 text-[13px] text-foreground">
                                <div className="max-w-[150px] truncate">{task.clientName || '—'}</div>
                              </td>
                              <td className="px-3 py-2.5 text-[13px] text-foreground">
                                <div className="max-w-[200px] truncate">{task.taskDetail || task.activityName || '—'}</div>
                              </td>
                              <td className="px-3 py-2.5 text-[13px] text-foreground whitespace-nowrap">
                                {isMulti ? '09:00 AM' : start ? start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                              </td>
                              <td className="px-3 py-2.5 text-[13px] text-foreground whitespace-nowrap">
                                {isMulti ? '05:00 PM' : end ? end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
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

          <div className="sticky bottom-0 border-t-2 border-border bg-card p-4">
            <Button onClick={handleCloseUserCalendarModal} className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

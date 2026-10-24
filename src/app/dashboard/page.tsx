'use client';

/**
 * OPTIMIZED Dashboard Page
 * Performance improvements applied:
 * - Lazy Firebase initialization
 * - Progressive hydration for charts
 * - Optimized data fetching with caching
 * - Task chunking for large datasets
 * - Proper loading states
 */

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { createPortal } from 'react-dom';
import {
  PlusCircleIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  CalendarIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { Task } from '@/types/task.types';
import { taskApi } from '@/services/task.api';
import { RecurringTask } from '@/services/recurring-task.service';
import DashboardFormEmbed from '@/components/dashboard/DashboardFormEmbed';
import { activityService } from '@/services/activity.service';
import { clientService, Client } from '@/services/client.service';
import { employeeService } from '@/services/employee.service';
import { pendingInvoiceService } from '@/services/pending-invoice.service';
import { leaveService } from '@/services/leave.service';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { useModal } from '@/contexts/modal-context';
import { getDbLazy, getAuthLazy, preloadFirebase } from '@/lib/firebase-optimized';
import { SimpleStatCard } from '@/components/dashboard/SimpleStatCard';
import { UpcomingDeadlines } from '@/components/dashboard/UpcomingDeadlines';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { WelcomeBanner } from '@/components/dashboard/WelcomeBanner';
import { KanbanCTA } from '@/components/dashboard/KanbanCTA';
import { AttendanceTrackingCard } from '@/components/dashboard/AttendanceTrackingCard';
import { PlanTaskModal } from '@/components/dashboard/PlanTaskModal';
import { ClientListModal } from '@/components/dashboard/ClientListModal';
import { TeamMembersModal } from '@/components/dashboard/TeamMembersModal';
import { DelegateTaskModal } from '@/components/dashboard/DelegateTaskModal';
import { ScheduleTaskModal } from '@/components/dashboard/ScheduleTaskModal';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { ProgressiveHydration, SkeletonLoader } from '@/components/ProgressiveHydration';
import { useOptimizedFetch, batchFetch } from '@/hooks/use-optimized-fetch';
import { useDeferredRender } from '@/hooks/use-deferred-value';
import { processInChunks } from '@/utils/chunk-tasks';
import { TaskReportModal } from '@/components/reports/TaskReportModal';
import { generateMonths } from '@/utils/report-utils';
import { ClientTaskCompletion } from '@/services/task-completion.service';
import type { DistributionRange } from '@/components/Charts/TaskDistributionChart';
import type { ProgressRange } from '@/components/Charts/WeeklyProgressChart';

// Lazy load heavy chart components with progressive hydration
const TaskDistributionChart = React.lazy(() => 
  import('@/components/Charts/TaskDistributionChart').then(m => ({ default: m.TaskDistributionChart }))
);
const WeeklyProgressChart = React.lazy(() => 
  import('@/components/Charts/WeeklyProgressChart').then(m => ({ default: m.WeeklyProgressChart }))
);
const TeamPerformanceChart = React.lazy(() => 
  import('@/components/Charts/TeamPerformanceChart').then(m => ({ default: m.TeamPerformanceChart }))
);

// Extended task type to include recurring tasks
interface DashboardTask extends Task {
  isRecurring?: boolean;
  recurrencePattern?: string;
  teamId?: string;
  contactIds?: string[]; // For recurring tasks
  teamMemberMappings?: Array<{
    userId: string;
    userName: string;
    clientIds: string[];
  }>;
}

// Helper function to get user name from Firestore (optimized with lazy loading)
async function getUserName(userId: string): Promise<string> {
  try {
    const db = await getDbLazy();
    const { doc, getDoc } = await import('firebase/firestore');
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.name || userData.displayName || userData.email || 'Unknown User';
    }
  } catch (error) {
    console.error('Error fetching user name:', error);
  }
  return 'Unknown User';
}

// Helper function to get client name from Firestore (optimized)
async function getClientName(clientId: string): Promise<string> {
  try {
    const client = await clientService.getById(clientId);
    if (client) {
      return client.clientName || client.businessName || 'Unknown Client';
    }
  } catch (error) {
    console.error('Error fetching client name:', error);
  }
  return 'Unknown Client';
}

export default function DashboardPage() {
  const { user, loading: authLoading, userProfile, isAdmin, isManager } = useEnhancedAuth();
  const router = useRouter();
  const { openModal, closeModal } = useModal();
  
  // State management
  const [showTaskTypeDialog, setShowTaskTypeDialog] = useState(false);
  const [showOverdueModal, setShowOverdueModal] = useState(false);
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [showAllTasksModal, setShowAllTasksModal] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [showInProgressModal, setShowInProgressModal] = useState(false);
  const [showPlanTaskModal, setShowPlanTaskModal] = useState(false);
  const [selectedTaskForPlanning, setSelectedTaskForPlanning] = useState<DashboardTask | null>(null);
  const [userNamesCache, setUserNamesCache] = useState<Record<string, string>>({});
  const [clientNamesCache, setClientNamesCache] = useState<Record<string, string>>({});
  const [showClientListModal, setShowClientListModal] = useState(false);
  const [selectedTaskForClients, setSelectedTaskForClients] = useState<DashboardTask | null>(null);
  const [showTeamMembersModal, setShowTeamMembersModal] = useState(false);
  const [selectedTaskForTeam, setSelectedTaskForTeam] = useState<DashboardTask | null>(null);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [selectedTaskForDelegate, setSelectedTaskForDelegate] = useState<DashboardTask | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedTaskForSchedule, setSelectedTaskForSchedule] = useState<DashboardTask | null>(null);
  const [showAllRecurringTasks, setShowAllRecurringTasks] = useState(false);

  // Completion stats and inline report modal
  const [taskCompletionStats, setTaskCompletionStats] = useState<Map<string, { completed: number; total: number }>>(new Map());
  const [selectedTaskForReport, setSelectedTaskForReport] = useState<DashboardTask | null>(null);
  const [showDashboardReportModal, setShowDashboardReportModal] = useState(false);
  const [reportModalClients, setReportModalClients] = useState<Client[]>([]);
  const [reportModalCompletions, setReportModalCompletions] = useState<ClientTaskCompletion[]>([]);
  const [reportModalLoading, setReportModalLoading] = useState(false);

  // Pending invoices count
  const [pendingInvoicesCount, setPendingInvoicesCount] = useState(0);
  
  // Pending leave approvals count
  const [pendingLeaveApprovalsCount, setPendingLeaveApprovalsCount] = useState(0);

  // Check if user is admin or manager
  const canViewAllTasks = isAdmin || isManager;

  // Card filter ranges
  const [distributionRange, setDistributionRange] = useState<DistributionRange>('week');
  const [weeklyRange, setWeeklyRange] = useState<ProgressRange>('week');

  // ✅ OPTIMIZATION: Preload Firebase during idle time
  useEffect(() => {
    preloadFirebase();
  }, []);

  // ✅ OPTIMIZATION: Memoize the non-recurring-tasks fetcher so its reference only changes
  // when the user UID changes — prevents stale cache hits from unauthenticated fetches.
  const nonRecurringTasksFetcher = React.useCallback(async () => {
    const auth = await getAuthLazy();
    const currentUser = auth.currentUser;
    if (!currentUser) return [];
    return taskApi.getTasks();
  }, [user?.uid]);

  // ✅ OPTIMIZATION: Use optimized fetch with caching for tasks
  // Key is user-specific to prevent serving one user's (empty) cache to another.
  const { data: nonRecurringTasks, loading: tasksLoading, error: tasksError } = useOptimizedFetch(
    user ? `dashboard-non-recurring-tasks-${user.uid}` : 'dashboard-non-recurring-tasks-anonymous',
    nonRecurringTasksFetcher,
    { cacheTime: user ? 5 * 60 * 1000 : 0, dedupe: true, retry: 3 }
  );

  // Memoize the recurring-tasks fetcher so its reference only changes when
  // the user UID changes — prevents unnecessary re-fetches on every render.
  const recurringTasksFetcher = React.useCallback(async () => {
    const auth = await getAuthLazy();
    const currentUser = auth.currentUser;
    if (!currentUser) return [];

    const token = await currentUser.getIdToken(false);
    const response = await fetch('/api/recurring-tasks', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      }
    });
    return response.ok ? response.json() : [];
  }, [user?.uid]); // only re-create when the uid actually changes

  // ✅ OPTIMIZATION: Fetch recurring tasks with optimized fetch
  // Key includes user uid so each user gets their own cache slot.
  // When user is null (auth not yet ready) we skip the fetch and return []
  // without poisoning any user-specific cache.
  const { data: recurringTasks, loading: recurringLoading } = useOptimizedFetch(
    user ? `dashboard-recurring-tasks-${user.uid}` : 'dashboard-recurring-tasks-anonymous',
    recurringTasksFetcher,
    // Don't cache the anonymous-user fetch; only cache when we have a real uid
    { cacheTime: user ? 5 * 60 * 1000 : 0, dedupe: true }
  );

  // ✅ OPTIMIZATION: Defer rendering of non-critical components
  const shouldRenderCharts = useDeferredRender(300);

  // ✅ OPTIMIZATION: Process tasks in chunks to avoid blocking
  const tasks = useMemo(() => {
    if (!nonRecurringTasks && !recurringTasks) return [];
    
    const allTasks: DashboardTask[] = [
      ...(nonRecurringTasks || []),
      ...(recurringTasks || []).map((task: RecurringTask) => {
        // For recurring tasks, extract user IDs from teamMemberMappings
        const assignedUserIds = task.teamMemberMappings?.map(mapping => mapping.userId) || [];
        
        return {
          ...task,
          isRecurring: true,
          assignedTo: assignedUserIds,
          // dueDate is already present in recurring tasks, no need to map
        };
      })
    ];
    
    return allTasks;
  }, [nonRecurringTasks, recurringTasks]);

  // Load user names for createdBy and assignedTo fields
  useEffect(() => {
    const loadUserNames = async () => {
      const userIds = new Set<string>();
      
      tasks.forEach(task => {
        if (task.createdBy) userIds.add(task.createdBy);
        if (task.assignedTo) {
          task.assignedTo.forEach(id => userIds.add(id));
        }
      });

      const names: Record<string, string> = {};
      await Promise.all(
        Array.from(userIds).map(async (userId) => {
          if (!userNamesCache[userId]) {
            names[userId] = await getUserName(userId);
          }
        })
      );

      if (Object.keys(names).length > 0) {
        setUserNamesCache(prev => ({ ...prev, ...names }));
      }
    };

    if (tasks.length > 0) {
      loadUserNames();
    }
  }, [tasks]);

  // Auto-fetch completion stats whenever tasks load so progress bars
  // appear regardless of which modal card the user opens first
  useEffect(() => {
    const hasRecurring = tasks.some(t => t.isRecurring && t.id);
    if (hasRecurring) {
      fetchCompletionStats();
    }
  }, [tasks]);

  // Helper to get user name from cache or fetch it
  const getCachedUserName = async (userId: string): Promise<string> => {
    if (userNamesCache[userId]) {
      return userNamesCache[userId];
    }
    const name = await getUserName(userId);
    setUserNamesCache(prev => ({ ...prev, [userId]: name }));
    return name;
  };

  // Helper to get client name from cache or fetch it
  const getCachedClientName = async (clientId: string): Promise<string> => {
    if (clientNamesCache[clientId]) {
      return clientNamesCache[clientId];
    }
    const name = await getClientName(clientId);
    setClientNamesCache(prev => ({ ...prev, [clientId]: name }));
    return name;
  };

  // Fetch current-period completion counts for all recurring tasks
  // Optimized: Use batch API and memoize with useCallback
  const fetchCompletionStats = React.useCallback(async () => {
    const recurringOnly = tasks.filter(t => t.isRecurring && t.id);
    if (recurringOnly.length === 0) return;

    const auth = await getAuthLazy();
    const token = await auth.currentUser?.getIdToken(false);
    if (!token) return;

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      // Use batch API to fetch all completion stats in 1-2 requests
      const taskIds = recurringOnly.map(t => t.id!);
      const res = await fetch('/api/task-completions/batch', {
        method: 'POST',
        headers,
        body: JSON.stringify({ taskIds })
      });

      if (!res.ok) {
        console.error('Failed to fetch batch completion stats');
        return;
      }

      const { stats } = await res.json();
      const newStats = new Map<string, { completed: number; total: number }>();

      // Process stats for each task
      recurringOnly.forEach(task => {
        if (!task.id || !stats[task.id]) return;

        const taskStats = stats[task.id];
        const months = generateMonths(task.recurrencePattern!);
        const currentPeriodKey = months[0]?.key;
        if (!currentPeriodKey) return;

        const completed = taskStats.completions.filter(
          (c: any) => c.isCompleted && c.monthKey === currentPeriodKey
        ).length;

        const hasTeamMapping = task.teamMemberMappings && task.teamMemberMappings.length > 0;
        const total = hasTeamMapping
          ? task.teamMemberMappings!.reduce((s: number, m: { clientIds: string[] }) => s + m.clientIds.length, 0)
          : (task.contactIds?.length || 0);

        newStats.set(task.id!, { completed, total });
      });

      setTaskCompletionStats(newStats);
    } catch (error) {
      console.error('Error fetching batch completion stats:', error);
    }
  }, [tasks]);

  // Trigger completion stats fetch only when recurring tasks change
  // Use useMemo to track only recurring tasks to avoid unnecessary refetches
  const recurringTaskIds = React.useMemo(() => {
    return tasks.filter(t => t.isRecurring && t.id).map(t => t.id).join(',');
  }, [tasks]);

  useEffect(() => {
    if (recurringTaskIds) {
      fetchCompletionStats();
    }
  }, [recurringTaskIds, fetchCompletionStats]);

  // Open inline report modal for a recurring task
  const openReportModal = async (task: DashboardTask) => {
    if (!task.id) return;
    setSelectedTaskForReport(task);
    setShowDashboardReportModal(true);
    setReportModalLoading(true);
    openModal();
    try {
      const auth = await getAuthLazy();
      const token = await auth.currentUser?.getIdToken(false);
      if (!token) return;
      const headers = { 'Authorization': `Bearer ${token}` };

      const [allClients, completionsRes] = await Promise.all([
        clientService.getAll(),
        fetch(`/api/task-completions?recurringTaskId=${task.id}`, { headers }),
      ]);

      const completions: ClientTaskCompletion[] = completionsRes.ok ? await completionsRes.json() : [];
      const hasTeamMapping = task.teamMemberMappings && task.teamMemberMappings.length > 0;
      const allMappedIds = hasTeamMapping
        ? new Set(task.teamMemberMappings!.flatMap((m: { clientIds: string[] }) => m.clientIds))
        : null;
      const filtered = (allClients as Client[]).filter((c: Client) => c.id &&
        (allMappedIds ? allMappedIds.has(c.id) : task.contactIds?.includes(c.id))
      );
      setReportModalClients(filtered);
      setReportModalCompletions(completions);
    } catch (error) {
      console.error('Error loading report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setReportModalLoading(false);
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch pending invoices count
  useEffect(() => {
    if (!user || !isAdmin || userProfile?.role !== 'admin') return;

    const fetchPendingInvoicesCount = async () => {
      try {
        const invoices = await pendingInvoiceService.getAll('pending');
        setPendingInvoicesCount(invoices.length);
      } catch (err) {
        console.error('Error fetching pending invoices count:', err);
      }
    };

    fetchPendingInvoicesCount();
  }, [user, isAdmin, userProfile]);

  // Fetch pending leave approvals count
  useEffect(() => {
    if (!user || (!isAdmin && !isManager)) return;

    const fetchPendingLeaveApprovalsCount = async () => {
      try {
        const leaveRequests = await leaveService.getAll({ status: 'pending' });
        
        // If manager, filter by hierarchy
        if (isManager && !isAdmin) {
          const { managerHierarchyService } = await import('@/services/manager-hierarchy.service');
          const hierarchy = await managerHierarchyService.getByManagerId(user.uid);
          
          if (hierarchy && hierarchy.employeeIds.length > 0) {
            // Filter leave requests for employees under this manager
            const filteredRequests = leaveRequests.filter(request => 
              hierarchy.employeeIds.includes(request.employeeId)
            );
            setPendingLeaveApprovalsCount(filteredRequests.length);
          } else {
            setPendingLeaveApprovalsCount(0);
          }
          return;
        }
        
        // If admin, show only:
        // 1. Leave requests from managers
        // 2. Leave requests from employees NOT assigned under any manager
        if (isAdmin) {
          const { managerHierarchyService } = await import('@/services/manager-hierarchy.service');
          const allHierarchies = await managerHierarchyService.getAll();
          
          // Get all employee IDs that are assigned under any manager
          const assignedEmployeeIds = new Set<string>();
          allHierarchies.forEach(hierarchy => {
            hierarchy.employeeIds.forEach(empId => assignedEmployeeIds.add(empId));
          });
          
          // Get all manager IDs
          const managerIds = new Set(allHierarchies.map(h => h.managerId));
          
          // Filter leave requests: show only managers or unassigned employees
          const filteredRequests = leaveRequests.filter(request => 
            managerIds.has(request.employeeId) || !assignedEmployeeIds.has(request.employeeId)
          );
          setPendingLeaveApprovalsCount(filteredRequests.length);
        }
      } catch (err) {
        console.error('Error fetching pending leave approvals count:', err);
      }
    };

    fetchPendingLeaveApprovalsCount();
  }, [user, isAdmin, isManager]);

  // Calculate stats (memoized)
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const todo = tasks.filter(t => t.status === 'pending').length;
    const now = new Date();
    const overdue = tasks.filter(t => 
      t.dueDate && 
      new Date(t.dueDate) < now && 
      t.status !== 'completed'
    ).length;
    
    return { total, completed, inProgress, todo, overdue };
  }, [tasks]);

  // Week-over-week change + 7-day sparkline for each stat card.
  const trends = useMemo(() => {
    const DAY = 24 * 60 * 60 * 1000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const within = (value: unknown, from: number, to: number) => {
      const time = new Date(value as string).getTime();
      return time >= from && time < to;
    };

    const daily = (match: (task: DashboardTask, from: number, to: number) => boolean) =>
      Array.from({ length: 14 }, (_, i) => {
        const from = today.getTime() - (13 - i) * DAY;
        return tasks.filter(task => match(task, from, from + DAY)).length;
      });

    const summarise = (series: number[]) => {
      const last = series.slice(7).reduce((a, b) => a + b, 0);
      const previous = series.slice(0, 7).reduce((a, b) => a + b, 0);
      const change = previous === 0 ? (last > 0 ? 100 : 0) : Math.round(((last - previous) / previous) * 100);
      return { change, spark: series.slice(7) };
    };

    return {
      total: summarise(daily((t, from, to) => within(t.createdAt, from, to))),
      completed: summarise(daily((t, from, to) => t.status === 'completed' && within(t.updatedAt, from, to))),
      inProgress: summarise(daily((t, from, to) => t.status === 'in-progress' && within(t.updatedAt, from, to))),
      todo: summarise(daily((t, from, to) => t.status === 'pending' && within(t.createdAt, from, to))),
      overdue: summarise(daily((t, from, to) => !!t.dueDate && t.status !== 'completed' && within(t.dueDate, from, to))),
    };
  }, [tasks]);

  // Task distribution scoped by the selected window (by creation date).
  const distribution = useMemo(() => {
    if (distributionRange === 'all') {
      return stats;
    }
    const days = distributionRange === 'week' ? 7 : 30;
    const from = Date.now() - days * 24 * 60 * 60 * 1000;
    const scoped = tasks.filter(t => new Date(t.createdAt).getTime() >= from);
    return {
      total: scoped.length,
      completed: scoped.filter(t => t.status === 'completed').length,
      inProgress: scoped.filter(t => t.status === 'in-progress').length,
      todo: scoped.filter(t => t.status === 'pending').length,
      overdue: stats.overdue,
    };
  }, [tasks, stats, distributionRange]);

  // Get filtered task lists (memoized)
  const overdueTasks = useMemo(() => {
    const now = new Date();
    return tasks.filter(task => 
      task.dueDate && 
      new Date(task.dueDate) < now && 
      task.status !== 'completed'
    ).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  }, [tasks]);

  // Fetch all employees
  const { data: employees, loading: employeesLoading } = useOptimizedFetch(
    'dashboard-employees',
    () => employeeService.getAll({ status: 'active' }),
    { cacheTime: 5 * 60 * 1000, dedupe: true }
  );

  // Fetch manager's assigned employees if user is a manager
  const { data: managerHierarchy } = useOptimizedFetch(
    `manager-hierarchy-${user?.uid}`,
    async () => {
      if (!user || !isManager || isAdmin) return null;
      const { managerHierarchyService } = await import('@/services/manager-hierarchy.service');
      return managerHierarchyService.getByManagerId(user.uid);
    },
    {
      cacheTime: 5 * 60 * 1000,
      dedupe: true
    }
  );

  // Calculate team performance data (memoized)
  // For admins: show all employees
  // For managers: show only assigned team members
  const teamPerformanceData = useMemo(() => {
    if (!employees || employees.length === 0) return [];

    // Deduplicate employees by ID to prevent React key errors
    const uniqueEmployees = Array.from(
      new Map(employees.map(emp => [emp.id, emp])).values()
    );

    // Filter employees based on role
    let filteredEmployees = uniqueEmployees;
    let assignedEmployeeIds: Set<string> | null = null;

    if (isAdmin) {
      // For admins, show ALL employees
      filteredEmployees = employees;
    } else if (isManager) {
      // For managers, only show assigned employees — if no hierarchy or no employees assigned, show nothing
      if (!managerHierarchy || !managerHierarchy.employeeIds?.length) return [];
      assignedEmployeeIds = new Set(managerHierarchy.employeeIds);
      filteredEmployees = employees.filter(emp => assignedEmployeeIds!.has(emp.id!));
    }

    // If no assigned employees, return empty array
    if (filteredEmployees.length === 0) {
      return [];
    }

    // Create a map to track task counts per employee
    const memberStats = new Map<string, { id: string; name: string; completed: number; inProgress: number; pending: number }>();

    // Initialize filtered employees with zero counts
    filteredEmployees.forEach(emp => {
      memberStats.set(emp.id!, {
        id: emp.id!,
        name: emp.name,
        completed: 0,
        inProgress: 0,
        pending: 0
      });
    });

    // Count tasks for each employee (only for assigned employees if manager)
    tasks.forEach(task => {
      if (task.assignedTo && task.assignedTo.length > 0) {
        task.assignedTo.forEach(userId => {
          // For managers, only count tasks for assigned employees
          if (isManager && !isAdmin && assignedEmployeeIds && !assignedEmployeeIds.has(userId)) {
            return; // Skip this user if not assigned to manager
          }
          
          if (memberStats.has(userId)) {
            const stats = memberStats.get(userId)!;
            if (task.status === 'completed') {
              stats.completed++;
            } else if (task.status === 'in-progress') {
              stats.inProgress++;
            } else if (task.status === 'pending' || task.status === 'todo') {
              stats.pending++;
            }
          }
        });
      }
    });

    return Array.from(memberStats.values())
      .map(stat => ({
        id: stat.id,
        name: stat.name,
        tasksCompleted: stat.completed,
        tasksInProgress: stat.inProgress,
        tasksPending: stat.pending
      }))
      .sort((a, b) => {
        const totalA = a.tasksCompleted + a.tasksInProgress + a.tasksPending;
        const totalB = b.tasksCompleted + b.tasksInProgress + b.tasksPending;
        return totalB - totalA;
      });
  }, [tasks, employees, isManager, isAdmin, managerHierarchy]);

  // Weekly progress data (current Mon–Sun week, or the last four such weeks)
  const weeklyProgressData = useMemo(() => {
    const now = new Date();
    const dayCount = weeklyRange === 'week' ? 7 : 28;
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const labels: string[] = [];
    const created: number[] = [];
    const completed: number[] = [];

    // Snap to the Monday of the current week, then walk back whole weeks.
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const rangeStart = new Date(weekStart);
    rangeStart.setDate(rangeStart.getDate() - (dayCount - 7));

    for (let i = 0; i < dayCount; i++) {
      const date = new Date(rangeStart);
      date.setDate(rangeStart.getDate() + i);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      labels.push(
        dayCount === 7
          ? daysOfWeek[date.getDay()]
          : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      );

      // Count tasks created on this day
      const createdCount = tasks.filter(task => {
        const taskDate = new Date(task.createdAt);
        return taskDate >= date && taskDate < nextDate;
      }).length;

      // Count tasks completed on this day
      const completedCount = tasks.filter(task => {
        if (task.status !== 'completed' || !task.updatedAt) return false;
        const taskDate = new Date(task.updatedAt);
        return taskDate >= date && taskDate < nextDate;
      }).length;

      created.push(createdCount);
      completed.push(completedCount);
    }

    return { labels, created, completed };
  }, [tasks, weeklyRange]);

  const todoTasks = useMemo(() => {
    return tasks.filter(task => task.status === 'pending')
      .sort((a, b) => {
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [tasks]);

  const completedTasks = useMemo(() => {
    return tasks.filter(task => task.status === 'completed')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [tasks]);

  const inProgressTasks = useMemo(() => {
    return tasks.filter(task => task.status === 'in-progress')
      .sort((a, b) => {
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [tasks]);

  // Loading state
  const loading = tasksLoading || recurringLoading;

  // Helper function to render recurring task action buttons
  const renderRecurringTaskActions = (task: DashboardTask) => {
    if (!task.isRecurring) {
      return null;
    }

    const hasTeamMemberMapping = task.teamMemberMappings && task.teamMemberMappings.length > 0;
    const hasTeamId = task.teamId && task.teamId.trim() !== '';
    const userMapping = user ? task.teamMemberMappings?.find(m => m.userId === user.uid) : null;
    
    // Get client count and IDs based on user role and assignment
    let clientCount = 0;
    let clientIds: string[] = [];
    
    if (hasTeamMemberMapping && userMapping) {
      // For team member mapped tasks, show only user's assigned clients
      clientCount = userMapping.clientIds.length;
      clientIds = userMapping.clientIds;
    } else if (!hasTeamMemberMapping && !hasTeamId) {
      // For regular tasks (no team assignment), show all contactIds
      clientCount = task.contactIds?.length || 0;
      clientIds = task.contactIds || [];
    } else if (hasTeamId && canViewAllTasks) {
      // For tasks assigned via teamId, admin/manager can see all clients
      clientCount = task.contactIds?.length || 0;
      clientIds = task.contactIds || [];
    }

    // Don't show any buttons if user has no clients assigned and is not admin/manager
    if (clientCount === 0 && !canViewAllTasks) {
      return null;
    }

    // Don't show buttons section at all if there are no buttons to show
    const hasClientsButton = clientCount > 0;
    const hasTeamButton = canViewAllTasks && (hasTeamMemberMapping || hasTeamId); // Show team button for admin/manager when task has team member mappings OR teamId
    const hasPlanButton = (userMapping || (!hasTeamMemberMapping && !hasTeamId)) && clientCount > 0; // Show Plan button only if user is mapped OR task has no team assignment

    // Delegate button: visible to all users who have been assigned via team member mapping
    const hasDelegateButton = hasTeamMemberMapping && (userMapping || canViewAllTasks) && clientCount > 0;

    // Schedule button: visible only to managers if the task has team member mappings
    const hasScheduleButton = isManager && hasTeamMemberMapping;

    const hasViewReportButton = task.isRecurring && (task.createdBy === user?.uid || canViewAllTasks);
    const hasGoToReportsButton = isManager && task.isRecurring;

    if (!hasClientsButton && !hasTeamButton && !hasPlanButton && !hasDelegateButton && !hasScheduleButton && !hasViewReportButton && !hasGoToReportsButton) {
      return null;
    }

    const completionStats = taskCompletionStats.get(task.id!);
    const completionPct = completionStats && completionStats.total > 0
      ? Math.round((completionStats.completed / completionStats.total) * 100)
      : 0;

    return (
      <>
        {/* Completion progress bar — task creator or admin/manager */}
        {hasViewReportButton && completionStats && (
          <div className="mt-3 pt-3 border-t border-white/60 dark:border-white/10">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {completionStats.completed}/{completionStats.total} clients completed ({completionPct}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        )}

      <div className="mt-3 pt-3 border-t border-white/60 dark:border-white/10 flex flex-wrap gap-2">
        {/* Clients Button - Show client count for user's assigned clients */}
        {hasClientsButton && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTaskForClients(task);
              setShowClientListModal(true);
              openModal(); // Hide header when modal opens
            }}
            className="px-3 py-1.5 text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 rounded-md transition-colors flex items-center gap-1 min-h-[35px]"
          >
            <UserGroupIcon className="w-4 h-4" />
            Clients ({clientCount})
          </button>
        )}

        {/* Team Button - Show for admin/manager when task has team member mappings or teamId */}
        {hasTeamButton && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTaskForTeam(task);
              setShowTeamMembersModal(true);
              openModal(); // Hide header when modal opens
            }}
            className="px-3 py-1.5 text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 rounded-md transition-colors flex items-center gap-1 min-h-[35px]"
          >
            <UserGroupIcon className="w-4 h-4" />
            Team {hasTeamMemberMapping ? `(${task.teamMemberMappings?.length || 0})` : ''}
          </button>
        )}

        {/* Plan Button - Show if user is assigned and has clients */}
        {hasPlanButton && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTaskForPlanning(task);
              setShowPlanTaskModal(true);
              openModal(); // Hide header when modal opens
            }}
            className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 rounded-md transition-colors flex items-center gap-1 min-h-[35px]"
          >
            <CalendarIcon className="w-4 h-4" />
            Plan
          </button>
        )}

        {/* Delegate Button - Show to all assigned users */}
        {hasDelegateButton && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTaskForDelegate(task);
              setShowDelegateModal(true);
              openModal();
            }}
            className="px-3 py-1.5 text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/50 rounded-md transition-colors flex items-center gap-1 min-h-[35px]"
          >
            <ArrowRightIcon className="w-4 h-4" />
            Delegate
          </button>
        )}

        {/* Schedule Button - Show only to managers */}
        {hasScheduleButton && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTaskForSchedule(task);
              setShowScheduleModal(true);
              openModal();
            }}
            className="px-3 py-1.5 text-xs font-medium bg-teal-100 text-teal-700 hover:bg-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-900/50 rounded-md transition-colors flex items-center gap-1 min-h-[35px]"
          >
            <CalendarDaysIcon className="w-4 h-4" />
            Schedule
          </button>
        )}

        {/* View Report Button — task creator or admin/manager */}
        {hasViewReportButton && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openReportModal(task);
            }}
            className="px-3 py-1.5 text-xs font-medium bg-cyan-100 text-cyan-700 hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:hover:bg-cyan-900/50 rounded-md transition-colors flex items-center gap-1 min-h-[35px]"
          >
            <ChartBarIcon className="w-4 h-4" />
            View Report
          </button>
        )}

        {/* Go to Reports Button — managers only */}
        {hasGoToReportsButton && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push('/reports');
            }}
            className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors flex items-center gap-1 min-h-[35px]"
          >
            <ArrowRightIcon className="w-4 h-4" />
            Go to Reports
          </button>
        )}
      </div>
      </>
    );
  };

  // Helper function to render assigned to text based on user role
  const renderAssignedTo = (task: DashboardTask) => {
    if (!task.assignedTo || task.assignedTo.length === 0) {
      return null;
    }

    // Admin/Manager see all assigned users
    if (canViewAllTasks) {
      return task.assignedTo.map(id => userNamesCache[id] || 'Loading...').join(', ');
    }

    // Employees only see their own name if they're assigned
    if (user && task.assignedTo.includes(user.uid)) {
      return userNamesCache[user.uid] || 'You';
    }

    return null;
  };

  if (authLoading) {
    return (
      <div className="p-6">
        <SkeletonLoader className="h-screen w-full" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonLoader className="h-32 w-full" />
        <SkeletonLoader className="h-64 w-full" />
        <SkeletonLoader className="h-64 w-full" />
      </div>
    );
  }

  if (tasksError) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 text-red-800 rounded">
          Error loading dashboard: {tasksError.message}
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate flex flex-col gap-4 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#EEF2FF] via-white to-[#F5F3FF] p-4 dark:from-[#060B18] dark:via-[#080F22] dark:to-[#0B1430] sm:p-6 xl:gap-5">
      {/* Ambient gradient wash — `overflow-clip` (not hidden) so the decorative
          blobs cannot extend the page's scrollable area in any direction */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-clip">
        <div className="absolute -left-24 -top-28 h-80 w-80 rounded-full bg-[#0447FD]/20 blur-3xl dark:bg-[#0447FD]/25" />
        <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-[#7F1BFF]/20 blur-3xl dark:bg-[#7F1BFF]/25" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-[#22D3EE]/15 blur-3xl" />
      </div>

      <WelcomeBanner
        name={userProfile?.displayName || user?.email?.split('@')[0] || 'there'}
      />

      {/* Stats Cards - Critical, render immediately */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
        <SimpleStatCard
          title="Total Tasks"
          mobileTitle="Total"
          value={stats.total}
          trend={trends.total}
          variant="glass"
          onClick={() => {
            setShowAllTasksModal(true);
            openModal(); // Open modal context to hide header
            fetchCompletionStats();
          }}
        />
        <SimpleStatCard
          title="Completed"
          mobileTitle="Done"
          value={stats.completed}
          color="green"
          trend={trends.completed}
          variant="glass"
          onClick={() => {
            setShowCompletedModal(true);
            openModal();
          }}
        />
        <SimpleStatCard
          title="In Progress"
          mobileTitle="Active"
          value={stats.inProgress}
          color="orange"
          trend={trends.inProgress}
          variant="glass"
          onClick={() => {
            setShowInProgressModal(true);
            openModal();
          }}
        />
        <SimpleStatCard
          title="To Do"
          value={stats.todo}
          color="purple"
          trend={trends.todo}
          variant="glass"
          onClick={() => {
            setShowTodoModal(true);
            openModal();
          }}
        />
        {/* Trailing 5th card fills the last row on the 2-column mobile grid */}
        <div className="col-span-2 sm:col-span-1">
          <SimpleStatCard
            title="Overdue"
            mobileTitle="Late"
            value={stats.overdue}
            color="red"
            trend={trends.overdue}
            variant="glass"
            onClick={() => {
              setShowOverdueModal(true);
              openModal();
            }}
          />
        </div>
      </div>

      {/* MIS Form Embed (only renders when forms are assigned) */}
      <DashboardFormEmbed />

      {/* Kanban CTA + Attendance */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-6">
          <KanbanCTA />
        </div>
        <div className="xl:col-span-6">
          <AttendanceTrackingCard userId={user?.uid} />
        </div>
      </div>

      {/* ✅ OPTIMIZATION: Charts load progressively */}
      {/* Distribution / Deadlines / Quick Actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
        {shouldRenderCharts && canViewAllTasks && (
          <div className="xl:col-span-4">
            <ProgressiveHydration
              delay={200}
              priority="low"
              fallback={<SkeletonLoader className="h-full min-h-[250px] w-full rounded-2xl" />}
            >
              <Suspense fallback={<SkeletonLoader className="h-full min-h-[250px] w-full rounded-2xl" />}>
                <TaskDistributionChart
                  completed={distribution.completed}
                  inProgress={distribution.inProgress}
                  todo={distribution.todo}
                  total={distribution.total}
                  range={distributionRange}
                  onRangeChange={setDistributionRange}
                />
              </Suspense>
            </ProgressiveHydration>
          </div>
        )}

        <div className={`md:col-span-1 ${canViewAllTasks ? 'xl:col-span-4' : 'md:col-span-2 xl:col-span-8'}`}>
          <UpcomingDeadlines tasks={tasks} onTaskClick={(taskId) => {
            const task = tasks.find(t => t.id === taskId);
            if (task) {
              router.push(`/tasks/${task.isRecurring ? 'recurring' : 'non-recurring'}`);
            }
          }} />
        </div>

        {canViewAllTasks && (
          <div className="md:col-span-2 xl:col-span-4">
            <QuickActions
              onCreateTask={() => {
                setShowTaskTypeDialog(true);
                openModal(); // Hide header when modal opens
              }}
              isAdminOrManager={canViewAllTasks}
              isManager={isManager}
              isAdmin={isAdmin}
              pendingInvoicesCount={pendingInvoicesCount}
              pendingLeaveApprovalsCount={pendingLeaveApprovalsCount}
            />
          </div>
        )}
      </div>

      {/* Team Performance + Weekly Progress */}
      {shouldRenderCharts && canViewAllTasks && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <ProgressiveHydration
              delay={300}
              priority="low"
              fallback={<SkeletonLoader className="h-full min-h-[250px] w-full rounded-2xl" />}
            >
              <Suspense fallback={<SkeletonLoader className="h-full min-h-[250px] w-full rounded-2xl" />}>
                <TeamPerformanceChart teamMembers={teamPerformanceData} />
              </Suspense>
            </ProgressiveHydration>
          </div>

          <div className="xl:col-span-5">
            <ProgressiveHydration
              delay={350}
              priority="low"
              fallback={<SkeletonLoader className="h-full min-h-[250px] w-full rounded-2xl" />}
            >
              <Suspense fallback={<SkeletonLoader className="h-full min-h-[250px] w-full rounded-2xl" />}>
                <WeeklyProgressChart
                  data={weeklyProgressData}
                  range={weeklyRange}
                  onRangeChange={setWeeklyRange}
                />
              </Suspense>
            </ProgressiveHydration>
          </div>
        </div>
      )}

      {/* Modals - Only render when needed */}
      {showTaskTypeDialog && (
        <div 
          className="fixed inset-0 !mt-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onClick={() => {
            setShowTaskTypeDialog(false);
            closeModal(); // Close modal context to show header
          }}
        >
          <div 
            className="w-full max-w-md rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0B1430]/90"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Choose Task Type
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowTaskTypeDialog(false);
                  closeModal(); // Close modal context to show header
                  router.push('/tasks/non-recurring');
                }}
                className="w-full rounded-2xl border border-slate-200/70 bg-white/50 p-4 text-left transition-all hover:border-indigo-300 hover:bg-white/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-indigo-400/40 dark:hover:bg-white/[0.06]"
              >
                <h4 className="font-semibold">Non-Recurring Task</h4>
                <p className="text-sm text-gray-600">One-time task with a single due date</p>
              </button>
              <button
                onClick={() => {
                  setShowTaskTypeDialog(false);
                  closeModal(); // Close modal context to show header
                  router.push('/tasks/recurring');
                }}
                className="w-full rounded-2xl border border-slate-200/70 bg-white/50 p-4 text-left transition-all hover:border-emerald-300 hover:bg-white/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-emerald-400/40 dark:hover:bg-white/[0.06]"
              >
                <h4 className="font-semibold">Recurring Task</h4>
                <p className="text-sm text-gray-600">Task that repeats on a schedule</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Tasks Modal */}
      {showAllTasksModal && (
        <div 
          className="fixed inset-0 !mt-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onClick={() => {
            setShowAllTasksModal(false);
            closeModal(); // Close modal context to show header
          }}
        >
          <div 
            className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0B1430]/90"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/60 dark:border-white/10">
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="p-1.5 sm:p-2 bg-blue-600 rounded-lg flex-shrink-0">
                    <ClipboardDocumentListIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                      All Tasks
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      <span className="hidden sm:inline">
                        {tasks.length} total tasks • {stats.completed} completed • {stats.inProgress} in progress • {stats.todo} pending
                      </span>
                      <span className="sm:hidden truncate block">
                        {tasks.length} total • {stats.completed} done • {stats.inProgress} active • {stats.todo} pending
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAllTasksModal(false);
                    closeModal(); // Close modal context to show header
                  }}
                  className="flex-shrink-0 rounded-lg p-1.5 transition-colors hover:bg-white/70 dark:hover:bg-white/10 sm:p-2"
                  aria-label="Close modal"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 dark:text-gray-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 p-4 overflow-y-auto">
              {tasks.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No tasks found
                </p>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => {
                    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                    const now = new Date();
                    const isOverdue = dueDate && dueDate < now && task.status !== 'completed';
                    const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                    
                    // For completed tasks, show relative completion time
                    const getCompletedTimeText = () => {
                      if (task.status !== 'completed' || !daysUntilDue) return null;
                      const daysPast = Math.abs(daysUntilDue);
                      if (daysPast === 0) return 'today';
                      if (daysPast === 1) return '1 day ago';
                      return `${daysPast} days ago`;
                    };
                    
                    return (
                      <div
                        key={task.id}
                        className={`p-4 border-2 rounded-lg transition-colors cursor-pointer hover:border-blue-300 ${
                          task.status === 'pending' ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10' :
                          task.status === 'in-progress' ? 'border-orange-200 bg-orange-50 dark:bg-orange-900/10' :
                          'border-green-200 bg-green-50 dark:bg-green-900/10'
                        }`}
                        onClick={() => router.push(`/tasks/${task.isRecurring ? 'recurring' : 'non-recurring'}`)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-900 dark:text-white">{task.title}</h4>
                              </div>
                              {dueDate && task.status !== 'completed' && (
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <div className={`px-2 sm:px-3 py-0.5 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap ${
                                    isOverdue ? 'bg-red-600 text-white' :
                                    daysUntilDue === 0 ? 'bg-orange-600 text-white' :
                                    daysUntilDue === 1 ? 'bg-red-600 text-white' :
                                    'bg-blue-600 text-white'
                                  }`}>
                                    {isOverdue ? `${Math.abs(daysUntilDue!)} days overdue` :
                                     daysUntilDue === 0 ? 'Due today' :
                                     daysUntilDue === 1 ? 'Due tomorrow' :
                                     `${daysUntilDue} days`}
                                  </div>
                                </div>
                              )}
                              {task.status === 'completed' && getCompletedTimeText() && (
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <div className="px-2 sm:px-3 py-0.5 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap bg-blue-600 text-white">
                                    {getCompletedTimeText()}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className={`px-2 py-0.5 rounded-full font-medium ${
                                task.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                task.status === 'in-progress' ? 'bg-orange-100 text-orange-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {task.status === 'pending' ? 'Pending' : task.status === 'in-progress' ? 'In Progress' : 'Completed'}
                              </span>
                              <span className="px-2 py-0.5 bg-white/70 dark:bg-white/10 rounded-full font-medium text-gray-600 dark:text-gray-400">
                                {task.priority || 'medium'}
                              </span>
                              {dueDate && (
                                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                  <ClockIcon className="w-3.5 h-3.5" />
                                  {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                              {task.isRecurring && (
                                <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full font-medium">
                                  Recurring
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mt-2 pt-2 border-t border-white/60 dark:border-white/10">
                              {task.createdBy && (
                                <span className="flex items-center gap-0.5 sm:gap-1 whitespace-nowrap overflow-hidden">
                                  <span className="font-medium flex-shrink-0">Created By:</span>
                                  <span className="text-gray-900 dark:text-white truncate">{userNamesCache[task.createdBy] || 'Loading...'}</span>
                                </span>
                              )}
                              {task.assignedTo && task.assignedTo.length > 0 && renderAssignedTo(task) && (
                                <span className="flex items-center gap-0.5 sm:gap-1 min-w-0 overflow-hidden whitespace-nowrap">
                                  <span className="font-medium flex-shrink-0">Assigned To:</span>
                                  <span className="text-gray-900 dark:text-white truncate">
                                    {renderAssignedTo(task)}
                                  </span>
                                </span>
                              )}
                            </div>
                            {renderRecurringTaskActions(task)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Completed Tasks Modal */}
      {showCompletedModal && (
        <div 
          className="fixed inset-0 !mt-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onClick={() => {
            setShowCompletedModal(false);
            closeModal();
          }}
        >
          <div 
            className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0B1430]/90"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/60 dark:border-white/10">
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="p-1.5 sm:p-2 bg-green-600 rounded-lg flex-shrink-0">
                    <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                      Completed Tasks
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      <span className="truncate block">
                        {completedTasks.length} completed {completedTasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCompletedModal(false);
                    closeModal();
                  }}
                  className="flex-shrink-0 rounded-lg p-1.5 transition-colors hover:bg-white/70 dark:hover:bg-white/10 sm:p-2"
                  aria-label="Close modal"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 dark:text-gray-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 p-4 overflow-y-auto">
              {completedTasks.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No completed tasks
                </p>
              ) : (
                <div className="space-y-3">
                  {completedTasks.map((task) => {
                    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                    
                    return (
                      <div
                        key={task.id}
                        className="p-4 border-2 rounded-lg transition-colors cursor-pointer hover:border-blue-300 border-green-200 bg-green-50 dark:bg-green-900/10"
                        onClick={() => router.push(`/tasks/${task.isRecurring ? 'recurring' : 'non-recurring'}`)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-900 dark:text-white">{task.title}</h4>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                                Completed
                              </span>
                              <span className="px-2 py-0.5 bg-white/70 dark:bg-white/10 rounded-full font-medium text-gray-600 dark:text-gray-400">
                                {task.priority || 'medium'}
                              </span>
                              {dueDate && (
                                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                  <ClockIcon className="w-3.5 h-3.5" />
                                  {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                              {task.isRecurring && (
                                <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full font-medium">
                                  Recurring
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mt-2 pt-2 border-t border-white/60 dark:border-white/10">
                              {task.createdBy && (
                                <span className="flex items-center gap-0.5 sm:gap-1 whitespace-nowrap overflow-hidden">
                                  <span className="font-medium flex-shrink-0">Created By:</span>
                                  <span className="text-gray-900 dark:text-white truncate">{userNamesCache[task.createdBy] || 'Loading...'}</span>
                                </span>
                              )}
                              {task.assignedTo && task.assignedTo.length > 0 && renderAssignedTo(task) && (
                                <span className="flex items-center gap-0.5 sm:gap-1 min-w-0 overflow-hidden whitespace-nowrap">
                                  <span className="font-medium flex-shrink-0">Assigned To:</span>
                                  <span className="text-gray-900 dark:text-white truncate">
                                    {renderAssignedTo(task)}
                                  </span>
                                </span>
                              )}
                            </div>
                            {renderRecurringTaskActions(task)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* In Progress Tasks Modal */}
      {showInProgressModal && (
        <div 
          className="fixed inset-0 !mt-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onClick={() => {
            setShowInProgressModal(false);
            closeModal();
          }}
        >
          <div 
            className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0B1430]/90"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/60 dark:border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                  In Progress Tasks ({inProgressTasks.length})
                </h3>
                <button
                  onClick={() => {
                    setShowInProgressModal(false);
                    closeModal();
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 p-4 overflow-y-auto">
              {inProgressTasks.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No tasks in progress
                </p>
              ) : (
                <div className="space-y-3">
                  {inProgressTasks.map((task) => {
                    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                    const now = new Date();
                    const isOverdue = dueDate && dueDate < now;
                    const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                    
                    return (
                      <div
                        key={task.id}
                        className="p-4 border-2 rounded-lg transition-colors cursor-pointer hover:border-blue-300 border-orange-200 bg-orange-50 dark:bg-orange-900/10"
                        onClick={() => router.push(`/tasks/${task.isRecurring ? 'recurring' : 'non-recurring'}`)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-900 dark:text-white">{task.title}</h4>
                              </div>
                              {dueDate && (
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <div className={`px-2 sm:px-3 py-0.5 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap ${
                                    isOverdue ? 'bg-red-600 text-white' :
                                    daysUntilDue === 0 ? 'bg-orange-600 text-white' :
                                    daysUntilDue === 1 ? 'bg-red-600 text-white' :
                                    'bg-blue-600 text-white'
                                  }`}>
                                    {isOverdue ? `${Math.abs(daysUntilDue!)} days overdue` :
                                     daysUntilDue === 0 ? 'Due today' :
                                     daysUntilDue === 1 ? 'Due tomorrow' :
                                     `${daysUntilDue} days`}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700">
                                In Progress
                              </span>
                              <span className="px-2 py-0.5 bg-white/70 dark:bg-white/10 rounded-full font-medium text-gray-600 dark:text-gray-400">
                                {task.priority || 'medium'}
                              </span>
                              {dueDate && (
                                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                  <ClockIcon className="w-3.5 h-3.5" />
                                  {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                              {task.isRecurring && (
                                <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full font-medium">
                                  Recurring
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mt-2 pt-2 border-t border-white/60 dark:border-white/10">
                              {task.createdBy && (
                                <span className="flex items-center gap-0.5 sm:gap-1 whitespace-nowrap overflow-hidden">
                                  <span className="font-medium flex-shrink-0">Created By:</span>
                                  <span className="text-gray-900 dark:text-white truncate">{userNamesCache[task.createdBy] || 'Loading...'}</span>
                                </span>
                              )}
                              {task.assignedTo && task.assignedTo.length > 0 && renderAssignedTo(task) && (
                                <span className="flex items-center gap-0.5 sm:gap-1 min-w-0 overflow-hidden whitespace-nowrap">
                                  <span className="font-medium flex-shrink-0">Assigned To:</span>
                                  <span className="text-gray-900 dark:text-white truncate">
                                    {renderAssignedTo(task)}
                                  </span>
                                </span>
                              )}
                            </div>
                            {renderRecurringTaskActions(task)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* To Do Tasks Modal */}
      {showTodoModal && (
        <div 
          className="fixed inset-0 !mt-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onClick={() => {
            setShowTodoModal(false);
            closeModal();
          }}
        >
          <div 
            className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0B1430]/90"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/60 dark:border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <PlusCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  To Do Tasks ({todoTasks.length})
                </h3>
                <button
                  onClick={() => {
                    setShowTodoModal(false);
                    closeModal();
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 p-4 overflow-y-auto">
              {todoTasks.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No pending tasks
                </p>
              ) : (
                <div className="space-y-3">
                  {todoTasks.map((task) => {
                    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                    const now = new Date();
                    const isOverdue = dueDate && dueDate < now;
                    const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                    
                    return (
                      <div
                        key={task.id}
                        className="p-4 border-2 rounded-lg transition-colors cursor-pointer hover:border-blue-300 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10"
                        onClick={() => router.push(`/tasks/${task.isRecurring ? 'recurring' : 'non-recurring'}`)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-900 dark:text-white">{task.title}</h4>
                              </div>
                              {dueDate && (
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <div className={`px-2 sm:px-3 py-0.5 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap ${
                                    isOverdue ? 'bg-red-600 text-white' :
                                    daysUntilDue === 0 ? 'bg-orange-600 text-white' :
                                    daysUntilDue === 1 ? 'bg-red-600 text-white' :
                                    'bg-blue-600 text-white'
                                  }`}>
                                    {isOverdue ? `${Math.abs(daysUntilDue!)} days overdue` :
                                     daysUntilDue === 0 ? 'Due today' :
                                     daysUntilDue === 1 ? 'Due tomorrow' :
                                     `${daysUntilDue} days`}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700">
                                Pending
                              </span>
                              <span className="px-2 py-0.5 bg-white/70 dark:bg-white/10 rounded-full font-medium text-gray-600 dark:text-gray-400">
                                {task.priority || 'medium'}
                              </span>
                              {dueDate && (
                                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                  <ClockIcon className="w-3.5 h-3.5" />
                                  {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                              {task.isRecurring && (
                                <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full font-medium">
                                  Recurring
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mt-2 pt-2 border-t border-white/60 dark:border-white/10">
                              {task.createdBy && (
                                <span className="flex items-center gap-0.5 sm:gap-1 whitespace-nowrap overflow-hidden">
                                  <span className="font-medium flex-shrink-0">Created By:</span>
                                  <span className="text-gray-900 dark:text-white truncate">{userNamesCache[task.createdBy] || 'Loading...'}</span>
                                </span>
                              )}
                              {task.assignedTo && task.assignedTo.length > 0 && renderAssignedTo(task) && (
                                <span className="flex items-center gap-0.5 sm:gap-1 min-w-0 overflow-hidden whitespace-nowrap">
                                  <span className="font-medium flex-shrink-0">Assigned To:</span>
                                  <span className="text-gray-900 dark:text-white truncate">
                                    {renderAssignedTo(task)}
                                  </span>
                                </span>
                              )}
                            </div>
                            {renderRecurringTaskActions(task)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overdue Tasks Modal */}
      {showOverdueModal && (
        <div 
          className="fixed inset-0 !mt-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onClick={() => {
            setShowOverdueModal(false);
            closeModal();
          }}
        >
          <div 
            className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0B1430]/90"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/60 dark:border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                  Overdue Tasks ({overdueTasks.length})
                </h3>
                <button
                  onClick={() => {
                    setShowOverdueModal(false);
                    closeModal();
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 p-4 overflow-y-auto">
              {overdueTasks.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No overdue tasks
                </p>
              ) : (
                <div className="space-y-3">
                  {overdueTasks.map((task) => {
                    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                    const now = new Date();
                    const daysOverdue = dueDate ? Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                    
                    return (
                      <div
                        key={task.id}
                        className="p-4 border-2 rounded-lg transition-colors cursor-pointer hover:border-blue-300 border-red-200 bg-red-50 dark:bg-red-900/10"
                        onClick={() => router.push(`/tasks/${task.isRecurring ? 'recurring' : 'non-recurring'}`)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-900 dark:text-white">{task.title}</h4>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="px-2 sm:px-3 py-0.5 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap bg-red-600 text-white">
                                  {daysOverdue} days overdue
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className={`px-2 py-0.5 rounded-full font-medium ${
                                task.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {task.status === 'pending' ? 'Pending' : 'In Progress'}
                              </span>
                              <span className="px-2 py-0.5 bg-white/70 dark:bg-white/10 rounded-full font-medium text-gray-600 dark:text-gray-400">
                                {task.priority || 'medium'}
                              </span>
                              {dueDate && (
                                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                  <ClockIcon className="w-3.5 h-3.5" />
                                  {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                              {task.isRecurring && (
                                <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full font-medium">
                                  Recurring
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mt-2 pt-2 border-t border-white/60 dark:border-white/10">
                              {task.createdBy && (
                                <span className="flex items-center gap-0.5 sm:gap-1 whitespace-nowrap overflow-hidden">
                                  <span className="font-medium flex-shrink-0">Created By:</span>
                                  <span className="text-gray-900 dark:text-white truncate">{userNamesCache[task.createdBy] || 'Loading...'}</span>
                                </span>
                              )}
                              {task.assignedTo && task.assignedTo.length > 0 && renderAssignedTo(task) && (
                                <span className="flex items-center gap-0.5 sm:gap-1 min-w-0 overflow-hidden whitespace-nowrap">
                                  <span className="font-medium flex-shrink-0">Assigned To:</span>
                                  <span className="text-gray-900 dark:text-white truncate">
                                    {renderAssignedTo(task)}
                                  </span>
                                </span>
                              )}
                            </div>
                            {renderRecurringTaskActions(task)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Plan Task Modal */}
      {showPlanTaskModal && selectedTaskForPlanning && (
        <PlanTaskModal
          isOpen={showPlanTaskModal}
          onClose={() => {
            setShowPlanTaskModal(false);
            setSelectedTaskForPlanning(null);
            closeModal(); // Close modal context to show header
          }}
          assignedClientIds={
            selectedTaskForPlanning.teamMemberMappings
              ?.find(m => m.userId === user?.uid)
              ?.clientIds || []
          }
          userId={user?.uid || ''}
          userName={userProfile?.displayName || user?.email || 'Unknown User'}
          taskTitle={selectedTaskForPlanning.title}
          recurringTaskId={selectedTaskForPlanning.id}
        />
      )}

      {/* Client List Modal */}
      {showClientListModal && selectedTaskForClients && (
        <ClientListModal
          isOpen={showClientListModal}
          onClose={() => {
            setShowClientListModal(false);
            setSelectedTaskForClients(null);
            closeModal(); // Close modal context to show header
          }}
          taskTitle={selectedTaskForClients.title}
          clientIds={
            selectedTaskForClients.teamMemberMappings && user
              ? selectedTaskForClients.teamMemberMappings.find(m => m.userId === user.uid)?.clientIds || selectedTaskForClients.contactIds || []
              : selectedTaskForClients.contactIds || []
          }
          isTeamMemberMapping={!!selectedTaskForClients.teamMemberMappings && selectedTaskForClients.teamMemberMappings.length > 0}
          teamMemberName={
            selectedTaskForClients.teamMemberMappings && user
              ? selectedTaskForClients.teamMemberMappings.find(m => m.userId === user.uid)?.userName
              : undefined
          }
        />
      )}

      {/* Team Members Modal */}
      {showTeamMembersModal && selectedTaskForTeam && (
        <TeamMembersModal
          isOpen={showTeamMembersModal}
          onClose={() => {
            setShowTeamMembersModal(false);
            setSelectedTaskForTeam(null);
            closeModal(); // Close modal context to show header
          }}
          taskTitle={selectedTaskForTeam.title}
          teamMembers={selectedTaskForTeam.teamMemberMappings || []}
          teamId={selectedTaskForTeam.teamId}
        />
      )}

      {/* Delegate Task Modal */}
      {showDelegateModal && selectedTaskForDelegate && (
        <DelegateTaskModal
          isOpen={showDelegateModal}
          onClose={() => {
            setShowDelegateModal(false);
            setSelectedTaskForDelegate(null);
            closeModal();
          }}
          taskId={selectedTaskForDelegate.id || ''}
          taskTitle={selectedTaskForDelegate.title}
          currentUserId={user?.uid || ''}
          currentUserName={userProfile?.displayName || user?.email || 'Unknown User'}
          currentUserRole={isAdmin ? 'admin' : isManager ? 'manager' : 'employee'}
          assignedClientIds={
            selectedTaskForDelegate.teamMemberMappings
              ?.find(m => m.userId === user?.uid)
              ?.clientIds || selectedTaskForDelegate.contactIds || []
          }
          teamMemberMappings={selectedTaskForDelegate.teamMemberMappings}
          onDelegated={() => {
            // Refresh tasks to show updated delegation
            window.location.reload();
          }}
        />
      )}

      {/* Schedule Task Modal (Manager only) */}
      {showScheduleModal && selectedTaskForSchedule && (
        <ScheduleTaskModal
          isOpen={showScheduleModal}
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedTaskForSchedule(null);
            closeModal();
          }}
          taskId={selectedTaskForSchedule.id || ''}
          taskTitle={selectedTaskForSchedule.title}
          currentUserId={user?.uid || ''}
          teamMemberMappings={selectedTaskForSchedule.teamMemberMappings}
          contactIds={selectedTaskForSchedule.contactIds}
          onScheduled={() => {
            toast.success('Schedule saved successfully!');
          }}
        />
      )}

      {/* Inline Report Modal */}
      {showDashboardReportModal && selectedTaskForReport && createPortal(
        reportModalLoading ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/70 bg-white/85 p-8 backdrop-blur-2xl dark:border-white/10 dark:bg-[#0B1430]/90">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Loading report...</span>
            </div>
          </div>
        ) : (
          <TaskReportModal
            task={selectedTaskForReport as unknown as RecurringTask}
            clients={reportModalClients}
            completions={reportModalCompletions}
            onClose={() => {
              setShowDashboardReportModal(false);
              setSelectedTaskForReport(null);
              setReportModalClients([]);
              setReportModalCompletions([]);
              closeModal();
            }}
          />
        ),
        document.body
      )}
    </div>
  );
}



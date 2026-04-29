import { NextRequest, NextResponse } from 'next/server';
import { recurringTaskAdminService, RecurringTask } from '@/services/recurring-task-admin.service';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

// Validation schema for recurring task creation
const createRecurringTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  recurrencePattern: z.enum(['monthly', 'quarterly', 'half-yearly', 'yearly']),
  startDate: z.union([
    z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid start date format',
    }),
    z.date()
  ]),
  dueDate: z.union([
    z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid due date format',
    }),
    z.date()
  ]).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['pending', 'in-progress', 'completed']).default('pending'),
  contactIds: z.array(z.string()).default([]),
  categoryId: z.string().optional(),
  teamId: z.string().optional(),
  teamMemberMappings: z.array(z.object({
    userId: z.string(),
    userName: z.string(),
    clientIds: z.array(z.string()),
  })).optional(),
  requiresArn: z.boolean().optional(),
});

/**
 * GET /api/recurring-tasks
 * Fetch all recurring tasks with optional filters
 * Role-based access: Admin/Manager see all tasks, Employees see only their assigned tasks
 * Validates Requirements: 3.1, 3.4
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    // Check role-based permissions
    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager', 'employee'].includes(userRole)) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }

    const userId = authResult.user.uid;
    const userEmail = authResult.user.email;
    const isAdminOrManager = userRole === 'admin' || userRole === 'manager';
    const { adminDb } = await import('@/lib/firebase-admin');

    // Create request-level cache to prevent duplicate queries
    const { RequestCache } = await import('@/lib/request-cache');
    const requestCache = new RequestCache();

    // Get user profile for email (needed for team member lookup) - with caching
    let userProfile: any = await requestCache.getOrFetch(`user-profile-${userId}`, async () => {
      const profile = { email: userEmail, role: userRole };
      try {
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (userDoc.exists) {
          return { ...profile, ...userDoc.data() };
        }
      } catch (error) {
        console.error('[Recurring Tasks API] Error getting user profile:', error);
      }
      return profile;
    });

    const { searchParams } = new URL(request.url);

    const filters = {
      status: searchParams.get('status') || undefined,
      priority: searchParams.get('priority') || undefined,
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') || undefined,
      isPaused: searchParams.get('isPaused') === 'true' ? true : searchParams.get('isPaused') === 'false' ? false : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    };

    // Check if this is a calendar view request
    const isCalendarView = searchParams.get('view') === 'calendar';

    // Fetch all tasks using Admin SDK
    let tasks = await recurringTaskAdminService.getAll(filters);

    console.log(`[Recurring Tasks API] Total tasks fetched: ${tasks.length}`);
    console.log(`[Recurring Tasks API] User Firebase Auth UID: ${userId}`);
    console.log(`[Recurring Tasks API] User role: ${userProfile.role}`);
    console.log(`[Recurring Tasks API] Is Admin/Manager: ${isAdminOrManager}`);
    console.log(`[Recurring Tasks API] Is Calendar View: ${isCalendarView}`);

    // Filter tasks based on user role
    // Admin sees all recurring tasks (created by any admin)
    // Managers see only tasks they created or tasks assigned to their team members
    // Employees see only their assigned tasks
    if (userRole === 'admin') {
      // Admins see all recurring tasks
      console.log(`Admin ${userId} viewing all recurring tasks:`, tasks.length);
    } else if (userRole === 'manager') {
      // Managers see tasks they created OR tasks assigned to their managed employees OR team-assigned tasks
      const { adminDb } = await import('@/lib/firebase-admin');
      const { teamAdminService } = await import('@/services/team-admin.service');

      // Get employees managed by this manager - with caching
      const managedEmployeeIds = await requestCache.getOrFetch(`manager-hierarchy-${userId}`, async () => {
        const hierarchySnapshot = await adminDb
          .collection('manager-hierarchies')
          .where('managerId', '==', userId)
          .limit(1)
          .get();

        const ids = new Set<string>();
        if (!hierarchySnapshot.empty) {
          const hierarchy = hierarchySnapshot.docs[0].data();
          (hierarchy.employeeIds || []).forEach((id: string) => ids.add(id));
        }
        return ids;
      });

      console.log(`[Recurring Tasks API] Manager ${userId} manages ${managedEmployeeIds.size} employees`);

      // Get teams this manager is a member or leader of - with caching
      const managerTeams = await requestCache.getOrFetch(`manager-teams-${userId}`, async () => {
        return await teamAdminService.getTeamsByMember(userId);
      });

      const managerTeamIds = new Set(managerTeams.map((t: any) => t.id).filter(Boolean));
      console.log(`[Recurring Tasks API] Manager ${userId} is in ${managerTeamIds.size} teams`);

      // Filter tasks: created by manager OR directly assigned to manager OR assigned to managed employees OR team-assigned
      tasks = tasks.filter(task => {
        // Check if task was created by this manager
        const isCreatedByManager = task.createdBy === userId;

        // Check if task is DIRECTLY assigned to this manager via team member mapping
        const isDirectlyAssignedToManager = task.teamMemberMappings &&
          Array.isArray(task.teamMemberMappings) &&
          task.teamMemberMappings.some(mapping => mapping.userId === userId);

        // Check if task is assigned to any managed employee via team member mappings
        const isAssignedToManagedEmployee = task.teamMemberMappings &&
          Array.isArray(task.teamMemberMappings) &&
          task.teamMemberMappings.some(mapping => managedEmployeeIds.has(mapping.userId));

        // Check if task's teamId is a team the manager belongs to
        const isManagerTeamAssigned = task.teamId && managerTeamIds.has(task.teamId);

        const willShow = isCreatedByManager || isDirectlyAssignedToManager || isAssignedToManagedEmployee || isManagerTeamAssigned;

        console.log(`[Recurring Tasks API] Task "${task.title}":`, {
          taskId: task.id,
          createdBy: task.createdBy,
          isCreatedByManager,
          isDirectlyAssignedToManager,
          isAssignedToManagedEmployee,
          isManagerTeamAssigned,
          willShow,
        });

        return willShow;
      });

      console.log(`[Recurring Tasks API] Manager ${userId} filtered tasks: ${tasks.length}`);
    } else if (userRole === 'employee') {
      // Employees see only their assigned tasks
      // OPTIMIZED: Use canonical Firebase Auth UID, skip unnecessary lookups
      const { teamAdminService } = await import('@/services/team-admin.service');

      console.log(`[Recurring Tasks API] Employee ${userId} filtering tasks`);
      console.log(`[Recurring Tasks API] User email: ${userProfile.email}`);

      // Use canonical Firebase Auth UID directly - no need for email-based lookups
      const userIds = new Set<string>([userId]);

      // Get teams for the user - with caching
      const userTeams = await requestCache.getOrFetch(`employee-teams-${userId}`, async () => {
        return await teamAdminService.getTeamsByMember(userId);
      });

      const userTeamIds = userTeams.map(t => t.id).filter(Boolean);

      console.log(`[Recurring Tasks API] User teams:`, userTeams.map(t => ({ id: t.id, name: t.name })));
      console.log(`[Recurring Tasks API] User team IDs:`, userTeamIds);

      // Pre-fetch team documents for all unique teamIds in the tasks list - with caching
      const uniqueTaskTeamIds = [...new Set(tasks.map((t: any) => t.teamId).filter(Boolean))];
      const teamCache = await requestCache.getOrFetch(`task-teams-cache`, async () => {
        const cache = new Map<string, any>();
        await Promise.all(uniqueTaskTeamIds.map(async (tid: any) => {
          try {
            const team = await requestCache.getOrFetch(`team-doc-${tid}`, () => teamAdminService.getById(tid));
            if (team) cache.set(tid, team);
          } catch (err) {
            console.error(`[Recurring Tasks API] Error fetching team ${tid}:`, err);
          }
        }));
        return cache;
      });

      const userIdsArray = Array.from(userIds);

      // Employees see tasks that are:
      // 1. Directly assigned to them (in contactIds), OR
      // 2. Assigned to a team they are a member of, OR
      // 3. Assigned to them via team member mappings
      tasks = tasks.filter(task => {
        // Check if task is directly assigned to user
        const isDirectlyAssigned = task.contactIds &&
          Array.isArray(task.contactIds) &&
          userIdsArray.some(id => task.contactIds.includes(id));

        // Check if task is assigned to a team the user is a member of
        const isTeamAssigned = task.teamId && userTeamIds.includes(task.teamId);

        // Direct fallback: check the specific team document for membership
        const isDirectTeamMember = task.teamId && !isTeamAssigned && (() => {
          const t = teamCache.get(task.teamId);
          if (!t) return false;
          return userIdsArray.some(uid =>
            (t.memberIds && t.memberIds.includes(uid)) ||
            (t.members && Array.isArray(t.members) && t.members.some((m: any) => m.id === uid)) ||
            t.leaderId === uid
          );
        })();

        // Check if task has team member mappings for this user
        const isMappedToUser = task.teamMemberMappings &&
          Array.isArray(task.teamMemberMappings) &&
          task.teamMemberMappings.some(mapping => {
            const matches = userIdsArray.includes(mapping.userId);
            if (task.teamMemberMappings && task.teamMemberMappings.length > 0) {
              console.log(`[Recurring Tasks API] Checking mapping for task "${task.title}":`, {
                mappingUserId: mapping.userId,
                currentUserId: userId,
                userIdsArray,
                matches,
                mappingUserName: mapping.userName,
                mappingClientIds: mapping.clientIds
              });
            }
            return matches;
          });

        console.log(`[Recurring Tasks API] Task "${task.title}":`, {
          taskId: task.id,
          teamId: task.teamId,
          contactIdsCount: task.contactIds?.length || 0,
          hasMappings: !!task.teamMemberMappings,
          mappingsCount: task.teamMemberMappings?.length || 0,
          mappingsData: task.teamMemberMappings,
          isDirectlyAssigned,
          isTeamAssigned,
          isDirectTeamMember,
          isMappedToUser,
          willShow: isDirectlyAssigned || isTeamAssigned || isDirectTeamMember || isMappedToUser
        });

        return isDirectlyAssigned || isTeamAssigned || isDirectTeamMember || isMappedToUser;
      });

      console.log(`[Recurring Tasks API] Employee ${userId} filtered tasks: ${tasks.length}`);
    } else if (userRole === 'admin') {
      console.log(`[Recurring Tasks API] Admin ${userId} viewing all recurring tasks: ${tasks.length} (Calendar view: ${isCalendarView})`);
    }

    // Serialize dates to ISO strings for JSON response
    const serializedTasks = tasks.map(task => ({
      ...task,
      startDate: task.startDate ? ((task.startDate as any).toDate ? (task.startDate as any).toDate().toISOString() : new Date(task.startDate as any).toISOString()) : null,
      dueDate: task.dueDate ? ((task.dueDate as any).toDate ? (task.dueDate as any).toDate().toISOString() : new Date(task.dueDate as any).toISOString()) : null,
      createdAt: task.createdAt ? ((task.createdAt as any).toDate ? (task.createdAt as any).toDate().toISOString() : new Date(task.createdAt as any).toISOString()) : null,
      updatedAt: task.updatedAt ? ((task.updatedAt as any).toDate ? (task.updatedAt as any).toDate().toISOString() : new Date(task.updatedAt as any).toISOString()) : null,
    }));

    return NextResponse.json(serializedTasks, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/recurring-tasks
 * Create a new recurring task
 * Validates Requirements: 3.2, 3.4
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    // Check role-based permissions
    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can access this resource');
    }

    const userId = authResult.user.uid;

    const body = await request.json();
    console.log('📥 [POST /api/recurring-tasks] Received body:', JSON.stringify(body, null, 2));

    // Validate request body
    const validationResult = createRecurringTaskSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('❌ [POST /api/recurring-tasks] Validation failed:', validationResult.error);
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const taskData = validationResult.data;
    console.log('✅ [POST /api/recurring-tasks] Validation passed');
    console.log('🗺️ [POST /api/recurring-tasks] Team member mappings:', taskData.teamMemberMappings);

    // Calculate the due date based on start date and current date
    const startDate = taskData.startDate instanceof Date ? taskData.startDate : new Date(taskData.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);

    // If start date is in the past or today, calculate the next due date from today
    let dueDate = startDate;
    if (startDate <= today) {
      const { calculateNextOccurrence } = await import('@/utils/recurrence-scheduler');
      dueDate = calculateNextOccurrence(today, taskData.recurrencePattern);
    }

    // Convert date strings to Date objects and add createdBy
    const taskToCreate = {
      ...taskData,
      description: taskData.description || '',
      startDate: startDate,
      dueDate: taskData.dueDate
        ? (taskData.dueDate instanceof Date ? taskData.dueDate : new Date(taskData.dueDate))
        : dueDate,
      createdBy: userId, // Store the creator's user ID
      completionHistory: [], // Initialize empty completion history
      isPaused: false, // Initialize as not paused
    };

    console.log('💾 [POST /api/recurring-tasks] Creating task in Firestore:', JSON.stringify(taskToCreate, null, 2));
    const newTask = await recurringTaskAdminService.create(taskToCreate as any);
    console.log('✅ [POST /api/recurring-tasks] Task created successfully with ID:', newTask.id);
    console.log('🗺️ [POST /api/recurring-tasks] Saved team member mappings:', newTask.teamMemberMappings);

    // Send notifications to all assigned users
    try {
      const { sendNotification } = await import('@/lib/notifications/send-notification');
      const { teamAdminService } = await import('@/services/team-admin.service');

      const assignedUserIds = new Set<string>();

      // Add directly assigned users
      (taskData.contactIds || []).forEach((id: string) => assignedUserIds.add(id));

      // Add users from team member mappings
      (taskData.teamMemberMappings || []).forEach((m: { userId: string }) => assignedUserIds.add(m.userId));

      // If a team is assigned but no explicit mappings, look up team members
      if (taskData.teamId && (!taskData.teamMemberMappings || taskData.teamMemberMappings.length === 0)) {
        try {
          const team = await teamAdminService.getById(taskData.teamId);
          if (team) {
            if (team.memberIds && Array.isArray(team.memberIds)) {
              team.memberIds.forEach((id: string) => assignedUserIds.add(id));
            } else if (team.members && Array.isArray(team.members)) {
              team.members.forEach((m: any) => m.id && assignedUserIds.add(m.id));
            }
            if (team.leaderId) assignedUserIds.add(team.leaderId);
          }
        } catch (teamErr) {
          console.error('[POST /api/recurring-tasks] Error fetching team members for notification:', teamErr);
        }
      }

      if (assignedUserIds.size > 0) {
        await sendNotification({
          userIds: [...assignedUserIds],
          title: 'New Recurring Task Assigned',
          body: `You have been assigned a recurring task: ${taskData.title}`,
          data: {
            url: '/tasks/recurring',
            type: 'recurring_task_assigned',
            taskId: newTask.id,
          },
        });
        console.log(`✅ [POST /api/recurring-tasks] Notifications sent to ${assignedUserIds.size} user(s)`);
      }
    } catch (notifErr) {
      console.error('[POST /api/recurring-tasks] Error sending notifications:', notifErr);
    }

    // Serialize dates for JSON response
    const serializedTask = {
      ...newTask,
      startDate: newTask.startDate ? ((newTask.startDate as any).toDate ? (newTask.startDate as any).toDate().toISOString() : new Date(newTask.startDate as any).toISOString()) : null,
      dueDate: newTask.dueDate ? ((newTask.dueDate as any).toDate ? (newTask.dueDate as any).toDate().toISOString() : new Date(newTask.dueDate as any).toISOString()) : null,
      createdAt: newTask.createdAt ? ((newTask.createdAt as any).toDate ? (newTask.createdAt as any).toDate().toISOString() : new Date(newTask.createdAt as any).toISOString()) : null,
      updatedAt: newTask.updatedAt ? ((newTask.updatedAt as any).toDate ? (newTask.updatedAt as any).toDate().toISOString() : new Date(newTask.updatedAt as any).toISOString()) : null,
    };

    return NextResponse.json(serializedTask, { status: 201 });
  } catch (error) {
    console.error('❌ [POST /api/recurring-tasks] Error:', error);
    return handleApiError(error);
  }
}

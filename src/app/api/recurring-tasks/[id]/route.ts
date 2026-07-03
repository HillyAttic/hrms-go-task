import { NextRequest, NextResponse } from 'next/server';
import { recurringTaskAdminService } from '@/services/recurring-task-admin.service';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

// Validation schema for recurring task update
const updateRecurringTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).optional(),
  description: z.string().max(1000).optional(),
  dueDate: z.union([
    z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid due date format',
    }),
    z.date()
  ]).optional(),
  recurrencePattern: z.enum(['monthly', 'quarterly', 'half-yearly', 'yearly']).optional(),
  startDate: z.union([
    z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid start date format',
    }),
    z.date()
  ]).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['pending', 'in-progress', 'completed']).optional(),
  assignedTo: z.array(z.string()).optional(),
  contactIds: z.array(z.string()).optional(),
  category: z.string().optional(),
  categoryId: z.string().optional(),
  teamId: z.string().optional(),
  teamMemberMappings: z.array(z.object({
    userId: z.string(),
    userName: z.string(),
    clientIds: z.array(z.string()),
  })).optional(),
  isPaused: z.boolean().optional(),
  requiresArn: z.boolean().optional(),
  requiresRemark: z.boolean().optional(),
});

/**
 * GET /api/recurring-tasks/[id]
 * Fetch a single recurring task by ID
 * Validates Requirements: 3.1
 * Requires: Employee role or higher
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);
    
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    // Check role - employees and above can view tasks
    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager', 'employee'].includes(userRole)) {
      return ErrorResponses.forbidden('Insufficient permissions to view tasks');
    }

    const { id } = await params;
    const task = await recurringTaskAdminService.getById(id);
    
    if (!task) {
      return ErrorResponses.notFound('Recurring task');
    }
    
    return NextResponse.json(task, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/recurring-tasks/[id]
 * Update a recurring task
 * Validates Requirements: 3.2, 3.8
 * Requires: Manager role or higher
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);
    
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    // Check role - only managers and admins can update tasks
    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can update tasks');
    }

    const { id } = await params;
    const body = await request.json();

    console.log(`📥 [PUT /api/recurring-tasks/${id}] Received body:`, JSON.stringify(body, null, 2));

    // Fetch existing task before update (to diff assignees for notifications)
    const existingTask = await recurringTaskAdminService.getById(id);

    // Validate request body
    const validationResult = updateRecurringTaskSchema.safeParse(body);
    if (!validationResult.success) {
      console.error(`❌ [PUT /api/recurring-tasks/${id}] Validation failed:`, validationResult.error);
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const taskData = validationResult.data;
    console.log(`✅ [PUT /api/recurring-tasks/${id}] Validation passed`);
    console.log(`🗺️ [PUT /api/recurring-tasks/${id}] Team member mappings:`, taskData.teamMemberMappings);
    
    // Convert date strings to Date objects if present
    const taskToUpdate: any = { ...taskData };
    if (taskData.dueDate) {
      taskToUpdate.dueDate = taskData.dueDate instanceof Date ? taskData.dueDate : new Date(taskData.dueDate);
    }
    if (taskData.startDate) {
      taskToUpdate.startDate = taskData.startDate instanceof Date ? taskData.startDate : new Date(taskData.startDate);
    }
    
    console.log(`💾 [PUT /api/recurring-tasks/${id}] Updating task in Firestore:`, JSON.stringify(taskToUpdate, null, 2));
    const updatedTask = await recurringTaskAdminService.update(id, taskToUpdate);
    
    if (!updatedTask) {
      console.error(`❌ [PUT /api/recurring-tasks/${id}] Task not found`);
      return ErrorResponses.notFound('Recurring task');
    }
    
    console.log(`✅ [PUT /api/recurring-tasks/${id}] Task updated successfully`);
    console.log(`🗺️ [PUT /api/recurring-tasks/${id}] Saved team member mappings:`, updatedTask.teamMemberMappings);

    // Send notifications to newly assigned users only
    try {
      const { sendNotification } = await import('@/lib/notifications/send-notification');
      const { teamAdminService } = await import('@/services/team-admin.service');

      // Collect old assigned user IDs
      const oldUserIds = new Set<string>();
      if (existingTask) {
        (existingTask.contactIds || []).forEach((uid: string) => oldUserIds.add(uid));
        ((existingTask as any).teamMemberMappings || []).forEach((m: { userId: string }) => oldUserIds.add(m.userId));
      }

      // Collect new assigned user IDs
      const newUserIds = new Set<string>();
      (taskToUpdate.contactIds || (updatedTask.contactIds || [])).forEach((uid: string) => newUserIds.add(uid));
      (taskToUpdate.teamMemberMappings || (updatedTask as any).teamMemberMappings || []).forEach((m: { userId: string }) => newUserIds.add(m.userId));

      // Resolve team members if teamId changed or no explicit mappings
      const newTeamId = taskToUpdate.teamId ?? (updatedTask as any).teamId;
      if (newTeamId && newUserIds.size === 0) {
        try {
          const team = await teamAdminService.getById(newTeamId);
          if (team) {
            if (team.memberIds && Array.isArray(team.memberIds)) {
              team.memberIds.forEach((uid: string) => newUserIds.add(uid));
            } else if (team.members && Array.isArray(team.members)) {
              team.members.forEach((m: any) => m.id && newUserIds.add(m.id));
            }
            if (team.leaderId) newUserIds.add(team.leaderId);
          }
        } catch (teamErr) {
          console.error(`[PUT /api/recurring-tasks/${id}] Error fetching team members:`, teamErr);
        }
      }

      // Only notify newly added users
      const newlyAddedIds = [...newUserIds].filter(uid => !oldUserIds.has(uid));

      if (newlyAddedIds.length > 0) {
        const taskTitle = taskToUpdate.title ?? (updatedTask as any).title ?? 'a recurring task';
        await sendNotification({
          userIds: newlyAddedIds,
          title: 'Recurring Task Assigned',
          body: `You have been assigned a recurring task: ${taskTitle}`,
          data: {
            url: '/tasks/recurring',
            type: 'recurring_task_assigned',
            taskId: id,
          },
        });
        console.log(`✅ [PUT /api/recurring-tasks/${id}] Notifications sent to ${newlyAddedIds.length} new user(s)`);
      }
    } catch (notifErr) {
      console.error(`[PUT /api/recurring-tasks/${id}] Error sending notifications:`, notifErr);
    }

    // Serialize dates for JSON response
    const serializedTask = {
      ...updatedTask,
      startDate: updatedTask.startDate ? ((updatedTask.startDate as any).toDate ? (updatedTask.startDate as any).toDate().toISOString() : new Date(updatedTask.startDate).toISOString()) : null,
      dueDate: updatedTask.dueDate ? ((updatedTask.dueDate as any).toDate ? (updatedTask.dueDate as any).toDate().toISOString() : new Date(updatedTask.dueDate).toISOString()) : null,
      createdAt: updatedTask.createdAt ? ((updatedTask.createdAt as any).toDate ? (updatedTask.createdAt as any).toDate().toISOString() : new Date(updatedTask.createdAt).toISOString()) : null,
      updatedAt: updatedTask.updatedAt ? ((updatedTask.updatedAt as any).toDate ? (updatedTask.updatedAt as any).toDate().toISOString() : new Date(updatedTask.updatedAt).toISOString()) : null,
    };
    
    return NextResponse.json(serializedTask, { status: 200 });
  } catch (error) {
    console.error(`❌ [PUT /api/recurring-tasks] Error:`, error);
    return handleApiError(error);
  }
}

/**
 * DELETE /api/recurring-tasks/[id]
 * Delete a recurring task with options
 * Validates Requirements: 3.10
 * Requires: Manager role or higher
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);
    
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    // Check role - only managers and admins can delete tasks
    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can delete tasks');
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    
    // Get delete option: 'all' or 'stop' (default: 'all')
    const deleteOption = searchParams.get('option') || 'all';
    
    console.log(`[DELETE Recurring Task] ID: ${id}, Option: ${deleteOption}`);
    
    if (deleteOption === 'stop') {
      // Stop recurrence by setting isPaused to true
      // Note: endDate is not part of the RecurringTask type, so we just pause it
      await recurringTaskAdminService.update(id, {
        isPaused: true,
      } as any);
      
      return NextResponse.json(
        { message: 'Recurring task stopped successfully' },
        { status: 200 }
      );
    } else {
      // Delete all future occurrences
      await recurringTaskAdminService.delete(id);
      
      return NextResponse.json(
        { message: 'Recurring task deleted successfully' },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('[DELETE Recurring Task] Error:', error);
    return handleApiError(error);
  }
}

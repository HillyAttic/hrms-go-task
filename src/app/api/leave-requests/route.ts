import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

const createLeaveSchema = z.object({
  leaveType: z.enum(['sick', 'casual']),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date))),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date))),
  reason: z.string().min(1).max(500),
  halfDay: z.boolean().optional(),
});

/**
 * GET /api/leave-requests
 * Get all leave requests.
 * Uses Admin SDK to bypass Firestore security rules on the server side.
 * Previously used client-SDK leaveService which caused 403 Forbidden errors
 * because the client SDK runs unauthenticated in API routes.
 */
export async function GET(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    const userId = authResult.user.uid;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const employeeId = searchParams.get('employeeId') || undefined;
    const leaveType = searchParams.get('leaveType') || undefined;
    const includeAll = searchParams.get('includeAll') === 'true'; // For roster views that need all employees

    // Use Admin SDK to bypass Firestore security rules on the server
    const { adminDb } = await import('@/lib/firebase-admin');
    let query: FirebaseFirestore.Query = adminDb.collection('leave-requests');

    // Employees can only see their own requests; managers/admins see all
    if (userRole === 'employee') {
      query = query.where('employeeId', '==', userId);
    } else if (userRole === 'manager') {
      // Managers can only see requests from their assigned employees
      const hierarchySnapshot = await adminDb
        .collection('manager-hierarchies')
        .where('managerId', '==', userId)
        .limit(1)
        .get();

      if (hierarchySnapshot.empty) {
        // Manager has no employees assigned - return empty
        return NextResponse.json([], { status: 200 });
      }

      const hierarchy = hierarchySnapshot.docs[0].data();
      const employeeIds = hierarchy.employeeIds || [];

      if (employeeIds.length === 0) {
        return NextResponse.json([], { status: 200 });
      }

      // Firestore 'in' query supports max 30 items, so we need to chunk if more
      if (employeeIds.length <= 30) {
        query = query.where('employeeId', 'in', employeeIds);
        // Apply status/leaveType filters before orderBy
        if (status) query = query.where('status', '==', status);
        if (leaveType) query = query.where('leaveType', '==', leaveType);
        query = query.orderBy('createdAt', 'desc');

        const snapshot = await query.get();

        // Collect unique approver UIDs missing approverName for backfill
        const missingApproverIds = new Set<string>();
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (!data.approverName && data.approvedBy) missingApproverIds.add(data.approvedBy);
        });
        const approverNameMap: Record<string, string> = {};
        if (missingApproverIds.size > 0) {
          const approverDocs = await Promise.all(
            Array.from(missingApproverIds).map((uid) => adminDb.collection('users').doc(uid).get())
          );
          approverDocs.forEach((doc) => {
            const d = doc.exists ? doc.data()! : null;
            approverNameMap[doc.id] = (d && (d.displayName || d.name || d.email)) || 'Manager';
          });
        }

        const requests = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            approverName: data.approverName || (data.approvedBy ? (approverNameMap[data.approvedBy] || 'Manager') : undefined),
            startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : data.startDate,
            endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString() : data.endDate,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
            approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate().toISOString() : data.approvedAt,
          };
        });

        return NextResponse.json(requests, { status: 200 });
      } else {
        // For managers with >30 employees, fetch all and filter in memory
        const allSnapshot = await adminDb
          .collection('leave-requests')
          .orderBy('createdAt', 'desc')
          .get();
        const employeeIdSet = new Set(employeeIds);
        let filteredDocs = allSnapshot.docs.filter((doc) => employeeIdSet.has(doc.data().employeeId));
        if (status) filteredDocs = filteredDocs.filter((doc) => doc.data().status === status);
        if (leaveType) filteredDocs = filteredDocs.filter((doc) => doc.data().leaveType === leaveType);

        // Backfill approverName for old records
        const missingApproverIds30 = new Set<string>();
        filteredDocs.forEach((doc) => {
          const data = doc.data();
          if (!data.approverName && data.approvedBy) missingApproverIds30.add(data.approvedBy);
        });
        const approverNameMap30: Record<string, string> = {};
        if (missingApproverIds30.size > 0) {
          const approverDocs = await Promise.all(
            Array.from(missingApproverIds30).map((uid) => adminDb.collection('users').doc(uid).get())
          );
          approverDocs.forEach((doc) => {
            const d = doc.exists ? doc.data()! : null;
            approverNameMap30[doc.id] = (d && (d.displayName || d.name || d.email)) || 'Manager';
          });
        }

        const requests = filteredDocs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            approverName: data.approverName || (data.approvedBy ? (approverNameMap30[data.approvedBy] || 'Manager') : undefined),
            startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : data.startDate,
            endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString() : data.endDate,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
            approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate().toISOString() : data.approvedAt,
          };
        });

        return NextResponse.json(requests, { status: 200 });
      }
    } else {
      // Admin: see all leave requests OR specific employee if employeeId is provided
      // When employeeId is explicitly requested (e.g., viewing calendar), show that employee's data
      // regardless of manager assignment
      // When includeAll=true (e.g., roster view), show all employees' leave requests
      
      if (employeeId) {
        // Admin is viewing a specific employee's calendar - show their leave requests
        query = query.where('employeeId', '==', employeeId);
      } else if (!includeAll) {
        // Admin is viewing the general list - only show requests from employees NOT assigned to any manager
        // (This is skipped when includeAll=true for roster views)
        // Collect all employeeIds that are under any manager
        const allHierarchiesSnapshot = await adminDb.collection('manager-hierarchies').get();
        const assignedEmployeeIds = new Set<string>();
        allHierarchiesSnapshot.docs.forEach((doc) => {
          const ids: string[] = doc.data().employeeIds || [];
          ids.forEach((id) => assignedEmployeeIds.add(id));
        });

        // We'll filter after fetching since we can't do a "not in" query in Firestore
        // This is only for the general list view, not for specific employee calendars or roster views
      }

      if (status) query = query.where('status', '==', status);
      if (leaveType) query = query.where('leaveType', '==', leaveType);
      query = query.orderBy('createdAt', 'desc');

      const snapshot = await query.get();

      // Filter out requests from employees assigned to any manager ONLY if not viewing specific employee
      // and not using includeAll flag
      let filteredDocs = snapshot.docs;
      
      if (!employeeId && !includeAll) {
        // For general list, collect assigned employees and filter them out
        const allHierarchiesSnapshot = await adminDb.collection('manager-hierarchies').get();
        const assignedEmployeeIds = new Set<string>();
        allHierarchiesSnapshot.docs.forEach((doc) => {
          const ids: string[] = doc.data().employeeIds || [];
          ids.forEach((id) => assignedEmployeeIds.add(id));
        });
        
        if (assignedEmployeeIds.size > 0) {
          filteredDocs = snapshot.docs.filter((doc) => !assignedEmployeeIds.has(doc.data().employeeId));
        }
      }

      // Backfill approverName for old records
      const missingApproverIds = new Set<string>();
      filteredDocs.forEach((doc) => {
        const data = doc.data();
        if (!data.approverName && data.approvedBy) missingApproverIds.add(data.approvedBy);
      });
      const approverNameMap: Record<string, string> = {};
      if (missingApproverIds.size > 0) {
        const approverDocs = await Promise.all(
          Array.from(missingApproverIds).map((uid) => adminDb.collection('users').doc(uid).get())
        );
        approverDocs.forEach((doc) => {
          const d = doc.exists ? doc.data()! : null;
          approverNameMap[doc.id] = (d && (d.displayName || d.name || d.email)) || 'Manager';
        });
      }

      const requests = filteredDocs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          approverName: data.approverName || (data.approvedBy ? (approverNameMap[data.approvedBy] || 'Manager') : undefined),
          startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : data.startDate,
          endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString() : data.endDate,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
          approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate().toISOString() : data.approvedAt,
        };
      });

      return NextResponse.json(requests, { status: 200 });
    }

    // Fallback (employee role path continues here)
    if (status) {
      query = query.where('status', '==', status);
    }

    if (leaveType) {
      query = query.where('leaveType', '==', leaveType);
    }

    query = query.orderBy('createdAt', 'desc');

    const snapshot = await query.get();

    // Collect unique approver UIDs that are missing approverName so we can batch-resolve them
    const missingApproverIds = new Set<string>();
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (!data.approverName && data.approvedBy) {
        missingApproverIds.add(data.approvedBy);
      }
    });

    // Batch fetch approver names for old records
    const approverNameMap: Record<string, string> = {};
    if (missingApproverIds.size > 0) {
      const approverDocs = await Promise.all(
        Array.from(missingApproverIds).map((uid) => adminDb.collection('users').doc(uid).get())
      );
      approverDocs.forEach((doc) => {
        const d = doc.exists ? doc.data()! : null;
        approverNameMap[doc.id] = (d && (d.displayName || d.name || d.email)) || 'Manager';
      });
    }

    const requests = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Backfill approverName for old records that only have approvedBy UID
        approverName: data.approverName || (data.approvedBy ? (approverNameMap[data.approvedBy] || 'Manager') : undefined),
        // Convert Firestore Timestamps to ISO strings for JSON serialization
        startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : data.startDate,
        endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString() : data.endDate,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate().toISOString() : data.approvedAt,
      };
    });

    return NextResponse.json(requests, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/leave-requests
 * Create a new leave request
 */
export async function POST(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const body = await request.json();
    const validation = createLeaveSchema.safeParse(body);

    if (!validation.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validation.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { leaveType, startDate, endDate, reason, halfDay } = validation.data;

    // Use Admin SDK to get user profile and create leave request
    const { adminDb } = await import('@/lib/firebase-admin');
    const userDoc = await adminDb.collection('users').doc(authResult.user.uid).get();
    const userData = userDoc.data();

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check for duplicate submissions within the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const duplicateCheck = await adminDb
      .collection('leave-requests')
      .where('employeeId', '==', authResult.user.uid)
      .where('leaveType', '==', leaveType)
      .where('createdAt', '>', fiveMinutesAgo)
      .get();

    // Check if any match exact dates and halfDay flag
    const exactDuplicate = duplicateCheck.docs.find(doc => {
      const data = doc.data();
      const docStart = data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate);
      const docEnd = data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate);

      return docStart.toISOString() === start.toISOString() &&
             docEnd.toISOString() === end.toISOString() &&
             data.halfDay === (halfDay || false);
    });

    if (exactDuplicate) {
      return NextResponse.json(
        {
          error: 'Duplicate request detected. A similar leave request was just submitted.',
          existingRequestId: exactDuplicate.id
        },
        { status: 409 }
      );
    }

    // Calculate total days - if halfDay is true, set to 0.5, otherwise calculate normally
    let totalDays: number;
    if (halfDay) {
      totalDays = 0.5;
    } else {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    const leaveRequestData = {
      employeeId: authResult.user.uid,
      employeeName: userData?.displayName || userData?.name || authResult.user.email || 'Unknown',
      employeeEmail: authResult.user.email || '',
      leaveType,
      startDate: start,
      endDate: end,
      totalDays,
      halfDay: halfDay || false,
      reason,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await adminDb.collection('leave-requests').add(leaveRequestData);

    // Notify the assigned manager if one exists, otherwise notify all admins
    try {
      console.log(`[leave-requests] ========== NOTIFICATION DEBUG START ==========`);
      console.log(`[leave-requests] Leave request created:`, {
        id: docRef.id,
        employeeId: authResult.user.uid,
        employeeName: leaveRequestData.employeeName,
        leaveType,
        startDate: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        endDate: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        totalDays,
      });

      const { sendNotification } = await import('@/lib/notifications/send-notification');
      const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const employeeName = leaveRequestData.employeeName;
      const daysText = halfDay ? '0.5 day (Half Day)' : `${totalDays} day${totalDays > 1 ? 's' : ''}`;
      const notifBody = `${employeeName} requested ${leaveType} leave (${daysText}) from ${startStr} to ${endStr}`;

      // Check if this employee has an assigned manager
      console.log(`[leave-requests] Querying manager hierarchy for employee:`, authResult.user.uid);
      const hierarchySnapshot = await adminDb
        .collection('manager-hierarchies')
        .where('employeeIds', 'array-contains', authResult.user.uid)
        .limit(1)
        .get();

      let notifyIds: string[] = [];

      if (!hierarchySnapshot.empty) {
        // Employee has an assigned manager — notify only that manager
        notifyIds = [hierarchySnapshot.docs[0].data().managerId];
        console.log(`[leave-requests] ✅ Manager found:`, notifyIds[0]);
      } else {
        // No manager assigned — notify all admins only
        console.log(`[leave-requests] ⚠️ No manager found, falling back to admins`);
        const adminsSnapshot = await adminDb.collection('users').where('role', '==', 'admin').get();
        notifyIds = adminsSnapshot.docs.map((d) => d.id);
        console.log(`[leave-requests] Found ${notifyIds.length} admin(s):`, notifyIds);
      }

      if (notifyIds.length === 0) {
        console.error(`[leave-requests] ❌ CRITICAL: No managers or admins found to notify!`);
        console.error(`[leave-requests] This leave request will NOT be notified to anyone.`);
      } else {
        console.log(`[leave-requests] Sending notifications to ${notifyIds.length} user(s):`, notifyIds);

        const result = await sendNotification({
          userIds: notifyIds,
          title: 'New Leave Request',
          body: notifBody,
          data: { url: '/admin/leave-approvals', type: 'leave_request' },
        });

        console.log('[leave-requests] ✅ Notification result:', {
          totalTime: `${result.totalTime}ms`,
          sent: result.sent.length,
          errors: result.errors.length,
        });

        // Log which users received notifications and which didn't
        if (result.sent.length > 0) {
          console.log('[leave-requests] ✅ Notifications sent to:', result.sent.map(s => s.userId));
        }
        if (result.errors.length > 0) {
          console.log('[leave-requests] ⚠️ Notification errors:', result.errors);
          result.errors.forEach(err => {
            if (err.error === 'No FCM token') {
              console.log(`[leave-requests] ⚠️ User ${err.userId} has not enabled notifications`);
              console.log(`[leave-requests] 💡 User needs to visit the app and click "Enable Notifications"`);
            } else {
              console.log(`[leave-requests] ❌ User ${err.userId} error: ${err.error}`);
            }
          });
        }
      }

      console.log(`[leave-requests] ========== NOTIFICATION DEBUG END ==========`);
    } catch (notifError) {
      console.error('[leave-requests] ❌ CRITICAL ERROR sending leave request notifications:', notifError);
      console.error('[leave-requests] Error details:', {
        message: notifError instanceof Error ? notifError.message : 'Unknown error',
        stack: notifError instanceof Error ? notifError.stack : undefined,
      });
      // Don't fail the leave request creation if notification fails
    }

    return NextResponse.json(
      {
        id: docRef.id,
        ...leaveRequestData,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        createdAt: leaveRequestData.createdAt.toISOString(),
        updatedAt: leaveRequestData.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

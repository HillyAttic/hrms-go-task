import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

const approveRejectSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
  approvalReason: z.string().optional(),
});

/**
 * GET /api/leave-requests/[id]
 * Get a single leave request
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const { id } = await params;

    // Use Admin SDK to bypass Firestore security rules
    const { adminDb } = await import('@/lib/firebase-admin');
    const doc = await adminDb.collection('leave-requests').doc(id).get();

    if (!doc.exists) {
      return ErrorResponses.notFound('Leave request');
    }

    const data = doc.data()!;
    const leaveRequest = {
      id: doc.id,
      employeeId: data.employeeId,
      ...data,
      startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : data.startDate,
      endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString() : data.endDate,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate().toISOString() : data.approvedAt,
    };

    // Check access: employees can only view their own requests
    const userRole = authResult.user.claims.role;
    if (userRole === 'employee' && leaveRequest.employeeId !== authResult.user.uid) {
      return ErrorResponses.forbidden('You can only view your own leave requests');
    }

    return NextResponse.json(leaveRequest, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/leave-requests/[id]
 * Approve or reject a leave request (admin/manager only)
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only admins and managers can approve/reject leave requests');
    }

    const { id } = await params;
    const body = await request.json();
    const validation = approveRejectSchema.safeParse(body);

    if (!validation.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validation.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { action, reason, approvalReason } = validation.data;

    if (action === 'reject' && !reason) {
      return ErrorResponses.badRequest('Rejection reason is required');
    }

    // Use Admin SDK to get approver name and update leave request
    const { adminDb } = await import('@/lib/firebase-admin');
    const userDoc = await adminDb.collection('users').doc(authResult.user.uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const approverName = userData?.displayName || userData?.name || authResult.user.email || 'Unknown';
    console.log('[leave-requests/[id]] Approver lookup — uid:', authResult.user.uid, 'docExists:', userDoc.exists, 'resolvedName:', approverName);

    const updates: Record<string, any> = {
      status: action === 'approve' ? 'approved' : 'rejected',
      approvedBy: authResult.user.uid,
      approverName,
      approvedAt: new Date(),
      updatedAt: new Date(),
    };

    if (action === 'reject' && reason) {
      updates.rejectionReason = reason;
    }

    if (action === 'approve' && approvalReason) {
      updates.approvalReason = approvalReason;
    }

    await adminDb.collection('leave-requests').doc(id).update(updates);

    // Return the updated document
    const updatedDoc = await adminDb.collection('leave-requests').doc(id).get();
    const data = updatedDoc.data()!;

    // Notify the employee about the decision
    try {
      console.log(`[leave-requests/[id]] ========== NOTIFICATION DEBUG START ==========`);
      console.log(`[leave-requests/[id]] Leave request ${action}d:`, {
        id,
        action,
        employeeId: data.employeeId,
      });

      const { sendNotification } = await import('@/lib/notifications/send-notification');
      const employeeId: string = data.employeeId;
      if (employeeId) {
        const leaveType: string = data.leaveType || 'leave';
        const startDate: Date = data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate);
        const endDate: Date = data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate);
        const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const isApproved = action === 'approve';
        const notifTitle = isApproved ? 'Leave Request Approved' : 'Leave Request Rejected';
        const notifBody = isApproved
          ? `Your ${leaveType} leave from ${startStr} to ${endStr} has been approved.${approvalReason ? ` Note: ${approvalReason}` : ''}`
          : `Your ${leaveType} leave from ${startStr} to ${endStr} has been rejected.${reason ? ` Reason: ${reason}` : ''}`;

        console.log(`[leave-requests/[id]] Sending notification to employee:`, employeeId);
        console.log(`[leave-requests/[id]] Notification type:`, isApproved ? 'leave_approved' : 'leave_rejected');

        const result = await sendNotification({
          userIds: [employeeId],
          title: notifTitle,
          body: notifBody,
          data: { url: '/attendance', type: isApproved ? 'leave_approved' : 'leave_rejected' },
        });

        console.log('[leave-requests/[id]] ✅ Notification result:', {
          totalTime: `${result.totalTime}ms`,
          sent: result.sent.length,
          errors: result.errors.length,
        });

        if (result.sent.length > 0) {
          console.log('[leave-requests/[id]] ✅ Notification sent to:', result.sent.map(s => s.userId));
        }
        if (result.errors.length > 0) {
          console.log('[leave-requests/[id]] ⚠️ Notification errors:', result.errors);
          result.errors.forEach(err => {
            if (err.error === 'No FCM token') {
              console.log(`[leave-requests/[id]] ⚠️ User ${err.userId} has not enabled notifications`);
            } else {
              console.log(`[leave-requests/[id]] ❌ User ${err.userId} error: ${err.error}`);
            }
          });
        }
      } else {
        console.warn(`[leave-requests/[id]] ⚠️ No employeeId found in leave request data`);
      }

      console.log(`[leave-requests/[id]] ========== NOTIFICATION DEBUG END ==========`);
    } catch (notifError) {
      console.error('[leave-requests/[id]] ❌ CRITICAL ERROR sending employee notification:', notifError);
      console.error('[leave-requests/[id]] Error details:', {
        message: notifError instanceof Error ? notifError.message : 'Unknown error',
        stack: notifError instanceof Error ? notifError.stack : undefined,
      });
    }

    const updated = {
      id: updatedDoc.id,
      ...data,
      startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : data.startDate,
      endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString() : data.endDate,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate().toISOString() : data.approvedAt,
    };

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/leave-requests/[id]
 * Delete a leave request
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const { id } = await params;

    // Use Admin SDK to bypass Firestore security rules
    const { adminDb } = await import('@/lib/firebase-admin');
    const doc = await adminDb.collection('leave-requests').doc(id).get();

    if (!doc.exists) {
      return ErrorResponses.notFound('Leave request');
    }

    const leaveRequest = doc.data()!;

    // Only admin or the employee who created it can delete
    const userRole = authResult.user.claims.role;
    if (userRole !== 'admin' && leaveRequest.employeeId !== authResult.user.uid) {
      return ErrorResponses.forbidden('You can only delete your own leave requests');
    }

    await adminDb.collection('leave-requests').doc(id).delete();
    return NextResponse.json({ message: 'Leave request deleted successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

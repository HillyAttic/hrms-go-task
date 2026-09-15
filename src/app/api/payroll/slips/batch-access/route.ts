import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuthToken } from '@/lib/server-auth';
import { ErrorResponses, handleApiError } from '@/lib/api-error-handler';
import { payrollAdminService } from '@/services/payroll-admin.service';
import { getAccessibleEmployeeIds } from '@/lib/manager-access';
import { adminDb } from '@/lib/firebase-admin';

const batchAccessSchema = z.object({
  updates: z
    .array(z.object({ slipId: z.string().min(1), accessGranted: z.boolean() }))
    .min(1)
    .max(500),
});

/**
 * PATCH /api/payroll/slips/batch-access — admin | manager.
 * Bulk grant/revoke. Deliberately sends NO notifications (the single-slip PATCH does).
 */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();

    const { uid, claims } = authResult.user;
    if (claims.role !== 'admin' && claims.role !== 'manager') {
      return ErrorResponses.forbidden('Only admins and managers can update salary slip access');
    }

    const { updates } = batchAccessSchema.parse(await request.json());

    if (claims.role === 'manager') {
      const accessibleIds = await getAccessibleEmployeeIds(uid, claims.role);
      const slips = await Promise.all(
        updates.map((update) => payrollAdminService.getSlipById(update.slipId))
      );

      const unauthorized = slips.some(
        (slip) => slip && !accessibleIds.includes(slip.employeeId)
      );
      if (unauthorized) {
        return ErrorResponses.forbidden('You can only update slips for your assigned employees');
      }
    }

    // Single batch: capped at 500 by the schema above, which is exactly Firestore's
    // limit. See the payroll known-gaps list — chunk it at 499 if the cap ever rises.
    const batch = adminDb.batch();
    updates.forEach((update) => {
      batch.update(adminDb.collection('salary-slips').doc(update.slipId), {
        accessGranted: update.accessGranted,
      });
    });
    await batch.commit();

    return NextResponse.json({ success: true, updatedCount: updates.length });
  } catch (error) {
    console.error('[Payroll] Error batch-updating salary slip access', error);
    return handleApiError(error);
  }
}

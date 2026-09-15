import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuthToken } from '@/lib/server-auth';
import { ErrorResponses, handleApiError } from '@/lib/api-error-handler';
import { payrollAdminService } from '@/services/payroll-admin.service';
import { getAccessibleEmployeeIds } from '@/lib/manager-access';

const cleanupSchema = z.object({
  month: z.number().int().min(0).max(11),
  year: z.number().int().min(2020).max(2099),
});

/**
 * POST /api/payroll/cleanup-slips — admin | manager. Deletes every slip in a period.
 *
 * SILENT AND IRREVERSIBLE: no soft delete, no undo, no backup, and the employees are
 * not notified. It touches salary-slips only — settings, accessConfig, templates and
 * the salary formula are left alone. Managers can only delete their assignees' slips.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();

    const { uid, claims } = authResult.user;
    if (claims.role !== 'admin' && claims.role !== 'manager') {
      return ErrorResponses.forbidden('Only admins and managers can delete salary slips');
    }

    const { month, year } = cleanupSchema.parse(await request.json());

    let slips = await payrollAdminService.getSlips({ month, year });

    if (claims.role === 'manager') {
      const accessibleIds = await getAccessibleEmployeeIds(uid, claims.role);
      slips = slips.filter((slip) => accessibleIds.includes(slip.employeeId));
    }

    const ids = slips.map((slip) => slip.id).filter((id): id is string => Boolean(id));
    const deletedCount = await payrollAdminService.deleteSlips(ids);

    console.log(
      `[Payroll] cleanup-slips uid=${uid} role=${claims.role} month=${month} year=${year} deleted=${deletedCount}`
    );

    return NextResponse.json({
      success: true,
      deletedCount,
      message:
        deletedCount > 0
          ? `Successfully deleted ${deletedCount} salary slip(s)`
          : 'No salary slips found for this period',
    });
  } catch (error) {
    console.error('[Payroll] Error cleaning up salary slips', error);
    return handleApiError(error);
  }
}

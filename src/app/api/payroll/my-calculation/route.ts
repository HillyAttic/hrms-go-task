import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuthToken } from '@/lib/server-auth';
import { ErrorResponses, handleApiError } from '@/lib/api-error-handler';
import { payrollAdminService } from '@/services/payroll-admin.service';

const myCalculationSchema = z.object({
  month: z.number().int().min(0).max(11),
  year: z.number().int().min(2020).max(2099),
});

/**
 * POST /api/payroll/my-calculation — any authenticated user, for themselves only.
 * The employeeId is ALWAYS the caller's uid; it is never read from the body, so a
 * crafted request cannot read someone else's live attendance.
 * Used by the self-service page to overlay live attendance on a possibly stale slip.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();

    const validated = myCalculationSchema.parse(await request.json());
    const result = await payrollAdminService.calculateSalary(
      authResult.user.uid,
      validated.month,
      validated.year
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Payroll] Error calculating own salary', error);
    return handleApiError(error);
  }
}

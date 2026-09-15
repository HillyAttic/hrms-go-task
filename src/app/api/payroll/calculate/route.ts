import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuthToken } from '@/lib/server-auth';
import { ErrorResponses, handleApiError } from '@/lib/api-error-handler';
import { payrollAdminService } from '@/services/payroll-admin.service';

const calculateSchema = z.object({
  employeeId: z.string().min(1),
  month: z.number().int().min(0).max(11),
  year: z.number().int().min(2020).max(2099),
});

/** POST /api/payroll/calculate — admin | manager. Returns SalaryCalculationResult raw. */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();

    const { role } = authResult.user.claims;
    if (role !== 'admin' && role !== 'manager') {
      return ErrorResponses.forbidden('Only admins and managers can calculate salary');
    }

    const validated = calculateSchema.parse(await request.json());
    const result = await payrollAdminService.calculateSalary(
      validated.employeeId,
      validated.month,
      validated.year
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Payroll] Error calculating salary', error);
    return handleApiError(error);
  }
}

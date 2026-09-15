import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuthToken } from '@/lib/server-auth';
import { ErrorResponses, handleApiError } from '@/lib/api-error-handler';
import { payrollAdminService } from '@/services/payroll-admin.service';

const generateSchema = z.object({
  employeeIds: z.array(z.string().min(1)).min(1),
  month: z.number().int().min(0).max(11),
  year: z.number().int().min(2020).max(2099),
  accessMap: z.record(z.string(), z.boolean()).optional(),
});

/** POST /api/payroll/generate — admin | manager. Generates slips for a period. */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();

    const { role } = authResult.user.claims;
    if (role !== 'admin' && role !== 'manager') {
      return ErrorResponses.forbidden('Only admins and managers can generate salary slips');
    }

    const validated = generateSchema.parse(await request.json());
    const slips = await payrollAdminService.generateSlips(
      validated.employeeIds,
      validated.month,
      validated.year,
      authResult.user.uid,
      validated.accessMap
    );

    return NextResponse.json({ success: true, slips });
  } catch (error) {
    console.error('[Payroll] Error generating salary slips', error);
    return handleApiError(error);
  }
}

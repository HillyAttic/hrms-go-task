import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/server-auth';
import { ErrorResponses, handleApiError } from '@/lib/api-error-handler';
import { payrollAdminService } from '@/services/payroll-admin.service';
import { adminDb } from '@/lib/firebase-admin';

const panSchema = z.object({
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i),
});

/**
 * POST /api/payroll/slips/[id]/pan
 * The employee writes their own PAN. No role check — ownership is the check here.
 * Pan lives on the slip (for the payslip) and on the user (so future slips inherit it).
 */
export const POST = withAuth<{ params: Promise<{ id: string }> }>(async (request, context) => {
  try {
    const { id } = await context!.params;
    const uid = request.user!.uid;

    const slip = await payrollAdminService.getSlipById(id);
    if (!slip) return ErrorResponses.notFound('Salary slip');
    if (slip.employeeId !== uid) {
      return ErrorResponses.forbidden('You can only update your own salary slip');
    }

    const validated = panSchema.parse(await request.json());
    const formattedPan = validated.pan.toUpperCase();

    await payrollAdminService.updateSlip(id, { pan: formattedPan });
    await adminDb.collection('users').doc(uid).update({ pan: formattedPan, updatedAt: new Date() });

    return NextResponse.json({ success: true, pan: formattedPan });
  } catch (error) {
    console.error('[Payroll] Error updating PAN', error);
    return handleApiError(error);
  }
});

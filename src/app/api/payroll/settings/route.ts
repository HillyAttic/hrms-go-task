import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuthToken } from '@/lib/server-auth';
import { ErrorResponses, handleApiError } from '@/lib/api-error-handler';
import { payrollAdminService } from '@/services/payroll-admin.service';

const settingsSchema = z.object({
  companyName: z.string().min(1),
  companyAddress: z.string().min(1),
  logoUrl: z.string().nullable(),
  basicPercentage: z.number().min(0).max(100),
  hraPercentage: z.number().min(0).max(100),
  specialPercentage: z.number().min(0).max(100),
  allowedPaidLeaves: z.number().int().min(0),
  includePaidLeavesInPaidDays: z.boolean().default(false),
  footerNote: z.string(),
  salaryFormula: z.string().optional(),
});

/**
 * GET /api/payroll/settings
 * Any authenticated user — employees need company details to render their slip.
 * Returns the settings object raw (not wrapped), or null when unconfigured.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();

    const settings = await payrollAdminService.getSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('[Payroll] Error reading settings', error);
    return handleApiError(error);
  }
}

/** PUT /api/payroll/settings — admin only, replaces the singleton. */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();
    if (authResult.user.claims.role !== 'admin') {
      return ErrorResponses.forbidden('Only admins can update payroll settings');
    }

    const body = await request.json();
    const validated = settingsSchema.parse(body);

    if (validated.basicPercentage + validated.hraPercentage + validated.specialPercentage !== 100) {
      return NextResponse.json({ error: 'Percentages must sum to 100' }, { status: 400 });
    }

    await payrollAdminService.saveSettings(validated);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Payroll] Error saving settings', error);
    return handleApiError(error);
  }
}

/** PATCH /api/payroll/settings — admin only, accessConfig alone. */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();
    if (authResult.user.claims.role !== 'admin') {
      return ErrorResponses.forbidden('Only admins can update payroll settings');
    }

    const body = await request.json();
    const { accessConfig } = body ?? {};

    if (accessConfig === undefined) {
      return ErrorResponses.badRequest('No valid fields to update');
    }

    await payrollAdminService.saveSettings({ accessConfig });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Payroll] Error updating access config', error);
    return handleApiError(error);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuthToken } from '@/lib/server-auth';
import { ErrorResponses, handleApiError } from '@/lib/api-error-handler';
import { payrollAdminService } from '@/services/payroll-admin.service';

const templateSchema = z.object({
  title: z.string().min(1),
  sections: z
    .array(
      z.object({
        key: z.string().min(1),
        title: z.string().min(1),
        visible: z.boolean(),
        fields: z.array(
          z.object({
            key: z.string().min(1),
            label: z.string().min(1),
            visible: z.boolean(),
          })
        ),
      })
    )
    .min(1),
  showFooterNote: z.boolean(),
  showSlipNumber: z.boolean(),
  footerNote: z.string().optional(),
});

/** GET /api/payroll/templates — any authenticated user (employees render their slip). */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();

    const templates = await payrollAdminService.getTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    console.error('[Payroll] Error fetching templates', error);
    return handleApiError(error);
  }
}

/** POST /api/payroll/templates — admin only. */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();
    if (authResult.user.claims.role !== 'admin') {
      return ErrorResponses.forbidden('Only admins can manage slip templates');
    }

    const validated = templateSchema.parse(await request.json());
    const template = await payrollAdminService.createTemplate(validated);

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('[Payroll] Error creating template', error);
    return handleApiError(error);
  }
}

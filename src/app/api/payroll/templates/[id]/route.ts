import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuthToken } from '@/lib/server-auth';
import { ErrorResponses, handleApiError } from '@/lib/api-error-handler';
import { payrollAdminService } from '@/services/payroll-admin.service';

const updateTemplateSchema = z.object({
  title: z.string().min(1).optional(),
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
    .min(1)
    .optional(),
  showFooterNote: z.boolean().optional(),
  showSlipNumber: z.boolean().optional(),
  footerNote: z.string().optional(),
});

/** GET /api/payroll/templates/[id] — any authenticated user. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();

    const { id } = await params;
    const template = await payrollAdminService.getTemplateById(id);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('[Payroll] Error fetching template', error);
    return handleApiError(error);
  }
}

/** PUT /api/payroll/templates/[id] — admin only. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();
    if (authResult.user.claims.role !== 'admin') {
      return ErrorResponses.forbidden('Only admins can manage slip templates');
    }

    const { id } = await params;
    const existing = await payrollAdminService.getTemplateById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const validated = updateTemplateSchema.parse(await request.json());
    await payrollAdminService.updateTemplate(id, validated);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Payroll] Error updating template', error);
    return handleApiError(error);
  }
}

/** DELETE /api/payroll/templates/[id] — admin only. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();
    if (authResult.user.claims.role !== 'admin') {
      return ErrorResponses.forbidden('Only admins can manage slip templates');
    }

    const { id } = await params;
    await payrollAdminService.deleteTemplate(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Payroll] Error deleting template', error);
    return handleApiError(error);
  }
}

import { NextResponse, NextRequest } from 'next/server';
import { withAuth } from '@/lib/server-auth';
import { formSubmissionService } from '@/services/form-submission.service';
import { formTemplateService } from '@/services/form-template.service';
import { handleApiError } from '@/lib/api-error-handler';
import type { FormSubmissionFilters } from '@/types/form.types';

/**
 * GET /api/forms/templates/[id]/responses
 * Get all responses for a specific form
 * Auth: Admin/Manager or form creator
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req) => {
    try {
      const { id: formId } = await params;
      const { searchParams } = new URL(req.url);
      const { uid, claims } = req.user!;

      // Get form template
      const template = await formTemplateService.getById(formId);
      if (!template) {
        return NextResponse.json(
          { error: 'Form not found' },
          { status: 404 }
        );
      }

      // Check access: admin, manager, or form creator
      const isAdmin = claims.role === 'admin';
      const isManager = claims.role === 'manager';
      const isCreator = template.createdBy === uid;

      if (!isAdmin && !isManager && !isCreator) {
        return NextResponse.json(
          { error: 'You do not have permission to view responses for this form' },
          { status: 403 }
        );
      }

      // Build filters
      const filters: FormSubmissionFilters = {
        formId,
        page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
        limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
        startDate: searchParams.get('startDate')
          ? new Date(searchParams.get('startDate')!)
          : undefined,
        endDate: searchParams.get('endDate')
          ? new Date(searchParams.get('endDate')!)
          : undefined,
      };

      // Get submissions
      const { submissions, total } = await formSubmissionService.getAll(filters);

      return NextResponse.json({
        success: true,
        responses: submissions,
        total,
        page: filters.page || 1,
        limit: filters.limit || 50,
        form: {
          id: template.id,
          title: template.title,
          fields: template.fields,
        },
      });
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}

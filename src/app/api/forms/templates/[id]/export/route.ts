import { NextResponse, NextRequest } from 'next/server';
import { withAuth } from '@/lib/server-auth';
import { formSubmissionService } from '@/services/form-submission.service';
import { formTemplateService } from '@/services/form-template.service';
import { formExportService } from '@/services/form-export.service';
import { handleApiError } from '@/lib/api-error-handler';
import type { FormSubmissionFilters } from '@/types/form.types';

/**
 * GET /api/forms/templates/[id]/export
 * Export form responses to Excel
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
          { error: 'You do not have permission to export responses for this form' },
          { status: 403 }
        );
      }

      // Build filters
      const filters: FormSubmissionFilters = {
        formId,
        startDate: searchParams.get('startDate')
          ? new Date(searchParams.get('startDate')!)
          : undefined,
        endDate: searchParams.get('endDate')
          ? new Date(searchParams.get('endDate')!)
          : undefined,
      };

      console.log('[Export API] Date filters:', {
        startDateParam: searchParams.get('startDate'),
        endDateParam: searchParams.get('endDate'),
        startDateParsed: filters.startDate?.toISOString(),
        endDateParsed: filters.endDate?.toISOString(),
      });

      // Get all submissions (no pagination for export)
      const { submissions } = await formSubmissionService.getAll(filters);

      console.log('[Export API] Found submissions:', {
        count: submissions.length,
        submissionDates: submissions.map(s => ({
          id: s.id,
          submittedAt: s.submittedAt,
        })),
      });

      if (submissions.length === 0) {
        return NextResponse.json(
          { error: 'No submissions found to export' },
          { status: 404 }
        );
      }

      // Generate Excel file
      const fileData = await formExportService.exportToExcel(submissions, template);
      const filename = formExportService.generateFilename(template.title, 'excel');

      // Return file as download
      return new NextResponse(fileData, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}

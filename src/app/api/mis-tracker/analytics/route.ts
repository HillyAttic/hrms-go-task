import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/server-auth';
import { adminDb } from '@/lib/firebase-admin';
import { MISConfigService } from '@/services/mis-config.service';
import { flattenFormFields } from '@/utils/submission-utils';
import type { FormTemplate, FormSubmission } from '@/types/form.types';

type DateFilter = 'today' | 'yesterday' | 'this-week' | 'this-month' | 'all-time';

interface AnalyticsData {
  formId: string;
  formTitle: string;
  dateFilter: DateFilter;
  dateRange: { start: string; end: string } | null;
  totalAssigned: number;
  submittedCount: number;
  notSubmittedCount: number;
  submittedUserIds: string[];
  notSubmittedUserIds: string[];
  submissionsWithTimestamps: Record<string, string>;
  zeroResponseField: {
    fieldId: string;
    fieldLabel: string;
    count: number;
    userIds: string[];
  } | null;
}

/**
 * Calculate date range based on filter
 */
function getDateRange(filter: DateFilter): { start: Date; end: Date } | null {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  switch (filter) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'yesterday':
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;

    case 'this-week':
      // Start of week (Monday)
      const dayOfWeek = start.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days
      start.setDate(start.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'this-month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'all-time':
      return null;

    default:
      return null;
  }

  return { start, end };
}

/**
 * GET /api/mis-tracker/analytics
 * Calculate submission analytics for a form
 */
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');
    const dateFilter = (searchParams.get('dateFilter') || 'today') as DateFilter;

    if (!formId) {
      return NextResponse.json(
        { success: false, error: 'formId is required' },
        { status: 400 }
      );
    }

    // Verify user has sheet access
    const misConfigService = new MISConfigService();
    const misConfig = await misConfigService.getMISConfig();

    if (!misConfig) {
      return NextResponse.json(
        { success: false, error: 'MIS configuration not found' },
        { status: 404 }
      );
    }

    const userUid = request.user!.uid;
    const hasSheetAccess = misConfig.sheetAssignedUsers?.includes(userUid) || false;

    if (!hasSheetAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get assigned users for this form
    const formMapping = misConfig.formToUserMappings?.find(
      (mapping) => mapping.formId === formId
    );

    if (!formMapping) {
      return NextResponse.json(
        { success: false, error: 'Form not found in MIS configuration' },
        { status: 404 }
      );
    }

    const assignedUserIds = formMapping.assignedUserIds || [];
    const totalAssigned = assignedUserIds.length;

    // Get form template to find "group visit" field
    const templateDoc = await adminDb
      .collection('form_templates')
      .doc(formId)
      .get();

    if (!templateDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Form template not found' },
        { status: 404 }
      );
    }

    const template = { id: templateDoc.id, ...templateDoc.data() } as FormTemplate;

    // Find "group visit" numeric field
    const flattenedFields = flattenFormFields(template.fields);
    const groupVisitField = flattenedFields.find(
      (field) =>
        field.type === 'number' &&
        field.label.toLowerCase().includes('group visit')
    );

    // Calculate date range
    const dateRange = getDateRange(dateFilter);

    // Query submissions
    let submissionsQuery = adminDb
      .collection('form_submissions')
      .where('formId', '==', formId);

    if (dateRange) {
      submissionsQuery = submissionsQuery
        .where('submittedAt', '>=', dateRange.start)
        .where('submittedAt', '<=', dateRange.end);
    }

    const submissionsSnapshot = await submissionsQuery.get();
    const submissions = submissionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as FormSubmission[];

    // Calculate analytics
    const submittedUserIds = new Set<string>();
    const submissionsWithTimestamps: Record<string, string> = {};
    const zeroResponseUserIds = new Set<string>();

    submissions.forEach((submission) => {
      if (submission.submittedBy) {
        submittedUserIds.add(submission.submittedBy);

        // Store latest submission timestamp for each user
        const submittedAt =
          typeof submission.submittedAt === 'string'
            ? submission.submittedAt
            : submission.submittedAt?.toDate?.()?.toISOString() || new Date().toISOString();

        if (
          !submissionsWithTimestamps[submission.submittedBy] ||
          submittedAt > submissionsWithTimestamps[submission.submittedBy]
        ) {
          submissionsWithTimestamps[submission.submittedBy] = submittedAt;
        }

        // Check for zero response in group visit field
        if (groupVisitField && submission.data) {
          const fieldValue = submission.data[groupVisitField.id];
          if (fieldValue === 0 || fieldValue === '0') {
            zeroResponseUserIds.add(submission.submittedBy);
          }
        }
      }
    });

    const submittedUserIdsArray = Array.from(submittedUserIds);
    const notSubmittedUserIds = assignedUserIds.filter(
      (uid) => !submittedUserIds.has(uid)
    );

    const analyticsData: AnalyticsData = {
      formId,
      formTitle: template.title,
      dateFilter,
      dateRange: dateRange
        ? {
            start: dateRange.start.toISOString(),
            end: dateRange.end.toISOString(),
          }
        : null,
      totalAssigned,
      submittedCount: submittedUserIdsArray.length,
      notSubmittedCount: notSubmittedUserIds.length,
      submittedUserIds: submittedUserIdsArray,
      notSubmittedUserIds,
      submissionsWithTimestamps,
      zeroResponseField: groupVisitField && zeroResponseUserIds.size > 0
        ? {
            fieldId: groupVisitField.id,
            fieldLabel: groupVisitField.label,
            count: zeroResponseUserIds.size,
            userIds: Array.from(zeroResponseUserIds),
          }
        : null,
    };

    return NextResponse.json({
      success: true,
      data: analyticsData,
    });
  } catch (error) {
    console.error('Error calculating analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate analytics',
      },
      { status: 500 }
    );
  }
});

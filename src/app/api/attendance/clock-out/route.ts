import { NextRequest, NextResponse } from 'next/server';
import { attendanceAdminService } from '@/services/attendance-admin.service';
import { clockOutDataSchema } from '@/lib/attendance-validation';
import { ErrorResponses } from '@/lib/api-error-handler';
import { misConfigService } from '@/services/mis-config.service';
import { createGoogleSheetsService } from '@/services/google-sheets.service';

export async function POST(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager', 'employee'].includes(userRole)) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }

    const body = await request.json();

    const validatedData = clockOutDataSchema.parse({
      ...body,
      timestamp: new Date(body.timestamp || Date.now()),
    });

    // Check if daily form submission is required
    const misConfig = await misConfigService.getMISConfig();

    if (misConfig && misConfig.formRequiredForClockout) {
      // Check if user is assigned to the form
      const isAssigned = misConfig.formAssignedUsers.includes(authResult.user.uid);

      if (isAssigned) {
        // Validate that user has submitted the form today
        if (!misConfig.formResponseSheetId || !misConfig.googleSheetsApiKey) {
          return NextResponse.json(
            {
              error: 'Configuration Error',
              message: 'Form validation is enabled but not properly configured. Please contact admin.'
            },
            { status: 500 }
          );
        }

        try {
          const sheetsService = createGoogleSheetsService(misConfig.googleSheetsApiKey);
          const submissionCheck = await sheetsService.checkUserSubmissionToday(
            misConfig.formResponseSheetId,
            misConfig.formResponseSheetGid || '0',
            authResult.user.email || '',
            misConfig.formEmailColumnIndex ?? 1,
            misConfig.formTimestampColumnIndex ?? 0
          );

          if (!submissionCheck.submitted || !submissionCheck.isToday) {
            return NextResponse.json(
              {
                error: 'Form Submission Required',
                message: 'Please submit today\'s MIS form before clocking out. You can find the form on your dashboard.',
                requiresFormSubmission: true
              },
              { status: 400 }
            );
          }
        } catch (error: any) {
          console.error('Error checking form submission:', error);
          return NextResponse.json(
            {
              error: 'Validation Error',
              message: 'Failed to verify form submission. Please try again or contact admin.',
              details: error.message
            },
            { status: 500 }
          );
        }
      }
    }

    const record = await attendanceAdminService.clockOut(validatedData.recordId, {
      timestamp: validatedData.timestamp,
      location: validatedData.location,
      notes: validatedData.notes,
    });

    return NextResponse.json(record, { status: 200 });
  } catch (error: any) {
    console.error('Clock out error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation Error', message: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message || 'Failed to clock out' },
      { status: 500 }
    );
  }
}

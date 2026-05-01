import { NextRequest, NextResponse } from 'next/server';
import { attendanceAdminService } from '@/services/attendance-admin.service';
import { ErrorResponses } from '@/lib/api-error-handler';

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Employee ID is required' },
        { status: 400 }
      );
    }

    const status = await attendanceAdminService.getCurrentStatus(employeeId);

    // Enhance response with form submission status
    const response: any = {
      ...status,
      formSubmissionRequired: false,
      formSubmitted: false,
      dailyFormId: null
    };

    // Check MIS config for form submission requirement
    try {
      const { misConfigService } = await import('@/services/mis-config.service');
      const { formSubmissionService } = await import('@/services/form-submission.service');

      const misConfig = await misConfigService.getMISConfig();

      if (misConfig && misConfig.formRequiredForClockout) {
        const isAssigned = misConfig.formAssignedUsers.includes(employeeId);

        if (isAssigned && misConfig.dailyFormTemplateId) {
          response.formSubmissionRequired = true;
          response.dailyFormId = misConfig.dailyFormTemplateId;

          // Check if user has submitted the form today
          const submissionCheck = await formSubmissionService.checkUserSubmissionToday(
            misConfig.dailyFormTemplateId,
            employeeId
          );

          response.formSubmitted = submissionCheck.submitted;
        }
      }
    } catch (error) {
      console.error('Error checking form submission status:', error);
      // Don't fail the entire request if form check fails
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Get status error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message || 'Failed to get attendance status' },
      { status: 500 }
    );
  }
}

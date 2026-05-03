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
      dailyFormId: null,
      unsubmittedForms: []
    };

    // Check MIS config for form submission requirement
    try {
      const { misConfigService } = await import('@/services/mis-config.service');
      const { formSubmissionService } = await import('@/services/form-submission.service');

      const misConfig = await misConfigService.getMISConfig();

      // NEW: Check multi-form configuration first
      if (misConfig && misConfig.formToUserMappings && misConfig.formToUserMappings.length > 0) {
        console.log('[Status API] Checking multi-form configuration');

        // Get all forms assigned to this user that require clock-out
        const requiredForms = misConfig.formToUserMappings.filter(
          mapping => mapping.requiredForClockout && mapping.assignedUserIds.includes(employeeId)
        );

        console.log('[Status API] Required forms for user:', {
          userId: employeeId,
          requiredFormsCount: requiredForms.length,
          forms: requiredForms.map(f => ({ id: f.formId, title: f.formTitle }))
        });

        if (requiredForms.length > 0) {
          response.formSubmissionRequired = true;
          response.dailyFormId = requiredForms[0].formId; // First required form for backward compatibility

          // Check if ALL required forms are submitted
          let allSubmitted = true;
          const unsubmittedForms: string[] = [];

          for (const form of requiredForms) {
            console.log('[Status API] Checking submission for form:', {
              formId: form.formId,
              formTitle: form.formTitle,
              userId: employeeId
            });

            const submissionCheck = await formSubmissionService.checkUserSubmissionToday(
              form.formId,
              employeeId
            );

            console.log('[Status API] Submission check result:', {
              formTitle: form.formTitle,
              submitted: submissionCheck.submitted
            });

            if (!submissionCheck.submitted) {
              allSubmitted = false;
              unsubmittedForms.push(form.formTitle);
            }
          }

          response.formSubmitted = allSubmitted;
          response.unsubmittedForms = unsubmittedForms;

          console.log('[Status API] Multi-form check complete:', {
            formSubmissionRequired: response.formSubmissionRequired,
            formSubmitted: response.formSubmitted,
            unsubmittedForms: response.unsubmittedForms
          });
        } else {
          console.log('[Status API] No required forms for this user');
        }
      }
      // LEGACY: Fallback to single-form configuration for backward compatibility
      else if (misConfig && misConfig.formRequiredForClockout) {
        console.log('[Status API] Using legacy single-form configuration');

        const isAssigned = misConfig.formAssignedUsers.includes(employeeId);

        if (isAssigned && misConfig.dailyFormTemplateId) {
          response.formSubmissionRequired = true;
          response.dailyFormId = misConfig.dailyFormTemplateId;

          // Check if user has submitted the form today
          console.log('[Status API] Checking legacy form submission for:', {
            formId: misConfig.dailyFormTemplateId,
            userId: employeeId,
            date: new Date().toISOString()
          });

          const submissionCheck = await formSubmissionService.checkUserSubmissionToday(
            misConfig.dailyFormTemplateId,
            employeeId
          );

          console.log('[Status API] Legacy form submission check result:', submissionCheck);

          response.formSubmitted = submissionCheck.submitted;

          if (!submissionCheck.submitted) {
            response.unsubmittedForms = ['Daily Form']; // Generic name for legacy
          }
        }
      } else {
        console.log('[Status API] No form submission requirements configured');
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

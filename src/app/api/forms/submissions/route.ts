import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/server-auth';
import { formSubmissionService } from '@/services/form-submission.service';
import { formTemplateService } from '@/services/form-template.service';
import { handleApiError } from '@/lib/api-error-handler';
import type { FormSubmissionFilters } from '@/types/form.types';

/**
 * GET /api/forms/submissions
 * List form submissions with filters
 * Auth: Authenticated user (filtered by access)
 */
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const { uid, claims } = request.user!;

    const filters: FormSubmissionFilters = {
      formId: searchParams.get('formId') || undefined,
      submittedBy: searchParams.get('submittedBy') || undefined,
      startDate: searchParams.get('startDate')
        ? new Date(searchParams.get('startDate')!)
        : undefined,
      endDate: searchParams.get('endDate')
        ? new Date(searchParams.get('endDate')!)
        : undefined,
      page: searchParams.get('page')
        ? parseInt(searchParams.get('page')!)
        : undefined,
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!)
        : 50,
    };

    const { submissions, total } = await formSubmissionService.getAll(filters);

    // Filter submissions based on user access
    // Admin/Manager can see all, others can only see their own
    let filteredSubmissions = submissions;
    if (claims.role !== 'admin' && claims.role !== 'manager') {
      filteredSubmissions = submissions.filter((s) => s.submittedBy === uid);
    }

    return NextResponse.json({
      success: true,
      submissions: filteredSubmissions,
      total: filteredSubmissions.length,
      page: filters.page || 1,
      limit: filters.limit || 50,
    });
  } catch (error) {
    return handleApiError(error);
  }
});

/**
 * POST /api/forms/submissions
 * Submit a form
 * Auth: Based on form access control
 */
export const POST = withAuth(async (request) => {
  try {
    const body = await request.json();
    const user = request.user!;

    // Validate required fields
    if (!body.formId || !body.data) {
      return NextResponse.json(
        { error: 'Form ID and data are required' },
        { status: 400 }
      );
    }

    // Get form template
    const template = await formTemplateService.getById(body.formId);
    if (!template) {
      return NextResponse.json(
        { error: 'Form template not found' },
        { status: 404 }
      );
    }

    // Check if form is published
    if (template.status !== 'published') {
      return NextResponse.json(
        { error: 'This form is not currently accepting submissions' },
        { status: 400 }
      );
    }

    // Check if user has access to submit
    const hasAccess = formTemplateService.canUserAccess(template, {
      uid: user.uid,
      role: user.claims.role,
    });

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to submit this form' },
        { status: 403 }
      );
    }

    // Check if multiple submissions are allowed
    if (!template.settings.allowMultipleSubmissions) {
      const existing = await formSubmissionService.getAll({
        formId: body.formId,
        submittedBy: user.uid,
        limit: 1,
      });

      if (existing.submissions.length > 0) {
        return NextResponse.json(
          { error: 'You have already submitted this form' },
          { status: 400 }
        );
      }
    }

    // Fetch user profile from Firestore using Admin SDK
    let submitterName: string | undefined;

    try {
      const { adminDb } = await import('@/lib/firebase-admin');
      const userDoc = await adminDb.collection('users').doc(user.uid).get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        submitterName = userData?.displayName;
        console.log('[Form Submission] User profile from Firestore:', {
          uid: user.uid,
          displayName: userData?.displayName,
          email: userData?.email,
          hasProfile: true
        });
      } else {
        console.log('[Form Submission] No Firestore profile found for user:', user.uid);
      }
    } catch (error) {
      console.error('[Form Submission] Error fetching user profile:', error);
    }

    // Fallback chain: Firestore displayName -> Firebase Auth displayName -> email
    if (!submitterName) {
      try {
        const { adminAuth } = await import('@/lib/firebase-admin');
        const authUser = await adminAuth.getUser(user.uid);
        submitterName = authUser.displayName || user.email || undefined;
        console.log('[Form Submission] Using Firebase Auth displayName:', authUser.displayName);
      } catch (error) {
        console.error('[Form Submission] Error fetching Firebase Auth user:', error);
        submitterName = user.email || undefined;
      }
    }

    console.log('[Form Submission] Final submitter name:', submitterName);

    // Create submission
    const submissionData = {
      formId: body.formId,
      formTitle: template.title,
      submittedBy: user.uid,
      submitterEmail: user.email || undefined,
      submitterName: submitterName,
      data: body.data,
      files: body.files || [],
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    };

    console.log('[Form Submission] Submission data:', {
      submitterName: submissionData.submitterName,
      dataKeys: Object.keys(body.data),
      dataValues: body.data
    });

    const submission = await formSubmissionService.create(submissionData);

    return NextResponse.json({
      success: true,
      submission,
      message: template.settings.successMessage,
    });
  } catch (error) {
    return handleApiError(error);
  }
});

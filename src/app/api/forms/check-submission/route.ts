import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/server-auth';
import { createGoogleSheetsService } from '@/services/google-sheets.service';
import { handleApiError } from '@/lib/api-error-handler';

export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const user = request.user!;
    const body = await request.json();

    const {
      sheetId,
      gid,
      userEmail,
      emailColumnIndex = 1,
      timestampColumnIndex = 0,
      apiKey,
    } = body;

    // Validate required fields
    if (!sheetId || !gid || !userEmail || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields: sheetId, gid, userEmail, apiKey' },
        { status: 400 }
      );
    }

    // Create Google Sheets service
    const sheetsService = createGoogleSheetsService(apiKey);

    // Check if user submitted today
    const result = await sheetsService.checkUserSubmissionToday(
      sheetId,
      gid,
      userEmail,
      emailColumnIndex,
      timestampColumnIndex
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error checking form submission:', error);
    return NextResponse.json(
      {
        error: 'Failed to check form submission',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
});

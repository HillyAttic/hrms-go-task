import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withAdminAuth, AuthenticatedRequest } from '@/lib/server-auth';
import { misConfigService } from '@/services/mis-config.service';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

function validateGoogleUrl(url: string, type: 'form' | 'sheet'): boolean {
  if (!url) return true;

  try {
    const urlObj = new URL(url);

    if (urlObj.hostname !== 'docs.google.com') {
      return false;
    }

    if (type === 'form' && !urlObj.pathname.includes('/forms/')) {
      return false;
    }

    if (type === 'sheet' && !urlObj.pathname.includes('/spreadsheets/')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function convertToEmbedUrl(url: string, type: 'form' | 'sheet'): string {
  if (!url) return '';

  try {
    const urlObj = new URL(url);

    if (type === 'form') {
      if (!urlObj.searchParams.has('embedded')) {
        urlObj.searchParams.set('embedded', 'true');
      }
      return urlObj.toString();
    }

    if (type === 'sheet') {
      if (urlObj.pathname.includes('/edit')) {
        urlObj.pathname = urlObj.pathname.replace('/edit', '/htmlembed');
      }
      return urlObj.toString();
    }

    return url;
  } catch {
    return url;
  }
}

export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const user = request.user!;
    const config = await misConfigService.getMISConfig();

    if (!config) {
      return NextResponse.json({
        success: true,
        data: {
          formUrl: '',
          formAssignedUsers: [],
          sheetUrl: '',
          sheetAssignedUsers: [],
          hasFormAccess: false,
          hasSheetAccess: false,
        },
      });
    }

    const isAdmin = user.claims.role === 'admin';

    if (isAdmin) {
      return NextResponse.json({
        success: true,
        data: {
          formUrl: config.formUrl,
          formAssignedUsers: config.formAssignedUsers,
          sheetUrl: config.sheetUrl,
          sheetAssignedUsers: config.sheetAssignedUsers,
          hasFormAccess: true,
          hasSheetAccess: true,
        },
      });
    }

    const hasFormAccess = config.formAssignedUsers.includes(user.uid);
    const hasSheetAccess = config.sheetAssignedUsers.includes(user.uid);

    return NextResponse.json({
      success: true,
      data: {
        formUrl: hasFormAccess ? config.formUrl : '',
        formAssignedUsers: [],
        sheetUrl: hasSheetAccess ? config.sheetUrl : '',
        sheetAssignedUsers: [],
        hasFormAccess,
        hasSheetAccess,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
});

export const PUT = withAdminAuth(async (request: AuthenticatedRequest) => {
  try {
    const user = request.user!;
    const body = await request.json();

    const {
      formUrl,
      formAssignedUsers,
      sheetUrl,
      sheetAssignedUsers,
      formResponseSheetId,
      formResponseSheetGid,
      formEmailColumnIndex,
      formTimestampColumnIndex,
      formRequiredForClockout,
      googleSheetsApiKey,
    } = body;

    if (formUrl !== undefined && formUrl !== '') {
      if (!validateGoogleUrl(formUrl, 'form')) {
        return NextResponse.json(
          { error: 'Invalid Google Form URL. Must be a valid docs.google.com/forms URL.' },
          { status: 400 }
        );
      }
    }

    if (sheetUrl !== undefined && sheetUrl !== '') {
      if (!validateGoogleUrl(sheetUrl, 'sheet')) {
        return NextResponse.json(
          { error: 'Invalid Google Sheet URL. Must be a valid docs.google.com/spreadsheets URL.' },
          { status: 400 }
        );
      }
    }

    const updates: any = {
      updatedBy: user.uid,
    };

    if (formUrl !== undefined) {
      updates.formUrl = convertToEmbedUrl(formUrl, 'form');
    }

    if (formAssignedUsers !== undefined) {
      if (!Array.isArray(formAssignedUsers)) {
        return NextResponse.json(
          { error: 'formAssignedUsers must be an array' },
          { status: 400 }
        );
      }
      updates.formAssignedUsers = formAssignedUsers;
    }

    if (sheetUrl !== undefined) {
      updates.sheetUrl = convertToEmbedUrl(sheetUrl, 'sheet');
    }

    if (sheetAssignedUsers !== undefined) {
      if (!Array.isArray(sheetAssignedUsers)) {
        return NextResponse.json(
          { error: 'sheetAssignedUsers must be an array' },
          { status: 400 }
        );
      }
      updates.sheetAssignedUsers = sheetAssignedUsers;
    }

    // New fields for daily form validation
    if (formResponseSheetId !== undefined) {
      updates.formResponseSheetId = formResponseSheetId;
    }

    if (formResponseSheetGid !== undefined) {
      updates.formResponseSheetGid = formResponseSheetGid;
    }

    if (formEmailColumnIndex !== undefined) {
      updates.formEmailColumnIndex = formEmailColumnIndex;
    }

    if (formTimestampColumnIndex !== undefined) {
      updates.formTimestampColumnIndex = formTimestampColumnIndex;
    }

    if (formRequiredForClockout !== undefined) {
      updates.formRequiredForClockout = formRequiredForClockout;
    }

    if (googleSheetsApiKey !== undefined) {
      updates.googleSheetsApiKey = googleSheetsApiKey;
    }

    const updatedConfig = await misConfigService.updateMISConfig(updates);

    return NextResponse.json({
      success: true,
      data: updatedConfig,
    });
  } catch (error) {
    return handleApiError(error);
  }
});

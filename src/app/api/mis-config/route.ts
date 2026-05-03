import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withAdminAuth, AuthenticatedRequest } from '@/lib/server-auth';
import { misConfigService } from '@/services/mis-config.service';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const user = request.user!;
    const config = await misConfigService.getMISConfig();

    if (!config) {
      return NextResponse.json({
        success: true,
        data: {
          formToUserMappings: [],
          assignedForms: [],
          dailyFormTemplateId: '',
          formAssignedUsers: [],
          sheetAssignedUsers: [],
          formRequiredForClockout: false,
          hasFormAccess: false,
          hasSheetAccess: false,
        },
      });
    }

    const isAdmin = user.claims.role === 'admin';

    if (isAdmin) {
      // Admin gets full config including all mappings
      return NextResponse.json({
        success: true,
        data: {
          formToUserMappings: config.formToUserMappings || [],
          sheetAssignedUsers: config.sheetAssignedUsers,
          hasFormAccess: true,
          hasSheetAccess: true,
          // Legacy fields for backward compatibility
          dailyFormTemplateId: config.dailyFormTemplateId || '',
          formAssignedUsers: config.formAssignedUsers || [],
          formRequiredForClockout: config.formRequiredForClockout || false,
        },
      });
    }

    // Non-admin users: filter to only show forms assigned to them
    const assignedForms = (config.formToUserMappings || [])
      .filter(mapping => mapping.assignedUserIds.includes(user.uid))
      .map(mapping => ({
        formId: mapping.formId,
        formTitle: mapping.formTitle,
        requiredForClockout: mapping.requiredForClockout,
      }));

    const hasFormAccess = assignedForms.length > 0;
    const hasSheetAccess = config.sheetAssignedUsers.includes(user.uid);

    // For backward compatibility, also check legacy fields
    const legacyHasFormAccess = config.formAssignedUsers?.includes(user.uid) || false;

    return NextResponse.json({
      success: true,
      data: {
        assignedForms,
        hasFormAccess: hasFormAccess || legacyHasFormAccess,
        hasSheetAccess,
        // Legacy fields for backward compatibility
        dailyFormTemplateId: (hasFormAccess || legacyHasFormAccess) ? config.dailyFormTemplateId || '' : '',
        formAssignedUsers: [],
        sheetAssignedUsers: [],
        formRequiredForClockout: config.formRequiredForClockout || false,
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
      formToUserMappings,
      sheetAssignedUsers,
      // Legacy fields
      dailyFormTemplateId,
      formAssignedUsers,
      formRequiredForClockout,
    } = body;

    // Validate formToUserMappings if provided
    if (formToUserMappings !== undefined) {
      if (!Array.isArray(formToUserMappings)) {
        return NextResponse.json(
          { success: false, error: 'formToUserMappings must be an array' },
          { status: 400 }
        );
      }

      // Validate each mapping
      const { formTemplateService } = await import('@/services/form-template.service');

      for (const mapping of formToUserMappings) {
        if (!mapping.formId || !mapping.assignedUserIds || !Array.isArray(mapping.assignedUserIds)) {
          return NextResponse.json(
            { success: false, error: 'Invalid mapping structure' },
            { status: 400 }
          );
        }

        // Validate form exists and is published
        const template = await formTemplateService.getById(mapping.formId);
        if (!template) {
          return NextResponse.json(
            { success: false, error: `Form template not found: ${mapping.formId}` },
            { status: 400 }
          );
        }

        if (template.status !== 'published') {
          return NextResponse.json(
            { success: false, error: `Form must be published: ${template.title}` },
            { status: 400 }
          );
        }

        // Denormalize formTitle for display
        mapping.formTitle = template.title;
      }
    }

    // Validate legacy form template ID if provided
    if (dailyFormTemplateId) {
      const { formTemplateService } = await import('@/services/form-template.service');
      const template = await formTemplateService.getById(dailyFormTemplateId);

      if (!template) {
        return NextResponse.json(
          { success: false, error: 'Form template not found' },
          { status: 400 }
        );
      }

      if (template.status !== 'published') {
        return NextResponse.json(
          { success: false, error: 'Only published forms can be used as daily forms' },
          { status: 400 }
        );
      }
    }

    // Validate user arrays
    if (formAssignedUsers && !Array.isArray(formAssignedUsers)) {
      return NextResponse.json(
        { success: false, error: 'formAssignedUsers must be an array' },
        { status: 400 }
      );
    }

    if (sheetAssignedUsers && !Array.isArray(sheetAssignedUsers)) {
      return NextResponse.json(
        { success: false, error: 'sheetAssignedUsers must be an array' },
        { status: 400 }
      );
    }

    const updatedConfig = await misConfigService.updateMISConfig({
      formToUserMappings,
      sheetAssignedUsers,
      // Legacy fields
      dailyFormTemplateId,
      formAssignedUsers,
      formRequiredForClockout,
      updatedBy: user.uid,
    });

    return NextResponse.json({
      success: true,
      data: updatedConfig,
    });
  } catch (error) {
    return handleApiError(error);
  }
});

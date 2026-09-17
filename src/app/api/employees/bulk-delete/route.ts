import { NextRequest, NextResponse } from 'next/server';
import { employeeAdminService } from '@/services/employee-admin.service';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * POST /api/employees/bulk-delete
 * Delete multiple employees using Admin SDK
 */
export async function POST(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (userRole !== 'admin') {
      return ErrorResponses.forbidden('Admin access required');
    }

    const body = await request.json();
    const { employeeIds } = body;

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json(
        { error: 'employeeIds must be a non-empty array' },
        { status: 400 }
      );
    }

    console.log(`=== BULK DELETE REQUEST ===`);
    console.log(`Deleting ${employeeIds.length} employees`);

    const results = {
      success: [] as string[],
      failed: [] as { id: string; error: string }[],
    };

    // Delete employees one by one using Admin SDK
    for (const id of employeeIds) {
      // Deleting your own account would delete your Firebase Auth login too
      if (id === authResult.user.uid) {
        results.failed.push({ id, error: 'Cannot delete your own account' });
        continue;
      }
      try {
        await employeeAdminService.delete(id);
        results.success.push(id);
        console.log(`✓ Deleted employee: ${id}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.failed.push({ id, error: errorMessage });
        console.error(`✗ Failed to delete employee ${id}:`, errorMessage);
      }
    }

    console.log(`=== BULK DELETE COMPLETE ===`);
    console.log(`Success: ${results.success.length}, Failed: ${results.failed.length}`);

    return NextResponse.json({
      message: `Deleted ${results.success.length} of ${employeeIds.length} employees`,
      results,
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    return handleApiError(error);
  }
}

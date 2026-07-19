import { NextRequest, NextResponse } from 'next/server';
import { projectAdminService } from '@/services/project-admin.service';
import { ErrorResponses, handleApiError } from '@/lib/api-error-handler';

/**
 * POST /api/projects/bulk-delete
 * Delete multiple projects at once
 */
export async function POST(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: ids must be a non-empty array' },
        { status: 400 }
      );
    }

    // Delete projects in parallel
    const deletePromises = ids.map((id: string) => projectAdminService.delete(id));
    await Promise.all(deletePromises);

    return NextResponse.json(
      { message: `Successfully deleted ${ids.length} project(s)`, count: ids.length },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API /api/projects/bulk-delete] Error:', error);
    return handleApiError(error);
  }
}

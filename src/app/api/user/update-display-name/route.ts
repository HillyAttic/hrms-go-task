import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/server-auth';
import { roleManagementService } from '@/services/role-management.service';

export const POST = withAuth(async (request) => {
  try {
    const { displayName } = await request.json();
    const { uid } = request.user!;

    if (!displayName || typeof displayName !== 'string') {
      return NextResponse.json(
        { error: 'Display name is required' },
        { status: 400 }
      );
    }

    // Update user profile in Firestore
    await roleManagementService.updateUserProfile(uid, {
      displayName: displayName.trim(),
    });

    return NextResponse.json({
      success: true,
      message: 'Display name updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating display name:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update display name' },
      { status: 500 }
    );
  }
});

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/server-auth';
import { roleManagementService } from '@/services/role-management.service';

export const GET = withAuth(async (request) => {
  const { uid, email } = request.user!;

  const userProfile = await roleManagementService.getUserProfile(uid);

  return NextResponse.json({
    uid,
    email,
    userProfile,
    hasDisplayName: !!userProfile?.displayName,
    displayNameValue: userProfile?.displayName || null,
  });
});

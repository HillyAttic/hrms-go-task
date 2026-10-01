import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ErrorResponses, handleApiError } from '@/lib/api-error-handler';
import { storePassword } from '@/services/employee-credential.service';

const changePasswordSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * Self-service password change behind /auth/forgot-password, for users who know
 * their current password and do not want to wait on a reset email.
 *
 * ponytail: no rate limit here — every attempt goes through Firebase Auth's
 * sign-in, which already throttles per-IP and per-account, and the API key is
 * public so a direct call is just as available. Add a fixed-window limiter if
 * this ever moves off Firebase Auth.
 */
export async function POST(request: Request) {
  try {
    const parsed = changePasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      return ErrorResponses.badRequest(parsed.error.issues[0]?.message || 'Invalid request');
    }

    const { email, currentPassword, newPassword } = parsed.data;

    // Verify by signing in. Unknown email, wrong password and disabled account
    // all return the same message so this cannot be used to enumerate accounts.
    try {
      // ponytail: mirrors the existing check in api/employees/[id]/route.ts.
      // Uses the shared server-side auth singleton, which is not designed for
      // concurrent use — swap for a stateless Identity Toolkit REST call if it
      // ever misbehaves under load.
      await signInWithEmailAndPassword(auth, email, currentPassword);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Email or current password is incorrect' },
        { status: 401 }
      );
    }

    const { adminAuth } = await import('@/lib/firebase-admin');
    const user = await adminAuth.getUserByEmail(email);
    await adminAuth.updateUser(user.uid, { password: newPassword });
    // A changed password must not leave the old session alive for up to an hour.
    await adminAuth.revokeRefreshTokens(user.uid);

    // Keep the admin-visible copy in sync. Non-fatal: the password is already
    // changed, and a missing ENCRYPTION_KEY should not fail the request.
    try {
      await storePassword(user.uid, newPassword);
    } catch (error) {
      console.error('[API] Failed to store encrypted password copy:', error);
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}

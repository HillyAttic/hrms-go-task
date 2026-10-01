import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/server-auth';
import { handleApiError } from '@/lib/api-error-handler';
import { revealPassword } from '@/services/employee-credential.service';

/**
 * Reveal an employee's stored password. Admin only — the sibling employee
 * routes also allow managers, this one must not.
 *
 * Returns `password: null` (not 404) when nothing is stored, so the modal can
 * render "not available" without an error toast.
 */
export const GET = withAdminAuth<{ params: Promise<{ id: string }> }>(async (request, context) => {
  try {
    const { id } = await context!.params;
    const credential = await revealPassword(id);

    return NextResponse.json({
      success: true,
      password: credential?.password ?? null,
      updatedAt: credential?.updatedAt ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
});

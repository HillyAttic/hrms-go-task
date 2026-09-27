/**
 * verifyAuthToken must strip the "Bearer " scheme exactly, keeping the token verbatim.
 *
 * A token extracted with a leading space (`split('Bearer')` on "Bearer x.y.z") still has
 * its 3 dot-separated segments, so it is not rejected up front — Firebase Admin fails it
 * as `auth/argument-error`, surfacing to the user as a session-wide 401 loop
 * ("API rejected the session (401) — signing out").
 *
 * @jest-environment node
 */
jest.mock('@/lib/firebase-admin', () => ({
  __esModule: true,
  default: { auth: jest.fn() },
  adminDb: { collection: jest.fn() },
}));

import { verifyAuthToken } from '@/lib/server-auth';

const TOKEN = 'header.payload.signature';

function requestWith(authorization?: string) {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'authorization' ? authorization ?? null : null,
    },
  } as any;
}

describe('verifyAuthToken authorization header', () => {
  it('passes the token through verbatim, with no leading space', async () => {
    const verifyIdToken = jest.fn().mockResolvedValue({ uid: 'u1' });
    jest.requireMock('@/lib/firebase-admin').default.auth.mockReturnValue({ verifyIdToken });
    jest.requireMock('@/lib/firebase-admin').adminDb.collection.mockReturnValue({
      doc: () => ({
        get: async () => ({ exists: true, data: () => ({ employeeId: 'E1' }) }),
      }),
    });

    const result = await verifyAuthToken(requestWith(`Bearer ${TOKEN}`));

    expect(result.success).toBe(true);
    expect(verifyIdToken).toHaveBeenCalledWith(TOKEN, true);
  });

  it.each([
    ['missing header', undefined],
    ['wrong scheme', `Basic ${TOKEN}`],
    ['bare token', TOKEN],
  ])('rejects a %s', async (_label, header) => {
    const result = await verifyAuthToken(requestWith(header as string | undefined));
    expect(result.success).toBe(false);
  });
});

/**
 * installAuthFailureHandler: a 401 from our API must sign the user out, so a
 * deleted account is kicked to /auth/sign-in instead of sitting on a dead session.
 */
jest.mock('@/lib/firebase', () => ({ auth: { currentUser: { uid: 'u1' } } }));
jest.mock('firebase/auth', () => ({
  signOut: jest.fn(() => Promise.resolve()),
  onAuthStateChanged: jest.fn(),
}));

import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { installAuthFailureHandler } from '@/lib/api-client';

const mockedSignOut = signOut as unknown as jest.Mock;
const mockedAuth = auth as unknown as { currentUser: { uid: string } | null };

describe('installAuthFailureHandler', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    mockedSignOut.mockClear();
    mockedAuth.currentUser = { uid: 'u1' };
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function installWith(status: number, url = '/api/employees') {
    global.fetch = jest.fn().mockResolvedValue({ status }) as any;
    installAuthFailureHandler();
    return global.fetch(url);
  }

  it('signs out on a 401 from the API', async () => {
    await installWith(401);
    expect(mockedSignOut).toHaveBeenCalledWith(auth);
  });

  it('leaves the session alone on other statuses', async () => {
    await installWith(403);
    expect(mockedSignOut).not.toHaveBeenCalled();
  });

  it('ignores 401s that are not API calls', async () => {
    await installWith(401, 'https://storage.example.com/file.png');
    expect(mockedSignOut).not.toHaveBeenCalled();
  });

  it('does not sign out when nobody is signed in', async () => {
    mockedAuth.currentUser = null;
    await installWith(401);
    expect(mockedSignOut).not.toHaveBeenCalled();
  });

  it('returns the original response untouched', async () => {
    const response = await installWith(401);
    expect(response.status).toBe(401);
  });
});

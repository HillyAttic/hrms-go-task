/**
 * authenticatedFetch must not stamp Content-Type on a FormData body: the browser
 * sets multipart/form-data with the boundary, and overriding it makes Next's
 * request.formData() throw "Content-Type was not one of ...". (theme logo upload)
 */
jest.mock('@/lib/firebase', () => ({
  auth: { currentUser: { getIdToken: jest.fn(async () => 'tok') } },
}));
jest.mock('firebase/auth', () => ({
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

import { authenticatedFetch } from '@/lib/api-client';

describe('authenticatedFetch', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const headersOf = () => (global.fetch as jest.Mock).mock.calls[0][1].headers;

  it('leaves Content-Type unset for FormData so the boundary survives', async () => {
    await authenticatedFetch('/api/theme-config/upload', { method: 'POST', body: new FormData() });
    expect(headersOf()['Content-Type']).toBeUndefined();
    expect(headersOf()['Authorization']).toBe('Bearer tok');
  });

  it('still sends JSON by default', async () => {
    await authenticatedFetch('/api/thing', { method: 'POST', body: JSON.stringify({ a: 1 }) });
    expect(headersOf()['Content-Type']).toBe('application/json');
  });
});

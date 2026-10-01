/**
 * The admin password reveal is only trustworthy if the password that goes in
 * comes back out unchanged, and if a missing record reads as "unavailable"
 * rather than a crash or a blank string.
 */

process.env.ENCRYPTION_KEY = '0123456789abcdef'.repeat(4); // 64 hex chars

// A factory, not an automock: automocking this module loads the real one, which
// pulls in firebase-admin's ESM-only `jose` and blows up on the import.
// Keep `adminDb` itself stable and swap the inner mock — the service's lazy
// import() captures the property by value, so reassigning adminDb wholesale
// would leave later tests talking to the first test's fake.
jest.mock('@/lib/firebase-admin', () => ({ adminDb: { collection: jest.fn() } }));

/** Point the lazily-imported adminDb at a fake credential doc ref. */
function mockCredentialDoc(ref: any) {
  require('@/lib/firebase-admin').adminDb.collection.mockReturnValue({
    doc: jest.fn(() => ref),
  });
}

describe('employee-credential.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores the password encrypted and reveals it unchanged', async () => {
    const ref: any = {
      set: jest.fn(),
      get: jest.fn(async () => ({
        exists: true,
        data: () => ({ encryptedPassword: ref.set.mock.calls[0][0].encryptedPassword, updatedAt: null }),
      })),
    };
    mockCredentialDoc(ref);

    const { storePassword, revealPassword } = require('@/services/employee-credential.service');
    await storePassword('uid-1', 'Sup3r-Secret!');

    const stored = ref.set.mock.calls[0][0].encryptedPassword;
    expect(stored).not.toContain('Sup3r-Secret!');
    expect(stored).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);

    await expect(revealPassword('uid-1')).resolves.toEqual({
      password: 'Sup3r-Secret!',
      updatedAt: null,
    });
  });

  it('returns null for an employee with no stored credential', async () => {
    mockCredentialDoc({ get: jest.fn(async () => ({ exists: false })) });

    const { revealPassword } = require('@/services/employee-credential.service');
    await expect(revealPassword('nobody')).resolves.toBeNull();
  });

  it('returns null instead of throwing when the ciphertext cannot be decrypted', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockCredentialDoc({
      get: jest.fn(async () => ({ exists: true, data: () => ({ encryptedPassword: 'not-valid' }) })),
    });

    const { revealPassword } = require('@/services/employee-credential.service');
    await expect(revealPassword('uid-2')).resolves.toBeNull();

    errorSpy.mockRestore();
  });
});

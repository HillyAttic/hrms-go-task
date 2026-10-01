import { encrypt, decrypt } from '@/lib/encryption';

/**
 * Encrypted copy of each employee's password, so an admin can look it up later.
 * Firebase Auth hashes passwords and will not hand them back, so the plaintext
 * has to be kept separately if it is ever to be recoverable.
 *
 * Deliberately its own collection rather than a field on `users/{uid}`:
 * `employee-admin.service.ts` serializes the user doc and `/api/admin/users`
 * spreads it raw, so a field there would leak. Firestore rules deny all client
 * access by default, and only the admin-only reveal route reads this.
 */
const COLLECTION = 'employee_credentials';

export interface StoredCredential {
  password: string;
  updatedAt: Date | null;
}

export async function storePassword(uid: string, plainPassword: string): Promise<void> {
  const { adminDb } = await import('@/lib/firebase-admin');
  await adminDb
    .collection(COLLECTION)
    .doc(uid)
    .set({ encryptedPassword: encrypt(plainPassword), updatedAt: new Date() }, { merge: true });
}

/**
 * Returns null when nothing is stored (employees created before this existed)
 * or when the stored ciphertext can no longer be decrypted — e.g. ENCRYPTION_KEY
 * was rotated. Callers show "not available" rather than a blank or a 500.
 */
export async function revealPassword(uid: string): Promise<StoredCredential | null> {
  const { adminDb } = await import('@/lib/firebase-admin');
  const doc = await adminDb.collection(COLLECTION).doc(uid).get();
  const data = doc.exists ? (doc.data() as any) : null;
  if (!data?.encryptedPassword) return null;

  try {
    return {
      password: decrypt(data.encryptedPassword),
      updatedAt: data.updatedAt?.toDate?.() ?? null,
    };
  } catch (error) {
    console.error('[EmployeeCredential] decrypt failed — ENCRYPTION_KEY changed?', error);
    return null;
  }
}

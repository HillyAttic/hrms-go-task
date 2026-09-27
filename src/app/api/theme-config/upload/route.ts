import { NextResponse } from 'next/server';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/server-auth';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

const MAX_BYTES = 512 * 1024;
const ALLOWED = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];

export const POST = withAdminAuth(async (request: AuthenticatedRequest) => {
  try {
    const form = await request.formData();
    const file = form.get('file');
    const kind = String(form.get('kind') || 'logo');

    if (!(file instanceof File)) return ErrorResponses.badRequest('No file provided');
    if (!ALLOWED.includes(file.type)) {
      return ErrorResponses.badRequest('Logo must be a PNG, JPEG, WebP or SVG');
    }
    if (file.size > MAX_BYTES) {
      return ErrorResponses.badRequest('Logo must be under 512 KB');
    }

    const { adminStorage } = await import('@/lib/firebase-admin');
    const ext = file.type.split('/')[1].replace('svg+xml', 'svg');
    const path = `theme/${kind}-${Date.now()}.${ext}`;

    const bucket = adminStorage.bucket();
    const token = crypto.randomUUID();
    await bucket.file(path).save(Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      metadata: { metadata: { firebaseStorageDownloadTokens: token } },
    });

    // Public download URL with the token — the bucket is not public-read, so this
    // tokenised URL is what lets <img src> load the logo for signed-in users.
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
    return NextResponse.json({ success: true, url });
  } catch (error) {
    return handleApiError(error);
  }
});
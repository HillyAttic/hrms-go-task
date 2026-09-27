import { NextResponse } from 'next/server';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/server-auth';
import { handleApiError } from '@/lib/api-error-handler';
import { COLOR_KEYS, FONTS } from '@/lib/theme-config';

const VALID_FONTS = FONTS.map((f) => f.value) as readonly string[];
const HEX = /^#[0-9a-f]{6}$/i;

/**
 * Theme config lives in a single Firestore doc. Kept out of the shared
 * `settings` collection naming so it cannot collide with other settings docs.
 */
const DOC = () => import('@/lib/firebase-admin').then((m) => m.adminDb.doc('settings/theme'));

/** Drop anything that is not an editable token or a known layout value. */
function sanitize(input: any) {
  const colors = (raw: any) => {
    const out: Record<string, string> = {};
    for (const key of COLOR_KEYS) {
      const value = raw?.[key];
      if (typeof value === 'string' && HEX.test(value)) out[key] = value;
    }
    return out;
  };

  const clamp = (value: any, min: number, max: number, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value)
      ? Math.min(max, Math.max(min, value))
      : fallback;

  const font = (value: any, fallback: string) =>
    typeof value === 'string' && VALID_FONTS.includes(value) ? value : fallback;

  const url = (value: any) =>
    typeof value === 'string' && /^(https?:\/\/|\/)/.test(value) ? value.slice(0, 2048) : undefined;

  return {
    base: colors(input?.base),
    dark: colors(input?.dark),
    fontSans: font(input?.fontSans, 'Inter'),
    fontDisplay: font(input?.fontDisplay, 'Space Grotesk'),
    fontScale: clamp(input?.fontScale, 12, 20, 16),
    radius: clamp(input?.radius, 0, 32, 20),
    sidebarWidth: clamp(input?.sidebarWidth, 200, 400, 290),
    headerHeight: clamp(input?.headerHeight, 56, 120, 70),
    logoLight: url(input?.logoLight),
    logoDark: url(input?.logoDark),
    logoIcon: url(input?.logoIcon),
  };
}

// Public read: every client applies the theme, and the values are just colours.
// Writing stays admin-only.
export async function GET() {
  try {
    const doc = await DOC();
    const snap = await doc.get();
    return NextResponse.json({ success: true, data: snap.exists ? snap.data() : null });
  } catch (error) {
    return handleApiError(error);
  }
}

export const PUT = withAdminAuth(async (request: AuthenticatedRequest) => {
  try {
    const user = request.user!;
    const config = sanitize(await request.json());
    const doc = await DOC();
    // Firestore rejects a document containing `undefined`, and `sanitize` leaves
    // the logo keys undefined when none has been uploaded — strip them.
    const stored = Object.fromEntries(Object.entries(config).filter(([, v]) => v !== undefined));
    await doc.set({ ...stored, updatedAt: new Date(), updatedBy: user.uid });
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    return handleApiError(error);
  }
});
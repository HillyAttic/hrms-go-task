import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

/**
 * POST /api/payroll/verify-access — the pre-login gate for the payroll console.
 *
 * Deliberately NOT auth-gated: it runs before the panel unlocks, and the password
 * is a UX speed bump, not an authorization boundary. Real authorization is the
 * role check on every other /api/payroll route.
 */

const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 10;

/** Per-IP attempt timestamps. In-memory: resets on deploy, per instance. */
const attempts = new Map<string, number[]>();

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function tooManyAttempts(ip: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(ip) ?? []).filter((time) => now - time < WINDOW_MS);
  attempts.set(ip, recent);
  return recent.length >= MAX_ATTEMPTS;
}

function recordAttempt(ip: string): void {
  const recent = attempts.get(ip) ?? [];
  recent.push(Date.now());
  attempts.set(ip, recent);
}

/** Constant-time compare; mismatched lengths still burn a comparison. */
function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  if (bufferA.length !== bufferB.length) {
    timingSafeEqual(bufferA, bufferA);
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);

  if (tooManyAttempts(ip)) {
    return NextResponse.json(
      { success: false, error: 'Too many attempts. Try again later.' },
      { status: 429 }
    );
  }

  const expected = process.env.PAYROLL_ACCESS_PASSWORD;
  if (!expected) {
    console.warn('[Payroll] PAYROLL_ACCESS_PASSWORD is not configured — refusing access');
    return NextResponse.json(
      { success: false, error: 'Access not configured. Contact administrator.' },
      { status: 403 }
    );
  }

  let password: unknown;
  try {
    ({ password } = await request.json());
  } catch {
    password = undefined;
  }

  if (typeof password !== 'string' || password.trim() === '') {
    return NextResponse.json({ success: false, error: 'Password is required' }, { status: 400 });
  }

  if (!safeEqual(password.trim(), expected)) {
    // Only failures count toward the throttle, so a legitimate unlock is never locked out.
    recordAttempt(ip);
    return NextResponse.json({ success: false, error: 'Incorrect password' }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}

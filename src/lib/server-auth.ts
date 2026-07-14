import { NextRequest, NextResponse } from 'next/server';
import { UserRole, CustomClaims } from '@/types/auth.types';
import admin from '@/lib/firebase-admin';
import { adminDb } from '@/lib/firebase-admin';

/**
 * Server-side authentication utilities for API routes
 * Uses Firebase Admin SDK for secure token verification
 */

// In-memory cache for user profiles to avoid Firestore reads on every API call
// key: uid, value: { data, timestamp }
const USER_PROFILE_CACHE = new Map<string, { data: any; timestamp: number }>();
const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedProfile(uid: string): any | null {
  const cached = USER_PROFILE_CACHE.get(uid);
  if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_TTL) {
    return cached.data;
  }
  if (cached) USER_PROFILE_CACHE.delete(uid);
  return null;
}

function setCachedProfile(uid: string, data: any): void {
  USER_PROFILE_CACHE.set(uid, { data, timestamp: Date.now() });
}

export function invalidateProfileCache(uid: string): void {
  USER_PROFILE_CACHE.delete(uid);
}

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    uid: string;
    email: string | null;
    claims: CustomClaims;
  };
}

/**
 * Extract and verify Firebase ID token from request headers using Firebase Admin SDK
 */
export async function verifyAuthToken(request: NextRequest): Promise<{
  success: boolean;
  user?: {
    uid: string;
    email: string | null;
    claims: CustomClaims;
  };
  error?: string;
}> {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Missing or invalid authorization header',
      };
    }

    const idToken = authHeader.split('Bearer ')[1];

    if (!idToken) {
      return {
        success: false,
        error: 'Missing ID token',
      };
    }

    // Verify the ID token using Firebase Admin SDK
    // Pass false for checkRevoked to speed up verification (skip extra network call)
    const decodedToken = await admin.auth().verifyIdToken(idToken, false);

    if (!decodedToken || !decodedToken.uid) {
      return {
        success: false,
        error: 'Invalid token',
      };
    }

    // Try to get user profile from cache first (avoids Firestore read on every API call)
    let userData = getCachedProfile(decodedToken.uid);
    let userDocExists = true;

    if (!userData) {
      // Cache miss — fetch from Firestore and cache for 5 minutes
      const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();

      if (!userDoc.exists) {
        console.warn(`[Auth] User profile not found at users/${decodedToken.uid}. Auto-creating minimal profile.`);
        userDocExists = false;

        // Auto-create a minimal user profile so API calls don't fail
        // This handles cases where Firebase Auth user exists but Firestore doc wasn't created
        const minimalProfile = {
          email: decodedToken.email || '',
          displayName: decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
          role: (decodedToken.role as UserRole) || 'employee',
          permissions: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastRoleUpdate: new Date().toISOString(),
        };

        try {
          await adminDb.collection('users').doc(decodedToken.uid).set(minimalProfile);
          userData = minimalProfile;
          setCachedProfile(decodedToken.uid, userData);
          console.log(`[Auth] Auto-created user profile for ${decodedToken.uid}`);
        } catch (createError) {
          console.error('[Auth] Failed to auto-create user profile:', createError);
          return {
            success: false,
            error: 'User profile not found and could not be created',
          };
        }
      } else {
        userData = userDoc.data();
        setCachedProfile(decodedToken.uid, userData);
      }
    }

    const role = (decodedToken.role as UserRole) || userData?.role || 'employee';

    // Build custom claims
    const claims: CustomClaims = {
      role,
      permissions: userData?.permissions || [],
      isAdmin: role === 'admin',
      createdAt: userData?.createdAt || new Date().toISOString(),
      lastRoleUpdate: userData?.lastRoleUpdate || new Date().toISOString(),
    };

    return {
      success: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email || null,
        claims,
      },
    };
  } catch (error: any) {
    console.error('[Auth] Token verification error:', {
      code: error.code,
      message: error.message,
      details: error.details,
    });

    // Provide specific error messages for common issues
    if (error.code === 'auth/id-token-expired') {
      return {
        success: false,
        error: 'Token expired. Please sign in again.',
      };
    }

    if (error.code === 'auth/id-token-revoked') {
      return {
        success: false,
        error: 'Token revoked. Please sign in again.',
      };
    }

    if (error.code === 'auth/argument-error') {
      return {
        success: false,
        error: 'Invalid token format',
      };
    }

    return {
      success: false,
      error: 'Token verification failed',
    };
  }
}

/**
 * Middleware to protect API routes with authentication
 */
export function withAuth<T = any>(
  handler: (request: AuthenticatedRequest, context?: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: T): Promise<NextResponse> => {
    const authResult = await verifyAuthToken(request);

    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication failed' },
        { status: 401 }
      );
    }

    // Add user info to request
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = authResult.user;

    return handler(authenticatedRequest, context);
  };
}

/**
 * Middleware to protect API routes with role-based access control
 */
export function withRoleAuth<T = any>(
  allowedRoles: UserRole[],
  handler: (request: AuthenticatedRequest, context?: T) => Promise<NextResponse>
) {
  return withAuth(async (request: AuthenticatedRequest, context?: T): Promise<NextResponse> => {
    const userRole = request.user?.claims.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return handler(request, context);
  });
}

/**
 * Middleware to protect API routes with permission-based access control
 */
export function withPermissionAuth<T = any>(
  requiredPermissions: string[],
  handler: (request: AuthenticatedRequest, context?: T) => Promise<NextResponse>
) {
  return withAuth(async (request: AuthenticatedRequest, context?: T): Promise<NextResponse> => {
    const userPermissions = request.user?.claims.permissions || [];

    const hasAllPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return handler(request, context);
  });
}

/**
 * Admin-only API route protection
 */
export function withAdminAuth<T = any>(
  handler: (request: AuthenticatedRequest, context?: T) => Promise<NextResponse>
) {
  return withRoleAuth(['admin'], handler);
}

/**
 * Manager+ API route protection (admin and manager roles)
 */
export function withManagerAuth<T = any>(
  handler: (request: AuthenticatedRequest, context?: T) => Promise<NextResponse>
) {
  return withRoleAuth(['admin', 'manager'], handler);
}

/**
 * Extract user ID from authenticated request
 */
export function getUserId(request: AuthenticatedRequest): string | null {
  return request.user?.uid || null;
}

/**
 * Extract user role from authenticated request
 */
export function getUserRole(request: AuthenticatedRequest): UserRole | null {
  return request.user?.claims.role || null;
}

/**
 * Check if user has specific permission
 */
export function hasPermission(
  request: AuthenticatedRequest,
  permission: string
): boolean {
  const userPermissions = request.user?.claims.permissions || [];
  return userPermissions.includes(permission);
}

/**
 * Check if user has specific role
 */
export function hasRole(
  request: AuthenticatedRequest,
  role: UserRole | UserRole[]
): boolean {
  const userRole = request.user?.claims.role;
  if (!userRole) return false;

  if (Array.isArray(role)) {
    return role.includes(userRole);
  }

  return userRole === role;
}

/**
 * Create error response for authentication failures
 */
export function createAuthErrorResponse(
  message: string,
  status: number = 401
): NextResponse {
  return NextResponse.json(
    { error: message },
    { status }
  );
}

/**
 * Create error response for authorization failures
 */
export function createAuthzErrorResponse(
  message: string = 'Insufficient permissions'
): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}
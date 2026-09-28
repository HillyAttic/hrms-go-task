import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// Cached auth promise to avoid re-subscribing
let authReadyPromise: Promise<void> | null = null;

let authFailureHandlerInstalled = false;

/**
 * Sign the user out the moment the API rejects their session.
 *
 * A deleted (or revoked) account keeps a still-valid ID token until it expires, so
 * the server answers 401 on its next request. API calls are made from all over the
 * app — some through authenticatedFetch, many hand-rolled with getIdToken() + fetch
 * — so the 401 is caught once at the fetch level instead of at 17 call sites.
 * AuthWrapper renders the redirect as soon as the user becomes null.
 *
 * Call once, before the first API request (see AuthWrapper).
 */
export function installAuthFailureHandler(): void {
  if (authFailureHandlerInstalled || typeof window === 'undefined') return;
  authFailureHandlerInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input, init);

    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    // auth.currentUser is null once signed out, so a burst of parallel 401s signs out once
    if (response.status === 401 && url.includes('/api/') && auth.currentUser) {
      console.warn('[auth] API rejected the session (401) — signing out');
      signOut(auth).catch((error) => console.error('[auth] Sign-out failed:', error));
    }

    return response;
  };
}

/**
 * Wait for Firebase auth to be ready using onAuthStateChanged (event-driven, not polling)
 */
function waitForAuth(maxWaitMs: number = 5000): Promise<void> {
  // If user is already available, resolve immediately
  if (auth.currentUser) return Promise.resolve();

  // Reuse existing promise if already waiting
  if (authReadyPromise) return authReadyPromise;

  authReadyPromise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      authReadyPromise = null;
      reject(new Error('User not authenticated - auth timeout'));
    }, maxWaitMs);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        clearTimeout(timeout);
        unsubscribe();
        authReadyPromise = null;
        resolve();
      }
    });
  });

  return authReadyPromise;
}

/**
 * Make authenticated API requests
 * Automatically adds Firebase ID token to Authorization header
 * Uses cached token when possible (avoids network call on every request)
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    // Wait for auth to be ready (event-driven, not polling)
    await waitForAuth();

    const user = auth.currentUser;

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Use cached ID token (false = don't force refresh unless expired)
    // This is much faster than getIdToken(true) which always makes a network call
    const token = await user.getIdToken(false);

    // Add Authorization header. FormData/Blob bodies must keep the browser-set
    // Content-Type (it carries the multipart boundary), so leave it unset there.
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
      'Authorization': `Bearer ${token}`,
    };
    if (!isFormData) headers['Content-Type'] = 'application/json';

    return fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error('Authenticated fetch error:', error);
    throw error;
  }
}

/**
 * Helper for GET requests
 */
export async function apiGet(url: string): Promise<any> {
  const response = await authenticatedFetch(url);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error}`);
  }
  return response.json();
}

/**
 * Helper for POST requests
 */
export async function apiPost(url: string, data: any): Promise<any> {
  const response = await authenticatedFetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error}`);
  }
  return response.json();
}

/**
 * Helper for PUT requests
 */
export async function apiPut(url: string, data: any): Promise<any> {
  const response = await authenticatedFetch(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error}`);
  }
  return response.json();
}

/**
 * Helper for DELETE requests
 */
export async function apiDelete(url: string): Promise<any> {
  const response = await authenticatedFetch(url, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error}`);
  }
  return response.json();
}

/**
 * Helper for PATCH requests
 */
export async function apiPatch(url: string, data: any): Promise<any> {
  const response = await authenticatedFetch(url, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error}`);
  }
  return response.json();
}

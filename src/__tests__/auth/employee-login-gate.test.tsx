/**
 * Login ≠ access.
 *
 * An account that authenticates with Firebase but has no users/{uid}.employeeId is not
 * in /employees, so it must not become `user` — AuthWrapper routes any truthy `user` away
 * from /auth/sign-in, which would race signIn()'s refusal message off the screen. See the
 * gate in src/contexts/enhanced-auth.context.tsx and verifyAuthToken in src/lib/server-auth.ts.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { EnhancedAuthProvider, useEnhancedAuth } from '@/contexts/enhanced-auth.context';

jest.mock('@/lib/firebase', () => ({ auth: { onAuthStateChanged: jest.fn() } }));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
  onIdTokenChanged: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock('@/services/role-management.service', () => ({
  roleManagementService: {
    getUserProfile: jest.fn(),
    updateUserProfile: jest.fn(),
    createUserProfile: jest.fn(),
  },
}));

// validateTokenProject() parses the ID token payload and signs out on a project mismatch,
// so the fixture has to be shaped like a real three-part JWT.
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'hrms-82eb5';
const idToken = () => `header.${btoa(JSON.stringify({ aud: projectId }))}.signature`;

const signedInUser = () => ({
  uid: 'ghost-uid',
  email: 'ghost@example.com',
  getIdToken: jest.fn().mockResolvedValue(idToken()),
  getIdTokenResult: jest.fn().mockResolvedValue({ claims: { role: 'admin' } }),
});

const mockOnAuthStateChanged = () => require('firebase/auth').onAuthStateChanged;
const mockGetUserProfile = () =>
  require('@/services/role-management.service').roleManagementService.getUserProfile;

const Probe = () => {
  const auth = useEnhancedAuth();
  return (
    <div>
      <div data-testid="loading">{auth.loading ? 'loading' : 'loaded'}</div>
      <div data-testid="user">{auth.user ? auth.user.email : 'no user'}</div>
    </div>
  );
};

const renderSignedIn = () => {
  mockOnAuthStateChanged().mockImplementation((_auth: any, callback: any) => {
    setTimeout(() => callback(signedInUser()), 0);
    return jest.fn();
  });
  return render(
    <EnhancedAuthProvider>
      <Probe />
    </EnhancedAuthProvider>
  );
};

describe('employee login gate', () => {
  beforeEach(() => jest.clearAllMocks());

  test('a profile with no employeeId never becomes the signed-in user', async () => {
    mockGetUserProfile().mockResolvedValue({
      uid: 'ghost-uid',
      email: 'ghost@example.com',
      role: 'admin',
      permissions: [],
      isActive: true,
    });

    renderSignedIn();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('loaded'));
    expect(screen.getByTestId('user')).toHaveTextContent('no user');
  });

  test('a profile with an employeeId signs the user in', async () => {
    mockGetUserProfile().mockResolvedValue({
      uid: 'ghost-uid',
      email: 'ghost@example.com',
      role: 'admin',
      permissions: [],
      isActive: true,
      employeeId: 'EMP001',
    });

    renderSignedIn();

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('ghost@example.com'));
  });

  test('a failed profile read keeps the session — absence was not established', async () => {
    mockGetUserProfile().mockRejectedValue(new Error('firestore unavailable'));

    renderSignedIn();

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('ghost@example.com'));
  });
});

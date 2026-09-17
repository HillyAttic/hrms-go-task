'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback
} from 'react';
import { 
  User, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  AuthError,
  onIdTokenChanged
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { 
  AuthContextType, 
  UserProfile, 
  CustomClaims, 
  AuthResult, 
  SignUpData, 
  UserRole 
} from '@/types/auth.types';
import { roleManagementService } from '@/services/role-management.service';

const EnhancedAuthContext = createContext<AuthContextType | undefined>(undefined);

export const useEnhancedAuth = (): AuthContextType => {
  const context = useContext(EnhancedAuthContext);
  if (!context) {
    throw new Error('useEnhancedAuth must be used within an EnhancedAuthProvider');
  }
  return context;
};

interface EnhancedAuthProviderProps {
  children: ReactNode;
}

export const EnhancedAuthProvider: React.FC<EnhancedAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<CustomClaims | null>(null);

  // Derived state for role checks
  const isAdmin = claims?.role === 'admin' || false;
  const isManager = claims?.role === 'manager' || isAdmin;
  const isEmployee = claims?.role === 'employee' || isManager;

  /**
   * Load user profile and claims
   */
  // Returns whether this account is an employee — see the gate in onAuthStateChanged.
  const loadUserData = useCallback(async (currentUser: User | null): Promise<boolean> => {
    if (!currentUser) {
      setUserProfile(null);
      setClaims(null);
      return false;
    }

    try {
      // Load user profile from Firestore
      const profile = await roleManagementService.getUserProfile(currentUser.uid);
      setUserProfile(profile);

      // Get ID token to extract custom claims
      const idTokenResult = await currentUser.getIdTokenResult();
      const customClaims: CustomClaims = {
        role: (idTokenResult.claims.role as UserRole) || profile?.role || 'employee',
        permissions: (idTokenResult.claims.permissions as string[]) || profile?.permissions || [],
        isAdmin: (idTokenResult.claims.isAdmin as boolean) || profile?.role === 'admin' || false,
        createdAt: idTokenResult.claims.createdAt as string || new Date().toISOString(),
        lastRoleUpdate: idTokenResult.claims.lastRoleUpdate as string || new Date().toISOString(),
      };

      setClaims(customClaims);

      // users/{uid}.employeeId is what puts an account in /employees. Without it the
      // account is a bare login, not a user of this system — same predicate as
      // verifyAuthToken. It must not count as signed in.
      return !!profile?.employeeId;
    } catch (error) {
      console.error('Error loading user data:', error);
      // Set default claims if loading fails
      setClaims({
        role: 'employee',
        permissions: [],
        isAdmin: false,
        createdAt: new Date().toISOString(),
        lastRoleUpdate: new Date().toISOString(),
      });
      // The read failed, so absence was never established. Keep the session rather than
      // evicting a real employee over a transient Firestore error; the API still refuses
      // a genuinely invalid account.
      return true;
    }
  }, []);

  /**
   * Refresh user data manually
   */
  const refreshUserData = useCallback(async () => {
    if (user) {
      await loadUserData(user);
    }
  }, [user]);

  /**
   * Refresh user claims
   */
  const refreshClaims = useCallback(async () => {
    if (!user) return;

    try {
      // Force token refresh
      await user.getIdToken(true);

      // Inline the profile loading to avoid dependency issues
      const profile = await roleManagementService.getUserProfile(user.uid);
      setUserProfile(profile);

      const idTokenResult = await user.getIdTokenResult();
      const customClaims: CustomClaims = {
        role: (idTokenResult.claims.role as UserRole) || profile?.role || 'employee',
        permissions: (idTokenResult.claims.permissions as string[]) || profile?.permissions || [],
        isAdmin: (idTokenResult.claims.isAdmin as boolean) || profile?.role === 'admin' || false,
        createdAt: idTokenResult.claims.createdAt as string || new Date().toISOString(),
        lastRoleUpdate: idTokenResult.claims.lastRoleUpdate as string || new Date().toISOString(),
      };

      setClaims(customClaims);
    } catch (error) {
      console.error('Error refreshing claims:', error);
    }
  }, [user]);

  /**
   * Validate that the user's token matches our Firebase project
   * This catches stale auth state from old project deployments
   */
  const validateTokenProject = async (user: User): Promise<boolean> => {
    try {
      const token = await user.getIdToken(false);
      // Decode JWT without verification (just parsing)
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      const payload = JSON.parse(atob(parts[1]));
      const expectedProject = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'hrms-82eb5';

      if (payload.aud !== expectedProject) {
        console.warn(`[Auth] Token audience mismatch: expected "${expectedProject}", got "${payload.aud}". Signing out.`);
        await user.getIdToken(true); // Try refresh first
        const refreshedToken = await user.getIdToken(false);
        const refreshedParts = refreshedToken.split('.');
        const refreshedPayload = JSON.parse(atob(refreshedParts[1]));

        if (refreshedPayload.aud !== expectedProject) {
          console.error(`[Auth] Token refresh failed to fix audience. Forcing sign out.`);
          await firebaseSignOut(auth);
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('[Auth] Token validation error:', error);
      return false;
    }
  };

  /**
   * Set up authentication state listener
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);

      if (currentUser) {
        // Validate token project before proceeding
        const isValid = await validateTokenProject(currentUser);
        if (!isValid) {
          setUser(null);
          setUserProfile(null);
          setClaims(null);
          setLoading(false);
          return;
        }
      }

      // Login ≠ access. Gate `user` on loadUserData's answer, because AuthWrapper
      // redirects any truthy `user` away from /auth/sign-in to /dashboard — so setting it
      // first would navigate a bare login off the page before signIn()'s refusal message
      // could render. Loading stays true across the read, which is what holds that redirect.
      const isEmployee = await loadUserData(currentUser);
      setUser(isEmployee ? currentUser : null);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Firebase Auth says who you are; users/{uid}.employeeId says whether this system
      // knows you. Without it the account is not in /employees, so it must not reach the
      // dashboard at all — the API would 401 on its first request anyway, but only after
      // the shell has rendered. Same predicate as verifyAuthToken and the auth-state gate.
      const profile = await roleManagementService
        .getUserProfile(userCredential.user.uid)
        .catch(() => {
          // Read failed, so absence was not established — don't tell a real employee they
          // don't exist. The outer catch surfaces this message.
          throw new Error('Could not verify your account. Please try again.');
        });

      if (!profile?.employeeId) {
        await firebaseSignOut(auth);
        return {
          success: false,
          error: 'User does not exist in the database. Please contact the administrator.',
        };
      }

      // Update last login time
      if (userCredential.user) {
        await roleManagementService.updateUserProfile(userCredential.user.uid, {
          lastLogin: new Date() as any,
        });
      }

      return { 
        success: true, 
        user: userCredential.user 
      };
    } catch (error) {
      const authError = error as AuthError;
      let errorMessage = 'An error occurred during sign in';
      
      switch (authError.code) {
        case 'auth/user-not-found':
          errorMessage = 'No user found with this email address';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'User does not exist in the database. Please contact the administrator.';
          break;
        default:
          errorMessage = authError.message;
      }
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  };

  /**
   * Sign up new user
   */
  const signUp = async (userData: SignUpData): Promise<AuthResult> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        userData.password
      );

      // Create user profile in Firestore
      await roleManagementService.createUserProfile(userCredential.user.uid, {
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role || 'employee',
        department: userData.department,
        phoneNumber: userData.phoneNumber,
        createdBy: userCredential.user.uid,
      });

      return { 
        success: true, 
        user: userCredential.user 
      };
    } catch (error) {
      const authError = error as AuthError;
      let errorMessage = 'An error occurred during registration';
      
      switch (authError.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Email address is already in use';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak';
          break;
        default:
          errorMessage = authError.message;
      }
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  };

  /**
   * Sign out user
   */
  const signOut = async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
      // Immediately clear state
      setUser(null);
      setUserProfile(null);
      setClaims(null);
      setLoading(false);
      // Force a hard reload to clear all cached state
      window.location.href = '/auth/sign-in';
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  /**
   * Reset password
   */
  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      const authError = error as AuthError;
      let errorMessage = 'An error occurred during password reset';
      
      switch (authError.code) {
        case 'auth/user-not-found':
          errorMessage = 'No user found with this email address';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        default:
          errorMessage = authError.message;
      }
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  };

  /**
   * Check if user has specific permission
   */
  const hasPermission = useCallback((permission: string): boolean => {
    if (!claims) return false;
    return claims.permissions.includes(permission);
  }, [claims]);

  /**
   * Check if user has specific role
   */
  const hasRole = useCallback((role: UserRole | UserRole[]): boolean => {
    if (!claims) return false;
    if (Array.isArray(role)) {
      return role.includes(claims.role);
    }
    return claims.role === role;
  }, [claims]);

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    claims,
    isAdmin,
    isManager,
    isEmployee,
    signIn,
    signUp,
    signOut,
    refreshClaims,
    refreshUserData,
    resetPassword,
    hasPermission,
    hasRole,
  };

  return (
    <EnhancedAuthContext.Provider value={value}>
      {children}
    </EnhancedAuthContext.Provider>
  );
};
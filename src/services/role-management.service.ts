import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { 
  UserRole, 
  UserProfile, 
  CustomClaims, 
  AuditLog, 
  ROLE_CONFIGS 
} from '@/types/auth.types';

export class RoleManagementService {
  private static instance: RoleManagementService;

  public static getInstance(): RoleManagementService {
    if (!RoleManagementService.instance) {
      RoleManagementService.instance = new RoleManagementService();
    }
    return RoleManagementService.instance;
  }

  /**
   * Assign a role to a user
   */
  async assignRole(uid: string, role: UserRole, assignedBy?: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      const roleConfig = ROLE_CONFIGS[role];
      
      const updateData = {
        role,
        permissions: roleConfig.permissions.map(p => p.id),
        lastRoleUpdate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await updateDoc(userRef, updateData);

      // CRITICAL FIX: Sync to Firebase Auth custom claims
      // This ensures the role is reflected in the user's token
      try {
        const { setUserClaims } = await import('@/utils/sync-user-roles');
        await setUserClaims(uid, role, roleConfig.permissions.map(p => p.id));
        console.log(`Custom claims synced for user ${uid}`);
      } catch (claimsError) {
        console.error('Error syncing custom claims:', claimsError);
        // Don't fail the whole operation if claims sync fails
        // The Firestore trigger will handle it automatically
      }

      // Log the role assignment
      if (assignedBy) {
        await this.logAuditEvent({
          action: 'role_assigned',
          performedBy: assignedBy,
          targetUser: uid,
          details: { newRole: role, previousRole: await this.getUserRole(uid) },
        });
      }

      console.log(`Role ${role} assigned to user ${uid}`);
    } catch (error: any) {
      // Handle "No document to update" error gracefully
      if (error?.code === 'not-found' || error?.message?.includes('No document to update')) {
        console.warn(`Cannot assign role to user ${uid} - user document not found`);
        return;
      }
      
      console.error('Error assigning role:', error);
      throw new Error('Failed to assign role');
    }
  }

  /**
   * Get user role from Firestore
   */
  async getUserRole(uid: string): Promise<UserRole> {
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        return userData.role || 'employee';
      }
      
      return 'employee'; // Default role
    } catch (error: any) {
      // Handle "No document to update" error gracefully
      if (error?.code === 'not-found' || error?.message?.includes('No document to update')) {
        console.warn(`User document not found for UID: ${uid}`);
        return 'employee'; // Default role
      }
      
      console.error('Error getting user role:', error);
      return 'employee';
    }
  }

  /**
   * Get user profile from Firestore
   */
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    // Missing doc is not an error — getDoc reports it as exists() === false. A throw here
    // therefore means the read itself failed, and callers need to tell the two apart:
    // callers that grant access treat "no profile" as "not a user of this system", so
    // swallowing a transient failure into null would evict a real employee.
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists() ? (userDoc.data() as UserProfile) : null;
  }

  /**
   * Update user permissions
   */
  async updateUserPermissions(uid: string, permissions: string[]): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        permissions,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating user permissions:', error);
      throw new Error('Failed to update permissions');
    }
  }

  /**
   * Create user profile in Firestore
   */
  async createUserProfile(uid: string, profileData: Partial<UserProfile>): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      const defaultRole = profileData.role || 'employee';
      const roleConfig = ROLE_CONFIGS[defaultRole];
      
      const userProfile: any = {
        uid,
        email: profileData.email || '',
        displayName: profileData.displayName || '',
        role: defaultRole,
        permissions: roleConfig.permissions.map(p => p.id),
        isActive: true,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        createdBy: profileData.createdBy || uid,
      };

      // Only add optional fields if they have values
      if (profileData.department) {
        userProfile.department = profileData.department;
      }
      if (profileData.phoneNumber) {
        userProfile.phoneNumber = profileData.phoneNumber;
      }
      if (profileData.photoURL) {
        userProfile.photoURL = profileData.photoURL;
      }

      await setDoc(userRef, userProfile);
    } catch (error: any) {
      // Handle "No document to update" error gracefully
      if (error?.code === 'not-found' || error?.message?.includes('No document to update')) {
        console.warn(`Cannot create profile for user ${uid} - user document not found`);
        return;
      }
      
      console.error('Error creating user profile:', error);
      throw new Error('Failed to create user profile');
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error: any) {
      // Handle "No document to update" error gracefully
      if (error?.code === 'not-found' || error?.message?.includes('No document to update')) {
        console.warn(`User document not found for UID: ${uid}. This may be expected for new users.`);
        // Don't throw error for missing documents - this can happen for new users
        return;
      }
      
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(uid: string, deactivatedBy: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        isActive: false,
        deactivatedAt: serverTimestamp(),
        deactivatedBy,
        updatedAt: serverTimestamp(),
      });

      // Log the deactivation
      await this.logAuditEvent({
        action: 'user_deactivated',
        performedBy: deactivatedBy,
        targetUser: uid,
        details: { reason: 'Manual deactivation' },
      });
    } catch (error: any) {
      // Handle "No document to update" error gracefully
      if (error?.code === 'not-found' || error?.message?.includes('No document to update')) {
        console.warn(`Cannot deactivate user ${uid} - user document not found`);
        return;
      }
      
      console.error('Error deactivating user:', error);
      throw new Error('Failed to deactivate user');
    }
  }

  /**
   * Activate user account
   */
  async activateUser(uid: string, activatedBy: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        isActive: true,
        activatedAt: serverTimestamp(),
        activatedBy,
        updatedAt: serverTimestamp(),
      });

      // Log the activation
      await this.logAuditEvent({
        action: 'user_activated',
        performedBy: activatedBy,
        targetUser: uid,
        details: { reason: 'Manual activation' },
      });
    } catch (error: any) {
      // Handle "No document to update" error gracefully
      if (error?.code === 'not-found' || error?.message?.includes('No document to update')) {
        console.warn(`Cannot activate user ${uid} - user document not found`);
        return;
      }
      
      console.error('Error activating user:', error);
      throw new Error('Failed to activate user');
    }
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(uid: string): Promise<string[]> {
    try {
      const userProfile = await this.getUserProfile(uid);
      return userProfile?.permissions || [];
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(uid: string, permission: string): Promise<boolean> {
    try {
      const permissions = await this.getUserPermissions(uid);
      return permissions.includes(permission);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check if user has specific role
   */
  async hasRole(uid: string, role: UserRole | UserRole[]): Promise<boolean> {
    try {
      const userRole = await this.getUserRole(uid);
      if (Array.isArray(role)) {
        return role.includes(userRole);
      }
      return userRole === role;
    } catch (error) {
      console.error('Error checking role:', error);
      return false;
    }
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(auditData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      const auditRef = collection(db, 'audit_logs');
      await addDoc(auditRef, {
        ...auditData,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error logging audit event:', error);
      // Don't throw error for audit logging failures
    }
  }

  /**
   * Get role configuration
   */
  getRoleConfig(role: UserRole) {
    return ROLE_CONFIGS[role];
  }

  /**
   * Get all available roles
   */
  getAllRoles(): UserRole[] {
    return Object.keys(ROLE_CONFIGS) as UserRole[];
  }

  /**
   * Get permissions for role
   */
  getPermissionsForRole(role: UserRole): string[] {
    return ROLE_CONFIGS[role].permissions.map(p => p.id);
  }
}

export const roleManagementService = RoleManagementService.getInstance();
import { User } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { EmployeeDocuments } from './employee.types';

export type UserRole = 'admin' | 'employee' | 'manager';

export interface CustomClaims {
  role: UserRole;
  permissions: string[];
  isAdmin: boolean;
  createdAt: string;
  lastRoleUpdate: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  permissions: string[];
  isActive: boolean;
  createdAt: Timestamp;
  lastLogin: Timestamp;
  createdBy: string;
  department?: string;
  phoneNumber?: string;
  photoURL?: string;
  // Present on every employee record; absent on bare logins (self-signup, seed/test
  // accounts). Its presence is what makes an account an employee — see verifyAuthToken.
  employeeId?: string;
  // Employee record fields, all optional for the same reason as employeeId. The owner may
  // self-edit only the subset listed in SELF_EDITABLE_FIELDS (src/app/api/auth/profile/route.ts);
  // salary, role, status and managerId are deliberately absent — employees never see them.
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  dateOfJoining?: string;
  workAnniversary?: string;
  probationDuration?: number;
  probationEndDate?: string;
  promotionDate?: string;
  promotionDetails?: string;
  documents?: EmployeeDocuments;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
  requiresEmailVerification?: boolean;
}

export interface SignUpData {
  email: string;
  password: string;
  displayName: string;
  role?: UserRole;
  department?: string;
  phoneNumber?: string;
}

export interface RoleConfig {
  role: UserRole;
  permissions: Permission[];
  description: string;
  canManageUsers: boolean;
  canViewReports: boolean;
  canManageTasks: boolean;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

export interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  claims: CustomClaims | null;
  isAdmin: boolean;
  isManager: boolean;
  isEmployee: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (userData: SignUpData) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshClaims: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

export interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  targetUser?: string;
  timestamp: Timestamp;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface InvitationData {
  email: string;
  role: UserRole;
  department?: string;
  invitedBy: string;
  expiresAt: Timestamp;
}

// Default role configurations
export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  admin: {
    role: 'admin',
    permissions: [
      { id: 'users.manage', name: 'Manage Users', description: 'Create, update, delete users', resource: 'users', action: 'manage' },
      { id: 'roles.assign', name: 'Assign Roles', description: 'Assign roles to users', resource: 'roles', action: 'assign' },
      { id: 'reports.view', name: 'View Reports', description: 'Access all reports', resource: 'reports', action: 'view' },
      { id: 'tasks.manage', name: 'Manage Tasks', description: 'Create, update, delete all tasks', resource: 'tasks', action: 'manage' },
      { id: 'teams.manage', name: 'Manage Teams', description: 'Create, update, delete teams', resource: 'teams', action: 'manage' },
      { id: 'attendance.manage', name: 'Manage Attendance', description: 'Manage all attendance records', resource: 'attendance', action: 'manage' },
    ],
    description: 'Full system access with user management capabilities',
    canManageUsers: true,
    canViewReports: true,
    canManageTasks: true,
  },
  manager: {
    role: 'manager',
    permissions: [
      { id: 'reports.view', name: 'View Reports', description: 'Access team reports', resource: 'reports', action: 'view' },
      { id: 'tasks.manage', name: 'Manage Tasks', description: 'Create, update, delete team tasks', resource: 'tasks', action: 'manage' },
      { id: 'teams.view', name: 'View Teams', description: 'View team information', resource: 'teams', action: 'view' },
      { id: 'attendance.view', name: 'View Attendance', description: 'View team attendance records', resource: 'attendance', action: 'view' },
    ],
    description: 'Team management with reporting capabilities',
    canManageUsers: false,
    canViewReports: true,
    canManageTasks: true,
  },
  employee: {
    role: 'employee',
    permissions: [
      { id: 'tasks.view', name: 'View Tasks', description: 'View assigned tasks', resource: 'tasks', action: 'view' },
      { id: 'tasks.update', name: 'Update Tasks', description: 'Update own tasks', resource: 'tasks', action: 'update' },
      { id: 'attendance.own', name: 'Own Attendance', description: 'Manage own attendance', resource: 'attendance', action: 'own' },
    ],
    description: 'Basic access to assigned tasks and own records',
    canManageUsers: false,
    canViewReports: false,
    canManageTasks: false,
  },
};
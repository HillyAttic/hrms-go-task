/**
 * Employee Admin Service
 * Server-side service using Firebase Admin SDK for employee operations
 * This bypasses Firestore security rules and should only be used in API routes
 */

import { adminDb } from '@/lib/firebase-admin';
import { EmployeeDocuments } from '@/types/employee.types';
import { UserRole } from '@/types/auth.types';
import { storePassword } from '@/services/employee-credential.service';

export interface Employee {
  id?: string; // Firebase Auth UID
  employeeId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  department?: string;
  dateOfBirth?: string;
  salary?: number;
  dateOfJoining?: string;
  // Payroll fields (see src/types/payroll.types.ts). grossSalary/doj are the payroll
  // source of truth; salary/dateOfJoining are the legacy profile fields they fall back to.
  grossSalary?: number;
  doj?: string | null;
  pan?: string | null;
  designation?: string;
  photoURL?: string;
  role: 'Manager' | 'Admin' | 'Employee';
  status: 'active' | 'on-leave' | 'resigned';
  // Manager info
  managerId?: string;
  managerName?: string;
  reportees?: Array<{ id: string; name: string; employeeId: string }>;
  // Probation & Promotion
  probationDuration?: number;
  probationEndDate?: string;
  workAnniversary?: string;
  salaryChanges?: Array<{
    date: string;
    oldSalary: number;
    newSalary: number;
    reason: 'probation' | 'promotion' | 'revision';
    notes?: string;
  }>;
  promotionDate?: string;
  promotionDetails?: string;
  // Attendance settings
  requireLocationTracking?: boolean;
  // Bank details — editable by the employee on their own profile
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  // Documents
  documents?: EmployeeDocuments;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Employee Admin Service - Server-side only
 * Uses Firebase Admin SDK to bypass security rules
 */
export const employeeAdminService = {
  /**
   * Get all employees with optional filters
   */
  async getAll(filters?: {
    status?: string;
    search?: string;
    limit?: number;
  }): Promise<Employee[]> {
    try {
      console.log('[EmployeeAdminService] Fetching employees from users collection');

      let query = adminDb.collection('users');

      // Add status filter if provided
      if (filters?.status) {
        query = query.where('status', '==', filters.status) as any;
      }

      const snapshot = await query.get();
      console.log(`[EmployeeAdminService] Found ${snapshot.size} users`);

      let employees: Employee[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();

        // Bare login profiles (auto-created by verifyAuthToken) have no employeeId
        // and are not employee records — listing them reads as "the deleted
        // employee came back", under their raw uid as the Employee ID.
        if (!data.employeeId) return;

        employees.push({
          id: doc.id,
          employeeId: data.employeeId || data.uid || doc.id,
          name: data.displayName || data.name || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phoneNumber || data.phone || '',
          department: data.department || '',
          dateOfBirth: data.dateOfBirth || '',
          salary: data.salary || undefined,
          dateOfJoining: data.dateOfJoining || '',
          grossSalary: data.grossSalary ?? data.salary ?? 0,
          doj: data.doj || data.dateOfJoining || null,
          pan: data.pan || null,
          designation: data.designation || '',
          photoURL: data.photoURL || '',
          role: this.mapUserRoleToEmployeeRole(data.role),
          status: (data.status as 'active' | 'on-leave' | 'resigned') || 'active',
          managerId: data.managerId || '',
          managerName: data.managerName || '',
          reportees: data.reportees || [],
          probationDuration: data.probationDuration || undefined,
          probationEndDate: data.probationEndDate || '',
          workAnniversary: data.workAnniversary || '',
          salaryChanges: data.salaryChanges || [],
          promotionDate: data.promotionDate || '',
          promotionDetails: data.promotionDetails || '',
          requireLocationTracking: data.requireLocationTracking ?? true,
          bankName: data.bankName || '',
          bankAccountNumber: data.bankAccountNumber || '',
          bankIfsc: data.bankIfsc || '',
          documents: data.documents || {},
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
        });
      });

      // Apply search filter (client-side)
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        employees = employees.filter(emp =>
          emp.name.toLowerCase().includes(searchLower) ||
          emp.email.toLowerCase().includes(searchLower) ||
          emp.employeeId.toLowerCase().includes(searchLower) ||
          emp.role.toLowerCase().includes(searchLower)
        );
      }

      // Apply limit
      if (filters?.limit) {
        employees = employees.slice(0, filters.limit);
      }

      console.log(`[EmployeeAdminService] Returning ${employees.length} employees`);
      return employees;
    } catch (error) {
      console.error('[EmployeeAdminService] Error in getAll:', error);
      throw error;
    }
  },

  /**
   * Map user role to employee role
   */
  mapUserRoleToEmployeeRole(userRole?: string): 'Manager' | 'Admin' | 'Employee' {
    if (userRole === 'admin') return 'Admin';
    if (userRole === 'manager') return 'Manager';
    return 'Employee';
  },

  /**
   * Map employee role to user role
   */
  mapEmployeeRoleToUserRole(employeeRole: 'Manager' | 'Admin' | 'Employee'): UserRole {
    if (employeeRole === 'Admin') return 'admin';
    if (employeeRole === 'Manager') return 'manager';
    return 'employee';
  },

  /**
   * Get an employee by ID (Firebase Auth UID)
   */
  async getById(id: string): Promise<Employee | null> {
    try {
      const userDoc = await adminDb.collection('users').doc(id).get();

      if (!userDoc.exists) {
        return null;
      }

      const data = userDoc.data()!;
      return {
        id: userDoc.id,
        employeeId: data.employeeId || data.uid || userDoc.id,
        name: data.displayName || data.name || '',
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        phone: data.phoneNumber || data.phone || '',
        department: data.department || '',
        dateOfBirth: data.dateOfBirth || '',
        salary: data.salary || undefined,
        dateOfJoining: data.dateOfJoining || '',
        grossSalary: data.grossSalary ?? data.salary ?? 0,
        doj: data.doj || data.dateOfJoining || null,
        pan: data.pan || null,
        designation: data.designation || '',
        photoURL: data.photoURL || '',
        role: this.mapUserRoleToEmployeeRole(data.role),
        status: (data.status as 'active' | 'on-leave' | 'resigned') || 'active',
        managerId: data.managerId || '',
        managerName: data.managerName || '',
        reportees: data.reportees || [],
        probationDuration: data.probationDuration || undefined,
        probationEndDate: data.probationEndDate || '',
        workAnniversary: data.workAnniversary || '',
        salaryChanges: data.salaryChanges || [],
        promotionDate: data.promotionDate || '',
        promotionDetails: data.promotionDetails || '',
        requireLocationTracking: data.requireLocationTracking ?? true,
        bankName: data.bankName || '',
        bankAccountNumber: data.bankAccountNumber || '',
        bankIfsc: data.bankIfsc || '',
        documents: data.documents || {},
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      };
    } catch (error) {
      console.error('[EmployeeAdminService] Error getting employee by ID:', error);
      return null;
    }
  },

  /**
   * Get an employee by employee ID
   */
  async getByEmployeeId(employeeId: string): Promise<Employee | null> {
    try {
      const snapshot = await adminDb.collection('users')
        .where('employeeId', '==', employeeId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const data = doc.data();

      return {
        id: doc.id,
        employeeId: data.employeeId || data.uid || doc.id,
        name: data.displayName || data.name || '',
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        phone: data.phoneNumber || data.phone || '',
        department: data.department || '',
        dateOfBirth: data.dateOfBirth || '',
        salary: data.salary || undefined,
        dateOfJoining: data.dateOfJoining || '',
        grossSalary: data.grossSalary ?? data.salary ?? 0,
        doj: data.doj || data.dateOfJoining || null,
        pan: data.pan || null,
        designation: data.designation || '',
        photoURL: data.photoURL || '',
        role: this.mapUserRoleToEmployeeRole(data.role),
        status: (data.status as 'active' | 'on-leave' | 'resigned') || 'active',
        managerId: data.managerId || '',
        managerName: data.managerName || '',
        reportees: data.reportees || [],
        probationDuration: data.probationDuration || undefined,
        probationEndDate: data.probationEndDate || '',
        workAnniversary: data.workAnniversary || '',
        salaryChanges: data.salaryChanges || [],
        promotionDate: data.promotionDate || '',
        promotionDetails: data.promotionDetails || '',
        requireLocationTracking: data.requireLocationTracking ?? true,
        bankName: data.bankName || '',
        bankAccountNumber: data.bankAccountNumber || '',
        bankIfsc: data.bankIfsc || '',
        documents: data.documents || {},
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      };
    } catch (error) {
      console.error('[EmployeeAdminService] Error getting employee by employeeId:', error);
      return null;
    }
  },

  /**
   * Update an employee
   */
  async update(
    id: string,
    data: Partial<Omit<Employee, 'id'>>,
    password?: string
  ): Promise<Employee> {
    console.log('[EmployeeAdminService] Updating employee:', id);

    try {
      const userRef = adminDb.collection('users').doc(id);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new Error('Employee not found');
      }

      // Update Firebase Auth password if provided
      if (password) {
        const { adminAuth } = await import('@/lib/firebase-admin');
        await adminAuth.updateUser(id, { password });
        console.log('[EmployeeAdminService] Firebase Auth password updated');

        // Best-effort copy for the admin reveal — never fail the update over it.
        try {
          await storePassword(id, password);
        } catch (error) {
          console.error('[EmployeeAdminService] Failed to store encrypted password copy:', error);
        }
      }

      // Update Firebase Auth email if provided
      if (data.email) {
        const { adminAuth } = await import('@/lib/firebase-admin');
        await adminAuth.updateUser(id, { email: data.email });
        console.log('[EmployeeAdminService] Firebase Auth email updated');
      }

      // Prepare update payload
      const updatePayload: any = {
        updatedAt: new Date(),
      };

      if (data.name) {
        updatePayload.displayName = data.name;
      }
      if (data.firstName !== undefined) {
        updatePayload.firstName = data.firstName;
      }
      if (data.lastName !== undefined) {
        updatePayload.lastName = data.lastName;
      }
      if (data.email) {
        updatePayload.email = data.email;
      }
      if (data.phone) {
        updatePayload.phoneNumber = data.phone;
      }
      if (data.department !== undefined) {
        updatePayload.department = data.department || '';
      }
      if (data.dateOfBirth !== undefined) {
        updatePayload.dateOfBirth = data.dateOfBirth;
      }
      if (data.salary !== undefined) {
        updatePayload.salary = data.salary;
      }
      if (data.dateOfJoining !== undefined) {
        updatePayload.dateOfJoining = data.dateOfJoining;
      }
      // Payroll fields. `doj`/`grossSalary` are written on their own so the payroll
      // module does not depend on the legacy profile fields staying in sync.
      if (data.doj !== undefined) {
        updatePayload.doj = data.doj;
      }
      if (data.pan !== undefined) {
        updatePayload.pan = data.pan;
      }
      if (data.designation !== undefined) {
        updatePayload.designation = data.designation;
      }
      if (data.grossSalary !== undefined) {
        updatePayload.grossSalary = data.grossSalary;
      }
      if (data.role) {
        updatePayload.role = this.mapEmployeeRoleToUserRole(data.role);
      }
      if (data.status) {
        updatePayload.isActive = data.status === 'active';
        updatePayload.status = data.status;
      }
      if (data.employeeId) {
        updatePayload.employeeId = data.employeeId;
      }
      if (data.managerId !== undefined) {
        updatePayload.managerId = data.managerId;
      }
      if (data.managerName !== undefined) {
        updatePayload.managerName = data.managerName;
      }
      if (data.reportees !== undefined) {
        updatePayload.reportees = data.reportees;
      }
      if (data.probationDuration !== undefined) {
        updatePayload.probationDuration = data.probationDuration;
      }
      if (data.probationEndDate !== undefined) {
        updatePayload.probationEndDate = data.probationEndDate;
      }
      if (data.workAnniversary !== undefined) {
        updatePayload.workAnniversary = data.workAnniversary;
      }
      if (data.salaryChanges !== undefined) {
        updatePayload.salaryChanges = data.salaryChanges;
      }
      if (data.promotionDate !== undefined) {
        updatePayload.promotionDate = data.promotionDate;
      }
      if (data.promotionDetails !== undefined) {
        updatePayload.promotionDetails = data.promotionDetails;
      }
      if (data.documents !== undefined) {
        updatePayload.documents = data.documents;
      }
      if (data.requireLocationTracking !== undefined) {
        updatePayload.requireLocationTracking = data.requireLocationTracking;
      }
      if (data.bankName !== undefined) {
        updatePayload.bankName = data.bankName;
      }
      if (data.bankAccountNumber !== undefined) {
        updatePayload.bankAccountNumber = data.bankAccountNumber;
      }
      if (data.bankIfsc !== undefined) {
        updatePayload.bankIfsc = data.bankIfsc;
      }

      // Update user document
      await userRef.update(updatePayload);

      console.log('[EmployeeAdminService] Employee updated successfully');

      // Return updated employee
      return await this.getById(id) as Employee;
    } catch (error) {
      console.error('[EmployeeAdminService] Error updating employee:', error);
      throw error;
    }
  },

  /**
   * Create a new employee using Firebase Admin Auth + Firestore
   */
  async create(
    data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>,
    password: string
  ): Promise<Employee> {
    const { adminAuth } = await import('@/lib/firebase-admin');
    const { Timestamp } = await import('firebase-admin/firestore');

    console.log('[EmployeeAdminService] Creating employee:', {
      employeeId: data.employeeId,
      email: data.email,
      phone: data.phone,
      phoneFormat: data.phone ? (data.phone.startsWith('+') ? 'E.164' : '10-digit') : 'none'
    });

    // Check if employee ID already exists
    const existing = await this.getByEmployeeId(data.employeeId);
    if (existing) {
      console.log('[EmployeeAdminService] Employee ID already exists:', data.employeeId);
      throw new Error('Employee ID already exists');
    }

    // Check if email already exists in Firestore
    const emailSnapshot = await adminDb.collection('users').where('email', '==', data.email).limit(1).get();
    if (!emailSnapshot.empty) {
      console.log('[EmployeeAdminService] Email already exists:', data.email);
      throw new Error('Email already exists');
    }

    // Format phone to E.164
    const formattedPhone = this.formatPhoneToE164(data.phone);
    console.log('[EmployeeAdminService] Phone formatting:', {
      original: data.phone,
      formatted: formattedPhone
    });

    let createdAuthUid: string | null = null;

    try {
      // Create user in Firebase Auth
      const userRole = this.mapEmployeeRoleToUserRole(data.role);
      console.log('[EmployeeAdminService] Creating Auth user with role:', userRole);

      const userRecord = await adminAuth.createUser({
        email: data.email,
        password,
        displayName: data.name,
        phoneNumber: formattedPhone,
      });

      createdAuthUid = userRecord.uid;
      console.log('[EmployeeAdminService] Auth user created:', userRecord.uid);

      const now = Timestamp.now();

      // Create user document in Firestore
      console.log('[EmployeeAdminService] Writing to Firestore...');
      await adminDb.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: data.email,
        displayName: data.name,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        phoneNumber: data.phone || '',
        department: data.department || '',
        dateOfBirth: data.dateOfBirth || '',
        salary: data.salary || null,
        dateOfJoining: data.dateOfJoining || '',
        grossSalary: data.grossSalary ?? data.salary ?? 0,
        doj: data.doj || data.dateOfJoining || null,
        pan: data.pan || null,
        designation: data.designation || '',
        role: userRole,
        employeeId: data.employeeId,
        status: data.status,
        isActive: data.status === 'active',
        managerId: data.managerId || '',
        managerName: data.managerName || '',
        reportees: data.reportees || [],
        probationDuration: data.probationDuration || null,
        probationEndDate: data.probationEndDate || '',
        workAnniversary: data.workAnniversary || '',
        salaryChanges: data.salaryChanges || [],
        promotionDate: data.promotionDate || '',
        promotionDetails: data.promotionDetails || '',
        bankName: data.bankName || '',
        bankAccountNumber: data.bankAccountNumber || '',
        bankIfsc: data.bankIfsc || '',
        documents: data.documents || {},
        requireLocationTracking: data.requireLocationTracking ?? true,
        createdAt: now,
        updatedAt: now,
      });
      console.log('[EmployeeAdminService] Firestore write successful');

      // Set custom claims
      console.log('[EmployeeAdminService] Setting custom claims...');
      await adminAuth.setCustomUserClaims(userRecord.uid, { role: userRole });

      // Best-effort copy for the admin reveal. Backgrounded behind its own
      // catch on purpose: this whole block is inside the try whose catch
      // deletes the Auth user, and a missing ENCRYPTION_KEY must not roll back
      // an otherwise valid employee. The POST route passes '' when no password
      // was supplied, hence the truthiness guard.
      if (password) {
        try {
          await storePassword(userRecord.uid, password);
        } catch (error) {
          console.error('[EmployeeAdminService] Failed to store encrypted password copy:', error);
        }
      }

      console.log('[EmployeeAdminService] Employee created successfully:', userRecord.uid);

      return {
        id: userRecord.uid,
        employeeId: data.employeeId,
        name: data.name,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email,
        phone: data.phone,
        department: data.department,
        dateOfBirth: data.dateOfBirth || '',
        salary: data.salary,
        dateOfJoining: data.dateOfJoining || '',
        grossSalary: data.grossSalary ?? data.salary ?? 0,
        doj: data.doj || data.dateOfJoining || null,
        pan: data.pan || null,
        designation: data.designation || '',
        photoURL: '',
        role: data.role,
        status: data.status,
        managerId: data.managerId || '',
        managerName: data.managerName || '',
        reportees: data.reportees || [],
        probationDuration: data.probationDuration,
        probationEndDate: data.probationEndDate || '',
        workAnniversary: data.workAnniversary || '',
        salaryChanges: data.salaryChanges || [],
        promotionDate: data.promotionDate || '',
        promotionDetails: data.promotionDetails || '',
        documents: data.documents || {},
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
      };
    } catch (error: any) {
      console.error('[EmployeeAdminService] Error creating employee:', {
        code: error.code,
        message: error.message,
        createdAuthUid
      });

      // Rollback: Delete Auth user if created
      if (createdAuthUid) {
        try {
          await adminAuth.deleteUser(createdAuthUid);
          console.log('[EmployeeAdminService] Rolled back Auth user:', createdAuthUid);
        } catch (rollbackError: any) {
          console.error('[EmployeeAdminService] Failed to rollback Auth user:', {
            uid: createdAuthUid,
            error: rollbackError.message
          });
        }
      }

      throw error;
    }
  },

  formatPhoneToE164(phone: string | undefined, defaultCountryCode: string = '+91'): string | undefined {
    if (!phone) return undefined;

    // Already in E.164 format
    if (/^\+\d{10,15}$/.test(phone)) return phone;

    // Convert 10-digit Indian number
    if (/^\d{10}$/.test(phone)) return `${defaultCountryCode}${phone}`;

    // Invalid format
    return undefined;
  },


  async delete(id: string): Promise<void> {
    try {
      // The Auth account has to go too. verifyAuthToken() re-creates users/{uid}
      // for any signed-in account whose doc is missing (src/lib/server-auth.ts:91),
      // so a Firestore-only delete resurrects itself on that user's next request.
      const { adminAuth } = await import('@/lib/firebase-admin');
      await adminAuth.deleteUser(id).catch((error: any) => {
        if (error?.code !== 'auth/user-not-found') throw error;
      });
      await adminDb.collection('users').doc(id).delete();
      console.log('[EmployeeAdminService] Employee deleted:', id);
    } catch (error) {
      console.error('[EmployeeAdminService] Error deleting employee:', error);
      throw error;
    }
  },

  /**
   * Deactivate an employee (set to on-leave)
   */
  async deactivate(id: string): Promise<Employee> {
    await adminDb.collection('users').doc(id).update({
      isActive: false,
      status: 'on-leave',
      updatedAt: new Date(),
    });
    return await this.getById(id) as Employee;
  },

  /**
   * Get employee statistics
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    onLeave: number;
  }> {
    const allEmployees = await this.getAll();

    return {
      total: allEmployees.length,
      active: allEmployees.filter((e) => e.status === 'active').length,
      onLeave: allEmployees.filter((e) => e.status === 'on-leave').length,
    };
  },
};

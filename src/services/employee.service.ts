/**
 * Employee Service
 * Handles all employee-related Firebase operations
 * Now uses the 'users' collection instead of separate 'employees' collection
 */

import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { userManagementService } from './user-management.service';
import { UserRole } from '@/types/auth.types';

export interface Employee {
  id?: string; // This is the Firebase Auth UID
  employeeId: string;
  name: string; // Auto-generated from firstName + lastName (maps to displayName)
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  department?: string;
  dateOfBirth?: string; // DOB - date string
  salary?: number;
  dateOfJoining?: string; // DOJ - date string
  photoURL?: string;
  role: 'Manager' | 'Admin' | 'Employee';
  passwordHash?: string; // Hashed password, not plain text
  status: 'active' | 'on-leave' | 'resigned';
  // Manager info
  managerId?: string;
  managerName?: string;
  reportees?: Array<{ id: string; name: string; employeeId: string }>;
  // Probation & Promotion
  probationDuration?: number; // in months
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
  // Documents
  documents?: {
    addressProof?: string | { url: string; path?: string; name?: string; size?: number; mimeType?: string };
    cancelledCheque?: string | { url: string; path?: string; name?: string; size?: number; mimeType?: string };
    aadhaarCard?: string | { url: string; path?: string; name?: string; size?: number; mimeType?: string };
    panCard?: string | { url: string; path?: string; name?: string; size?: number; mimeType?: string };
    resignationLetter?: string | { url: string; path?: string; name?: string; size?: number; mimeType?: string };
    salarySlips?: (string | { url: string; path?: string; name?: string; size?: number; mimeType?: string })[];
    marksheet10th?: string | { url: string; path?: string; name?: string; size?: number; mimeType?: string };
    marksheet12th?: string | { url: string; path?: string; name?: string; size?: number; mimeType?: string };
    degree?: string | { url: string; path?: string; name?: string; size?: number; mimeType?: string };
  };
  createdAt?: Date;
  updatedAt?: Date;
}

/** Helper to combine firstName + lastName into displayName */
export function getFullName(firstName?: string, lastName?: string): string {
  return [firstName, lastName].filter(Boolean).join(' ') || '';
}

/**
 * Employee Service API - Now using users collection
 */
export const employeeService = {
  /**
   * Get all employees with optional filters
   */
  async getAll(filters?: {
    status?: string;
    search?: string;
    limit?: number;
  }): Promise<Employee[]> {
    try {
      const usersRef = collection(db, 'users');
      let q = query(usersRef);

      // Add status filter if provided
      if (filters?.status) {
        q = query(usersRef, where('status', '==', filters.status));
      }

      const querySnapshot = await getDocs(q);
      let employees: Employee[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        employees.push({
          id: doc.id, // Firebase Auth UID
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
          photoURL: data.photoURL || '',
          role: this.mapUserRoleToEmployeeRole(data.role),
          status: data.isActive === false ? 'on-leave' : 'active',
          managerId: data.managerId || '',
          managerName: data.managerName || '',
          reportees: data.reportees || [],
          probationDuration: data.probationDuration || undefined,
          probationEndDate: data.probationEndDate || '',
          workAnniversary: data.workAnniversary || '',
          salaryChanges: data.salaryChanges || [],
          promotionDate: data.promotionDate || '',
          promotionDetails: data.promotionDetails || '',
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

      return employees;
    } catch (error) {
      console.error('Error in employeeService.getAll:', error);
      return [];
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
      const userRef = doc(db, 'users', id);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return null;
      }

      const data = userDoc.data();
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
        photoURL: data.photoURL || '',
        role: this.mapUserRoleToEmployeeRole(data.role),
        status: data.isActive === false ? 'on-leave' : 'active',
        managerId: data.managerId || '',
        managerName: data.managerName || '',
        reportees: data.reportees || [],
        probationDuration: data.probationDuration || undefined,
        probationEndDate: data.probationEndDate || '',
        workAnniversary: data.workAnniversary || '',
        salaryChanges: data.salaryChanges || [],
        promotionDate: data.promotionDate || '',
        promotionDetails: data.promotionDetails || '',
        documents: data.documents || {},
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      };
    } catch (error) {
      console.error('Error getting employee by ID:', error);
      return null;
    }
  },

  /**
   * Get an employee by employee ID
   */
  async getByEmployeeId(employeeId: string): Promise<Employee | null> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('employeeId', '==', employeeId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
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
        photoURL: data.photoURL || '',
        role: this.mapUserRoleToEmployeeRole(data.role),
        status: data.isActive === false ? 'on-leave' : 'active',
        managerId: data.managerId || '',
        managerName: data.managerName || '',
        reportees: data.reportees || [],
        probationDuration: data.probationDuration || undefined,
        probationEndDate: data.probationEndDate || '',
        workAnniversary: data.workAnniversary || '',
        salaryChanges: data.salaryChanges || [],
        promotionDate: data.promotionDate || '',
        promotionDetails: data.promotionDetails || '',
        documents: data.documents || {},
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      };
    } catch (error) {
      console.error('Error getting employee by employeeId:', error);
      return null;
    }
  },

  /**
   * Create a new employee (creates user in users collection and Firebase Auth)
   */
  async create(
    data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash'>,
    password?: string
  ): Promise<Employee> {
    // Check if employee ID already exists
    const existing = await this.getByEmployeeId(data.employeeId);
    if (existing) {
      throw new Error('Employee ID already exists');
    }

    // Check if email already exists
    const usersRef = collection(db, 'users');
    const emailQuery = query(usersRef, where('email', '==', data.email));
    const emailSnapshot = await getDocs(emailQuery);
    if (!emailSnapshot.empty) {
      throw new Error('Email already exists');
    }

    // Create user in Firebase Auth if password provided
    if (password) {
      try {
        const userRole = this.mapEmployeeRoleToUserRole(data.role);
        
        // Create user in Firebase Auth and users collection
        const createdUser = await userManagementService.createUser(
          {
            email: data.email,
            password,
            displayName: data.name,
            role: userRole,
            phoneNumber: data.phone,
          },
          'system'
        );

        // Update with employee-specific fields
        const userRef = doc(db, 'users', createdUser.uid);
        await updateDoc(userRef, {
          employeeId: data.employeeId,
          status: data.status,
          isActive: data.status === 'active',
        });

        return {
          id: createdUser.uid,
          employeeId: data.employeeId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          department: data.department,
          photoURL: '',
          role: data.role,
          status: data.status,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      } catch (error) {
        console.error('Error creating employee with auth:', error);
        throw error;
      }
    } else {
      throw new Error('Password is required to create an employee');
    }
  },

  /**
   * Update an employee (updates user in users collection)
   */
  async update(
    id: string,
    data: Partial<Omit<Employee, 'id'>>,
    password?: string
  ): Promise<Employee> {
    console.log('=== EMPLOYEE UPDATE (USERS COLLECTION) ===');
    console.log('User ID:', id);
    console.log('Update data:', data);
    
    try {
      const userRef = doc(db, 'users', id);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('Employee not found');
      }

      // Prepare update payload
      const updatePayload: any = {
        updatedAt: serverTimestamp(),
      };

      if (data.name) {
        updatePayload.displayName = data.name;
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

      // Update password if provided
      if (password) {
        // Note: Updating password in Firebase Auth requires admin SDK
        // For now, we'll just log it
        console.log('Password update requested - requires Firebase Admin SDK');
      }

      console.log('Update payload:', updatePayload);

      // Update user document
      await updateDoc(userRef, updatePayload);

      console.log('✅ User updated successfully in users collection');

      // Return updated employee
      return await this.getById(id) as Employee;
    } catch (error) {
      console.error('❌ Error updating employee:', error);
      throw error;
    }
  },

  /**
   * Delete an employee (deletes from users collection)
   */
  async delete(id: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', id);
      await deleteDoc(userRef);
      console.log('Employee deleted from users collection:', id);
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  },

  /**
   * Deactivate an employee (set to on-leave)
   */
  async deactivate(id: string): Promise<Employee> {
    const userRef = doc(db, 'users', id);
    await updateDoc(userRef, {
      isActive: false,
      status: 'on-leave',
      updatedAt: serverTimestamp(),
    });
    return await this.getById(id) as Employee;
  },

  /**
   * Reactivate an employee
   */
  async reactivate(id: string): Promise<Employee> {
    const userRef = doc(db, 'users', id);
    await updateDoc(userRef, {
      isActive: true,
      status: 'active',
      updatedAt: serverTimestamp(),
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

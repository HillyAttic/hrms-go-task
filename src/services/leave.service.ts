/**
 * Leave Management Service
 */

import { createFirebaseService, QueryOptions } from './firebase.service';
import { LeaveRequest, LeaveFilters, LeaveStats, LeaveStatus } from '@/types/leave.types';
import { 
  LeaveType, 
  LeaveBalance, 
  LeaveRequest as AttendanceLeaveRequest, 
  LeaveStatus as AttendanceLeaveStatus 
} from '@/types/attendance.types';

const leaveFirebaseService = createFirebaseService<LeaveRequest>('leave-requests');

// Create separate service for leave types
const leaveTypeFirebaseService = createFirebaseService<LeaveType>('leave-types');

// Create separate service for leave balances
const leaveBalanceFirebaseService = createFirebaseService<LeaveBalance>('leave-balances');

export const leaveService = {
  /**
   * Get all leave requests with filters
   */
  async getAll(filters?: LeaveFilters): Promise<LeaveRequest[]> {
    const options: QueryOptions = {
      filters: [],
      orderByField: 'createdAt',
      orderDirection: 'desc',
    };

    if (filters?.status) {
      options.filters!.push({
        field: 'status',
        operator: '==',
        value: filters.status,
      });
    }

    if (filters?.employeeId) {
      options.filters!.push({
        field: 'employeeId',
        operator: '==',
        value: filters.employeeId,
      });
    }

    if (filters?.leaveType) {
      options.filters!.push({
        field: 'leaveType',
        operator: '==',
        value: filters.leaveType,
      });
    }

    if (filters?.limit) {
      options.pagination = {
        pageSize: filters.limit,
      };
    }

    let requests = await leaveFirebaseService.getAll(options);

    // Client-side search filter
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      requests = requests.filter(req =>
        req.employeeName.toLowerCase().includes(searchLower) ||
        req.employeeEmail.toLowerCase().includes(searchLower) ||
        req.reason.toLowerCase().includes(searchLower)
      );
    }

    return requests;
  },

  /**
   * Get leave request by ID
   */
  async getById(id: string): Promise<LeaveRequest | null> {
    return await leaveFirebaseService.getById(id);
  },

  /**
   * Create a new leave request
   */
  async create(data: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest> {
    // Calculate total days
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const leaveRequest = {
      ...data,
      totalDays,
      status: 'pending' as LeaveStatus,
    };

    return await leaveFirebaseService.create(leaveRequest);
  },

  /**
   * Update leave request
   */
  async update(id: string, data: Partial<LeaveRequest>): Promise<void> {
    await leaveFirebaseService.update(id, data);
  },

  /**
   * Approve leave request
   */
  async approve(id: string, approverId: string, approverName: string): Promise<void> {
    // Get leave request details before updating
    const leaveRequest = await leaveFirebaseService.getById(id);
    
    await leaveFirebaseService.update(id, {
      status: 'approved',
      approvedBy: approverId,
      approverName,
      approvedAt: new Date(),
    });
    
    // Send push notification to employee
    if (leaveRequest) {
      try {
        const { pushNotificationService } = await import('./push-notification.service');
        await pushNotificationService.notifyLeaveApproval(
          leaveRequest.employeeId,
          leaveRequest.leaveType || 'Leave',
          leaveRequest.startDate,
          leaveRequest.endDate,
          true
        );
      } catch (error) {
        console.error('Error sending leave approval notification:', error);
      }
    }
  },

  /**
   * Reject leave request
   */
  async reject(id: string, approverId: string, approverName: string, reason: string): Promise<void> {
    // Get leave request details before updating
    const leaveRequest = await leaveFirebaseService.getById(id);
    
    await leaveFirebaseService.update(id, {
      status: 'rejected',
      approvedBy: approverId,
      approverName,
      approvedAt: new Date(),
      rejectionReason: reason,
    });
    
    // Send push notification to employee
    if (leaveRequest) {
      try {
        const { pushNotificationService } = await import('./push-notification.service');
        await pushNotificationService.notifyLeaveApproval(
          leaveRequest.employeeId,
          leaveRequest.leaveType || 'Leave',
          leaveRequest.startDate,
          leaveRequest.endDate,
          false,
          reason
        );
      } catch (error) {
        console.error('Error sending leave rejection notification:', error);
      }
    }
  },

  /**
   * Delete leave request
   */
  async delete(id: string): Promise<void> {
    await leaveFirebaseService.delete(id);
  },

  /**
   * Get leave statistics
   */
  async getStats(filters?: LeaveFilters): Promise<LeaveStats> {
    const requests = await this.getAll(filters);

    return {
      totalRequests: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
    };
  },

  /**
   * Get employee leave requests
   */
  async getEmployeeRequests(employeeId: string): Promise<LeaveRequest[]> {
    return await this.getAll({ employeeId });
  },

  /**
   * Get all leave types
   */
  async getLeaveTypes(): Promise<LeaveType[]> {
    try {
      console.log('Fetching leave types from Firestore...');
      const types = await leaveTypeFirebaseService.getAll({
        filters: [{ field: 'isActive', operator: '==', value: true }],
        orderByField: 'name',
        orderDirection: 'asc'
      });
      
      console.log('Fetched leave types:', types);
      
      // If no types found in database, return default types
      if (!types || types.length === 0) {
        console.log('No leave types found in database, returning defaults...');
        const defaultTypes = [
          {
            id: 'sick',
            name: 'Sick Leave',
            code: 'SICK',
            isPaid: true,
            requiresApproval: true,
            maxDaysPerYear: 999,
            accrualRate: 1,
            carryOverAllowed: false,
            color: '#ef4444',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'casual',
            name: 'Casual Leave',
            code: 'CASUAL',
            isPaid: true,
            requiresApproval: true,
            maxDaysPerYear: 999,
            accrualRate: 1,
            carryOverAllowed: false,
            color: '#f59e0b',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];

        return defaultTypes;
      }
      
      return types;
    } catch (error) {
      console.error('Error fetching leave types:', error);
      // Return default leave types if fetch fails
      return [
        {
          id: 'sick-leave',
          name: 'Sick Leave',
          code: 'SICK',
          isPaid: true,
          requiresApproval: true,
          maxDaysPerYear: 999,
          accrualRate: 1,
          carryOverAllowed: false,
          color: '#ef4444',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'casual-leave',
          name: 'Casual Leave',
          code: 'CASUAL',
          isPaid: true,
          requiresApproval: true,
          maxDaysPerYear: 999,
          accrualRate: 1,
          carryOverAllowed: false,
          color: '#f59e0b',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
    }
  },

  /**
   * Get leave balances for an employee
   */
  async getLeaveBalances(employeeId: string): Promise<LeaveBalance[]> {
    try {
      // Import the calculator
      const { LeaveBalanceCalculator } = await import('./leave-balance-calculator.service');
      
      // Get all leave requests for this employee
      const requests = await this.getAll({ employeeId });
      
      // Calculate balances using the new calculator
      const calculatedBalances = LeaveBalanceCalculator.calculateBalances(employeeId, requests);
      
      // Return as LeaveBalance array (without the extra calculated fields)
      return calculatedBalances.map(balance => ({
        leaveTypeId: balance.leaveTypeId,
        leaveTypeName: balance.leaveTypeName,
        totalDays: balance.totalDays,
        usedDays: balance.usedDays,
        remainingDays: balance.remainingDays,
        accrualRate: balance.accrualRate,
        updatedAt: balance.updatedAt
      }));
    } catch (error) {
      console.error('Error fetching leave balances:', error);
      return [];
    }
  },

  /**
   * Get leave requests with optional filters
   */
  async getLeaveRequests(filters?: { employeeId?: string }): Promise<AttendanceLeaveRequest[]> {
    try {
      const queryOptions: QueryOptions = {
        orderByField: 'createdAt',
        orderDirection: 'desc'
      };
      
      if (filters?.employeeId) {
        queryOptions.filters = [{
          field: 'employeeId',
          operator: '==',
          value: filters.employeeId
        }];
      }
      
      const requests = await leaveFirebaseService.getAll(queryOptions);
      
      // Transform the data to match AttendanceLeaveRequest interface
      return requests.map(req => ({
        id: req.id || '',
        employeeId: req.employeeId,
        employeeName: req.employeeName,
        leaveTypeId: req.leaveType || 'general',
        leaveTypeName: req.leaveType || 'General',
        startDate: req.startDate,
        endDate: req.endDate,
        duration: req.totalDays,
        halfDay: req.halfDay || false,
        reason: req.reason,
        status: req.status as AttendanceLeaveStatus,
        approvedBy: req.approvedBy,
        approvedAt: req.approvedAt,
        rejectionReason: req.rejectionReason,
        approvalReason: req.approvalReason,
        createdAt: req.createdAt || new Date(),
        updatedAt: req.updatedAt || new Date()
      }));
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      return [];
    }
  },

  /**
   * Get pending leave requests for a manager/admin
   * Routes through the authenticated API so server-side scoping applies:
   * - Admins only see requests from employees with no assigned manager
   * - Managers only see requests from their assigned employees
   */
  async getPendingLeaveRequests(managerId: string): Promise<AttendanceLeaveRequest[]> {
    try {
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch('/api/leave-requests?status=pending');

      if (!response.ok) {
        console.error('Failed to fetch pending leave requests:', response.status);
        return [];
      }

      const requests: any[] = await response.json();

      return requests.map(req => ({
        id: req.id || '',
        employeeId: req.employeeId,
        employeeName: req.employeeName,
        leaveTypeId: req.leaveType || 'general',
        leaveTypeName: req.leaveType || 'General',
        startDate: req.startDate,
        endDate: req.endDate,
        duration: req.totalDays,
        halfDay: req.halfDay || false,
        reason: req.reason,
        status: req.status as AttendanceLeaveStatus,
        approvedBy: req.approvedBy,
        approvedAt: req.approvedAt,
        rejectionReason: req.rejectionReason,
        approvalReason: req.approvalReason,
        createdAt: req.createdAt || new Date(),
        updatedAt: req.updatedAt || new Date()
      }));
    } catch (error) {
      console.error('Error fetching pending leave requests:', error);
      return [];
    }
  },

  /**
   * Create a new leave request
   */
  async createLeaveRequest(data: any): Promise<AttendanceLeaveRequest> {
    try {
      const { authenticatedFetch } = await import('@/lib/api-client');

      const response = await authenticatedFetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveType: data.leaveTypeId,
          startDate: data.startDate instanceof Date ? data.startDate.toISOString() : data.startDate,
          endDate: data.endDate instanceof Date ? data.endDate.toISOString() : data.endDate,
          reason: data.reason,
          halfDay: data.halfDay || false,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create leave request');
      }

      const created = await response.json();

      return {
        id: created.id,
        employeeId: created.employeeId,
        employeeName: created.employeeName,
        leaveTypeId: created.leaveType || 'general',
        leaveTypeName: created.leaveType || 'General',
        startDate: new Date(created.startDate),
        endDate: new Date(created.endDate),
        duration: created.totalDays,
        reason: created.reason,
        status: created.status as AttendanceLeaveStatus,
        createdAt: new Date(created.createdAt),
        updatedAt: new Date(created.updatedAt),
      };
    } catch (error) {
      console.error('Error creating leave request:', error);
      throw error;
    }
  },

  /**
   * Approve a leave request
   */
  async approveLeaveRequest(id: string, approverId: string): Promise<void> {
    try {
      // Get leave request details before updating
      const leaveRequest = await leaveFirebaseService.getById(id);
      
      await leaveFirebaseService.update(id, {
        status: 'approved',
        approvedBy: approverId,
        approvedAt: new Date(),
        updatedAt: new Date()
      });
      
      // Send push notification to employee
      if (leaveRequest) {
        try {
          const { pushNotificationService } = await import('./push-notification.service');
          await pushNotificationService.notifyLeaveApproval(
            leaveRequest.employeeId,
            leaveRequest.leaveType || 'Leave',
            leaveRequest.startDate,
            leaveRequest.endDate,
            true
          );
        } catch (error) {
          console.error('Error sending leave approval notification:', error);
        }
      }
    } catch (error) {
      console.error('Error approving leave request:', error);
      throw error;
    }
  },

  /**
   * Reject a leave request
   */
  async rejectLeaveRequest(id: string, approverId: string, reason: string): Promise<void> {
    try {
      // Get leave request details before updating
      const leaveRequest = await leaveFirebaseService.getById(id);
      
      await leaveFirebaseService.update(id, {
        status: 'rejected',
        approvedBy: approverId,
        rejectionReason: reason,
        approvedAt: new Date(),
        updatedAt: new Date()
      });
      
      // Send push notification to employee
      if (leaveRequest) {
        try {
          const { pushNotificationService } = await import('./push-notification.service');
          await pushNotificationService.notifyLeaveApproval(
            leaveRequest.employeeId,
            leaveRequest.leaveType || 'Leave',
            leaveRequest.startDate,
            leaveRequest.endDate,
            false,
            reason
          );
        } catch (error) {
          console.error('Error sending leave rejection notification:', error);
        }
      }
    } catch (error) {
      console.error('Error rejecting leave request:', error);
      throw error;
    }
  },

  /**
   * Cancel a leave request
   */
  async cancelLeaveRequest(id: string): Promise<void> {
    try {
      await leaveFirebaseService.update(id, {
        status: 'cancelled',
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error cancelling leave request:', error);
      throw error;
    }
  }
};

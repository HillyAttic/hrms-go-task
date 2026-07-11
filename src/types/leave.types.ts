/**
 * Leave Management Types
 */

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type LeaveType = 'sick' | 'casual' | 'wfh';

export interface LeaveRequest {
  id?: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  halfDay?: boolean;
  reason: string;
  status: LeaveStatus;
  approvedBy?: string;
  approverName?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  approvalReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LeaveFilters {
  status?: LeaveStatus;
  employeeId?: string;
  leaveType?: LeaveType;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  limit?: number;
}

export interface LeaveStats {
  totalRequests: number;
  pending: number;
  approved: number;
  rejected: number;
}

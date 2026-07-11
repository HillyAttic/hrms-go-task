/**
 * Leave Balance Calculator Service
 * Handles financial year-based leave balance calculations
 * Financial Year: April 1 to March 31
 */

import { LeaveRequest } from '@/types/leave.types';
import { LeaveBalance } from '@/types/attendance.types';

export interface LeaveAllocation {
  leaveTypeId: string;
  leaveTypeName: string;
  annualAllocation: number;
  monthlyLimit?: number; // undefined means no monthly limit
}

export interface MonthlyLeaveUsage {
  month: number; // 0-11 (Jan-Dec)
  year: number;
  sickLeave: number;
  casualLeave: number;
  vacationLeave: number;
  emergencyLeave: number;
}

export interface CalculatedBalance extends LeaveBalance {
  pendingDays: number; // Days in pending requests
  approvedDays: number; // Days in approved requests
  monthlyUsage?: MonthlyLeaveUsage[];
  canApplyInCurrentMonth: boolean;
  monthlyLimitReached: boolean;
}

// Leave type configurations
const LEAVE_ALLOCATIONS: LeaveAllocation[] = [
  {
    leaveTypeId: 'sick',
    leaveTypeName: 'Sick Leave',
    annualAllocation: 999,
    monthlyLimit: undefined
  },
  {
    leaveTypeId: 'casual',
    leaveTypeName: 'Casual Leave',
    annualAllocation: 999,
    monthlyLimit: undefined
  }
];

export class LeaveBalanceCalculator {
  /**
   * Get the current financial year start and end dates
   * Financial year runs from April 1 to March 31
   */
  static getCurrentFinancialYear(): { startDate: Date; endDate: Date } {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-11

    let fyStartYear: number;
    let fyEndYear: number;

    // If current month is Jan, Feb, or Mar (0, 1, 2), we're in the second half of FY
    if (currentMonth < 3) {
      fyStartYear = currentYear - 1;
      fyEndYear = currentYear;
    } else {
      // Apr to Dec, we're in the first half of FY
      fyStartYear = currentYear;
      fyEndYear = currentYear + 1;
    }

    const startDate = new Date(fyStartYear, 3, 1); // April 1
    const endDate = new Date(fyEndYear, 2, 31, 23, 59, 59); // March 31

    return { startDate, endDate };
  }

  /**
   * Calculate leave balances for an employee
   */
  static calculateBalances(
    employeeId: string,
    leaveRequests: LeaveRequest[]
  ): CalculatedBalance[] {
    const { startDate: fyStart, endDate: fyEnd } = this.getCurrentFinancialYear();

    // Filter requests for current financial year
    const fyRequests = leaveRequests.filter(req => {
      const reqStart = new Date(req.startDate);
      return reqStart >= fyStart && reqStart <= fyEnd;
    });

    return LEAVE_ALLOCATIONS.map(allocation => {
      const typeRequests = fyRequests.filter(
        req => req.leaveType === allocation.leaveTypeId || 
               req.leaveType === allocation.leaveTypeName
      );

      // Calculate approved and pending days
      const approvedDays = typeRequests
        .filter(req => req.status === 'approved')
        .reduce((sum, req) => sum + req.totalDays, 0);

      const pendingDays = typeRequests
        .filter(req => req.status === 'pending')
        .reduce((sum, req) => sum + req.totalDays, 0);

      // Calculate remaining days
      const remainingDays = allocation.annualAllocation - approvedDays - pendingDays;

      // Calculate monthly usage if there's a monthly limit
      let monthlyUsage: MonthlyLeaveUsage[] | undefined;
      let canApplyInCurrentMonth = true;
      let monthlyLimitReached = false;

      if (allocation.monthlyLimit !== undefined) {
        monthlyUsage = this.calculateMonthlyUsage(typeRequests, fyStart, fyEnd);
        const currentMonthUsage = this.getCurrentMonthUsage(typeRequests);
        monthlyLimitReached = currentMonthUsage >= allocation.monthlyLimit;
        canApplyInCurrentMonth = currentMonthUsage < allocation.monthlyLimit;
      }

      return {
        leaveTypeId: allocation.leaveTypeId,
        leaveTypeName: allocation.leaveTypeName,
        totalDays: allocation.annualAllocation,
        usedDays: approvedDays,
        remainingDays: Math.max(0, remainingDays),
        pendingDays,
        approvedDays,
        monthlyUsage,
        canApplyInCurrentMonth,
        monthlyLimitReached,
        accrualRate: 1,
        updatedAt: new Date()
      };
    });
  }

  /**
   * Calculate monthly usage for a leave type
   */
  private static calculateMonthlyUsage(
    requests: LeaveRequest[],
    fyStart: Date,
    fyEnd: Date
  ): MonthlyLeaveUsage[] {
    const monthlyData: Map<string, MonthlyLeaveUsage> = new Map();

    // Initialize all months in the financial year
    const current = new Date(fyStart);
    while (current <= fyEnd) {
      const key = `${current.getFullYear()}-${current.getMonth()}`;
      monthlyData.set(key, {
        month: current.getMonth(),
        year: current.getFullYear(),
        sickLeave: 0,
        casualLeave: 0,
        vacationLeave: 0,
        emergencyLeave: 0
      });
      current.setMonth(current.getMonth() + 1);
    }

    // Count approved leaves by month
    requests
      .filter(req => req.status === 'approved')
      .forEach(req => {
        const startDate = new Date(req.startDate);
        const key = `${startDate.getFullYear()}-${startDate.getMonth()}`;
        const monthData = monthlyData.get(key);

        if (monthData) {
          const leaveType = req.leaveType as string;
          if (leaveType === 'sick') {
            monthData.sickLeave += req.totalDays;
          } else if (leaveType === 'casual') {
            monthData.casualLeave += req.totalDays;
          } else if (leaveType === 'vacation') {
            monthData.vacationLeave += req.totalDays;
          } else if (leaveType === 'emergency') {
            monthData.emergencyLeave += req.totalDays;
          }
          // 'wfh' leave type is not tracked in leave balances, so it's intentionally ignored here
        }
      });

    return Array.from(monthlyData.values());
  }

  /**
   * Get current month's leave usage
   */
  private static getCurrentMonthUsage(requests: LeaveRequest[]): number {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return requests
      .filter(req => {
        const reqDate = new Date(req.startDate);
        return (
          reqDate.getMonth() === currentMonth &&
          reqDate.getFullYear() === currentYear &&
          (req.status === 'approved' || req.status === 'pending')
        );
      })
      .reduce((sum, req) => sum + req.totalDays, 0);
  }

  /**
   * Validate if a leave request can be applied
   */
  static validateLeaveRequest(
    leaveTypeId: string,
    startDate: Date,
    endDate: Date,
    employeeRequests: LeaveRequest[]
  ): { valid: boolean; message?: string } {
    const allocation = LEAVE_ALLOCATIONS.find(a => a.leaveTypeId === leaveTypeId);

    if (!allocation) {
      return { valid: false, message: 'Invalid leave type' };
    }

    // Calculate duration
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Check if within financial year
    const { startDate: fyStart, endDate: fyEnd } = this.getCurrentFinancialYear();
    if (startDate < fyStart || startDate > fyEnd) {
      return {
        valid: false,
        message: `Leave must be within current financial year (${fyStart.toLocaleDateString()} - ${fyEnd.toLocaleDateString()})`
      };
    }

    // No limit checks - all leave requests are valid as long as they're within FY
    return { valid: true };
  }

  /**
   * Get leave allocation configuration
   */
  static getLeaveAllocations(): LeaveAllocation[] {
    return LEAVE_ALLOCATIONS;
  }
}

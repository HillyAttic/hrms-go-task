/**
 * Structural stand-in for a Firestore Timestamp. The Admin SDK and the client SDK
 * both satisfy it, so the same types work on both sides of the API boundary —
 * importing either concrete Timestamp here would reject the other one.
 */
export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
}

/** Month names, 0-indexed to match the DB/API convention (0 = January). */
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export interface PayrollSettings {
  id?: string;
  companyName: string;
  companyAddress: string;
  logoUrl: string | null;
  basicPercentage: number;
  hraPercentage: number;
  specialPercentage: number;
  allowedPaidLeaves: number;
  includePaidLeavesInPaidDays: boolean;
  footerNote: string;
  salaryFormula?: string;
  /** "2026-6" (unpadded month) -> employeeId -> granted */
  accessConfig?: Record<string, Record<string, boolean>>;
  updatedAt?: FirestoreTimestamp;
}

export interface AttendanceBreakdown {
  present: number;
  wfh: number;
  approvedLeave: number;
  unapprovedLeave: number;
  halfDay: number;
  holiday: number;
  paidLeave: number;
  leaveTaken: number;
  unpaidLeave: number;
  paidDays: number;
}

export interface SalaryBreakup {
  basic: number;
  hra: number;
  special: number;
  totalDeductions: number;
  netSalary: number;
  epf?: number;
  esi?: number;
  professionalTax?: number;
  tds?: number;
  loanRecovery?: number;
  otherDeduction?: number;
  leaveDeduction?: number;
}

export interface EmployeeSalary {
  id?: string;
  employeeId: string;
  name: string;
  employeeCode: string;
  designation: string;
  department: string;
  doj: string | null;
  pan: string | null;
  grossSalary: number;
  /** 0-indexed */
  month: number;
  year: number;
  totalDaysInMonth: number;
  paidDays: number;
  attendanceBreakdown: AttendanceBreakdown;
  salaryBreakup: SalaryBreakup;
  slipNumber: string;
  generatedAt?: FirestoreTimestamp;
  generatedBy: string;
  accessGranted: boolean;
}

export interface SalaryCalculationResult {
  attendanceBreakdown: AttendanceBreakdown;
  salaryBreakup: SalaryBreakup;
  totalDaysInMonth: number;
  paidDays: number;
}

export interface SalarySlipTemplateField {
  key: string;
  label: string;
  visible: boolean;
}

export interface SalarySlipTemplateSection {
  key: string;
  title: string;
  visible: boolean;
  fields: SalarySlipTemplateField[];
}

export interface SalarySlipTemplate {
  id?: string;
  title: string;
  sections: SalarySlipTemplateSection[];
  showFooterNote: boolean;
  showSlipNumber: boolean;
  footerNote?: string;
  updatedAt?: FirestoreTimestamp;
}

export const DEFAULT_SALARY_SLIP_TEMPLATE: Omit<SalarySlipTemplate, 'id' | 'updatedAt'> = {
  title: 'Default Template',
  showFooterNote: true,
  showSlipNumber: true,
  sections: [
    {
      key: 'employeeDetails',
      title: 'Employee Details',
      visible: true,
      fields: [
        { key: 'name', label: 'Name of the Employee', visible: true },
        { key: 'pan', label: 'PAN', visible: true },
        { key: 'employeeId', label: 'Employee ID', visible: true },
        { key: 'department', label: 'Department', visible: true },
        { key: 'designation', label: 'Designation', visible: true },
        { key: 'doj', label: 'Date of Joining', visible: true },
      ],
    },
    {
      key: 'attendance',
      title: 'Attendance Details',
      visible: true,
      fields: [
        { key: 'totalDaysInMonth', label: 'Total Days in Month', visible: true },
        { key: 'paidDays', label: 'Paid Days', visible: true },
        { key: 'present', label: 'Present', visible: true },
        { key: 'wfh', label: 'WFH', visible: true },
        { key: 'holiday', label: 'Holidays', visible: true },
        { key: 'leaveTaken', label: 'Leave Taken', visible: true },
        { key: 'paidLeave', label: 'Paid Leave', visible: true },
        { key: 'unpaidLeave', label: 'Unpaid Leave', visible: true },
        { key: 'approvedLeave', label: 'Approved Leave', visible: true },
        { key: 'unapprovedLeave', label: 'Unapproved Leave', visible: true },
        { key: 'halfDay', label: 'Half Day', visible: true },
      ],
    },
    {
      key: 'earnings',
      title: 'Earnings',
      visible: true,
      fields: [
        { key: 'basic', label: 'Basic Wage', visible: true },
        { key: 'hra', label: 'HRA', visible: true },
        { key: 'special', label: 'Special Allowances', visible: true },
      ],
    },
    {
      key: 'deductions',
      title: 'Deductions',
      visible: true,
      fields: [
        { key: 'epf', label: 'EPF', visible: true },
        { key: 'esi', label: 'ESI/Health Insurance', visible: true },
        { key: 'professionalTax', label: 'Professional Tax', visible: true },
        { key: 'tds', label: 'TDS / Income Tax', visible: true },
        { key: 'loanRecovery', label: 'Loan Recovery', visible: true },
        { key: 'otherDeduction', label: 'Other Deduction', visible: true },
        { key: 'leaveDeduction', label: 'Leave Deduction', visible: true },
      ],
    },
  ],
};

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  DEFAULT_SALARY_SLIP_TEMPLATE,
  MONTH_NAMES,
  type AttendanceBreakdown,
  type EmployeeSalary,
  type PayrollSettings,
  type SalaryBreakup,
  type SalarySlipTemplate,
  type SalarySlipTemplateSection,
} from '@/types/payroll.types';

export interface SalarySlipPreviewProps {
  slip: EmployeeSalary;
  settings: PayrollSettings;
  template?: SalarySlipTemplate | null;
  forPDF?: boolean;
  hideBreakdown?: boolean;
}

const CURRENCY_FORMAT = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const DEFAULT_FOOTER_NOTE =
  'This is a computer-generated salary slip and does not require a signature.';

function formatCurrency(value: number | undefined): string {
  const num = Number(value);
  return CURRENCY_FORMAT.format(Number.isFinite(num) ? num : 0);
}

function formatCount(value: number | undefined): string {
  const num = Number(value);
  return Number.isFinite(num) ? String(num) : '0';
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN');
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-700">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );
}

interface ResolvedField {
  key: string;
  label: string;
}

/**
 * Employee names/ids and the like live outside the slip document (they come from
 * `users`), so a template may name fields the slip has no value for — those are
 * dropped rather than rendered blank.
 */
function resolveFields(
  section: SalarySlipTemplateSection | undefined,
  values: Record<string, string>,
  fallbackLabels: Record<string, string>
): ResolvedField[] {
  if (!section || section.visible === false) return [];
  const fields = section.fields ?? [];
  if (fields.length === 0) {
    return Object.keys(values).map((key) => ({ key, label: fallbackLabels[key] ?? key }));
  }
  return fields
    .filter((field) => field.visible !== false && values[field.key] !== undefined)
    .map((field) => ({ key: field.key, label: field.label }));
}

/**
 * The A4 sheet is a fixed light document in every theme: it is printed and
 * rasterised for the PDF, so it deliberately carries no dark: variants. The
 * screen-only calculation breakdown below it is styled to match.
 */
export function SalarySlipPreview({
  slip,
  settings,
  template,
  forPDF = false,
  hideBreakdown = false,
}: SalarySlipPreviewProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const activeTemplate = template ?? DEFAULT_SALARY_SLIP_TEMPLATE;
  const sections = activeTemplate.sections ?? [];
  const sectionFor = (key: string) => sections.find((section) => section.key === key);
  const isSectionVisible = (key: string) => sectionFor(key)?.visible !== false;

  // settings can still be in flight on the caller's side even though the prop
  // type is non-nullable — read every field defensively.
  const safeSettings = settings ?? ({} as PayrollSettings);

  const attendance: Partial<AttendanceBreakdown> = slip.attendanceBreakdown ?? {};
  const breakup: Partial<SalaryBreakup> = slip.salaryBreakup ?? {};

  const grossSalary = Number(slip.grossSalary ?? 0);
  const totalDaysInMonth = Number(slip.totalDaysInMonth ?? 0);
  const paidDays = Number(slip.paidDays ?? attendance.paidDays ?? 0);
  const unpaidLeave = Number(attendance.unpaidLeave ?? 0);
  const halfDay = Number(attendance.halfDay ?? 0);
  const allowedPaidLeaves = Number(safeSettings.allowedPaidLeaves ?? 0);
  const basicPercentage = Number(safeSettings.basicPercentage ?? 100);
  const hraPercentage = Number(safeSettings.hraPercentage ?? 0);
  const specialPercentage = Number(safeSettings.specialPercentage ?? 0);

  const basic = Number(breakup.basic ?? 0);
  const hra = Number(breakup.hra ?? 0);
  const special = Number(breakup.special ?? 0);
  const totalEarnings = basic + hra + special;
  const totalDeductions = Number(breakup.totalDeductions ?? 0);
  const leaveDeduction = Number(breakup.leaveDeduction ?? (grossSalary * unpaidLeave) / 26);
  const netSalary = Number(breakup.netSalary ?? grossSalary - leaveDeduction);

  const employeeValues: Record<string, string> = {
    name: slip.name || '-',
    pan: slip.pan || '-',
    employeeId: slip.employeeCode || slip.employeeId || '-',
    department: slip.department || '-',
    designation: slip.designation || '-',
    doj: formatDate(slip.doj),
  };

  const attendanceValues: Record<string, string> = {
    totalDaysInMonth: formatCount(totalDaysInMonth),
    paidDays: formatCount(paidDays),
    present: formatCount(attendance.present),
    wfh: formatCount(attendance.wfh),
    holiday: formatCount(attendance.holiday),
    leaveTaken: formatCount(attendance.leaveTaken),
    paidLeave: formatCount(attendance.paidLeave),
    unpaidLeave: formatCount(unpaidLeave),
    approvedLeave: formatCount(attendance.approvedLeave),
    unapprovedLeave: formatCount(attendance.unapprovedLeave),
    halfDay: formatCount(halfDay),
  };

  const earningsValues: Record<string, string> = {
    basic: formatCurrency(basic),
    hra: formatCurrency(hra),
    special: formatCurrency(special),
  };

  const deductionsValues: Record<string, string> = {
    epf: formatCurrency(breakup.epf),
    esi: formatCurrency(breakup.esi),
    professionalTax: formatCurrency(breakup.professionalTax),
    tds: formatCurrency(breakup.tds),
    loanRecovery: formatCurrency(breakup.loanRecovery),
    otherDeduction: formatCurrency(breakup.otherDeduction),
    leaveDeduction: formatCurrency(leaveDeduction),
  };

  const employeeFields = resolveFields(sectionFor('employeeDetails'), employeeValues, {
    name: 'Name of the Employee',
    pan: 'PAN',
    employeeId: 'Employee ID',
    department: 'Department',
    designation: 'Designation',
    doj: 'Date of Joining',
  });

  const attendanceFields = resolveFields(sectionFor('attendance'), attendanceValues, {
    totalDaysInMonth: 'Total Days in Month',
    paidDays: 'Paid Days',
    present: 'Present',
    wfh: 'WFH',
    holiday: 'Holidays',
    leaveTaken: 'Leave Taken',
    paidLeave: 'Paid Leave',
    unpaidLeave: 'Unpaid Leave',
    approvedLeave: 'Approved Leave',
    unapprovedLeave: 'Unapproved Leave',
    halfDay: 'Half Day',
  });

  const earningFields = resolveFields(sectionFor('earnings'), earningsValues, {
    basic: 'Basic Wage',
    hra: 'HRA',
    special: 'Special Allowances',
  });

  const deductionFields = resolveFields(sectionFor('deductions'), deductionsValues, {
    epf: 'EPF',
    esi: 'ESI/Health Insurance',
    professionalTax: 'Professional Tax',
    tds: 'TDS / Income Tax',
    loanRecovery: 'Loan Recovery',
    otherDeduction: 'Other Deduction',
    leaveDeduction: 'Leave Deduction',
  });

  const earningsVisible = isSectionVisible('earnings');
  const deductionsVisible = isSectionVisible('deductions');
  const showBreakdownPanel = !forPDF && !hideBreakdown;

  return (
    <div
      id="salary-slip-preview"
      className="text-black"
      style={{
        width: '210mm',
        minHeight: '297mm',
        fontFamily: 'Arial, sans-serif',
        background: '#ffffff',
        border: '1px solid #d1d5db',
        boxSizing: 'border-box',
        padding: '60px',
      }}
    >
      {/* Letterhead substitute — this app ships no letterhead image. */}
      <div className="border-b border-gray-300 pb-3 mb-6 text-center">
        <p className="text-base font-bold">{safeSettings.companyName || 'Company'}</p>
        {safeSettings.companyAddress ? (
          <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">
            {safeSettings.companyAddress}
          </p>
        ) : null}
      </div>

      <div className="border-b-2 border-gray-800 pb-2 mb-6 text-center">
        <h2 className="text-xl font-bold">SALARY SLIP</h2>
        <p className="text-sm">
          Pay Slip for {MONTH_NAMES[slip.month] ?? ''}, {slip.year}
        </p>
      </div>

      {employeeFields.length > 0 && (
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm">
          {employeeFields.map((field) => (
            <FieldRow key={field.key} label={field.label} value={employeeValues[field.key]} />
          ))}
        </div>
      )}

      {attendanceFields.length > 0 && (
        <div className="border-t border-gray-300 pt-4 mb-6">
          <h3 className="font-bold mb-2">{sectionFor('attendance')?.title ?? 'Attendance Details'}</h3>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 text-sm">
            {attendanceFields.map((field) => (
              <FieldRow key={field.key} label={field.label} value={attendanceValues[field.key]} />
            ))}
          </div>
        </div>
      )}

      {(earningsVisible || deductionsVisible) && (
        <div className="grid grid-cols-2 gap-8">
          {earningsVisible && (
            <div>
              <h3 className="text-center font-bold border-b border-gray-400 pb-2">
                {sectionFor('earnings')?.title ?? 'Earnings'}
              </h3>
              <div className="space-y-2 text-sm mt-2">
                {earningFields.map((field) => (
                  <FieldRow key={field.key} label={field.label} value={earningsValues[field.key]} />
                ))}
              </div>
              <div className="flex justify-between font-bold border-t border-gray-400 pt-2 mt-2 text-sm">
                <span>Total Earnings</span>
                <span>{formatCurrency(totalEarnings)}</span>
              </div>
            </div>
          )}
          {deductionsVisible && (
            <div>
              <h3 className="text-center font-bold border-b border-gray-400 pb-2">
                {sectionFor('deductions')?.title ?? 'Deductions'}
              </h3>
              <div className="space-y-2 text-sm mt-2">
                {deductionFields.map((field) => (
                  <FieldRow key={field.key} label={field.label} value={deductionsValues[field.key]} />
                ))}
              </div>
              <div className="flex justify-between font-bold border-t border-gray-400 pt-2 mt-2 text-sm">
                <span>Total Deductions</span>
                <span>{formatCurrency(totalDeductions)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-gray-200 p-4 rounded mb-6 mt-6 flex justify-between items-center">
        <span className="text-lg font-bold">Net Salary</span>
        <span className="text-xl font-bold">{formatCurrency(netSalary)}</span>
      </div>

      {activeTemplate.showFooterNote && (
        <p className="text-xs text-gray-600 italic mt-8 pt-4 border-t border-gray-300">
          {activeTemplate.footerNote || safeSettings.footerNote || DEFAULT_FOOTER_NOTE}
        </p>
      )}
      {activeTemplate.showSlipNumber && slip.slipNumber ? (
        <p className="text-xs text-gray-500 mt-4">Slip Number: {slip.slipNumber}</p>
      ) : null}

      {showBreakdownPanel && (
        <>
          <button
            type="button"
            onClick={() => setShowBreakdown((open) => !open)}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            {showBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showBreakdown ? 'Hide Calculation Breakdown' : 'Show Calculation Breakdown'}
          </button>

          {showBreakdown && (
            <div className="mt-4 space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <p className="text-xs font-semibold text-blue-700 uppercase">Leave Deduction</p>
                <p className="font-mono text-xs text-blue-900 font-bold">
                  leaveDeduction = (grossSalary × unpaidLeave) / 26 = ({formatCurrency(grossSalary)} ×{' '}
                  {unpaidLeave}) / 26 = {formatCurrency(leaveDeduction)}
                </p>
                <p className="text-xs font-semibold text-blue-700 uppercase pt-2">Net Salary</p>
                <p className="font-mono text-xs text-blue-900 font-bold">
                  netSalary = grossSalary − leaveDeduction = {formatCurrency(grossSalary)} −{' '}
                  {formatCurrency(leaveDeduction)} = {formatCurrency(netSalary)}
                </p>
                <p className="text-xs font-semibold text-blue-700 uppercase pt-2">Paid Days</p>
                <p className="font-mono text-xs text-blue-900 font-bold">
                  paidDays = 26 − unpaidLeave − (halfDay × 0.5) = 26 − {unpaidLeave} − ({halfDay} ×
                  0.5) = {formatCount(paidDays)}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-4 text-xs space-y-1.5">
                  <p className="font-semibold text-gray-700 uppercase mb-2">Given</p>
                  <FieldRow label="Gross Salary" value={formatCurrency(grossSalary)} />
                  <FieldRow label="Total Days in Month" value={formatCount(totalDaysInMonth)} />
                  <FieldRow label="Unpaid Leave" value={formatCount(unpaidLeave)} />
                  <FieldRow label="Half Day" value={formatCount(halfDay)} />
                  <FieldRow label="Paid Leaves Allowed" value={formatCount(allowedPaidLeaves)} />
                  <FieldRow label="Basic / HRA / Special" value={`${basicPercentage}/${hraPercentage}/${specialPercentage}%`} />
                </div>

                <div className="bg-gray-50 rounded-lg p-4 text-xs space-y-1.5">
                  <p className="font-semibold text-gray-700 uppercase mb-2">Calculation</p>
                  <FieldRow label="Paid Days" value={formatCount(paidDays)} />
                  <FieldRow label="Leave Deduction" value={formatCurrency(leaveDeduction)} />
                  <FieldRow label="Total Deductions" value={formatCurrency(totalDeductions)} />
                  <FieldRow label="Net Salary" value={formatCurrency(netSalary)} />
                </div>

                <div className="bg-gray-50 rounded-lg p-4 text-xs space-y-1.5">
                  <p className="font-semibold text-gray-700 uppercase mb-2">Breakdown</p>
                  <FieldRow label="Basic Wage" value={formatCurrency(basic)} />
                  <FieldRow label="HRA" value={formatCurrency(hra)} />
                  <FieldRow label="Special Allowances" value={formatCurrency(special)} />
                  <FieldRow label="Total Earnings" value={formatCurrency(totalEarnings)} />
                  <FieldRow label="Total Deductions" value={formatCurrency(totalDeductions)} />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SalarySlipPreview;

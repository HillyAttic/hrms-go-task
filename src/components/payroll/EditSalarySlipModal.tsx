'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { payrollService } from '@/services/payroll.service';
import { MONTH_NAMES, type EmployeeSalary, type SalarySlipTemplate } from '@/types/payroll.types';
import { cn } from '@/lib/utils';

const amount = z
  .union([z.number(), z.nan()])
  .refine((value) => Number.isFinite(value) && value >= 0, 'Enter a value of 0 or more');

const slipSchema = z.object({
  grossSalary: amount,
  designation: z.string(),
  department: z.string(),
  pan: z
    .string()
    .refine(
      (value) => value === '' || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value),
      'Enter a valid PAN (5 letters, 4 digits, 1 letter)'
    ),
  doj: z.string(),
  present: amount,
  wfh: amount,
  halfDay: amount,
  holiday: amount,
  paidLeave: amount,
  leaveTaken: amount,
  unpaidLeave: amount,
  paidDays: amount,
  basic: amount,
  hra: amount,
  special: amount,
  epf: amount,
  esi: amount,
  professionalTax: amount,
  tds: amount,
  loanRecovery: amount,
  otherDeduction: amount,
  leaveDeduction: amount,
});

type SlipFormValues = z.infer<typeof slipSchema>;

type NumericField =
  | 'grossSalary' | 'present' | 'wfh' | 'halfDay' | 'holiday' | 'paidLeave' | 'leaveTaken'
  | 'unpaidLeave' | 'paidDays' | 'basic' | 'hra' | 'special' | 'epf' | 'esi'
  | 'professionalTax' | 'tds' | 'loanRecovery' | 'otherDeduction' | 'leaveDeduction';

const DEDUCTION_FIELDS: { name: NumericField; label: string }[] = [
  { name: 'epf', label: 'EPF' },
  { name: 'esi', label: 'ESI / Health Insurance' },
  { name: 'professionalTax', label: 'Professional Tax' },
  { name: 'tds', label: 'TDS / Income Tax' },
  { name: 'loanRecovery', label: 'Loan Recovery' },
  { name: 'otherDeduction', label: 'Other Deduction' },
  { name: 'leaveDeduction', label: 'Leave Deduction' },
];

const ATTENDANCE_FIELDS: { name: NumericField; label: string; step?: number; highlight?: boolean }[] = [
  { name: 'present', label: 'Present' },
  { name: 'wfh', label: 'WFH' },
  { name: 'halfDay', label: 'Half Day' },
  { name: 'holiday', label: 'Holiday' },
  { name: 'paidLeave', label: 'Paid Leave' },
  { name: 'leaveTaken', label: 'Leave Taken' },
  { name: 'unpaidLeave', label: 'Unpaid Leave' },
  { name: 'paidDays', label: 'Paid Days', step: 0.5, highlight: true },
];

interface EditSalarySlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  slip: EmployeeSalary | null;
  template?: SalarySlipTemplate | null;
  onSaveSuccess?: () => void;
}

const inputClass =
  'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
const errorClass = 'mt-1 text-xs text-red-500';
const sectionTitleClass = 'text-base font-semibold text-gray-900 dark:text-white';

export function EditSalarySlipModal({
  isOpen,
  onClose,
  slip,
  template,
  onSaveSuccess,
}: EditSalarySlipModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SlipFormValues>({ resolver: zodResolver(slipSchema) });

  useEffect(() => {
    if (!isOpen || !slip) return;
    const attendance = slip.attendanceBreakdown;
    const breakup = slip.salaryBreakup;
    reset({
      grossSalary: slip.grossSalary ?? 0,
      designation: slip.designation ?? '',
      department: slip.department ?? '',
      pan: slip.pan ?? '',
      doj: slip.doj ?? '',
      present: attendance?.present ?? 0,
      wfh: attendance?.wfh ?? 0,
      halfDay: attendance?.halfDay ?? 0,
      holiday: attendance?.holiday ?? 0,
      paidLeave: attendance?.paidLeave ?? 0,
      leaveTaken: attendance?.leaveTaken ?? 0,
      unpaidLeave: attendance?.unpaidLeave ?? 0,
      paidDays: attendance?.paidDays ?? 0,
      basic: breakup?.basic ?? 0,
      hra: breakup?.hra ?? 0,
      special: breakup?.special ?? 0,
      epf: breakup?.epf ?? 0,
      esi: breakup?.esi ?? 0,
      professionalTax: breakup?.professionalTax ?? 0,
      tds: breakup?.tds ?? 0,
      loanRecovery: breakup?.loanRecovery ?? 0,
      otherDeduction: breakup?.otherDeduction ?? 0,
      leaveDeduction: breakup?.leaveDeduction ?? 0,
    });
  }, [isOpen, slip, reset]);

  const present = Number(watch('present') || 0);
  const wfh = Number(watch('wfh') || 0);
  const halfDay = Number(watch('halfDay') || 0);
  const paidLeave = Number(watch('paidLeave') || 0);

  useEffect(() => {
    if (!isOpen) return;
    setValue('paidDays', present + wfh + paidLeave + halfDay * 0.5);
  }, [isOpen, present, wfh, paidLeave, halfDay, setValue]);

  const totalEarnings =
    Number(watch('basic') || 0) + Number(watch('hra') || 0) + Number(watch('special') || 0);
  const totalDeductions = DEDUCTION_FIELDS.reduce(
    (sum, field) => sum + Number(watch(field.name) || 0),
    0
  );
  const netSalary = totalEarnings - totalDeductions;

  const sectionVisible = (key: string) => {
    if (!template) return true;
    const section = template.sections.find((item) => item.key === key);
    return section ? section.visible : true;
  };
  const fieldVisible = (sectionKey: string, fieldKey: string) => {
    if (!template) return true;
    const section = template.sections.find((item) => item.key === sectionKey);
    if (!section) return true;
    const field = section.fields.find((item) => item.key === fieldKey);
    return field ? field.visible : true;
  };

  const numberField = (
    name: NumericField,
    label: string,
    options?: { step?: number; highlight?: boolean }
  ) => (
    <div key={name}>
      <label className={labelClass}>{label}</label>
      <input
        type="number"
        min={0}
        step={options?.step ?? 1}
        {...register(name, { valueAsNumber: true })}
        className={cn(inputClass, options?.highlight && 'bg-blue-50 dark:bg-blue-900/20')}
      />
      {errors[name] && <p className={errorClass}>{errors[name]?.message}</p>}
    </div>
  );

  const onSubmit = async (values: SlipFormValues) => {
    if (!slip?.id) return;
    const ok = await payrollService.updateSlip(slip.id, {
      grossSalary: values.grossSalary,
      designation: values.designation,
      department: values.department,
      pan: values.pan.trim() ? values.pan.trim().toUpperCase() : null,
      doj: values.doj || null,
      attendanceBreakdown: {
        present: values.present,
        wfh: values.wfh,
        halfDay: values.halfDay,
        holiday: values.holiday,
        paidLeave: values.paidLeave,
        leaveTaken: values.leaveTaken,
        unpaidLeave: values.unpaidLeave,
        paidDays: values.paidDays,
        // Not editable here — carried over so the PUT still satisfies the ten-field schema.
        approvedLeave: slip.attendanceBreakdown?.approvedLeave ?? 0,
        unapprovedLeave: slip.attendanceBreakdown?.unapprovedLeave ?? 0,
      },
      salaryBreakup: {
        basic: values.basic,
        hra: values.hra,
        special: values.special,
        totalDeductions,
        netSalary,
        epf: values.epf,
        esi: values.esi,
        professionalTax: values.professionalTax,
        tds: values.tds,
        loanRecovery: values.loanRecovery,
        otherDeduction: values.otherDeduction,
        leaveDeduction: values.leaveDeduction,
      },
    });
    if (!ok) {
      toast.error('Failed to save the salary slip');
      return;
    }
    toast.success('Salary slip updated');
    onSaveSuccess?.();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[950px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">
            Edit Salary Slip — {slip?.name ?? ''}
            {slip ? ` (${MONTH_NAMES[slip.month]} ${slip.year})` : ''}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {sectionVisible('employeeDetails') && (
            <section className="space-y-4">
              <h3 className={sectionTitleClass}>Employee Details</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Employee ID</label>
                  <input value={slip?.employeeCode ?? ''} readOnly disabled className={cn(inputClass, 'opacity-70')} />
                </div>
                <div>
                  <label className={labelClass}>Name</label>
                  <input value={slip?.name ?? ''} readOnly disabled className={cn(inputClass, 'opacity-70')} />
                </div>
                {numberField('grossSalary', 'Gross Salary')}
                {fieldVisible('employeeDetails', 'designation') && (
                  <div>
                    <label className={labelClass}>Designation</label>
                    <input {...register('designation')} className={inputClass} />
                  </div>
                )}
                {fieldVisible('employeeDetails', 'department') && (
                  <div>
                    <label className={labelClass}>Department</label>
                    <input {...register('department')} className={inputClass} />
                  </div>
                )}
                {fieldVisible('employeeDetails', 'pan') && (
                  <div>
                    <label className={labelClass}>PAN</label>
                    <input {...register('pan')} maxLength={10} className={cn(inputClass, 'font-mono')} />
                    {errors.pan && <p className={errorClass}>{errors.pan.message}</p>}
                  </div>
                )}
                {fieldVisible('employeeDetails', 'doj') && (
                  <div>
                    <label className={labelClass}>Date of Joining</label>
                    <input type="date" {...register('doj')} className={inputClass} />
                  </div>
                )}
              </div>
            </section>
          )}

          {sectionVisible('attendance') && (
            <section className="space-y-4">
              <h3 className={sectionTitleClass}>Attendance</h3>
              <div className="grid grid-cols-4 gap-3">
                {ATTENDANCE_FIELDS.filter((field) => fieldVisible('attendance', field.name)).map((field) =>
                  numberField(field.name, field.label, { step: field.step, highlight: field.highlight })
                )}
              </div>
            </section>
          )}

          <div className="grid grid-cols-2 gap-4">
            {sectionVisible('earnings') && (
              <section className="space-y-4">
                <h3 className={sectionTitleClass}>Earnings</h3>
                <div className="space-y-3">
                  {fieldVisible('earnings', 'basic') && numberField('basic', 'Basic Wage')}
                  {fieldVisible('earnings', 'hra') && numberField('hra', 'HRA')}
                  {fieldVisible('earnings', 'special') && numberField('special', 'Special Allowance')}
                </div>
              </section>
            )}
            {sectionVisible('deductions') && (
              <section className="space-y-4">
                <h3 className={sectionTitleClass}>Deductions</h3>
                <div className="space-y-3">
                  {DEDUCTION_FIELDS.filter((field) => fieldVisible('deductions', field.name)).map((field) =>
                    numberField(field.name, field.label)
                  )}
                </div>
              </section>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Total Earnings</p>
              <p className="font-bold text-green-600 dark:text-green-400">
                ₹{totalEarnings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Total Deductions</p>
              <p className="font-bold text-red-600 dark:text-red-400">
                ₹{totalDeductions.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Net Salary</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                ₹{netSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditSalarySlipModal;

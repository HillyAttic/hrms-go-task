'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/** Shape returned by GET /api/employees — the subset this module cares about. */
export interface PayrollEmployee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  department: string;
  grossSalary: number;
  doj: string | null;
  pan: string | null;
  designation: string;
}

const salarySchema = z.object({
  doj: z.string(),
  pan: z
    .string()
    .refine(
      (value) => value === '' || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value),
      'Enter a valid PAN (5 letters, 4 digits, 1 letter)'
    ),
  department: z.string(),
  designation: z.string().min(1, 'Designation is required'),
  grossSalary: z
    .union([z.number(), z.nan()])
    .refine((value) => Number.isFinite(value) && value >= 0, 'Enter a gross salary of 0 or more'),
});

export type SalaryConfigValues = z.infer<typeof salarySchema>;

interface SalaryConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: PayrollEmployee | null;
  isLoading?: boolean;
  onSubmit: (values: SalaryConfigValues) => void;
}

const inputClass =
  'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ring';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
const errorClass = 'mt-1 text-xs text-red-500';

export function SalaryConfigModal({
  isOpen,
  onClose,
  employee,
  isLoading,
  onSubmit,
}: SalaryConfigModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SalaryConfigValues>({ resolver: zodResolver(salarySchema) });

  useEffect(() => {
    if (!isOpen || !employee) return;
    reset({
      doj: employee.doj ?? '',
      pan: employee.pan ?? '',
      department: employee.department ?? '',
      designation: employee.designation ?? '',
      grossSalary: employee.grossSalary ?? 0,
    });
  }, [isOpen, employee, reset]);

  const panField = register('pan');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">
            Configure Salary - {employee?.name ?? ''}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className={labelClass}>Date of Joining</label>
            <input type="date" {...register('doj')} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>PAN Number</label>
            <input
              {...panField}
              placeholder="ABCDE1234F"
              maxLength={10}
              onChange={(event) => {
                event.target.value = event.target.value.toUpperCase();
                void panField.onChange(event);
              }}
              className={`${inputClass} font-mono`}
            />
            {errors.pan ? (
              <p className={errorClass}>{errors.pan.message}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Format: 5 letters, 4 digits, 1 letter
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Department</label>
            <input {...register('department')} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Designation</label>
            <input {...register('designation')} className={inputClass} />
            {errors.designation && <p className={errorClass}>{errors.designation.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Gross Salary</label>
            <input
              type="number"
              min={0}
              step={1}
              {...register('grossSalary', { valueAsNumber: true })}
              className={inputClass}
            />
            {errors.grossSalary && <p className={errorClass}>{errors.grossSalary.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default SalaryConfigModal;

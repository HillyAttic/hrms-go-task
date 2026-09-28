'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { payrollService } from '@/services/payroll.service';
import { cn } from '@/lib/utils';

const percentage = z
  .union([z.number(), z.nan()])
  .refine((value) => Number.isFinite(value) && value >= 0 && value <= 100, 'Enter 0-100');

const settingsSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  companyAddress: z.string().min(1, 'Company address is required'),
  logoUrl: z.string(),
  basicPercentage: percentage,
  hraPercentage: percentage,
  specialPercentage: percentage,
  allowedPaidLeaves: z
    .union([z.number(), z.nan()])
    .refine((value) => Number.isInteger(value) && value >= 0, 'Enter a whole number of 0 or more'),
  includePaidLeavesInPaidDays: z.boolean(),
  footerNote: z.string(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

interface PayrollSettingsFormProps {
  onSaveSuccess?: () => void;
}

const inputClass =
  'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none';
const labelClass = 'block text-sm font-medium text-muted-foreground mb-1';
const errorClass = 'mt-1 text-xs text-destructive';
const sectionTitleClass = 'text-base font-semibold text-foreground flex items-center gap-2';

export function PayrollSettingsForm({ onSaveSuccess }: PayrollSettingsFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      companyName: '',
      companyAddress: '',
      logoUrl: '',
      basicPercentage: 50,
      hraPercentage: 20,
      specialPercentage: 30,
      allowedPaidLeaves: 0,
      includePaidLeavesInPaidDays: false,
      footerNote: '',
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const settings = await payrollService.getSettings();
      if (cancelled) return;
      if (settings) {
        reset({
          companyName: settings.companyName ?? '',
          companyAddress: settings.companyAddress ?? '',
          logoUrl: settings.logoUrl ?? '',
          basicPercentage: settings.basicPercentage ?? 0,
          hraPercentage: settings.hraPercentage ?? 0,
          specialPercentage: settings.specialPercentage ?? 0,
          allowedPaidLeaves: settings.allowedPaidLeaves ?? 0,
          includePaidLeavesInPaidDays: settings.includePaidLeavesInPaidDays ?? false,
          footerNote: settings.footerNote ?? '',
        });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reset]);

  const total =
    Number(watch('basicPercentage') || 0) +
    Number(watch('hraPercentage') || 0) +
    Number(watch('specialPercentage') || 0);
  const totalsToHundred = total === 100;

  const onSubmit = async (values: SettingsFormValues) => {
    if (!totalsToHundred) {
      toast.error(`Percentages must sum to 100 (currently ${total})`);
      return;
    }
    setSaving(true);
    const saved = await payrollService.saveSettings({
      ...values,
      logoUrl: values.logoUrl.trim() ? values.logoUrl.trim() : null,
    });
    setSaving(false);
    if (!saved) {
      toast.error('Failed to save payroll settings');
      return;
    }
    toast.success('Payroll settings saved');
    onSaveSuccess?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
      <section className="space-y-4">
        <h3 className={sectionTitleClass}>Company Information</h3>
        <div>
          <label className={labelClass}>Company Name</label>
          <input {...register('companyName')} className={inputClass} />
          {errors.companyName && <p className={errorClass}>{errors.companyName.message}</p>}
        </div>
        <div>
          <label className={labelClass}>Company Address</label>
          <Textarea
            rows={3}
            {...register('companyAddress')}
            className="rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground"
          />
          {errors.companyAddress && <p className={errorClass}>{errors.companyAddress.message}</p>}
        </div>
        <div>
          <label className={labelClass}>Logo URL (optional)</label>
          <input {...register('logoUrl')} placeholder="https://..." className={inputClass} />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className={sectionTitleClass}>Salary Breakup Percentages</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Basic %</label>
            <input type="number" step={1} {...register('basicPercentage', { valueAsNumber: true })} className={inputClass} />
            {errors.basicPercentage && <p className={errorClass}>{errors.basicPercentage.message}</p>}
          </div>
          <div>
            <label className={labelClass}>HRA %</label>
            <input type="number" step={1} {...register('hraPercentage', { valueAsNumber: true })} className={inputClass} />
            {errors.hraPercentage && <p className={errorClass}>{errors.hraPercentage.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Special %</label>
            <input type="number" step={1} {...register('specialPercentage', { valueAsNumber: true })} className={inputClass} />
            {errors.specialPercentage && <p className={errorClass}>{errors.specialPercentage.message}</p>}
          </div>
        </div>
        <p
          className={cn(
            'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
            totalsToHundred
              ? 'bg-success/15 text-success'
              : 'bg-warning/15 text-warning'
          )}
        >
          Total: {total}%{totalsToHundred ? '' : ' (Must equal 100%)'}
        </p>
      </section>

      <section className="space-y-4">
        <h3 className={sectionTitleClass}>Leave Policy</h3>
        <div>
          <label className={labelClass}>Allowed Paid Leaves per Month</label>
          <input
            type="number"
            min={0}
            step={1}
            {...register('allowedPaidLeaves', { valueAsNumber: true })}
            className={inputClass}
          />
          {errors.allowedPaidLeaves && <p className={errorClass}>{errors.allowedPaidLeaves.message}</p>}
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border border-border">
          <input
            type="checkbox"
            id="include-paid-leaves"
            {...register('includePaidLeavesInPaidDays')}
            className="h-4 w-4 rounded border-border text-ring focus:ring-ring"
          />
          <label htmlFor="include-paid-leaves" className="text-sm text-muted-foreground">
            Include Allowed Paid Leaves in Paid Days count
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          When enabled, the monthly paid-leave allowance also counts towards paid days on the slip.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className={sectionTitleClass}>Footer Note</h3>
        <Textarea
          rows={2}
          {...register('footerNote')}
          placeholder="This is a computer-generated salary slip and does not require a signature."
          className="rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground"
        />
      </section>

      <div>
        <Button type="submit" loading={saving}>
          Save Settings
        </Button>
      </div>
    </form>
  );
}

export default PayrollSettingsForm;

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { authenticatedFetch } from '@/lib/api-client';
import { payrollService } from '@/services/payroll.service';
import {
  MONTH_NAMES,
  type EmployeeSalary,
  type PayrollSettings,
  type SalaryCalculationResult,
  type SalarySlipTemplate,
} from '@/types/payroll.types';
import { SalarySlipPreview } from '@/components/payroll/SalarySlipPreview';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';

const YEARS = [2024, 2025, 2026, 2027];
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const CURRENCY_FORMAT = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const SELECT_CLASS =
  'w-40 dark:bg-gray-700 dark:border-gray-600 dark:text-white';

interface LiveProfile {
  displayName?: string;
  name?: string;
  pan?: string | null;
  designation?: string;
  department?: string;
  doj?: string | null;
}

/** A failure here is not fatal — the slip renders from its stored values. */
async function fetchProfile(): Promise<LiveProfile | null> {
  try {
    const response = await authenticatedFetch('/api/auth/profile');
    if (!response.ok) return null;
    const json = await response.json();
    return (json?.data ?? json) as LiveProfile;
  } catch (error) {
    console.error('[SalarySlipPage] Failed to load the user profile', error);
    return null;
  }
}

async function fetchMyCalculation(
  month: number,
  year: number
): Promise<SalaryCalculationResult | null> {
  try {
    const response = await authenticatedFetch('/api/payroll/my-calculation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year }),
    });
    if (!response.ok) return null;
    return (await response.json()) as SalaryCalculationResult;
  } catch (error) {
    console.error('[SalarySlipPage] Failed to refresh attendance', error);
    return null;
  }
}

function formatCurrency(value: number | undefined): string {
  const num = Number(value);
  return CURRENCY_FORMAT.format(Number.isFinite(num) ? num : 0);
}

export default function SalarySlipPage() {
  const { user: currentUser, loading: authLoading, claims } = useEnhancedAuth();
  const router = useRouter();
  const role = claims?.role ?? null;

  const [allSlips, setAllSlips] = useState<EmployeeSalary[]>([]);
  const [slips, setSlips] = useState<EmployeeSalary[]>([]);
  const [settings, setSettings] = useState<PayrollSettings | null>(null);
  const [templates, setTemplates] = useState<SalarySlipTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState<number | undefined>(undefined);
  const [year, setYear] = useState<number | undefined>(undefined);
  const [templateId, setTemplateId] = useState('');
  const [previewSlip, setPreviewSlip] = useState<EmployeeSalary | null>(null);
  const [busySlipId, setBusySlipId] = useState<string | null>(null);

  const [panSlip, setPanSlip] = useState<EmployeeSalary | null>(null);
  const [panValue, setPanValue] = useState('');
  const [panError, setPanError] = useState('');
  const [savingPan, setSavingPan] = useState(false);
  const pendingActionRef = useRef<'view' | 'download' | null>(null);
  const redirectedRef = useRef(false);

  const loadData = useCallback(async (userId: string) => {
    const [rawSlips, settingsData, templateList] = await Promise.all([
      payrollService.getSlips({ employeeId: userId }),
      payrollService.getSettings(),
      payrollService.getTemplates(),
    ]);

    // The API already filtered these; anything dropped here is a bug or a hostile
    // response, and either way it must never reach the screen.
    const accessible = rawSlips.filter(
      (slip) => slip.employeeId === userId && slip.accessGranted === true
    );
    if (accessible.length !== rawSlips.length) {
      console.error(
        `[SalarySlipPage] SECURITY VIOLATION — dropped ${rawSlips.length - accessible.length} slip(s)`
      );
    }

    setAllSlips(rawSlips);
    setSlips(accessible);
    setSettings(settingsData);
    setTemplates(templateList);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadData(currentUser.uid).finally(() => setLoading(false));
  }, [authLoading, currentUser, loadData]);

  // Notification deep-links land on their period, then the keys are consumed so a
  // later plain visit opens unfiltered.
  useEffect(() => {
    const storedMonth = sessionStorage.getItem('salarySlipMonth');
    const storedYear = sessionStorage.getItem('salarySlipYear');
    sessionStorage.removeItem('salarySlipMonth');
    sessionStorage.removeItem('salarySlipYear');

    const parsedMonth = storedMonth === null ? NaN : parseInt(storedMonth, 10);
    const parsedYear = storedYear === null ? NaN : parseInt(storedYear, 10);
    if (Number.isInteger(parsedMonth) && parsedMonth >= 0 && parsedMonth <= 11) {
      setMonth(parsedMonth);
    }
    if (Number.isInteger(parsedYear)) setYear(parsedYear);
  }, []);

  useEffect(() => {
    const handleFilterChange = (event: Event) => {
      const detail = (event as CustomEvent<{ month?: number; year?: number }>).detail ?? {};
      const eventMonth = detail.month ?? (event as Event & { month?: number }).month;
      const eventYear = detail.year ?? (event as Event & { year?: number }).year;
      if (typeof eventMonth === 'number' && Number.isInteger(eventMonth)) setMonth(eventMonth);
      if (typeof eventYear === 'number' && Number.isInteger(eventYear)) setYear(eventYear);
    };

    window.addEventListener('salarySlipFilterChange', handleFilterChange);
    return () => window.removeEventListener('salarySlipFilterChange', handleFilterChange);
  }, []);

  useEffect(() => {
    if (loading || role === null || redirectedRef.current) return;
    if (role === 'admin' || role === 'manager') return;
    if (slips.length > 0) return;
    redirectedRef.current = true;
    toast.error('No salary slips are available for your account yet');
    router.replace('/dashboard');
  }, [loading, role, slips.length, router]);

  const visibleSlips = useMemo(
    () =>
      slips
        .filter(
          (slip) =>
            (month === undefined || slip.month === month) &&
            (year === undefined || slip.year === year)
        )
        .sort((a, b) => b.year - a.year || b.month - a.month),
    [slips, month, year]
  );

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === templateId) ?? templates[0] ?? null,
    [templates, templateId]
  );

  const handleRefresh = async () => {
    if (!currentUser) return;
    setRefreshing(true);
    try {
      await loadData(currentUser.uid);
      toast.success('Salary slips refreshed');
    } finally {
      setRefreshing(false);
    }
  };

  /** Live attendance + profile, so a slip generated mid-month shows current numbers. */
  const freshenSlip = async (slip: EmployeeSalary): Promise<EmployeeSalary> => {
    const next: EmployeeSalary = { ...slip };
    const [profile, calculation] = await Promise.all([
      fetchProfile(),
      fetchMyCalculation(slip.month, slip.year),
    ]);

    if (profile) {
      next.name = profile.displayName || profile.name || next.name;
      next.pan = profile.pan ?? next.pan;
      next.designation = profile.designation || next.designation;
      next.department = profile.department || next.department;
      next.doj = profile.doj ?? next.doj;
    }
    if (calculation) {
      next.attendanceBreakdown = calculation.attendanceBreakdown ?? next.attendanceBreakdown;
      next.salaryBreakup = calculation.salaryBreakup ?? next.salaryBreakup;
      next.paidDays = calculation.paidDays ?? next.paidDays;
      next.totalDaysInMonth = calculation.totalDaysInMonth ?? next.totalDaysInMonth;
    }

    return next;
  };

  const openPreview = async (slip: EmployeeSalary) => {
    setBusySlipId(slip.id ?? slip.slipNumber);
    try {
      setPreviewSlip(await freshenSlip(slip));
    } finally {
      setBusySlipId(null);
    }
  };

  const downloadSlip = async (slip: EmployeeSalary) => {
    if (!settings) {
      toast.error('Payroll settings are not available yet — try again in a moment');
      return;
    }
    setBusySlipId(slip.id ?? slip.slipNumber);
    try {
      const fresh = await freshenSlip(slip);
      const { generateSalarySlipPDF } = await import('@/components/payroll/SalarySlipPDF');
      await generateSalarySlipPDF(fresh, settings, selectedTemplate);
      toast.success('Salary slip downloaded');
    } catch (error) {
      console.error('[SalarySlipPage] Failed to generate the salary slip PDF', error);
      toast.error('Failed to generate the salary slip PDF');
    } finally {
      setBusySlipId(null);
    }
  };

  const startAction = async (slip: EmployeeSalary, action: 'view' | 'download') => {
    if (!slip.pan) {
      pendingActionRef.current = action;
      setPanValue('');
      setPanError('');
      setPanSlip(slip);
      return;
    }
    if (action === 'view') await openPreview(slip);
    else await downloadSlip(slip);
  };

  const closePanDialog = () => {
    pendingActionRef.current = null;
    setPanSlip(null);
  };

  const handleSavePan = async () => {
    if (!panSlip) return;
    const pan = panValue.trim().toUpperCase();
    if (!PAN_REGEX.test(pan)) {
      setPanError('Enter a valid PAN, e.g. ABCDE1234F');
      return;
    }
    if (!panSlip.id) {
      toast.error('This salary slip cannot be updated');
      return;
    }

    setSavingPan(true);
    // The PAN route writes to the slip AND to the user doc, so future slips inherit it.
    const saved = await payrollService.updateSlipPan(panSlip.id, pan);
    setSavingPan(false);

    if (!saved) {
      setPanError('Failed to save your PAN. Please try again.');
      return;
    }

    const updated: EmployeeSalary = { ...panSlip, pan };
    setSlips((prev) => prev.map((slip) => (slip.id === panSlip.id ? updated : slip)));
    setAllSlips((prev) => prev.map((slip) => (slip.id === panSlip.id ? updated : slip)));

    const action = pendingActionRef.current ?? 'view';
    closePanDialog();
    toast.success('PAN saved');

    if (action === 'view') await openPreview(updated);
    else await downloadSlip(updated);
  };

  const filterActive = month !== undefined || year !== undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Salary Slips</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          View and download your salary slips
        </p>
      </div>

      {loading ? (
        <div className="bg-card rounded-xl shadow-sm border border-border p-10 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading your information...</p>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-xl shadow-sm border border-border p-5">
            <div className="flex gap-4 items-end flex-wrap">
              <div>
                <label
                  htmlFor="salary-slip-month"
                  className="block text-sm font-medium text-muted-foreground mb-1"
                >
                  Month
                </label>
                <Select
                  id="salary-slip-month"
                  className={SELECT_CLASS}
                  value={month === undefined ? '' : String(month)}
                  onChange={(event) =>
                    setMonth(event.target.value === '' ? undefined : Number(event.target.value))
                  }
                >
                  <option value="">All Months</option>
                  {MONTH_NAMES.map((name, index) => (
                    <option key={name} value={index}>
                      {name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label
                  htmlFor="salary-slip-year"
                  className="block text-sm font-medium text-muted-foreground mb-1"
                >
                  Year
                </label>
                <Select
                  id="salary-slip-year"
                  className={SELECT_CLASS}
                  value={year === undefined ? '' : String(year)}
                  onChange={(event) =>
                    setYear(event.target.value === '' ? undefined : Number(event.target.value))
                  }
                >
                  <option value="">All Years</option>
                  {YEARS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </div>

              <Button className="mt-5" onClick={handleRefresh} loading={refreshing}>
                Refresh
              </Button>

              {filterActive && (
                <Button
                  variant="outline"
                  className="mt-5"
                  onClick={() => {
                    setMonth(undefined);
                    setYear(undefined);
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            {slips.length === 0 ? (
              <div className="p-10 text-center">
                <svg
                  className="mx-auto w-16 h-16 text-muted-foreground dark:text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h2 className="text-lg font-semibold text-foreground mt-4">
                  No Salary Slips Available
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Your salary slips will appear here once they are generated and access is granted
                  by your administrator.
                </p>
              </div>
            ) : visibleSlips.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No salary slips for the selected period
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      {[
                        'Slip Number',
                        'Employee',
                        'Month/Year',
                        'Paid Days',
                        'Net Salary',
                        'Actions',
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {visibleSlips.map((slip) => (
                      <tr
                        key={slip.id ?? slip.slipNumber}
                        className="hover:bg-muted/50"
                      >
                        <td className="px-4 py-3 text-sm font-mono text-foreground">
                          {slip.slipNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {slip.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {MONTH_NAMES[slip.month]} {slip.year}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {slip.paidDays}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-foreground">
                          {formatCurrency(slip.salaryBreakup?.netSalary)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              loading={busySlipId === (slip.id ?? slip.slipNumber)}
                              onClick={() => startAction(slip, 'view')}
                            >
                              View
                            </Button>
                            <Button
                              size="sm"
                              loading={busySlipId === (slip.id ?? slip.slipNumber)}
                              onClick={() => startAction(slip, 'download')}
                            >
                              Download
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <Dialog open={previewSlip !== null} onOpenChange={(open) => !open && setPreviewSlip(null)}>
        <DialogContent className="max-w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Salary Slip Preview</DialogTitle>
          </DialogHeader>

          {templates.length > 1 && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="salary-slip-template"
                className="text-sm font-medium text-muted-foreground"
              >
                Slip Template:
              </label>
              <Select
                id="salary-slip-template"
                className="w-56 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={selectedTemplate?.id ?? ''}
                onChange={(event) => setTemplateId(event.target.value)}
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {previewSlip &&
            (settings ? (
              <div className="overflow-x-auto">
                <SalarySlipPreview
                  slip={previewSlip}
                  settings={settings}
                  template={selectedTemplate}
                  hideBreakdown
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Payroll settings are still loading. Please try again in a moment.
              </p>
            ))}

          <DialogFooter className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setPreviewSlip(null)}>
              Close
            </Button>
            <Button
              disabled={!previewSlip}
              loading={busySlipId === (previewSlip?.id ?? previewSlip?.slipNumber)}
              onClick={() => previewSlip && downloadSlip(previewSlip)}
            >
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={panSlip !== null} onOpenChange={(open) => !open && closePanDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Enter PAN Number</DialogTitle>
            <DialogDescription>
              Your PAN is printed on every payslip and is required for salary records. It is saved
              to your profile, so you only need to enter it once.
            </DialogDescription>
          </DialogHeader>

          <div>
            <label
              htmlFor="salary-slip-pan"
              className="block text-sm font-medium text-muted-foreground mb-1"
            >
              PAN Number
            </label>
            <input
              id="salary-slip-pan"
              type="text"
              value={panValue}
              maxLength={10}
              placeholder="ABCDE1234F"
              autoComplete="off"
              onChange={(event) => {
                setPanValue(event.target.value.toUpperCase());
                setPanError('');
              }}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono uppercase text-foreground placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {panError && <p className="text-xs mt-1 text-destructive">{panError}</p>}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closePanDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSavePan}
              disabled={panValue.trim().length !== 10}
              loading={savingPan}
            >
              Save &amp; Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

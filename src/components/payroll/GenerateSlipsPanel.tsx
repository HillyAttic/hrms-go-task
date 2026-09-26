'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'react-toastify';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
import { EditSalarySlipModal } from '@/components/payroll/EditSalarySlipModal';
import type { PayrollEmployee } from '@/components/payroll/SalaryConfigModal';
import { cn } from '@/lib/utils';

const AttendanceCalendarModal = dynamic(
  () => import('@/components/attendance/AttendanceCalendarModal').then((mod) => mod.AttendanceCalendarModal),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    ),
  }
);

const YEARS = [2024, 2025, 2026, 2027];
const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const cardClass =
  'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700';
const inputClass =
  'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ring';
const thClass =
  'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider';

interface GenerateSlipsPanelProps {
  settings: PayrollSettings | null;
  onGenerationComplete?: () => void;
  onNavigateToSettings?: () => void;
}

export function GenerateSlipsPanel({
  settings,
  onGenerationComplete,
  onNavigateToSettings,
}: GenerateSlipsPanelProps) {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [slips, setSlips] = useState<Record<string, EmployeeSalary>>({});
  const [accessMap, setAccessMap] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, SalaryCalculationResult>>({});
  const [templates, setTemplates] = useState<SalarySlipTemplate[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [calendarEmployee, setCalendarEmployee] = useState<PayrollEmployee | null>(null);
  const [editSlip, setEditSlip] = useState<EmployeeSalary | null>(null);
  const [previewSlip, setPreviewSlip] = useState<EmployeeSalary | null>(null);
  const appliedPeriodRef = useRef('');

  useEffect(() => {
    (async () => {
      const [response, loadedTemplates] = await Promise.all([
        authenticatedFetch('/api/employees'),
        payrollService.getTemplates(),
      ]);
      const json = response.ok ? await response.json() : null;
      const list: PayrollEmployee[] = Array.isArray(json) ? json : json?.data ?? [];
      setEmployees(
        list
          .filter((employee) => employee.status === 'active')
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      );
      setTemplates(loadedTemplates);
    })();
  }, []);

  const loadPeriodSlips = useCallback(async () => {
    const periodSlips = await payrollService.getSlips({ month, year, includeAll: true });
    const byEmployee: Record<string, EmployeeSalary> = {};
    periodSlips.forEach((slip) => {
      if (slip.employeeId) byEmployee[slip.employeeId] = slip;
    });
    setSlips(byEmployee);
    return byEmployee;
  }, [month, year]);

  useEffect(() => {
    setResults({});
    setSelectedEmployeeId(null);
    void loadPeriodSlips();
  }, [loadPeriodSlips]);

  // The saved access config is a cache keyed by period — apply it once per period so a
  // re-render never stomps toggles the admin has already flipped.
  useEffect(() => {
    if (employees.length === 0 || settings === null) return;
    const periodKey = `${year}-${month}`;
    if (appliedPeriodRef.current === periodKey) return;
    appliedPeriodRef.current = periodKey;
    const saved = settings.accessConfig?.[periodKey];
    setAccessMap(
      Object.fromEntries(employees.map((employee) => [employee.id, saved?.[employee.id] ?? true]))
    );
  }, [employees, settings, month, year]);

  const grantedFor = (employeeId: string) => accessMap[employeeId] ?? true;
  const fullAccessMap = () =>
    Object.fromEntries(employees.map((employee) => [employee.id, grantedFor(employee.id)]));

  const persistAccess = (next: Record<string, boolean>) =>
    payrollService.saveAccessConfig({ ...(settings?.accessConfig ?? {}), [`${year}-${month}`]: next });

  const toggleAccess = async (employee: PayrollEmployee) => {
    const value = !grantedFor(employee.id);
    const next = { ...fullAccessMap(), [employee.id]: value };
    setAccessMap(next);
    const slip = slips[employee.id];
    if (slip?.id) await payrollService.updateSlipAccess(slip.id, value);
    await persistAccess(next);
  };

  const setAllAccess = async (value: boolean) => {
    const next = Object.fromEntries(employees.map((employee) => [employee.id, value]));
    setAccessMap(next);
    await persistAccess(next);
  };

  const calculateAll = async () => {
    setCalculating(true);
    setProgress({ current: 0, total: employees.length, success: 0, failed: 0 });
    const calculated: Record<string, SalaryCalculationResult> = {};
    for (let index = 0; index < employees.length; index += 1) {
      const employee = employees[index];
      const result = await payrollService.calculateSalary(employee.id, month, year);
      if (result) calculated[employee.id] = result;
      setProgress((previous) => ({
        ...previous,
        current: index + 1,
        success: previous.success + (result ? 1 : 0),
        failed: previous.failed + (result ? 0 : 1),
      }));
    }
    setResults((previous) => ({ ...previous, ...calculated }));
    setCalculating(false);
  };

  const calculateOne = async (employee: PayrollEmployee) => {
    setRowBusy(employee.id);
    const result = await payrollService.calculateSalary(employee.id, month, year);
    setRowBusy(null);
    if (!result) {
      toast.error(`Failed to calculate the salary for ${employee.name}`);
      return;
    }
    setResults((previous) => ({ ...previous, [employee.id]: result }));
  };

  const slipFor = (employee: PayrollEmployee): EmployeeSalary | null => {
    const existing = slips[employee.id];
    if (existing) return existing;
    const result = results[employee.id];
    if (!result) return null;
    const employeeCode = employee.employeeId || employee.id;
    return {
      employeeId: employee.id,
      name: employee.name,
      employeeCode,
      designation: employee.designation || '',
      department: employee.department || '',
      doj: employee.doj || null,
      pan: employee.pan || null,
      grossSalary: employee.grossSalary || 0,
      month,
      year,
      totalDaysInMonth: result.totalDaysInMonth,
      paidDays: result.paidDays,
      attendanceBreakdown: result.attendanceBreakdown,
      salaryBreakup: result.salaryBreakup,
      slipNumber: `SAL-${year}${String(month + 1).padStart(2, '0')}-${employeeCode}`,
      generatedBy: '',
      accessGranted: grantedFor(employee.id),
    };
  };

  const cleanupSlip = async (employee: PayrollEmployee) => {
    const slip = slips[employee.id];
    if (!slip?.id) return;
    if (!window.confirm(`Delete the salary slip for ${employee.name}? This cannot be undone.`)) return;
    const deleted = await payrollService.deleteSlip(slip.id);
    if (!deleted) {
      toast.error('Failed to delete the salary slip');
      return;
    }
    toast.success('Salary slip deleted');
    await loadPeriodSlips();
  };

  const cleanupPeriod = async () => {
    if (!window.confirm(`Delete every salary slip for ${MONTH_NAMES[month]} ${year}?`)) return;
    if (!window.confirm('This is irreversible. There is no undo and no backup. Continue?')) return;
    setCleaning(true);
    const response = await authenticatedFetch('/api/payroll/cleanup-slips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year }),
    });
    setCleaning(false);
    if (!response.ok) {
      toast.error('Failed to clean up the salary slips');
      return;
    }
    const json = await response.json().catch(() => null);
    toast.success(json?.message ?? 'Salary slips deleted');
    await loadPeriodSlips();
  };

  const selectedIds = employees.filter((employee) => grantedFor(employee.id)).map((employee) => employee.id);
  const allEnabled = employees.length > 0 && selectedIds.length === employees.length;

  const generate = async () => {
    if (selectedIds.length === 0) {
      toast.error('Grant access to at least one employee first');
      return;
    }
    setGenerating(true);
    const created = await payrollService.generateSlips(selectedIds, month, year, fullAccessMap());
    setGenerating(false);
    if (created.length === 0) {
      toast.error('No salary slips were generated');
      return;
    }
    toast.success(`Generated ${created.length} salary slip(s)`);
    await loadPeriodSlips();
    onGenerationComplete?.();
  };

  const percent =
    progress.total === 0 ? 0 : Math.round((progress.current / progress.total) * 100);
  const selectedTemplate = templates.find((template) => template.id === templateId) ?? null;

  return (
    <div className="space-y-6">
      {!settings && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              Payroll settings not configured
            </p>
            <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
              Company details and breakup percentages are required before slips can be generated.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => onNavigateToSettings?.()}>
            Go to Payroll Settings
          </Button>
        </div>
      )}

      <div className={cardClass}>
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            Select Period
          </h2>
        </div>
        <div className="flex flex-wrap gap-4 items-end p-5">
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Month</label>
            <Select value={String(month)} onChange={(event) => setMonth(Number(event.target.value))} className={inputClass}>
              {MONTH_NAMES.map((name, index) => (
                <option key={name} value={index}>
                  {name}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
            <Select value={String(year)} onChange={(event) => setYear(Number(event.target.value))} className={inputClass}>
              {YEARS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
          <Button onClick={calculateAll} loading={calculating} disabled={!settings || employees.length === 0}>
            Calculate All
          </Button>
        </div>
      </div>

      {calculating && (
        <div className={cn(cardClass, 'p-5')}>
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">Calculating salaries…</p>
            <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
              {progress.current} / {progress.total}
            </span>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${percent}%`, background: 'linear-gradient(90deg, #3b82f6, #2563eb)' }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500 dark:text-gray-400">✓ {progress.success} success</span>
              <span className="text-xs text-red-600 dark:text-red-400">✗ {progress.failed} failed</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{percent}%</span>
          </div>
        </div>
      )}

      <div className={cardClass}>
        <div className="flex items-center justify-between gap-4 p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            Employees ({employees.length})
          </h2>
          <Button variant="outline" size="sm" onClick={() => void setAllAccess(!allEnabled)}>
            {allEnabled ? 'Disable All' : 'Enable All'}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className={thClass}>#</th>
                <th className={thClass}>Access</th>
                <th className={thClass}>Name</th>
                <th className={thClass}>Employee ID</th>
                <th className={thClass}>Department</th>
                <th className={thClass}>Gross Salary</th>
                <th className={thClass}>Net Salary</th>
                <th className={thClass}>Paid Days</th>
                <th className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {employees.map((employee, index) => {
                const slip = slips[employee.id];
                const result = results[employee.id];
                const granted = grantedFor(employee.id);
                const netSalary = slip?.salaryBreakup?.netSalary ?? result?.salaryBreakup?.netSalary;
                const paidDays = slip?.paidDays ?? result?.paidDays;
                return (
                  <tr
                    key={employee.id}
                    onClick={() => setSelectedEmployeeId(employee.id)}
                    className={cn(
                      'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50',
                      selectedEmployeeId === employee.id && 'bg-blue-50 dark:bg-blue-900/20'
                    )}
                  >
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={granted}
                        aria-label={`Access for ${employee.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          void toggleAccess(employee);
                        }}
                        className={cn(
                          'relative w-10 h-6 rounded-full transition-colors',
                          granted ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                            granted && 'translate-x-4'
                          )}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setCalendarEmployee(employee);
                        }}
                        className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {employee.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {employee.employeeId || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {employee.department || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {currency.format(employee.grossSalary || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {netSalary === undefined ? '-' : currency.format(netSalary)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {paidDays === undefined ? '-' : paidDays}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          loading={rowBusy === employee.id}
                          disabled={!settings}
                          onClick={(event) => {
                            event.stopPropagation();
                            void calculateOne(employee);
                          }}
                        >
                          Calculate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!slip}
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditSlip(slip ?? null);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!slip && !result}
                          onClick={(event) => {
                            event.stopPropagation();
                            setPreviewSlip(slipFor(employee));
                          }}
                        >
                          Preview
                        </Button>
                        <Button
                          variant={slip ? 'destructive' : 'outline'}
                          size="sm"
                          disabled={!slip}
                          className={cn(
                            !slip && 'text-gray-400 border-gray-200 dark:text-gray-500 dark:border-gray-700'
                          )}
                          onClick={(event) => {
                            event.stopPropagation();
                            void cleanupSlip(employee);
                          }}
                        >
                          Clean Up
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No active employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={cn(cardClass, 'flex flex-wrap justify-between items-center gap-4 p-5')}>
        <Button variant="destructive" size="lg" onClick={cleanupPeriod} loading={cleaning} disabled={!settings}>
          Clean Up Slips
        </Button>
        <Button size="lg" onClick={generate} loading={generating} disabled={selectedIds.length === 0 || !settings}>
          Generate &amp; Save ({selectedIds.length} slips)
        </Button>
      </div>

      <EditSalarySlipModal
        isOpen={Boolean(editSlip)}
        onClose={() => setEditSlip(null)}
        slip={editSlip}
        template={selectedTemplate}
        onSaveSuccess={() => void loadPeriodSlips()}
      />

      <Dialog open={Boolean(previewSlip)} onOpenChange={(open) => !open && setPreviewSlip(null)}>
        <DialogContent className="max-w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Salary Slip Preview</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Slip Template:</label>
            <Select value={templateId} onChange={(event) => setTemplateId(event.target.value)} className={inputClass}>
              <option value="">Default (all sections)</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title}
                </option>
              ))}
            </Select>
          </div>

          {previewSlip && settings ? (
            <div className="overflow-x-auto">
              <SalarySlipPreview slip={previewSlip} settings={settings} template={selectedTemplate} />
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Payroll settings must be configured before a slip can be rendered.
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewSlip(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {calendarEmployee && (
        <AttendanceCalendarModal
          isOpen={Boolean(calendarEmployee)}
          onClose={() => setCalendarEmployee(null)}
          employeeId={calendarEmployee.id}
          employeeName={calendarEmployee.name}
          employeeEmail={calendarEmployee.email}
        />
      )}
    </div>
  );
}

export default GenerateSlipsPanel;

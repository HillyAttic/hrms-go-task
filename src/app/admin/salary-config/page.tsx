'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'react-toastify';
import { FileText, FunctionSquare, IndianRupee, LayoutTemplate, Settings, Users } from 'lucide-react';
import { PayrollAccessGate } from '@/components/payroll/PayrollAccessGate';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SalaryConfigModal, type PayrollEmployee, type SalaryConfigValues } from '@/components/payroll/SalaryConfigModal';
import { PayrollSettingsForm } from '@/components/payroll/PayrollSettingsForm';
import { GenerateSlipsPanel } from '@/components/payroll/GenerateSlipsPanel';
import { TemplateManager } from '@/components/payroll/TemplateManager';
import { FormulaEditor } from '@/components/payroll/FormulaEditor';
import { authenticatedFetch } from '@/lib/api-client';
import { payrollService } from '@/services/payroll.service';
import type { PayrollSettings } from '@/types/payroll.types';
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

const cardClass =
  'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700';
const thClass =
  'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider';

export default function SalaryConfigPage() {
  const [settings, setSettings] = useState<PayrollSettings | null>(null);
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployee | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('employees');
  const [calendarEmployee, setCalendarEmployee] = useState<PayrollEmployee | null>(null);

  const fetchSettings = async () => {
    setSettings(await payrollService.getSettings());
  };

  const fetchEmployees = async () => {
    setLoading(true);
    const response = await authenticatedFetch('/api/employees');
    const json = response.ok ? await response.json() : null;
    const list: PayrollEmployee[] = Array.isArray(json) ? json : json?.data ?? [];
    setEmployees(
      list
        .filter((employee) => employee.status === 'active')
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    );
    setLoading(false);
  };

  useEffect(() => {
    void Promise.all([fetchSettings(), fetchEmployees()]);
  }, []);

  const openConfigure = (employee: PayrollEmployee) => {
    setSelectedEmployee(employee);
    setModalOpen(true);
  };

  const saveEmployee = async (values: SalaryConfigValues) => {
    if (!selectedEmployee) return;
    setModalLoading(true);
    const response = await authenticatedFetch(`/api/employees/${selectedEmployee.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doj: values.doj || null,
        pan: values.pan.trim() ? values.pan.trim().toUpperCase() : null,
        department: values.department,
        designation: values.designation,
        grossSalary: values.grossSalary,
      }),
    });
    if (!response.ok) {
      setModalLoading(false);
      toast.error('Failed to save the salary configuration');
      return;
    }
    toast.success('Salary configuration saved');
    await fetchEmployees();
    setModalLoading(false);
    setModalOpen(false);
  };

  const triggerClass = (value: string) =>
    cn(
      'gap-2',
      activeTab === value
        ? 'dark:bg-gray-900 dark:text-white'
        : 'dark:text-gray-400 dark:hover:text-gray-200'
    );

  return (
    <PayrollAccessGate>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
            <IndianRupee className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Salary Configuration</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Configure payroll settings, employee salaries, and generate salary slips
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-auto flex-wrap justify-start gap-1 bg-gray-100 dark:bg-gray-800">
            <TabsTrigger value="employees" className={triggerClass('employees')}>
              <Users className="h-4 w-4" />
              Employee Salaries
            </TabsTrigger>
            <TabsTrigger value="generate" className={triggerClass('generate')}>
              <FileText className="h-4 w-4" />
              Generate Slips
            </TabsTrigger>
            <TabsTrigger value="templates" className={triggerClass('templates')}>
              <LayoutTemplate className="h-4 w-4" />
              Slip Templates
            </TabsTrigger>
            <TabsTrigger value="settings" className={triggerClass('settings')}>
              <Settings className="h-4 w-4" />
              Payroll Settings
            </TabsTrigger>
            <TabsTrigger value="formula" className={triggerClass('formula')}>
              <FunctionSquare className="h-4 w-4" />
              Logic
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="mt-4">
            <div className={cardClass}>
              <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  Configure Employee Salaries
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Set DOJ, PAN, Designation, and Gross Salary for each employee
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '10%' }} />
                  </colgroup>
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className={thClass}>#</th>
                      <th className={thClass}>Name</th>
                      <th className={thClass}>Emp ID</th>
                      <th className={thClass}>Department</th>
                      <th className={thClass}>Designation</th>
                      <th className={thClass}>DOJ</th>
                      <th className={thClass}>PAN</th>
                      <th className={thClass}>Gross Salary</th>
                      <th
                        className={cn(
                          thClass,
                          'sticky right-0 text-right bg-gray-50 dark:bg-gray-700/50 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]'
                        )}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-10 text-center">
                          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
                        </td>
                      </tr>
                    ) : employees.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                          No active employees found.
                        </td>
                      </tr>
                    ) : (
                      employees.map((employee, index) => (
                        <tr
                          key={employee.id}
                          className="group hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => setCalendarEmployee(employee)}
                              className="truncate text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
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
                            {employee.designation || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                            {employee.doj ? new Date(employee.doj).toLocaleDateString('en-IN') : '-'}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm text-gray-700 dark:text-gray-300">
                            {employee.pan || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                            {employee.grossSalary
                              ? `₹${employee.grossSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                              : '-'}
                          </td>
                          <td
                            className={cn(
                              'sticky right-0 px-4 py-3 text-right bg-white dark:bg-gray-800',
                              'group-hover:bg-gray-50 dark:group-hover:bg-gray-700/50',
                              'shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]'
                            )}
                          >
                            <Button variant="outline" size="sm" onClick={() => openConfigure(employee)}>
                              Configure
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="generate" className="mt-4">
            <GenerateSlipsPanel
              settings={settings}
              onGenerationComplete={() => void fetchEmployees()}
              onNavigateToSettings={() => setActiveTab('settings')}
            />
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            <div className={cn(cardClass, 'p-6')}>
              <TemplateManager />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <div className={cn(cardClass, 'p-6')}>
              <PayrollSettingsForm onSaveSuccess={() => void fetchSettings()} />
            </div>
          </TabsContent>

          <TabsContent value="formula" className="mt-4">
            <FormulaEditor settings={settings} onSaveSuccess={() => void fetchSettings()} />
          </TabsContent>
        </Tabs>
      </div>

      <SalaryConfigModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        employee={selectedEmployee}
        isLoading={modalLoading}
        onSubmit={(values) => void saveEmployee(values)}
      />

      {calendarEmployee && (
        <AttendanceCalendarModal
          isOpen={Boolean(calendarEmployee)}
          onClose={() => setCalendarEmployee(null)}
          employeeId={calendarEmployee.id}
          employeeName={calendarEmployee.name}
          employeeEmail={calendarEmployee.email}
        />
      )}
    </PayrollAccessGate>
  );
}

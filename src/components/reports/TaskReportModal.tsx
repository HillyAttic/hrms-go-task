'use client';

import { useState, useMemo } from 'react';
import { RecurringTask } from '@/services/recurring-task.service';
import { Client } from '@/services/client.service';
import { ClientTaskCompletion } from '@/services/task-completion.service';
import { XMarkIcon, CheckIcon, XCircleIcon, UserGroupIcon, ArrowDownTrayIcon, UserMinusIcon, ChatBubbleLeftIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/react/24/outline';
import { isFuture, isToday, startOfMonth } from 'date-fns';
import { exportToPDF, exportToExcel } from '@/utils/report-export.utils';
import { buildCompletionData, buildRemarkData, getCompletionStatus, type MonthData, type RemarkInfo } from '@/utils/report-utils';

export interface TaskReportModalProps {
  task: RecurringTask;
  clients: Client[];
  completions: ClientTaskCompletion[];
  onClose: () => void;
}

interface TeamMemberReport {
  userId: string;
  userName: string;
  clientIds: string[];
  clients: Client[];
  completionRate: number;
  completedCount: number;
  totalExpected: number;
}

type StatusFilter = 'all' | 'filed' | 'not_filed';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function generateFinancialYears(): string[] {
  const years: string[] = [];
  for (let startYear = 2025; startYear <= 2035; startYear++) {
    years.push(`${startYear}-${String(startYear + 1).slice(-2)}`);
  }
  return years;
}

function getCurrentFinancialYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  // FY starts in April (month index 3)
  const fyStart = month >= 3 ? year : year - 1;
  return `${fyStart}-${String(fyStart + 1).slice(-2)}`;
}

/** Generate months for a financial year, optionally filtered to a single month */
function generateDisplayMonths(fy: string, recurrencePattern: string, selectedMonth?: string, dueMonth?: number): MonthData[] {
  const months = generateFYMonths(fy, recurrencePattern, dueMonth);
  if (selectedMonth && selectedMonth !== 'all') {
    return months.filter(m => m.monthName === selectedMonth);
  }
  return months;
}

function buildMonthData(month: number, year: number): MonthData {
  const date = new Date(year, month, 1);
  return {
    key: `${year}-${String(month + 1).padStart(2, '0')}`,
    monthName: date.toLocaleDateString('en-US', { month: 'short' }),
    year: year.toString(),
    fullDate: date,
  };
}

function applyRecurrenceFilter(months: MonthData[], recurrencePattern: string, dueMonth?: number): MonthData[] {
  switch (recurrencePattern) {
    case 'quarterly':
      if (dueMonth !== undefined) {
        const offset = dueMonth % 3;
        return months.filter(m => m.fullDate.getMonth() % 3 === offset);
      }
      return months.filter((_, i) => i % 3 === 0);
    case 'half-yearly':
      if (dueMonth !== undefined) {
        const offset = dueMonth % 6;
        return months.filter(m => m.fullDate.getMonth() % 6 === offset);
      }
      return months.filter((_, i) => i % 6 === 0);
    case 'yearly':
      if (dueMonth !== undefined) {
        return months.filter(m => m.fullDate.getMonth() === dueMonth);
      }
      return months.filter((_, i) => i % 12 === 0);
    default:            return months;
  }
}

/** All months from Apr 2025 (FY 2025-26 start) to 2 years ahead — covers full history + near future */
function generateAllExportMonths(recurrencePattern: string, dueMonth?: number): MonthData[] {
  const endYear = new Date().getFullYear() + 2;
  const all: MonthData[] = [];
  for (let year = 2025; year <= endYear; year++) {
    const firstMonth = year === 2025 ? 3 : 0;
    for (let month = firstMonth; month <= 11; month++) {
      all.push(buildMonthData(month, year));
    }
  }
  return applyRecurrenceFilter(all, recurrencePattern, dueMonth);
}

/** All months for a specific Indian financial year (Apr → Mar) */
function generateFYMonths(fy: string, recurrencePattern: string, dueMonth?: number): MonthData[] {
  const startYear = parseInt(fy.split('-')[0]);
  const fyMonths: MonthData[] = [
    ...Array.from({ length: 9 }, (_, i) => buildMonthData(3 + i, startYear)),
    ...Array.from({ length: 3 }, (_, i) => buildMonthData(i, startYear + 1)),
  ];
  return applyRecurrenceFilter(fyMonths, recurrencePattern, dueMonth);
}

// ---------- Export Dialog ----------

interface ExportDialogProps {
  task: RecurringTask;
  clients: Client[];
  completions: ClientTaskCompletion[];
  isTeamMemberView?: boolean;
  teamMemberName?: string;
  isUnassignedView?: boolean;
  dueMonth?: number;
  onClose: () => void;
}

function ExportDialog({ task, clients, completions, isTeamMemberView, teamMemberName, isUnassignedView, dueMonth, onClose }: ExportDialogProps) {
  const [exportYear, setExportYear] = useState('all');
  const [exportMonth, setExportMonth] = useState('all');
  const financialYears = generateFinancialYears();

  const getExportMonths = (): MonthData[] => {
    const baseMonths =
      exportYear === 'all'
        ? generateAllExportMonths(task.recurrencePattern, dueMonth)
        : generateFYMonths(exportYear, task.recurrencePattern, dueMonth);
    if (exportMonth === 'all') return baseMonths;
    return baseMonths.filter(m => m.monthName === exportMonth);
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    const months = getExportMonths();
    const exportData = { task, clients, completions, months, isTeamMemberView, teamMemberName, isUnassignedView };
    if (format === 'pdf') exportToPDF(exportData);
    else exportToExcel(exportData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-dark rounded-xl shadow-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Export Report</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Financial Year
            </label>
            <select
              value={exportYear}
              onChange={e => setExportYear(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Years</option>
              {financialYears.map(fy => (
                <option key={fy} value={fy}>{fy}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Month
            </label>
            <select
              value={exportMonth}
              onChange={e => setExportMonth(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Months</option>
              {MONTH_NAMES.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={() => handleExport('pdf')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Filter Tabs ----------

function StatusFilterTabs({ value, onChange }: { value: StatusFilter; onChange: (v: StatusFilter) => void }) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      {(['all', 'filed', 'not_filed'] as StatusFilter[]).map(f => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            value === f
              ? 'bg-white dark:bg-gray-dark text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          {f === 'all' ? 'All' : f === 'filed' ? 'Filed' : 'Not Filed'}
        </button>
      ))}
    </div>
  );
}

// ---------- Shared Report Table ----------

function ReportTable({
  clients,
  months,
  completionData,
  remarkData,
}: {
  clients: Client[];
  months: MonthData[];
  completionData: Map<string, Map<string, boolean>>;
  remarkData: Map<string, Map<string, RemarkInfo>>;
}) {
  const [viewingRemark, setViewingRemark] = useState<{ remark: string; remarkBy: string; clientName: string; monthName: string } | null>(null);

  return (
    <>
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50 dark:bg-gray-800">
        <tr>
          <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-800 z-10">
            Client Name
          </th>
          {months.map(month => (
            <th
              key={month.key}
              className="px-2 sm:px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
            >
              <div>{month.monthName}</div>
              <div className="text-xs font-normal text-gray-400">{month.year}</div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white dark:bg-gray-dark divide-y divide-gray-200">
        {clients.map(client => (
          <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
            <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-dark">
              {client.clientName}
            </td>
            {months.map(month => {
              const status = getCompletionStatus(completionData, client.id || '', month.key, month.fullDate);
              const remark = remarkData.get(client.id || '')?.get(month.key);
              return (
                <td key={month.key} className="px-2 sm:px-4 py-3 sm:py-4 text-center align-top">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="flex items-center gap-1">
                      {status === 'completed' && <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />}
                      {status === 'incomplete' && <XCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />}
                      {status === 'future' && <span className="text-gray-400 text-xs">-</span>}
                    </div>
                    {remark && (
                      <div
                        className="group relative cursor-pointer"
                        onClick={() => setViewingRemark({ remark: remark.remark, remarkBy: remark.remarkBy, clientName: client.clientName, monthName: `${month.monthName} ${month.year}` })}
                      >
                        <div className="flex items-center gap-1">
                          <ChatBubbleLeftIcon className="w-3 h-3 text-amber-500" />
                          <span className="text-[10px] text-amber-700 dark:text-amber-400 whitespace-normal break-words max-w-[200px]" title={remark.remark}>
                            {remark.remark}
                          </span>
                        </div>
                        <span className="text-[9px] text-gray-400">— {remark.remarkBy}</span>
                      </div>
                    )}
                  </div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>

    {/* Remark View Dialog */}
    {viewingRemark && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={() => setViewingRemark(null)}>
        <div className="bg-white dark:bg-gray-dark rounded-xl shadow-2xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Remark</h3>
            <button onClick={() => setViewingRemark(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="mb-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">{viewingRemark.clientName} — {viewingRemark.monthName}</span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-3">
            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{viewingRemark.remark}</p>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            By: {viewingRemark.remarkBy}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// ---------- Shared Modal Shell ----------

function ModalShell({ onClose, onFullscreenToggle, isFullscreen, children }: { onClose: () => void; onFullscreenToggle: () => void; isFullscreen: boolean; children: React.ReactNode }) {
  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${isFullscreen ? 'items-stretch justify-stretch p-0' : 'sm:items-center sm:justify-center sm:p-4'}`}>
      <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />
      <div className={`relative ${isFullscreen ? 'w-full h-full' : 'w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-6xl'} flex flex-col bg-white dark:bg-gray-dark sm:rounded-lg shadow-xl overflow-hidden`}>
        {children}
      </div>
    </div>
  );
}

// ---------- Shared Legend Footer ----------

function LegendFooter() {
  return (
    <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-800 px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center">
        <CheckIcon className="w-4 h-4 text-green-600 mr-2" />
        <span className="text-gray-700 dark:text-gray-300">Completed</span>
      </div>
      <div className="flex items-center">
        <XCircleIcon className="w-4 h-4 text-red-600 mr-2" />
        <span className="text-gray-700 dark:text-gray-300">Incomplete</span>
      </div>
      <div className="flex items-center">
        <span className="text-gray-400 mr-2">-</span>
        <span className="text-gray-700 dark:text-gray-300">Future</span>
      </div>
      <div className="flex items-center">
        <ChatBubbleLeftIcon className="w-4 h-4 text-amber-500 mr-2" />
        <span className="text-gray-700 dark:text-gray-300">Remark</span>
      </div>
    </div>
  );
}

// ---------- Team Member Report Modal ----------

const UNASSIGNED_KEY = '__unassigned__';

function TeamMemberReportModal({ task, clients, completions, onClose }: TaskReportModalProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedFY, setSelectedFY] = useState(getCurrentFinancialYear());
  const [selectedMonth, setSelectedMonth] = useState('all');
  const financialYears = generateFinancialYears();

  // Extract due month from task for recurrence-aware filtering
  const dueMonth = task.dueDate ? new Date(task.dueDate).getMonth() : undefined;

  const months = useMemo(
    () => generateDisplayMonths(selectedFY, task.recurrencePattern, selectedMonth, dueMonth),
    [selectedFY, task.recurrencePattern, selectedMonth, dueMonth]
  );

  // Compute which client IDs are assigned to any team member
  const allMappedClientIds = useMemo(() => {
    const ids = new Set<string>();
    (task.teamMemberMappings || []).forEach(mapping => {
      mapping.clientIds.forEach(clientId => ids.add(clientId));
    });
    return ids;
  }, [task.teamMemberMappings]);

  // Unassigned clients: clients in the prop that are NOT in any team member mapping
  // These come from task.contactIds (e.g., all 266 ITR clients) minus mapped clients
  const unassignedClients = useMemo(() => {
    return clients.filter(c => c.id && !allMappedClientIds.has(c.id));
  }, [clients, allMappedClientIds]);

  const teamMemberReports: TeamMemberReport[] = (task.teamMemberMappings || []).map(mapping => {
    const memberClients = clients.filter(c => c.id && mapping.clientIds.includes(c.id));
    const visibleMonthKeys = new Set(months.map(m => m.key));
    const memberCompletions = completions.filter(
      comp =>
        comp.isCompleted &&
        mapping.clientIds.includes(comp.clientId) &&
        visibleMonthKeys.has(comp.monthKey)
    );
    const totalExpected =
      memberClients.length *
      months.filter(m => !isFuture(m.fullDate) || isToday(startOfMonth(m.fullDate))).length;
    const completedCount = memberCompletions.length;
    const completionRate = totalExpected > 0 ? Math.round((completedCount / totalExpected) * 100) : 0;
    return {
      userId: mapping.userId,
      userName: mapping.userName,
      clientIds: mapping.clientIds,
      clients: memberClients,
      completionRate,
      completedCount,
      totalExpected,
    };
  });

  // Compute unassigned clients' completion stats
  const unassignedReport = useMemo(() => {
    const visibleMonthKeys = new Set(months.map(m => m.key));
    const unassignedClientIds = new Set(unassignedClients.map(c => c.id || ''));
    const memberCompletions = completions.filter(
      comp =>
        comp.isCompleted &&
        unassignedClientIds.has(comp.clientId) &&
        visibleMonthKeys.has(comp.monthKey)
    );
    const totalExpected =
      unassignedClients.length *
      months.filter(m => !isFuture(m.fullDate) || isToday(startOfMonth(m.fullDate))).length;
    const completedCount = memberCompletions.length;
    const completionRate = totalExpected > 0 ? Math.round((completedCount / totalExpected) * 100) : 0;
    return { completionRate, completedCount, totalExpected };
  }, [unassignedClients, completions, months]);

  const selectedMember = selectedMemberId && selectedMemberId !== UNASSIGNED_KEY
    ? teamMemberReports.find(r => r.userId === selectedMemberId)
    : null;

  const isUnassignedSelected = selectedMemberId === UNASSIGNED_KEY;
  const baseClients = isUnassignedSelected
    ? unassignedClients
    : selectedMember
    ? selectedMember.clients
    : clients;

  const completionData = buildCompletionData(completions, baseClients, months);
  const remarkData = useMemo(() => buildRemarkData(completions, baseClients, months), [completions, baseClients, months]);

  const filteredClients = useMemo(() => {
    if (statusFilter === 'all') return baseClients;
    const visibleMonthKeys = new Set(months.map(m => m.key));
    return baseClients.filter(client => {
      const hasFiled = completions.some(
        c => c.clientId === client.id && c.isCompleted && visibleMonthKeys.has(c.monthKey)
      );
      return statusFilter === 'filed' ? hasFiled : !hasFiled;
    });
  }, [baseClients, completions, statusFilter, months]);

  const exportClients = isUnassignedSelected
    ? unassignedClients
    : selectedMember
    ? selectedMember.clients
    : clients;

  return (
    <>
      <ModalShell onClose={onClose} onFullscreenToggle={() => setIsFullscreen(!isFullscreen)} isFullscreen={isFullscreen}>
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white break-words">{task.title}</h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Team Member Reports • {task.recurrencePattern} recurrence
                {unassignedClients.length > 0 && (
                  <span className="text-orange-600 dark:text-orange-400"> • {unassignedClients.length} unassigned</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <ArrowsPointingInIcon className="w-5 h-5" /> : <ArrowsPointingOutIcon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setShowExportDialog(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm font-medium"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                aria-label="Close modal"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Filter:</span>
            <StatusFilterTabs value={statusFilter} onChange={setStatusFilter} />
            <select
              value={selectedFY}
              onChange={e => { setSelectedFY(e.target.value); setSelectedMonth('all'); }}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {financialYears.map(fy => (
                <option key={fy} value={fy}>FY {fy}</option>
              ))}
            </select>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Months</option>
              {months.length > 1 && MONTH_NAMES.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Team Member Summary Cards + Unassigned Card */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {teamMemberReports.map(report => (
              <button
                key={report.userId}
                onClick={() => setSelectedMemberId(selectedMemberId === report.userId ? null : report.userId)}
                className={`p-2.5 sm:p-4 rounded-lg border-2 transition-all text-left ${
                  selectedMemberId === report.userId
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-dark hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <UserGroupIcon className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                    <span className="font-semibold text-xs sm:text-base text-gray-900 dark:text-white truncate">{report.userName}</span>
                  </div>
                  {selectedMemberId === report.userId && (
                    <span className="text-[10px] sm:text-xs font-medium text-blue-600 whitespace-nowrap ml-1">✓</span>
                  )}
                </div>
                <div className="text-[10px] sm:text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {report.clients.length} client{report.clients.length !== 1 ? 's' : ''}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 min-w-0 bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-green-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${report.completionRate}%` }}
                    />
                  </div>
                  <span className="text-[10px] sm:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">{report.completionRate}%</span>
                </div>
              </button>
            ))}

            {/* Unassigned Clients Card - only show if there are unassigned clients */}
            {unassignedClients.length > 0 && (
              <button
                onClick={() => setSelectedMemberId(selectedMemberId === UNASSIGNED_KEY ? null : UNASSIGNED_KEY)}
                className={`p-2.5 sm:p-4 rounded-lg border-2 transition-all text-left ${
                  selectedMemberId === UNASSIGNED_KEY
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                    : 'border-orange-200 dark:border-orange-800 bg-white dark:bg-gray-dark hover:border-orange-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <UserMinusIcon className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                    <span className="font-semibold text-xs sm:text-base text-orange-700 dark:text-orange-300 truncate">Unassigned</span>
                  </div>
                  {selectedMemberId === UNASSIGNED_KEY && (
                    <span className="text-[10px] sm:text-xs font-medium text-orange-600 whitespace-nowrap ml-1">✓</span>
                  )}
                </div>
                <div className="text-[10px] sm:text-sm text-orange-600 dark:text-orange-400 mb-1">
                  {unassignedClients.length} client{unassignedClients.length !== 1 ? 's' : ''}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 min-w-0 bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-orange-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${unassignedReport.completionRate}%` }}
                    />
                  </div>
                  <span className="text-[10px] sm:text-sm font-medium text-orange-700 dark:text-orange-300 whitespace-nowrap">{unassignedReport.completionRate}%</span>
                </div>
              </button>
            )}
          </div>

          {selectedMember && (
            <div className="mt-2 sm:mt-3 p-2.5 sm:p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-300">
                Showing {selectedMember.clients.length} client{selectedMember.clients.length !== 1 ? 's' : ''} for {selectedMember.userName} • {selectedMember.completedCount}/{selectedMember.totalExpected} ({selectedMember.completionRate}%)
              </p>
            </div>
          )}

          {isUnassignedSelected && (
            <div className="mt-2 sm:mt-3 p-2.5 sm:p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-xs sm:text-sm font-medium text-orange-900 dark:text-orange-300">
                Showing {unassignedClients.length} unassigned client{unassignedClients.length !== 1 ? 's' : ''} • {unassignedReport.completedCount}/{unassignedReport.totalExpected} ({unassignedReport.completionRate}%) — not assigned to any team member
              </p>
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 overscroll-x-contain">
          <div className="sm:hidden px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-600 dark:text-blue-400 text-center">
            ← Swipe left/right to see monthly data →
          </div>
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                {statusFilter !== 'all'
                  ? `No clients with "${statusFilter === 'filed' ? 'Filed' : 'Not Filed'}" status`
                  : selectedMember
                  ? `No clients assigned to ${selectedMember.userName}`
                  : isUnassignedSelected
                  ? 'No unassigned clients'
                  : 'No clients assigned to this task'}
              </p>
            </div>
          ) : (
            <ReportTable clients={filteredClients} months={months} completionData={completionData} remarkData={remarkData} />
          )}
        </div>

        <LegendFooter />
      </ModalShell>

      {showExportDialog && (
        <ExportDialog
          task={task}
          clients={exportClients}
          completions={completions}
          isTeamMemberView={!!selectedMember}
          teamMemberName={selectedMember?.userName}
          isUnassignedView={isUnassignedSelected}
          dueMonth={dueMonth}
          onClose={() => setShowExportDialog(false)}
        />
      )}
    </>
  );
}

// ---------- Regular Task Report Modal ----------

export function TaskReportModal({ task, clients, completions, onClose }: TaskReportModalProps) {
  const hasTeamMemberMapping = task.teamMemberMappings && task.teamMemberMappings.length > 0;

  if (hasTeamMemberMapping) {
    return <TeamMemberReportModal task={task} clients={clients} completions={completions} onClose={onClose} />;
  }

  return (
    <RegularTaskReportModal
      task={task}
      clients={clients}
      completions={completions}
      onClose={onClose}
    />
  );
}

function RegularTaskReportModal({ task, clients, completions, onClose }: TaskReportModalProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedFY, setSelectedFY] = useState(getCurrentFinancialYear());
  const [selectedMonth, setSelectedMonth] = useState('all');
  const financialYears = generateFinancialYears();

  // Extract due month from task for recurrence-aware filtering
  const dueMonth = task.dueDate ? new Date(task.dueDate).getMonth() : undefined;

  const months = useMemo(
    () => generateDisplayMonths(selectedFY, task.recurrencePattern, selectedMonth, dueMonth),
    [selectedFY, task.recurrencePattern, selectedMonth, dueMonth]
  );

  const completionData = useMemo(
    () => buildCompletionData(completions, clients, months),
    [completions, clients, months]
  );
  const remarkData = useMemo(
    () => buildRemarkData(completions, clients, months),
    [completions, clients, months]
  );

  const filteredClients = useMemo(() => {
    if (statusFilter === 'all') return clients;
    const visibleMonthKeys = new Set(months.map(m => m.key));
    return clients.filter(client => {
      const hasFiled = completions.some(
        c => c.clientId === client.id && c.isCompleted && visibleMonthKeys.has(c.monthKey)
      );
      return statusFilter === 'filed' ? hasFiled : !hasFiled;
    });
  }, [clients, completions, statusFilter, months]);

  return (
    <>
      <ModalShell onClose={onClose} onFullscreenToggle={() => setIsFullscreen(!isFullscreen)} isFullscreen={isFullscreen}>
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4">
          {/* Title + actions row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white break-words">{task.title}</h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Track completion for {clients.length} clients • {task.recurrencePattern} recurrence
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <ArrowsPointingInIcon className="w-5 h-5" /> : <ArrowsPointingOutIcon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setShowExportDialog(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm font-medium"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                aria-label="Close modal"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Filter:</span>
            <StatusFilterTabs value={statusFilter} onChange={setStatusFilter} />
            <select
              value={selectedFY}
              onChange={e => { setSelectedFY(e.target.value); setSelectedMonth('all'); }}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {financialYears.map(fy => (
                <option key={fy} value={fy}>FY {fy}</option>
              ))}
            </select>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Months</option>
              {months.length > 1 && MONTH_NAMES.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            {statusFilter !== 'all' && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {filteredClients.length} of {clients.length} clients
              </span>
            )}
          </div>
        </div>

        {/* Scrollable table */}
        <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 overscroll-x-contain">
          <div className="sm:hidden px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-600 dark:text-blue-400 text-center">
            ← Swipe left/right to see monthly data →
          </div>
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No clients with &ldquo;{statusFilter === 'filed' ? 'Filed' : 'Not Filed'}&rdquo; status
              </p>
            </div>
          ) : (
            <ReportTable clients={filteredClients} months={months} completionData={completionData} remarkData={remarkData} />
          )}
        </div>

        <LegendFooter />
      </ModalShell>

      {showExportDialog && (
        <ExportDialog
          task={task}
          clients={clients}
          completions={completions}
          dueMonth={dueMonth}
          onClose={() => setShowExportDialog(false)}
        />
      )}
    </>
  );
}

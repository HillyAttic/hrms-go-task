'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import type { FormTemplate } from '@/types/form.types';
import { useModal } from '@/contexts/modal-context';
import { authenticatedFetch } from '@/lib/api-client';

interface SpreadsheetExportModalProps {
  formId: string;
  onClose: () => void;
}

export function SpreadsheetExportModal({
  formId,
  onClose,
}: SpreadsheetExportModalProps) {
  const { openModal, closeModal } = useModal();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);
  const [template, setTemplate] = useState<FormTemplate | null>(null);

  // Notify modal context when modal opens/closes
  useEffect(() => {
    openModal();
    return () => {
      closeModal();
    };
  }, [openModal, closeModal]);

  // Fetch form template
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const response = await authenticatedFetch(`/api/forms/templates/${formId}`);
        const result = await response.json();
        if (result.success) {
          setTemplate(result.template);
        }
      } catch (error) {
        console.error('Error fetching template:', error);
        toast.error('Failed to load form template');
      }
    };
    fetchTemplate();
  }, [formId]);

  // Generate year options (current year and 5 years back)
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  // Month options
  const monthOptions = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const handleExport = async () => {
    try {
      if (!template) {
        toast.error('Form template not loaded');
        return;
      }

      setExporting(true);
      toast.info('Preparing Excel export...');

      // Build date range - use custom dates or month/year selection
      let exportStartDate: string | undefined;
      let exportEndDate: string | undefined;

      if (startDate || endDate) {
        // Use custom date range
        exportStartDate = startDate || undefined;
        exportEndDate = endDate || undefined;
      } else {
        // Use selected month/year - build first and last day of month
        const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
        const lastDay = new Date(selectedYear, selectedMonth, 0);
        exportStartDate = firstDay.toISOString().split('T')[0];
        exportEndDate = lastDay.toISOString().split('T')[0];
      }

      // Build query params for export - use the template export endpoint
      // which fetches ALL records directly from Firestore (no 50-record limit)
      const params = new URLSearchParams();
      if (exportStartDate) {
        const startDateISO = new Date(exportStartDate);
        startDateISO.setHours(0, 0, 0, 0);
        params.append('startDate', startDateISO.toISOString());
      }
      if (exportEndDate) {
        const endDateISO = new Date(exportEndDate);
        endDateISO.setHours(23, 59, 59, 999);
        params.append('endDate', endDateISO.toISOString());
      }

      // Use the template export endpoint which fetches ALL records
      // This is the same endpoint used by Form Builder's ResponsesView
      const response = await authenticatedFetch(
        `/api/forms/templates/${formId}/export?${params.toString()}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      // Get the Excel file as blob
      const blob = await response.blob();

      // Generate filename with date range
      const sanitizedTitle = template.title.replace(/[^a-zA-Z0-9]/g, '_');
      let filename: string;

      if (exportStartDate && exportEndDate) {
        filename = `${sanitizedTitle}_${exportStartDate}_to_${exportEndDate}.xlsx`;
      } else if (exportStartDate) {
        filename = `${sanitizedTitle}_from_${exportStartDate}.xlsx`;
      } else if (exportEndDate) {
        filename = `${sanitizedTitle}_until_${exportEndDate}.xlsx`;
      } else {
        const monthName = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;
        filename = `${sanitizedTitle}_${monthName}_${selectedYear}.xlsx`;
      }

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Excel file downloaded successfully');
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to export to Excel');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Export to Excel</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Period Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Select Period
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {monthOptions.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Custom Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Custom Date Range (Optional)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              If custom date range is provided, it will override month/year selection
            </p>
          </div>

          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <span className="text-blue-600 dark:text-blue-400 text-lg">ℹ️</span>
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">Export includes:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Submitter information</li>
                  <li>All form responses</li>
                  <li>Submission timestamps</li>
                  <li>File attachment names</li>
                  <li>Summary statistics sheet</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={exporting}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
          >
            {exporting ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Export</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

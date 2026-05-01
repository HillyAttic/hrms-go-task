'use client';

import React, { useState, useEffect } from 'react';
import { formExportService } from '@/services/form-export.service';
import { toast } from 'react-toastify';
import type { FormSubmission, FormTemplate } from '@/types/form.types';
import { useModal } from '@/contexts/modal-context';

interface SpreadsheetExportModalProps {
  submissions: FormSubmission[];
  template: FormTemplate;
  onClose: () => void;
}

export function SpreadsheetExportModal({
  submissions,
  template,
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

  // Notify modal context when modal opens/closes
  useEffect(() => {
    openModal();
    return () => {
      closeModal();
    };
  }, [openModal, closeModal]);

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
      setExporting(true);
      toast.info('Preparing Excel export...');

      // Filter submissions based on selected criteria
      let filteredSubmissions = [...submissions];

      // Apply date range filter if provided
      if (startDate || endDate) {
        filteredSubmissions = filteredSubmissions.filter((submission) => {
          const submittedDate =
            submission.submittedAt && typeof submission.submittedAt === 'object' && 'toDate' in submission.submittedAt
              ? submission.submittedAt.toDate()
              : new Date(submission.submittedAt);

          if (startDate) {
            const start = new Date(startDate);
            if (submittedDate < start) return false;
          }

          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (submittedDate > end) return false;
          }

          return true;
        });
      } else {
        // Apply year/month filter
        filteredSubmissions = filteredSubmissions.filter((submission) => {
          const submittedDate =
            submission.submittedAt && typeof submission.submittedAt === 'object' && 'toDate' in submission.submittedAt
              ? submission.submittedAt.toDate()
              : new Date(submission.submittedAt);

          const year = submittedDate.getFullYear();
          const month = submittedDate.getMonth() + 1;

          return year === selectedYear && month === selectedMonth;
        });
      }

      if (filteredSubmissions.length === 0) {
        toast.warning('No submissions found for the selected period');
        setExporting(false);
        return;
      }

      // Export the filtered submissions
      const excelBuffer = await formExportService.exportToExcel(
        filteredSubmissions,
        template
      );

      // Create blob and download
      const blob = formExportService.createDownloadBlob(excelBuffer, 'excel');

      // Generate filename with date range if custom dates are provided
      let filename: string;
      const sanitizedTitle = template.title.replace(/[^a-zA-Z0-9]/g, '_');

      if (startDate && endDate) {
        filename = `${sanitizedTitle}_${startDate}_to_${endDate}.xlsx`;
      } else if (startDate) {
        filename = `${sanitizedTitle}_from_${startDate}.xlsx`;
      } else if (endDate) {
        filename = `${sanitizedTitle}_until_${endDate}.xlsx`;
      } else {
        // Use month/year in filename
        const monthName = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;
        filename = `${sanitizedTitle}_${monthName}_${selectedYear}.xlsx`;
      }

      formExportService.downloadFile(blob, filename);

      toast.success(`Excel file downloaded successfully (${filteredSubmissions.length} submissions)`);
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export to Excel');
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

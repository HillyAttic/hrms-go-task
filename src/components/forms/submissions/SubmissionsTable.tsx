'use client';

import React, { useState } from 'react';
import type { FormSubmission, FormTemplate } from '@/types/form.types';
import { SubmissionDetailModal } from './SubmissionDetailModal';
import { SubmissionExportModal } from './SubmissionExportModal';

interface SubmissionsTableProps {
  submissions: FormSubmission[];
  template: FormTemplate;
  onRefresh: () => void;
  onDelete?: (id: string) => void;
  onModalOpen?: () => void;
  onModalClose?: () => void;
}

export function SubmissionsTable({
  submissions,
  template,
  onRefresh,
  onDelete,
  onModalOpen,
  onModalClose,
}: SubmissionsTableProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Notify parent when modal state changes
  React.useEffect(() => {
    const isModalOpen = !!selectedSubmission || showExportModal;
    if (isModalOpen) {
      onModalOpen?.();
    } else {
      onModalClose?.();
    }
  }, [selectedSubmission, showExportModal, onModalOpen, onModalClose]);

  // Filter submissions
  const filteredSubmissions = submissions.filter((submission) => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesName = submission.submitterName?.toLowerCase().includes(searchLower);
      const matchesEmail = submission.submitterEmail?.toLowerCase().includes(searchLower);
      if (!matchesName && !matchesEmail) return false;
    }

    // Date range filter
    if (startDate) {
      const submittedDate = submission.submittedAt && typeof submission.submittedAt === 'object' && 'toDate' in submission.submittedAt
        ? submission.submittedAt.toDate()
        : new Date(submission.submittedAt);
      if (submittedDate < new Date(startDate)) return false;
    }
    if (endDate) {
      const submittedDate = submission.submittedAt && typeof submission.submittedAt === 'object' && 'toDate' in submission.submittedAt
        ? submission.submittedAt.toDate()
        : new Date(submission.submittedAt);
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      if (submittedDate > endDateTime) return false;
    }

    return true;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this submission?')) return;
    if (onDelete) {
      onDelete(id);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Submissions ({filteredSubmissions.length})
          </h2>
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Export
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="date"
            placeholder="Start date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="date"
            placeholder="End date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No submissions found</p>
            {(searchTerm || startDate || endDate) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStartDate('');
                  setEndDate('');
                }}
                className="mt-2 text-blue-600 hover:text-blue-700"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitter
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Files
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSubmissions.map((submission) => (
                <tr key={submission.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {submission.submitterName || 'Anonymous'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {submission.submitterEmail || ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {typeof submission.submittedAt === 'string'
                      ? new Date(submission.submittedAt).toLocaleString()
                      : submission.submittedAt.toDate().toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {submission.files && submission.files.length > 0 ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {submission.files.length} file(s)
                      </span>
                    ) : (
                      <span className="text-gray-400">No files</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {!submission.isRead && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          New
                        </span>
                      )}
                      {submission.isFlagged && (
                        <span className="text-red-500">🚩</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setSelectedSubmission(submission)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      View
                    </button>
                    {onDelete && (
                      <button
                        onClick={() => handleDelete(submission.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {selectedSubmission && (
        <SubmissionDetailModal
          submission={selectedSubmission}
          template={template}
          onClose={() => setSelectedSubmission(null)}
          onRefresh={onRefresh}
        />
      )}

      {showExportModal && (
        <SubmissionExportModal
          formId={template.id}
          formTitle={template.title}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}

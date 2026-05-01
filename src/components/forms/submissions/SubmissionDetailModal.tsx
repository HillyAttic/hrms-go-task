'use client';

import React from 'react';
import type { FormSubmission, FormTemplate } from '@/types/form.types';
import { authenticatedFetch } from '@/lib/api-client';
import { toast } from 'react-toastify';

interface SubmissionDetailModalProps {
  submission: FormSubmission;
  template: FormTemplate;
  onClose: () => void;
  onRefresh: () => void;
}

export function SubmissionDetailModal({
  submission,
  template,
  onClose,
  onRefresh,
}: SubmissionDetailModalProps) {
  const [toggling, setToggling] = React.useState(false);

  // Flatten all fields including nested ones from sections
  const allFields = React.useMemo(() => {
    const fields: any[] = [];
    template.fields.forEach((field) => {
      if (field.type === 'section' && field.fields) {
        // Add nested fields only (not the section itself for lookup)
        fields.push(...field.fields);
      } else if (field.type !== 'section') {
        fields.push(field);
      }
    });
    return fields;
  }, [template.fields]);

  const handleToggleFlag = async () => {
    try {
      setToggling(true);
      const response = await authenticatedFetch(
        `/api/forms/submissions/${submission.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isFlagged: !submission.isFlagged,
          }),
        }
      );

      if (response.ok) {
        toast.success(submission.isFlagged ? 'Flag removed' : 'Submission flagged');
        onRefresh();
        onClose();
      } else {
        toast.error('Failed to update submission');
      }
    } catch (error) {
      toast.error('Failed to update submission');
    } finally {
      setToggling(false);
    }
  };

  const renderFieldValue = (fieldId: string) => {
    const field = allFields.find((f) => f.id === fieldId);
    const value = submission.data[fieldId];

    console.log('[SubmissionDetailModal] Rendering field:', {
      fieldId,
      foundField: !!field,
      fieldType: field?.type,
      fieldLabel: field?.label,
      hasValue: value !== null && value !== undefined && value !== '',
      value: value
    });

    if (!field) return <span className="text-gray-400">Unknown field</span>;

    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400">No answer</span>;
    }

    // Handle different field types
    switch (field.type) {
      case 'checkbox':
      case 'multiselect':
        if (Array.isArray(value)) {
          return (
            <div className="space-y-1">
              {value.map((v, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <span className="text-green-600">✓</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          );
        }
        return <span>{String(value)}</span>;

      case 'date':
        return <span>{new Date(value).toLocaleDateString()}</span>;

      case 'file':
        return <span className="text-blue-600">See attachments below</span>;

      default:
        return <span>{String(value)}</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Submission Details</h2>
            <p className="text-sm text-gray-500 mt-1">
              Submitted by {submission.submitterName || 'Anonymous'} on{' '}
              {typeof submission.submittedAt === 'string'
                ? new Date(submission.submittedAt).toLocaleString()
                : submission.submittedAt.toDate().toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Submitter Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Submitter Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <span className="ml-2 font-medium">
                  {submission.submitterName || 'Anonymous'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Email:</span>
                <span className="ml-2 font-medium">
                  {submission.submitterEmail || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Submitted At:</span>
                <span className="ml-2 font-medium">
                  {typeof submission.submittedAt === 'string'
                    ? new Date(submission.submittedAt).toLocaleString()
                    : submission.submittedAt.toDate().toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-600">IP Address:</span>
                <span className="ml-2 font-medium">
                  {submission.ipAddress || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Form Responses */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Responses</h3>
            <div className="space-y-4">
              {(() => {
                // Flatten all fields including nested ones from sections
                const displayFields: any[] = [];
                template.fields.forEach((field) => {
                  if (field.type === 'section' && field.fields) {
                    // Add section header
                    displayFields.push(field);
                    // Add nested fields
                    displayFields.push(...field.fields);
                  } else if (field.type !== 'section') {
                    displayFields.push(field);
                  }
                });

                console.log('[SubmissionDetailModal] Flattened fields:', {
                  totalFields: displayFields.length,
                  fieldIds: displayFields.map(f => ({ id: f.id, type: f.type, label: f.label })),
                  submissionDataKeys: Object.keys(submission.data),
                  submissionData: submission.data
                });

                return displayFields
                  .sort((a, b) => a.order - b.order)
                  .map((field) => {
                    // Render section header differently
                    if (field.type === 'section') {
                      return (
                        <div key={field.id} className="py-6 border-t-2 border-gray-300 mt-8 first:mt-0 first:pt-0 first:border-t-0">
                          <h2 className="text-2xl font-bold text-gray-900 mb-2">{field.label}</h2>
                          {field.description && (
                            <p className="text-sm text-gray-600 mt-1">{field.description}</p>
                          )}
                        </div>
                      );
                    }

                    // Render regular field
                    return (
                      <div key={field.id} className="border-b pb-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </div>
                        <div className="text-sm text-gray-900">
                          {renderFieldValue(field.id)}
                        </div>
                      </div>
                    );
                  });
              })()}
            </div>
          </div>

          {/* File Attachments */}
          {submission.files && submission.files.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">File Attachments</h3>
              <div className="space-y-2">
                {submission.files.map((file, index) => {
                  const field = allFields.find((f) => f.id === file.fieldId);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">📎</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {file.fileName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {field?.label} • {(file.fileSize / 1024).toFixed(2)} KB
                          </div>
                        </div>
                      </div>
                      <a
                        href={file.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Download
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Metadata */}
          {submission.userAgent && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Technical Details</h3>
              <div className="text-xs text-gray-600 font-mono break-all">
                {submission.userAgent}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-between">
          <button
            onClick={handleToggleFlag}
            disabled={toggling}
            className={`px-4 py-2 rounded-lg transition-colors ${
              submission.isFlagged
                ? 'bg-gray-600 text-white hover:bg-gray-700'
                : 'bg-red-600 text-white hover:bg-red-700'
            } disabled:opacity-50`}
          >
            {toggling
              ? 'Updating...'
              : submission.isFlagged
              ? 'Remove Flag'
              : 'Flag Submission'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

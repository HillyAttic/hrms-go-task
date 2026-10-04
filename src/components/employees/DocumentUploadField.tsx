"use client";

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { ArrowUpTrayIcon, DocumentIcon, EyeIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
  DOCUMENT_LABELS,
  DocumentField,
  DocumentValue,
  deleteEmployeeDocument,
  docName,
  docPath,
  docUrl,
  uploadEmployeeDocument,
  validateDocumentFile,
  viewDocument,
} from '@/services/employee-document.service';

interface DocumentUploadFieldProps {
  field: DocumentField;
  /** Firebase UID of the employee this document belongs to. */
  employeeId?: string;
  label?: string;
  value?: DocumentValue;
  onChange: (value: DocumentValue | undefined) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

/**
 * One document slot: shows the current file with view/delete, or an upload button.
 * Owns its own upload state so parent forms only deal with the resulting value.
 */
export function DocumentUploadField({
  field,
  employeeId,
  label,
  value,
  onChange,
  onError,
  disabled,
}: DocumentUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const url = docUrl(value);
  const name = docName(value);
  const path = docPath(value);

  const handleUpload = async (file: File) => {
    if (!employeeId) {
      onError?.('Save the employee first before uploading documents.');
      return;
    }
    const errorMsg = validateDocumentFile(file);
    if (errorMsg) {
      onError?.(errorMsg);
      return;
    }
    setIsUploading(true);
    setProgress(0);
    try {
      onChange(await uploadEmployeeDocument(employeeId, field, file, setProgress));
    } catch (err: any) {
      onError?.(`Failed to upload ${DOCUMENT_LABELS[field]}: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this document? This action cannot be undone.')) return;
    try {
      if (path) await deleteEmployeeDocument(path);
      onChange(undefined);
    } catch (err: any) {
      onError?.(`Failed to delete document: ${err.message}`);
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
      <Label className="text-sm font-medium mb-2 block">{label || DOCUMENT_LABELS[field]}</Label>

      {url && (
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-md px-3 py-2 mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <DocumentIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
              {name || 'Uploaded document'}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <button
              type="button"
              onClick={() => viewDocument(url)}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
              title="View document"
            >
              <EyeIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={disabled}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
              title="Delete document"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="mb-2">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{progress}% uploaded</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <label
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            isUploading || disabled
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 cursor-pointer'
          }`}
        >
          <ArrowUpTrayIcon className="w-4 h-4" />
          {url ? 'Replace' : 'Upload'}
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
            disabled={isUploading || disabled || !employeeId}
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Reset first so picking the same file again still fires a change event.
              e.target.value = '';
              if (file) handleUpload(file);
            }}
          />
        </label>
        {!employeeId && <span className="text-xs text-amber-600">Save employee first</span>}
      </div>
    </div>
  );
}

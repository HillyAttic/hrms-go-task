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
    <div className="rounded-xl border border-white/60 bg-white/40 p-3 backdrop-blur dark:border-white/10 dark:bg-white/[0.03]">
      <Label className="mb-2 block text-sm font-medium text-slate-900 dark:text-white">{label || DOCUMENT_LABELS[field]}</Label>

      {url && (
        <div className="mb-2 flex items-center justify-between rounded-xl bg-white/60 px-3 py-2 dark:bg-white/[0.06]">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <DocumentIcon className="h-5 w-5 flex-shrink-0 text-indigo-500" />
            <span className="truncate text-sm text-slate-700 dark:text-slate-300">
              {name || 'Uploaded document'}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <button
              type="button"
              onClick={() => viewDocument(url)}
              className="rounded p-1.5 text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
              title="View document"
            >
              <EyeIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={disabled}
              className="rounded p-1.5 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
              title="Delete document"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="mb-2">
          <div className="h-2 w-full rounded-full bg-slate-200/70 dark:bg-white/10">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-[#0447FD] to-[#7F1BFF] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{progress}% uploaded</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <label
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-all ${
            isUploading || disabled
              ? 'cursor-not-allowed bg-white/50 text-slate-400 dark:bg-white/5 dark:text-slate-500'
              : 'cursor-pointer bg-gradient-to-r from-[#0447FD] to-[#7F1BFF] text-white shadow-lg shadow-indigo-500/25 hover:brightness-110'
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

'use client';

import React from 'react';
import { Plus, Eye } from 'lucide-react';
import type { FormFieldType } from '@/types/form.types';

interface AddQuestionButtonProps {
  onAddField: (type: FormFieldType) => void;
  onPreview: () => void;
  showAddMenu: boolean;
  onToggleAddMenu: () => void;
}

const QUESTION_TYPES: Array<{ type: FormFieldType; label: string }> = [
  { type: 'text', label: 'Short answer' },
  { type: 'textarea', label: 'Paragraph' },
  { type: 'radio', label: 'Multiple choice' },
  { type: 'checkbox', label: 'Checkboxes' },
  { type: 'select', label: 'Dropdown' },
  { type: 'date', label: 'Date' },
  { type: 'time', label: 'Time' },
  { type: 'number', label: 'Number' },
  { type: 'email', label: 'Email' },
  { type: 'phone', label: 'Phone' },
  { type: 'file', label: 'File upload' },
  { type: 'multiselect', label: 'Multi-select' },
  { type: 'section', label: 'Section' },
];

export function AddQuestionButton({
  onAddField,
  onPreview,
  showAddMenu,
  onToggleAddMenu,
}: AddQuestionButtonProps) {
  return (
    <>
      <div className="bg-white rounded-full shadow-lg border border-gray-200 flex items-center gap-1 px-3 py-2">
        <div className="relative">
          <button
            onClick={onToggleAddMenu}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#673ab7] text-white hover:bg-[#5e35b1] transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Add question
          </button>

          {/* Dropdown Menu */}
          {showAddMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-2 z-[10000] w-80">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 px-1">Question Type</p>
              <div className="grid grid-cols-3 gap-0.5">
                {QUESTION_TYPES.map(({ type, label }) => (
                  <button
                    key={type}
                    onClick={() => {
                      onAddField(type);
                    }}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-gray-700 hover:bg-purple-50 hover:text-[#673ab7] transition-colors text-left"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        <button
          onClick={onPreview}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-gray-600 hover:bg-gray-100 transition-colors text-sm"
          title="Preview"
        >
          <Eye size={16} />
          Preview
        </button>
      </div>

      {/* Backdrop to close menu */}
      {showAddMenu && (
        <div
          className="fixed inset-0 z-[9999]"
          onClick={onToggleAddMenu}
        />
      )}
    </>
  );
}

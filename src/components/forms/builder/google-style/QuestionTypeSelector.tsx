'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { FormFieldType } from '@/types/form.types';

interface QuestionTypeSelectorProps {
  type: FormFieldType;
  onChange: (type: FormFieldType) => void;
}

const FIELD_TYPES: Array<{ type: FormFieldType; label: string }> = [
  { type: 'text', label: 'Short answer' },
  { type: 'textarea', label: 'Paragraph' },
  { type: 'number', label: 'Number' },
  { type: 'email', label: 'Email' },
  { type: 'phone', label: 'Phone' },
  { type: 'date', label: 'Date' },
  { type: 'time', label: 'Time' },
  { type: 'select', label: 'Dropdown' },
  { type: 'radio', label: 'Multiple choice' },
  { type: 'checkbox', label: 'Checkboxes' },
  { type: 'multiselect', label: 'Multi-select' },
  { type: 'file', label: 'File upload' },
  { type: 'section', label: 'Section' },
];

export function QuestionTypeSelector({
  type,
  onChange,
}: QuestionTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentLabel = FIELD_TYPES.find(f => f.type === type)?.label || 'Unknown';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          w-full sm:w-auto px-3 py-2 text-sm font-medium text-gray-700 bg-white
          border border-gray-300 rounded-md hover:border-purple-600
          hover:bg-purple-50 transition-colors flex items-center justify-between sm:justify-start space-x-2
          whitespace-nowrap
        "
      >
        <span>{currentLabel}</span>
        <ChevronDown size={16} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-10 right-0 bg-white shadow-lg rounded-md border border-gray-200 py-2 z-[9999] min-w-[180px]">
          {FIELD_TYPES.map((fieldType) => (
            <button
              key={fieldType.type}
              onClick={() => {
                onChange(fieldType.type);
                setIsOpen(false);
              }}
              className={`
                w-full px-4 py-2 text-left text-sm transition-colors
                ${type === fieldType.type
                  ? 'bg-purple-100 text-purple-900 font-medium'
                  : 'text-gray-700 hover:bg-purple-50 hover:text-purple-900'
                }
              `}
            >
              {fieldType.label}
            </button>
          ))}
        </div>
      )}

      {/* Backdrop to close menu */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

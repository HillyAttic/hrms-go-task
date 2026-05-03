'use client';

import React from 'react';
import { X, Plus } from 'lucide-react';
import type { FieldOption } from '@/types/form.types';

interface OptionsEditorProps {
  options: FieldOption[];
  onChange: (options: FieldOption[]) => void;
  type: 'radio' | 'checkbox' | 'select' | 'multiselect';
}

export function OptionsEditor({
  options,
  onChange,
  type,
}: OptionsEditorProps) {
  const addOption = () => {
    onChange([...options, `Option ${options.length + 1}`]);
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    onChange(updated);
  };

  const removeOption = (index: number) => {
    const updated = options.filter((_, i) => i !== index);
    onChange(updated);
  };

  const getIndicator = () => {
    switch (type) {
      case 'radio':
        return '◯';
      case 'checkbox':
        return '☑';
      case 'select':
      case 'multiselect':
        return '▼';
      default:
        return '•';
    }
  };

  return (
    <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
      {options.map((option, idx) => (
        <div key={idx} className="flex items-center space-x-3">
          {/* Option indicator */}
          <span className="text-gray-400 flex-shrink-0 text-sm font-medium">
            {getIndicator()}
          </span>

          {/* Option input */}
          <input
            type="text"
            value={typeof option === 'string' ? option : option.label || option.value}
            onChange={(e) => updateOption(idx, e.target.value)}
            className="
              flex-1 px-2 py-1 text-sm border-b border-gray-200
              focus:border-purple-600 focus:outline-none
              placeholder-gray-400
            "
            placeholder={`Option ${idx + 1}`}
          />

          {/* Remove button */}
          <button
            onClick={() => removeOption(idx)}
            className="
              text-gray-400 hover:text-red-600 flex-shrink-0
              transition-colors p-1
            "
            title="Remove option"
          >
            <X size={16} />
          </button>
        </div>
      ))}

      {/* Add option button */}
      <button
        onClick={addOption}
        className="
          text-sm text-purple-600 hover:text-purple-700
          flex items-center space-x-1 mt-2 transition-colors
        "
      >
        <Plus size={16} />
        <span>Add option</span>
      </button>
    </div>
  );
}

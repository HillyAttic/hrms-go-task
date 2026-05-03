'use client';

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Copy, Trash2, GripVertical } from 'lucide-react';
import type { FormField } from '@/types/form.types';
import { QuestionTypeSelector } from './QuestionTypeSelector';
import { OptionsEditor } from './OptionsEditor';
import { AdvancedSettings } from './AdvancedSettings';
import { FieldPreview } from './FieldPreview';

interface QuestionCardProps {
  field: FormField;
  index: number;
  isSelected: boolean;
  onUpdate: (updates: Partial<FormField>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onFocus: () => void;
}

const needsOptions = (type: string) => ['select', 'radio', 'checkbox', 'multiselect'].includes(type);

export function QuestionCard({
  field,
  index,
  isSelected,
  onUpdate,
  onDelete,
  onDuplicate,
  onFocus,
}: QuestionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
  };

  const handleDelete = () => {
    if (confirm('Delete this question?')) {
      onDelete();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        bg-white rounded-lg border transition-all duration-150 cursor-pointer
        ${isSelected
          ? 'border-blue-400 shadow-md border-l-4 border-l-[#673ab7]'
          : 'border-gray-200 hover:border-gray-300 shadow-sm'
        }
        ${isDragging ? 'opacity-50' : ''}
      `}
      onClick={onFocus}
    >
      {/* Drag handle - center top */}
      <div
        {...attributes}
        {...listeners}
        className="flex justify-center py-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="7" cy="8" r="1.5" />
          <circle cx="13" cy="8" r="1.5" />
        </svg>
      </div>

      <div className="px-6 pb-4">
        {/* Question Header */}
        <div className="flex flex-col sm:flex-row items-start gap-3">
          {field.type === 'section' ? (
            isSelected ? (
              <input
                type="text"
                value={field.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                placeholder="Section title"
                className="flex-1 text-base font-medium border-b-2 border-blue-500 focus:outline-none bg-transparent py-1"
              />
            ) : (
              <span className="flex-1 text-base font-medium text-gray-800">
                {field.label || 'Section title'}
              </span>
            )
          ) : isSelected ? (
            <input
              type="text"
              value={field.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              placeholder="Question"
              className="flex-1 text-base bg-gray-50 border-0 border-b-2 border-blue-400 focus:outline-none px-3 py-2 rounded-t"
            />
          ) : (
            <span className="flex-1 text-sm font-medium text-gray-800 py-1">
              {field.label || 'Question'}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </span>
          )}

          {isSelected && field.type !== 'section' && (
            <div className="w-full sm:w-auto sm:flex-shrink-0">
              <QuestionTypeSelector
                type={field.type}
                onChange={(type) => onUpdate({ type })}
              />
            </div>
          )}
        </div>

        {/* Description */}
        {isSelected && field.type !== 'section' && (
          <input
            type="text"
            value={field.helpText || ''}
            onChange={(e) => onUpdate({ helpText: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            placeholder="Description (optional)"
            className="w-full text-sm text-gray-500 border-0 border-b border-gray-200 focus:border-blue-400 focus:outline-none py-1 mt-2 bg-transparent"
          />
        )}
        {!isSelected && field.helpText && (
          <p className="text-sm text-gray-500 mt-0.5">{field.helpText}</p>
        )}

        {/* Answer Area */}
        {field.type !== 'section' && (
          <div className="mt-4">
            <FieldPreview field={field} />
          </div>
        )}

        {/* Options Editor (for select/radio/checkbox) */}
        {isSelected && needsOptions(field.type) && (
          <div className="mt-3">
            <OptionsEditor
              options={field.options || []}
              onChange={(options) => onUpdate({ options })}
              type={field.type as 'radio' | 'checkbox' | 'select' | 'multiselect'}
            />
          </div>
        )}

        {/* Section-specific content */}
        {field.type === 'section' && (
          <div className="mt-2">
            <div className="h-px bg-gray-300 w-full" />
            {isSelected && (
              <input
                type="text"
                value={field.description || ''}
                onChange={(e) => onUpdate({ description: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                placeholder="Section description (optional)"
                className="mt-2 w-full border-b border-gray-300 focus:border-blue-500 outline-none text-sm py-0.5 bg-transparent text-gray-500"
              />
            )}
          </div>
        )}

        {/* Footer Actions - only show when selected */}
        {isSelected && (
          <div className="flex items-center justify-end gap-1 mt-5 pt-3 border-t border-gray-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
              title="Duplicate"
            >
              <Copy size={20} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
              title="Delete"
            >
              <Trash2 size={20} />
            </button>
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <span className="text-sm text-gray-600">Required</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({ required: !field.required });
              }}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                field.required ? 'bg-[#673ab7]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  field.required ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        )}

        {/* Advanced Settings */}
        {isSelected && <AdvancedSettings field={field} onUpdate={onUpdate} />}
      </div>
    </div>
  );
}

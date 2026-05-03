'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { FormField, FieldValidation, FileConfig } from '@/types/form.types';

interface AdvancedSettingsProps {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
}

export function AdvancedSettings({
  field,
  onUpdate,
}: AdvancedSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleValidationChange = (key: keyof FieldValidation, value: any) => {
    const validation = field.validation || {};
    onUpdate({
      validation: { ...validation, [key]: value || undefined },
    });
  };

  const handleFileConfigChange = (key: keyof FileConfig, value: any) => {
    const fileConfig = field.fileConfig || {};
    onUpdate({
      fileConfig: { ...fileConfig, [key]: value },
    });
  };

  const needsValidation = ['text', 'textarea', 'number', 'email', 'phone', 'date', 'time'].includes(field.type);
  const needsFileConfig = field.type === 'file';

  if (!needsValidation && !needsFileConfig && !field.placeholder && !field.helpText) {
    return null;
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          text-sm text-purple-600 hover:text-purple-700
          flex items-center space-x-1 transition-colors
        "
      >
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        <span>{isOpen ? 'Hide' : 'Show'} advanced settings</span>
      </button>

      {isOpen && (
        <div className="mt-4 space-y-4 pt-4 border-t border-gray-100">
          {/* Placeholder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Placeholder
            </label>
            <input
              type="text"
              value={field.placeholder || ''}
              onChange={(e) => onUpdate({ placeholder: e.target.value || undefined })}
              className="
                w-full px-3 py-2 text-sm border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
              "
              placeholder="Enter placeholder text"
            />
          </div>

          {/* Help Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Help text
            </label>
            <textarea
              value={field.helpText || ''}
              onChange={(e) => onUpdate({ helpText: e.target.value || undefined })}
              className="
                w-full px-3 py-2 text-sm border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                resize-none
              "
              placeholder="Enter help text"
              rows={2}
            />
          </div>

          {/* Validation Rules */}
          {needsValidation && (
            <div className="space-y-3 pt-3 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-700">Validation</h4>

              {['number', 'text', 'textarea'].includes(field.type) && (
                <>
                  {field.type === 'number' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Min value
                          </label>
                          <input
                            type="number"
                            value={field.validation?.min ?? ''}
                            onChange={(e) => handleValidationChange('min', e.target.value ? Number(e.target.value) : undefined)}
                            className="
                              w-full px-2 py-1 text-sm border border-gray-300 rounded-md
                              focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                            "
                            placeholder="Min"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Max value
                          </label>
                          <input
                            type="number"
                            value={field.validation?.max ?? ''}
                            onChange={(e) => handleValidationChange('max', e.target.value ? Number(e.target.value) : undefined)}
                            className="
                              w-full px-2 py-1 text-sm border border-gray-300 rounded-md
                              focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                            "
                            placeholder="Max"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {['text', 'textarea'].includes(field.type) && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Min length
                          </label>
                          <input
                            type="number"
                            value={field.validation?.minLength ?? ''}
                            onChange={(e) => handleValidationChange('minLength', e.target.value ? Number(e.target.value) : undefined)}
                            className="
                              w-full px-2 py-1 text-sm border border-gray-300 rounded-md
                              focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                            "
                            placeholder="Min"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Max length
                          </label>
                          <input
                            type="number"
                            value={field.validation?.maxLength ?? ''}
                            onChange={(e) => handleValidationChange('maxLength', e.target.value ? Number(e.target.value) : undefined)}
                            className="
                              w-full px-2 py-1 text-sm border border-gray-300 rounded-md
                              focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                            "
                            placeholder="Max"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {field.type === 'text' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Pattern (regex)
                      </label>
                      <input
                        type="text"
                        value={field.validation?.pattern ?? ''}
                        onChange={(e) => handleValidationChange('pattern', e.target.value || undefined)}
                        className="
                          w-full px-2 py-1 text-sm border border-gray-300 rounded-md
                          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                        "
                        placeholder="e.g., ^[A-Z]+$"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Error message
                    </label>
                    <input
                      type="text"
                      value={field.validation?.customMessage ?? ''}
                      onChange={(e) => handleValidationChange('customMessage', e.target.value || undefined)}
                      className="
                        w-full px-2 py-1 text-sm border border-gray-300 rounded-md
                        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                      "
                      placeholder="Custom error message"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* File Upload Configuration */}
          {needsFileConfig && (
            <div className="space-y-3 pt-3 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-700">File settings</h4>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Accepted file types (comma-separated)
                </label>
                <input
                  type="text"
                  value={(field.fileConfig?.acceptedTypes || []).join(', ')}
                  onChange={(e) => handleFileConfigChange('acceptedTypes', e.target.value ? e.target.value.split(',').map(t => t.trim()) : [])}
                  className="
                    w-full px-2 py-1 text-sm border border-gray-300 rounded-md
                    focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                  "
                  placeholder="e.g., .pdf, .doc, .docx"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Max file size (MB)
                  </label>
                  <input
                    type="number"
                    value={(field.fileConfig?.maxSize || 5242880) / 1024 / 1024}
                    onChange={(e) => handleFileConfigChange('maxSize', e.target.value ? Number(e.target.value) * 1024 * 1024 : 5242880)}
                    className="
                      w-full px-2 py-1 text-sm border border-gray-300 rounded-md
                      focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                    "
                    placeholder="5"
                  />
                </div>
                <div>
                  <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 mt-6">
                    <input
                      type="checkbox"
                      checked={field.fileConfig?.multiple || false}
                      onChange={(e) => handleFileConfigChange('multiple', e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span>Allow multiple files</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

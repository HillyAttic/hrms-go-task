'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { FormField } from '@/types/form.types';

interface FieldEditorProps {
  field: FormField;
  onUpdate: (field: FormField) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function FieldEditor({ field, onUpdate, onDelete, onClose }: FieldEditorProps) {
  const [localField, setLocalField] = useState(field);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Update local state when field prop changes
  useEffect(() => {
    setLocalField(field);
    setShowDeleteConfirm(false);
  }, [field]);

  const handleUpdate = (updates: Partial<FormField>) => {
    const updated = { ...localField, ...updates };
    setLocalField(updated);
    onUpdate(updated);
  };

  const handleAddOption = () => {
    const options = localField.options || [];
    handleUpdate({
      options: [...options, `Option ${options.length + 1}`],
    });
  };

  const handleUpdateOption = (index: number, value: string) => {
    const options = [...(localField.options || [])];
    options[index] = value;
    handleUpdate({ options });
  };

  const handleRemoveOption = (index: number) => {
    const options = [...(localField.options || [])];
    options.splice(index, 1);
    handleUpdate({ options });
  };

  const needsOptions = ['select', 'multiselect', 'radio', 'checkbox'].includes(field.type);
  const isSection = field.type === 'section';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div className="bg-pink-500 px-4 sm:px-6 py-3 sm:py-4 border-b border-pink-600">
        <div className="flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Field
          </h3>
          <button
            onClick={onClose}
            className="text-white hover:text-pink-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
        {/* Label */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isSection ? 'Section Title' : 'Label'} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={localField.label}
            onChange={(e) => handleUpdate({ label: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            placeholder={isSection ? "Enter section title" : "Enter field label"}
          />
        </div>

        {/* Description for Section */}
        {isSection && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={localField.description || ''}
              onChange={(e) => handleUpdate({ description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
              placeholder="Add a description for this section"
            />
          </div>
        )}

        {/* Placeholder - hide for section */}
        {!isSection && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Placeholder
            </label>
            <input
              type="text"
              value={localField.placeholder || ''}
              onChange={(e) => handleUpdate({ placeholder: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="Enter placeholder"
            />
          </div>
        )}

        {/* Help Text - hide for section */}
        {!isSection && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Help Text
            </label>
            <textarea
              value={localField.helpText || ''}
              onChange={(e) => handleUpdate({ helpText: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
              placeholder="Additional instructions"
            />
          </div>
        )}

        {/* Required Toggle - hide for section */}
        {!isSection && (
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <div className="font-medium text-gray-900">Required</div>
              <div className="text-sm text-gray-500">Field must be filled</div>
            </div>
            <button
              onClick={() => handleUpdate({ required: !localField.required })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                localField.required ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localField.required ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        )}

        {/* Validation Rules */}
        {(field.type === 'text' || field.type === 'textarea' || field.type === 'number') && (
          <div className="space-y-4 p-4 bg-cyan-50 rounded-lg border border-cyan-200">
            <div className="font-medium text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Validation
            </div>

            {field.type === 'number' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min
                  </label>
                  <input
                    type="number"
                    value={localField.validation?.min ?? ''}
                    onChange={(e) =>
                      handleUpdate({
                        validation: {
                          ...localField.validation,
                          min: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="Min"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max
                  </label>
                  <input
                    type="number"
                    value={localField.validation?.max ?? ''}
                    onChange={(e) =>
                      handleUpdate({
                        validation: {
                          ...localField.validation,
                          max: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="Max"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Length
                  </label>
                  <input
                    type="number"
                    value={localField.validation?.minLength ?? ''}
                    onChange={(e) =>
                      handleUpdate({
                        validation: {
                          ...localField.validation,
                          minLength: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="Min"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Length
                  </label>
                  <input
                    type="number"
                    value={localField.validation?.maxLength ?? ''}
                    onChange={(e) =>
                      handleUpdate({
                        validation: {
                          ...localField.validation,
                          maxLength: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="Max"
                  />
                </div>
              </div>
            )}

            {field.type === 'text' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pattern (Regex)
                </label>
                <input
                  type="text"
                  value={localField.validation?.pattern ?? ''}
                  onChange={(e) =>
                    handleUpdate({
                      validation: {
                        ...localField.validation,
                        pattern: e.target.value || undefined,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm font-mono"
                  placeholder="^[A-Za-z]+$"
                />
              </div>
            )}
          </div>
        )}

        {/* Options for select/radio/checkbox */}
        {needsOptions && (
          <div className="space-y-3 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-900 flex items-center">
                <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Options
              </div>
              <button
                onClick={handleAddOption}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
              >
                + Add
              </button>
            </div>

            <div className="space-y-2">
              {(localField.options || []).map((option, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center space-x-2"
                >
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white flex items-center justify-center text-xs font-medium rounded">
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={typeof option === 'string' ? option : option.label}
                    onChange={(e) => handleUpdateOption(index, e.target.value)}
                    className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Option ${index + 1}`}
                  />
                  <button
                    onClick={() => handleRemoveOption(index)}
                    className="flex-shrink-0 p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </motion.div>
              ))}
            </div>

            {(!localField.options || localField.options.length === 0) && (
              <div className="text-center py-4 text-gray-500 text-xs sm:text-sm">
                No options yet
              </div>
            )}
          </div>
        )}

        {/* File Upload Settings */}
        {field.type === 'file' && (
          <div className="space-y-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="font-medium text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              File Settings
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Accepted Types
              </label>
              <input
                type="text"
                value={localField.fileConfig?.acceptedTypes?.join(', ') || ''}
                onChange={(e) =>
                  handleUpdate({
                    fileConfig: {
                      ...localField.fileConfig,
                      acceptedTypes: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="image/*, .pdf, .doc"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Size (MB)
              </label>
              <input
                type="number"
                value={localField.fileConfig?.maxSize ? localField.fileConfig.maxSize / (1024 * 1024) : ''}
                onChange={(e) =>
                  handleUpdate({
                    fileConfig: {
                      ...localField.fileConfig,
                      maxSize: e.target.value ? Number(e.target.value) * 1024 * 1024 : undefined,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="5"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-200">
        {showDeleteConfirm ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-700 font-medium flex items-center">
              <svg className="w-5 h-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Delete this field?
            </p>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <button
                onClick={() => {
                  onDelete();
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Field
          </button>
        )}
      </div>
    </motion.div>
  );
}

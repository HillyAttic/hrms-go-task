'use client';

import React, { useState } from 'react';
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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, rotate: 2 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      className="bg-white border-4 border-black overflow-hidden brutal-border-pink"
    >
      {/* Header */}
      <div className="bg-[#FF006B] px-6 py-5 border-b-4 border-black noise-texture">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-black text-white flex items-center uppercase form-builder-neo">
            ✏️ EDITOR
          </h3>
          <button
            onClick={onClose}
            className="text-white hover:text-black transition-colors font-black text-2xl"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
        {/* Label */}
        <div>
          <label className="block text-sm font-black text-black mb-2 uppercase form-builder-neo">
            LABEL <span className="text-[#FF006B]">*</span>
          </label>
          <input
            type="text"
            value={localField.label}
            onChange={(e) => handleUpdate({ label: e.target.value })}
            className="w-full px-4 py-3 border-4 border-black focus:outline-none focus:ring-0 transition-all font-bold form-builder-mono bg-white"
            placeholder="Enter field label"
          />
        </div>

        {/* Placeholder */}
        <div>
          <label className="block text-sm font-black text-black mb-2 uppercase form-builder-neo">
            PLACEHOLDER
          </label>
          <input
            type="text"
            value={localField.placeholder || ''}
            onChange={(e) => handleUpdate({ placeholder: e.target.value })}
            className="w-full px-4 py-3 border-4 border-black focus:outline-none focus:ring-0 transition-all font-bold form-builder-mono bg-white"
            placeholder="Enter placeholder"
          />
        </div>

        {/* Help Text */}
        <div>
          <label className="block text-sm font-black text-black mb-2 uppercase form-builder-neo">
            HELP TEXT
          </label>
          <textarea
            value={localField.helpText || ''}
            onChange={(e) => handleUpdate({ helpText: e.target.value })}
            rows={2}
            className="w-full px-4 py-3 border-4 border-black focus:outline-none focus:ring-0 transition-all resize-none font-bold form-builder-mono bg-white"
            placeholder="Additional instructions"
          />
        </div>

        {/* Required Toggle */}
        <div className="flex items-center justify-between p-4 bg-[#FFE500] border-4 border-black">
          <div>
            <div className="font-black text-black uppercase form-builder-neo">REQUIRED</div>
            <div className="text-sm text-black/70 font-bold form-builder-mono">// Must fill</div>
          </div>
          <button
            onClick={() => handleUpdate({ required: !localField.required })}
            className={`relative inline-flex h-8 w-16 items-center border-4 border-black transition-colors ${
              localField.required ? 'bg-black' : 'bg-white'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform border-2 border-black transition-transform ${
                localField.required ? 'translate-x-8 bg-[#00FF85]' : 'translate-x-0 bg-white'
              }`}
            />
          </button>
        </div>

        {/* Validation Rules */}
        {(field.type === 'text' || field.type === 'textarea' || field.type === 'number') && (
          <div className="space-y-4 p-4 bg-[#00FFE5] border-4 border-black">
            <div className="font-black text-black flex items-center uppercase form-builder-neo">
              🛡️ VALIDATION
            </div>

            {field.type === 'number' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-black text-black mb-2 uppercase form-builder-mono">
                    MIN
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
                    className="w-full px-3 py-2 border-4 border-black focus:outline-none font-bold form-builder-mono bg-white"
                    placeholder="Min"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-black mb-2 uppercase form-builder-mono">
                    MAX
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
                    className="w-full px-3 py-2 border-4 border-black focus:outline-none font-bold form-builder-mono bg-white"
                    placeholder="Max"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-black text-black mb-2 uppercase form-builder-mono">
                    MIN LENGTH
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
                    className="w-full px-3 py-2 border-4 border-black focus:outline-none font-bold form-builder-mono bg-white"
                    placeholder="Min"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-black mb-2 uppercase form-builder-mono">
                    MAX LENGTH
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
                    className="w-full px-3 py-2 border-4 border-black focus:outline-none font-bold form-builder-mono bg-white"
                    placeholder="Max"
                  />
                </div>
              </div>
            )}

            {field.type === 'text' && (
              <div>
                <label className="block text-sm font-black text-black mb-2 uppercase form-builder-mono">
                  PATTERN (REGEX)
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
                  className="w-full px-3 py-2 border-4 border-black focus:outline-none font-bold form-builder-mono text-sm bg-white"
                  placeholder="^[A-Za-z]+$"
                />
              </div>
            )}
          </div>
        )}

        {/* Options for select/radio/checkbox */}
        {needsOptions && (
          <div className="space-y-3 p-4 bg-[#00FF85] border-4 border-black">
            <div className="flex items-center justify-between">
              <div className="font-black text-black flex items-center uppercase form-builder-neo">
                📋 OPTIONS
              </div>
              <button
                onClick={handleAddOption}
                className="px-4 py-2 bg-black text-[#00FF85] text-sm font-black uppercase border-4 border-black brutal-hover transition-all form-builder-neo"
              >
                + ADD
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
                  <div className="flex-shrink-0 w-8 h-8 bg-black text-white flex items-center justify-center text-xs font-black border-2 border-black">
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleUpdateOption(index, e.target.value)}
                    className="flex-1 px-3 py-2 border-4 border-black focus:outline-none font-bold form-builder-mono bg-white"
                    placeholder={`Option ${index + 1}`}
                  />
                  <button
                    onClick={() => handleRemoveOption(index)}
                    className="flex-shrink-0 p-2 text-[#FF006B] hover:bg-black hover:text-white border-4 border-black transition-colors font-black text-xl"
                  >
                    ✕
                  </button>
                </motion.div>
              ))}
            </div>

            {(!localField.options || localField.options.length === 0) && (
              <div className="text-center py-6 text-black/60 text-sm font-bold form-builder-mono">
                // No options yet
              </div>
            )}
          </div>
        )}

        {/* File Upload Settings */}
        {field.type === 'file' && (
          <div className="space-y-4 p-4 bg-[#FFE500] border-4 border-black">
            <div className="font-black text-black flex items-center uppercase form-builder-neo">
              📎 FILE SETTINGS
            </div>

            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase form-builder-mono">
                ACCEPTED TYPES
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
                className="w-full px-3 py-2 border-4 border-black focus:outline-none font-bold form-builder-mono bg-white"
                placeholder="image/*, .pdf, .doc"
              />
              <p className="text-xs text-black/60 mt-1 font-bold form-builder-mono">// Comma-separated</p>
            </div>

            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase form-builder-mono">
                MAX SIZE (MB)
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
                className="w-full px-3 py-2 border-4 border-black focus:outline-none font-bold form-builder-mono bg-white"
                placeholder="5"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-[#FFE500] border-t-4 border-black">
        {showDeleteConfirm ? (
          <div className="space-y-3">
            <p className="text-sm text-black font-bold form-builder-mono">
              ⚠️ DELETE THIS FIELD?
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  onDelete();
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 px-4 py-2 bg-black text-[#FF006B] border-4 border-black font-black uppercase brutal-hover transition-all form-builder-neo"
              >
                YES
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-white text-black border-4 border-black font-black uppercase brutal-hover transition-all form-builder-neo"
              >
                NO
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full px-4 py-3 bg-black text-[#FF006B] border-4 border-black font-black uppercase brutal-hover transition-all flex items-center justify-center form-builder-neo"
          >
            🗑️ DELETE FIELD
          </button>
        )}
      </div>
    </motion.div>
  );
}

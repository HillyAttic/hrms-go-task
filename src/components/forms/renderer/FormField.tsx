'use client';

import React from 'react';
import type { FormField as FormFieldType } from '@/types/form.types';
import { UseFormRegister, FieldError, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { SearchableSelect } from './SearchableSelect';

interface FormFieldProps {
  field: FormFieldType;
  register: UseFormRegister<any>;
  error?: FieldError;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
}

export function FormField({ field, register, error, setValue, watch }: FormFieldProps) {
  // Special rendering for section type
  if (field.type === 'section') {
    return (
      <div className="pt-4 border-t-2 border-gray-300 dark:border-gray-600 mt-6 first:mt-0 first:pt-0 first:border-t-0">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          {field.label}
        </h2>
        {field.description && (
          <p className="text-gray-600 dark:text-gray-400 text-base mb-2">
            {field.description}
          </p>
        )}
      </div>
    );
  }

  const renderField = () => {
    const baseClasses =
      'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent';
    const errorClasses = error ? 'border-red-500' : '';

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <input
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
            {...register(field.id)}
            placeholder={field.placeholder}
            className={`${baseClasses} ${errorClasses}`}
          />
        );

      case 'textarea':
        return (
          <textarea
            {...register(field.id)}
            placeholder={field.placeholder}
            rows={4}
            className={`${baseClasses} ${errorClasses}`}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            {...register(field.id)}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            className={`${baseClasses} ${errorClasses}`}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            {...register(field.id)}
            className={`${baseClasses} ${errorClasses}`}
          />
        );

      case 'time':
        return (
          <input
            type="time"
            {...register(field.id)}
            className={`${baseClasses} ${errorClasses}`}
          />
        );

      case 'select':
        return (
          <SearchableSelect
            options={field.options || []}
            value={watch(field.id) || ''}
            onChange={(value) => setValue(field.id, value)}
            placeholder="Select an option"
            className={`${baseClasses} ${errorClasses}`}
            error={!!error}
          />
        );

      case 'multiselect':
        return (
          <select
            {...register(field.id)}
            multiple
            size={Math.min(field.options?.length || 5, 5)}
            className={`${baseClasses} ${errorClasses}`}
          >
            {field.options?.map((option) => (
              <option key={typeof option === 'string' ? option : option.value} value={typeof option === 'string' ? option : option.value}>
                {typeof option === 'string' ? option : option.label}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label key={typeof option === 'string' ? option : option.value} className="flex items-center space-x-2">
                <input
                  type="radio"
                  {...register(field.id)}
                  value={typeof option === 'string' ? option : option.value}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700 dark:text-gray-300">{typeof option === 'string' ? option : option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label key={typeof option === 'string' ? option : option.value} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  {...register(field.id)}
                  value={typeof option === 'string' ? option : option.value}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700 dark:text-gray-300">{typeof option === 'string' ? option : option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'file':
        return (
          <div>
            <input
              type="file"
              accept={field.accept}
              multiple={field.multiple}
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setValue(field.id, field.multiple ? files : files[0]);
              }}
              className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
            />
            {field.maxFileSize && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Max file size: {(field.maxFileSize / (1024 * 1024)).toFixed(2)}MB
              </p>
            )}
            {field.accept && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Accepted types: {field.accept}
              </p>
            )}
          </div>
        );

      default:
        return (
          <input
            type="text"
            {...register(field.id)}
            placeholder={field.placeholder}
            className={`${baseClasses} ${errorClasses}`}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      {/* Label */}
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Help Text */}
      {field.helpText && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{field.helpText}</p>
      )}

      {/* Field Input */}
      {renderField()}

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600">{error.message as string}</p>
      )}
    </div>
  );
}

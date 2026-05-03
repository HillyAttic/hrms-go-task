'use client';

import React from 'react';
import type { FormField } from '@/types/form.types';

interface FieldPreviewProps {
  field: FormField;
}

export function FieldPreview({ field }: FieldPreviewProps) {
  switch (field.type) {
    case 'text':
      return (
        <input
          type="text"
          disabled
          placeholder={field.placeholder || 'Short answer text'}
          className="w-full px-0 py-2 text-sm border-b border-gray-300 bg-transparent text-gray-400 placeholder-gray-400 disabled:cursor-default"
        />
      );

    case 'textarea':
      return (
        <textarea
          disabled
          placeholder={field.placeholder || 'Long answer text'}
          className="w-full px-0 py-2 text-sm border-b border-gray-300 bg-transparent text-gray-400 placeholder-gray-400 disabled:cursor-default resize-none"
          rows={3}
        />
      );

    case 'number':
      return (
        <input
          type="number"
          disabled
          placeholder={field.placeholder || '0'}
          className="w-full px-0 py-2 text-sm border-b border-gray-300 bg-transparent text-gray-400 placeholder-gray-400 disabled:cursor-default"
        />
      );

    case 'email':
      return (
        <input
          type="email"
          disabled
          placeholder={field.placeholder || 'your@email.com'}
          className="w-full px-0 py-2 text-sm border-b border-gray-300 bg-transparent text-gray-400 placeholder-gray-400 disabled:cursor-default"
        />
      );

    case 'phone':
      return (
        <input
          type="tel"
          disabled
          placeholder={field.placeholder || '+1 (555) 000-0000'}
          className="w-full px-0 py-2 text-sm border-b border-gray-300 bg-transparent text-gray-400 placeholder-gray-400 disabled:cursor-default"
        />
      );

    case 'date':
      return (
        <input
          type="date"
          disabled
          className="w-full px-0 py-2 text-sm border-b border-gray-300 bg-transparent text-gray-400 disabled:cursor-default"
        />
      );

    case 'time':
      return (
        <input
          type="time"
          disabled
          className="w-full px-0 py-2 text-sm border-b border-gray-300 bg-transparent text-gray-400 disabled:cursor-default"
        />
      );

    case 'select':
      return (
        <select
          disabled
          className="w-full px-0 py-2 text-sm border-b border-gray-300 bg-transparent text-gray-400 disabled:cursor-default appearance-none"
        >
          <option>Choose an option</option>
          {(field.options || []).map((opt, idx) => (
            <option key={idx} disabled>
              {typeof opt === 'string' ? opt : opt.label || opt.value}
            </option>
          ))}
        </select>
      );

    case 'radio':
      return (
        <div className="space-y-2">
          {(field.options || []).map((opt, idx) => (
            <label key={idx} className="flex items-center space-x-2 text-sm text-gray-400">
              <input type="radio" disabled className="w-4 h-4" />
              <span>{typeof opt === 'string' ? opt : opt.label || opt.value}</span>
            </label>
          ))}
        </div>
      );

    case 'checkbox':
      return (
        <div className="space-y-2">
          {(field.options || []).map((opt, idx) => (
            <label key={idx} className="flex items-center space-x-2 text-sm text-gray-400">
              <input type="checkbox" disabled className="w-4 h-4" />
              <span>{typeof opt === 'string' ? opt : opt.label || opt.value}</span>
            </label>
          ))}
        </div>
      );

    case 'multiselect':
      return (
        <select
          disabled
          multiple
          className="w-full px-0 py-2 text-sm border-b border-gray-300 bg-transparent text-gray-400 disabled:cursor-default"
        >
          {(field.options || []).map((opt, idx) => (
            <option key={idx} disabled>
              {typeof opt === 'string' ? opt : opt.label || opt.value}
            </option>
          ))}
        </select>
      );

    case 'file':
      return (
        <input
          type="file"
          disabled
          className="w-full px-0 py-2 text-sm text-gray-400 disabled:cursor-default"
        />
      );

    case 'section':
      return (
        <div className="text-sm text-gray-500 italic">
          {field.description || 'Section description'}
        </div>
      );

    default:
      return null;
  }
}

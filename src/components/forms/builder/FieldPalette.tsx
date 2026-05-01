'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useDraggable } from '@dnd-kit/core';
import type { FormFieldType } from '@/types/form.types';

interface FieldPaletteProps {
  onAddField: (type: FormFieldType) => void;
  selectedSectionId?: string | null;
  onAddFieldToSection?: (sectionId: string, fieldType: FormFieldType) => void;
}

const fieldTypes: Array<{
  type: FormFieldType;
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}> = [
  {
    type: 'text',
    label: 'Text Input',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    ),
    description: 'Single line text',
    color: 'from-blue-500 to-blue-600',
  },
  {
    type: 'textarea',
    label: 'Text Area',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
    description: 'Multi-line text',
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    type: 'number',
    label: 'Number',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
      </svg>
    ),
    description: 'Numeric input',
    color: 'from-purple-500 to-purple-600',
  },
  {
    type: 'email',
    label: 'Email',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    description: 'Email address',
    color: 'from-pink-500 to-pink-600',
  },
  {
    type: 'phone',
    label: 'Phone',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
    description: 'Phone number',
    color: 'from-green-500 to-green-600',
  },
  {
    type: 'date',
    label: 'Date',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    description: 'Date picker',
    color: 'from-yellow-500 to-yellow-600',
  },
  {
    type: 'time',
    label: 'Time',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    description: 'Time picker',
    color: 'from-orange-500 to-orange-600',
  },
  {
    type: 'select',
    label: 'Dropdown',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
    description: 'Single selection',
    color: 'from-teal-500 to-teal-600',
  },
  {
    type: 'multiselect',
    label: 'Multi-Select',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    description: 'Multiple selection',
    color: 'from-cyan-500 to-cyan-600',
  },
  {
    type: 'radio',
    label: 'Radio Group',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="9" strokeWidth={2} />
        <circle cx="12" cy="12" r="4" fill="currentColor" />
      </svg>
    ),
    description: 'Single choice',
    color: 'from-red-500 to-red-600',
  },
  {
    type: 'checkbox',
    label: 'Checkboxes',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    description: 'Multiple choice',
    color: 'from-violet-500 to-violet-600',
  },
  {
    type: 'file',
    label: 'File Upload',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
    description: 'File attachment',
    color: 'from-gray-500 to-gray-600',
  },
  {
    type: 'section',
    label: 'Section',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
    description: 'Section divider',
    color: 'from-slate-500 to-slate-600',
  },
];

function DraggableFieldItem({
  field,
  index,
  onAddField,
  selectedSectionId,
  onAddFieldToSection
}: {
  field: typeof fieldTypes[0];
  index: number;
  onAddField: (type: FormFieldType) => void;
  selectedSectionId?: string | null;
  onAddFieldToSection?: (sectionId: string, fieldType: FormFieldType) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${field.type}`,
    data: { type: field.type, source: 'palette' },
  });

  const colors = ['#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B'];
  const bgColor = colors[index % colors.length];

  const handlePlusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedSectionId && onAddFieldToSection) {
      onAddFieldToSection(selectedSectionId, field.type);
    } else {
      onAddField(field.type);
    }
  };

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={`group relative overflow-hidden border border-gray-200 rounded-lg bg-white transition-all hover:border-gray-300 hover:shadow-md ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      <div className="relative p-3 flex items-center space-x-3">
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 w-10 h-10 rounded-md flex items-center justify-center text-white shadow-sm cursor-grab active:cursor-grabbing"
          style={{ backgroundColor: bgColor }}
        >
          {field.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 text-sm">{field.label}</div>
          <div className="text-xs text-gray-500 mt-0.5">{field.description}</div>
        </div>

        <button
          onClick={handlePlusClick}
          className="flex-shrink-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded p-1 transition-colors"
          title={selectedSectionId ? "Add to selected section" : "Add to form"}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

export function FieldPalette({ onAddField, selectedSectionId, onAddFieldToSection }: FieldPaletteProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm lg:sticky lg:top-4"
    >
      <div className="bg-orange-500 px-4 sm:px-6 py-3 sm:py-4 border-b border-orange-600">
        <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          Add Fields
        </h3>
        <p className="text-orange-100 text-xs sm:text-sm mt-1 hidden sm:block">Drag to canvas or tap to add</p>
        <p className="text-orange-100 text-xs mt-1 sm:hidden">Tap to add field</p>
      </div>

      <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-1 gap-2 max-h-[300px] lg:max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
        {fieldTypes.map((field, index) => (
          <motion.div
            key={field.type}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            {/* Desktop: Draggable with click */}
            <div className="hidden sm:block">
              <DraggableFieldItem
                field={field}
                index={index}
                onAddField={onAddField}
                selectedSectionId={selectedSectionId}
                onAddFieldToSection={onAddFieldToSection}
              />
            </div>
            <button
              onClick={() => onAddField(field.type)}
              className="sm:hidden w-full group relative overflow-hidden border border-gray-200 rounded-lg bg-white active:bg-gray-50 transition-all hover:border-gray-300 hover:shadow-md p-2"
            >
              <div className="flex flex-col items-center space-y-1">
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: ['#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B'][index % 5] }}
                >
                  {field.icon}
                </div>
                <div className="text-xs font-medium text-gray-900 text-center">{field.label}</div>
              </div>
            </button>
          </motion.div>
        ))}
      </div>

      <div className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-50 border-t border-gray-200 hidden sm:block">
        <div className="flex items-center space-x-2 text-xs text-gray-600">
          <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Drag fields to build your form</span>
        </div>
      </div>
    </motion.div>
  );
}

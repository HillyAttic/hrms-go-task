'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useDraggable } from '@dnd-kit/core';
import type { FormFieldType } from '@/types/form.types';

interface FieldPaletteProps {
  onAddField: (type: FormFieldType) => void;
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
];

function DraggableFieldItem({ field, index }: { field: typeof fieldTypes[0]; index: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${field.type}`,
    data: { type: field.type, source: 'palette' },
  });

  const colors = ['#FFE500', '#FF6B00', '#FF006B', '#00FFE5', '#00FF85'];
  const bgColor = colors[index % colors.length];

  return (
    <motion.div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      initial={{ opacity: 0, x: -20, rotate: -2 }}
      animate={{ opacity: 1, x: 0, rotate: 0 }}
      whileHover={{ y: -4, rotate: 1 }}
      whileTap={{ scale: 0.95 }}
      className={`group relative overflow-hidden border-4 border-black bg-white cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-50 shadow-2xl' : 'brutal-hover'
      }`}
      style={{ boxShadow: '4px 4px 0 #000' }}
    >
      <div className="absolute inset-0 noise-texture opacity-10 pointer-events-none" />

      <div className="relative p-4 flex items-center space-x-3">
        <div className="flex-shrink-0 w-12 h-12 border-3 border-black flex items-center justify-center text-black font-black" style={{ backgroundColor: bgColor }}>
          {field.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-black text-black text-sm uppercase form-builder-neo">{field.label}</div>
          <div className="text-xs text-black/60 mt-0.5 font-bold form-builder-mono">// {field.description}</div>
        </div>

        <div className="flex-shrink-0 text-black group-hover:text-[#FF6B00] transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>
      </div>
    </motion.div>
  );
}

export function FieldPalette({ onAddField }: FieldPaletteProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotate: 1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      className="bg-white border-4 border-black overflow-hidden brutal-border-orange"
    >
      <div className="bg-[#FF6B00] px-6 py-5 border-b-4 border-black noise-texture">
        <h3 className="text-2xl font-black text-black flex items-center uppercase form-builder-neo">
          🎨 PALETTE
        </h3>
        <p className="text-black/70 text-sm mt-1 font-bold form-builder-mono">// Drag to canvas</p>
      </div>

      <div className="p-4 space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar">
        {fieldTypes.map((field, index) => (
          <motion.div
            key={field.type}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <DraggableFieldItem field={field} index={index} />
          </motion.div>
        ))}
      </div>

      <div className="px-6 py-4 bg-[#FFE500] border-t-4 border-black">
        <div className="flex items-start space-x-2 text-xs text-black font-bold form-builder-mono">
          <span className="text-2xl">💡</span>
          <span>DRAG FIELDS TO BUILD YOUR FORM</span>
        </div>
      </div>
    </motion.div>
  );
}

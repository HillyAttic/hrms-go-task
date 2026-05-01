'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FormField, FormFieldType } from '@/types/form.types';
import { FieldEditor } from './FieldEditor';

interface FormBuilderCanvasProps {
  fields: FormField[];
  onUpdateField: (index: number, field: FormField) => void;
  onDeleteField: (index: number) => void;
  onReorderFields: (fields: FormField[]) => void;
  onAddField: (type: FormFieldType) => void;
}

function SortableFieldItem({
  field,
  index,
  isSelected,
  onClick,
}: {
  field: FormField;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: field.id,
    data: { type: 'field', field },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getFieldIcon = (type: FormFieldType) => {
    const icons: Record<FormFieldType, React.ReactNode> = {
      text: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      ),
      textarea: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
      number: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
        </svg>
      ),
      email: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      phone: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
      date: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      time: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      select: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
      multiselect: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      radio: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="12" r="9" strokeWidth={2} />
          <circle cx="12" cy="12" r="4" fill="currentColor" />
        </svg>
      ),
      checkbox: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      file: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
    };
    return icons[type] || icons.text;
  };

  const colors = ['#FFE500', '#FF6B00', '#FF006B', '#00FFE5', '#00FF85'];
  const bgColor = colors[index % colors.length];

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, x: -50, rotate: -2 }}
      animate={{ opacity: 1, x: 0, rotate: 0 }}
      exit={{ opacity: 0, scale: 0.9, rotate: 2 }}
      whileHover={{ y: isDragging ? 0 : -4, rotate: isDragging ? 0 : 1 }}
      className={`group relative ${isDragging ? 'z-50 opacity-50' : ''}`}
    >
      <div
        onClick={onClick}
        className={`relative overflow-hidden border-4 border-black transition-all cursor-pointer ${
          isSelected
            ? 'bg-black'
            : 'bg-white brutal-hover'
        }`}
        style={{
          boxShadow: isSelected ? `8px 8px 0 ${bgColor}` : '6px 6px 0 #000'
        }}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center cursor-grab active:cursor-grabbing border-r-4 border-black transition-colors"
          style={{ backgroundColor: bgColor }}
        >
          <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
          </svg>
        </div>

        <div className="pl-16 pr-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <div className="flex-shrink-0 w-8 h-8 border-3 border-black flex items-center justify-center text-black font-black" style={{ backgroundColor: bgColor }}>
                  {getFieldIcon(field.type)}
                </div>
                <span className={`font-black uppercase truncate form-builder-neo text-lg ${isSelected ? 'text-[#FFE500]' : 'text-black'}`}>
                  {field.label}
                </span>
                {field.required && (
                  <span className="flex-shrink-0 text-[#FF006B] text-xl font-black">*</span>
                )}
              </div>

              <div className="flex items-center space-x-2 mt-3">
                <span className="inline-flex items-center px-3 py-1 border-2 border-black text-xs font-bold bg-white text-black uppercase form-builder-mono">
                  {field.type}
                </span>
                {field.validation?.min !== undefined && (
                  <span className="text-xs font-bold text-black/60 form-builder-mono">MIN: {field.validation.min}</span>
                )}
                {field.validation?.max !== undefined && (
                  <span className="text-xs font-bold text-black/60 form-builder-mono">MAX: {field.validation.max}</span>
                )}
              </div>

              {field.helpText && (
                <p className={`text-sm mt-3 line-clamp-2 form-builder-mono ${isSelected ? 'text-white' : 'text-black/70'}`}>
                  // {field.helpText}
                </p>
              )}
            </div>

            <div className="flex-shrink-0 ml-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`transition-colors ${isSelected ? 'text-[#FFE500]' : 'text-black group-hover:text-[#FF6B00]'}`}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Noise texture overlay */}
        <div className="absolute inset-0 noise-texture pointer-events-none opacity-20" />
      </div>
    </motion.div>
  );
}

export function FormBuilderCanvas({
  fields,
  onUpdateField,
  onDeleteField,
  onReorderFields,
  onAddField,
}: FormBuilderCanvasProps) {
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null);

  const { setNodeRef: setCanvasRef, isOver } = useDroppable({
    id: 'canvas-drop-zone',
  });

  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Canvas Area */}
      <div className="lg:col-span-2">
        <motion.div
          initial={{ opacity: 0, y: 20, rotate: -1 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          className="bg-white border-4 border-black overflow-hidden brutal-border-cyan"
        >
          <div className="bg-[#00FFE5] px-6 py-5 border-b-4 border-black noise-texture">
            <h3 className="text-2xl font-black text-black flex items-center uppercase form-builder-neo">
              📋 CANVAS
            </h3>
            <p className="text-black/70 text-sm mt-1 font-bold form-builder-mono">
              {sortedFields.length} FIELD{sortedFields.length !== 1 ? 'S' : ''}
            </p>
          </div>

          <div
            ref={setCanvasRef}
            className={`p-6 min-h-[500px] diagonal-stripes transition-all ${
              isOver ? 'bg-[#00FFE5]/10' : ''
            }`}
          >
            {sortedFields.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-[400px] text-center"
              >
                <motion.div
                  className="w-32 h-32 bg-[#FFE500] border-4 border-black flex items-center justify-center mb-6 brutal-border-yellow"
                  animate={{ rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <span className="text-6xl">➕</span>
                </motion.div>
                <h4 className="text-3xl font-black text-black mb-3 uppercase form-builder-neo">
                  DROP FIELDS HERE
                </h4>
                <p className="text-black/60 max-w-sm font-bold form-builder-mono">
                  // Drag components from the palette →
                </p>
              </motion.div>
            ) : (
              <SortableContext
                items={sortedFields.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  <AnimatePresence>
                    {sortedFields.map((field, index) => {
                      const actualIndex = fields.findIndex((f) => f.id === field.id);
                      return (
                        <SortableFieldItem
                          key={field.id}
                          field={field}
                          index={index}
                          isSelected={selectedFieldIndex === actualIndex}
                          onClick={() => setSelectedFieldIndex(actualIndex)}
                        />
                      );
                    })}
                  </AnimatePresence>
                </div>
              </SortableContext>
            )}
          </div>
        </motion.div>
      </div>

      {/* Field Editor */}
      <div className="lg:col-span-1">
        <AnimatePresence mode="wait">
          {selectedFieldIndex !== null && fields[selectedFieldIndex] ? (
            <motion.div
              key="editor"
              initial={{ opacity: 0, x: 20, rotate: 2 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              exit={{ opacity: 0, x: 20, rotate: -2 }}
            >
              <FieldEditor
                field={fields[selectedFieldIndex]}
                onUpdate={(updatedField) => onUpdateField(selectedFieldIndex, updatedField)}
                onDelete={() => {
                  onDeleteField(selectedFieldIndex);
                  setSelectedFieldIndex(null);
                }}
                onClose={() => setSelectedFieldIndex(null)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0, x: 20, rotate: 2 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              exit={{ opacity: 0, x: 20, rotate: -2 }}
              className="bg-white border-4 border-black p-8 text-center brutal-border-pink"
            >
              <div className="w-24 h-24 bg-[#FF006B] border-4 border-black flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">✏️</span>
              </div>
              <p className="text-black font-black text-xl uppercase mb-2 form-builder-neo">NO SELECTION</p>
              <p className="text-black/60 font-bold form-builder-mono text-sm">// Click a field to edit</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

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
  onAddFieldToSection?: (sectionId: string, fieldType: FormFieldType) => void;
}

interface FieldPath {
  sectionIndex: number;
  fieldIndex: number;
}

function SortableFieldItem({
  field,
  index,
  isSelected,
  onClick,
  onAddFieldToSection,
  onNestedFieldClick,
  parentSectionIndex,
  selectedNestedPath,
}: {
  field: FormField;
  index: number;
  isSelected: boolean;
  onClick: (e?: React.MouseEvent) => void;
  onAddFieldToSection?: (sectionId: string, fieldType: FormFieldType) => void;
  onNestedFieldClick?: (sectionIndex: number, fieldIndex: number) => void;
  parentSectionIndex?: number;
  selectedNestedPath?: FieldPath | null;
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

  const { setNodeRef: setSectionDropRef, isOver: isSectionOver } = useDroppable({
    id: `section-${field.id}`,
    data: { type: 'section', sectionId: field.id },
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
      section: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
    };
    return icons[type] || icons.text;
  };

  const colors = ['#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B'];
  const bgColor = colors[index % colors.length];

  // Special rendering for section type
  if (field.type === 'section') {
    return (
      <motion.div
        ref={setNodeRef}
        style={style}
        layout
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ y: isDragging ? 0 : -2 }}
        className={`group relative ${isDragging ? 'z-50 opacity-50' : ''}`}
      >
        <div
          onClick={onClick}
          className={`relative overflow-hidden border-2 border-dashed rounded-lg transition-all cursor-pointer ${
            isSelected
              ? 'bg-slate-50 border-slate-400 shadow-lg'
              : 'bg-slate-50/50 border-slate-300 hover:border-slate-400 hover:shadow-md'
          }`}
        >
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="hidden sm:flex absolute left-0 top-0 bottom-0 w-10 items-center justify-center cursor-grab active:cursor-grabbing border-r border-slate-300 transition-colors hover:bg-slate-100"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
            </svg>
          </div>

          <div className="pl-5 sm:pl-14 pr-5 py-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="flex-shrink-0 w-8 h-8 rounded-md bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                    {getFieldIcon(field.type)}
                  </div>
                  <span className={`font-bold text-base ${isSelected ? 'text-indigo-700' : 'text-gray-900'}`}>
                    {field.label}
                  </span>
                </div>

                {field.description && (
                  <p className={`text-sm mt-2 ${isSelected ? 'text-gray-600' : 'text-gray-500'}`}>
                    {field.description}
                  </p>
                )}

                <div className="flex items-center space-x-2 mt-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
                    Section Header
                  </span>
                </div>
              </div>

              <div className="flex-shrink-0 ml-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`transition-colors ${isSelected ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-600'}`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Drop Zone for Fields within Section */}
          <div
            ref={setSectionDropRef}
            className={`px-4 pb-4 min-h-[100px] transition-all ${
              isSectionOver ? 'bg-indigo-100/50 border-t-2 border-indigo-400' : 'border-t border-slate-200'
            }`}
          >
            {field.fields && field.fields.length > 0 ? (
              <SortableContext
                items={field.fields.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3 mt-3">
                  <AnimatePresence>
                    {field.fields.map((nestedField, nestedIndex) => {
                      const isNestedSelected =
                        selectedNestedPath != null &&
                        selectedNestedPath.sectionIndex === parentSectionIndex &&
                        selectedNestedPath.fieldIndex === nestedIndex;

                      return (
                        <SortableFieldItem
                          key={nestedField.id}
                          field={nestedField}
                          index={nestedIndex}
                          isSelected={isNestedSelected}
                          onClick={(e) => {
                            e?.stopPropagation();
                            if (onNestedFieldClick && parentSectionIndex !== undefined) {
                              onNestedFieldClick(parentSectionIndex, nestedIndex);
                            }
                          }}
                          onNestedFieldClick={onNestedFieldClick}
                          parentSectionIndex={parentSectionIndex}
                          selectedNestedPath={selectedNestedPath}
                        />
                      );
                    })}
                  </AnimatePresence>
                </div>
              </SortableContext>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <svg className="w-12 h-12 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <p className="text-sm text-slate-500 font-medium">Drop fields here</p>
                <p className="text-xs text-slate-400 mt-1">Drag fields from the palette into this section</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

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
        onClick={(e) => {
          if (parentSectionIndex !== undefined) {
            e.stopPropagation();
          }
          onClick(e);
        }}
        className={`relative overflow-hidden border border-gray-200 rounded-lg transition-all cursor-pointer ${
          isSelected
            ? 'bg-indigo-50 border-indigo-300 shadow-lg'
            : 'bg-white hover:border-gray-300 hover:shadow-md'
        }`}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="hidden sm:flex absolute left-0 top-0 bottom-0 w-10 items-center justify-center cursor-grab active:cursor-grabbing border-r border-gray-200 transition-colors hover:bg-gray-50"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
          </svg>
        </div>

          <div className="pl-5 sm:pl-14 pr-5 py-3 sm:py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
                <div
                  className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: bgColor }}
                >
                  {getFieldIcon(field.type)}
                </div>
                <span className={`font-semibold text-sm leading-tight break-words ${isSelected ? 'text-indigo-700' : 'text-gray-900'}`}>
                  {field.label}
                </span>
                {field.required && (
                  <span className="flex-shrink-0 text-red-500 text-sm font-medium">*</span>
                )}
              </div>

              <div className="flex items-center flex-wrap gap-2 mt-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                  {field.type}
                </span>
                {field.validation?.min !== undefined && (
                  <span className="text-xs text-gray-500">Min: {field.validation.min}</span>
                )}
                {field.validation?.max !== undefined && (
                  <span className="text-xs text-gray-500">Max: {field.validation.max}</span>
                )}
              </div>

              {field.helpText && (
                <p className={`text-xs sm:text-sm mt-2 line-clamp-2 ${isSelected ? 'text-gray-700' : 'text-gray-500'}`}>
                  {field.helpText}
                </p>
              )}
            </div>

            <div className="flex-shrink-0 ml-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`transition-colors ${isSelected ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-600'}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </motion.div>
            </div>
          </div>
        </div>
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
  onAddFieldToSection,
}: FormBuilderCanvasProps) {
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null);
  const [selectedNestedPath, setSelectedNestedPath] = useState<FieldPath | null>(null);

  const { setNodeRef: setCanvasRef, isOver } = useDroppable({
    id: 'canvas-drop-zone',
  });

  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

  const handleNestedFieldClick = (sectionIndex: number, fieldIndex: number) => {
    setSelectedFieldIndex(null);
    setSelectedNestedPath({ sectionIndex, fieldIndex });
  };

  const handleTopLevelFieldClick = (index: number) => {
    setSelectedNestedPath(null);
    setSelectedFieldIndex(index);
  };

  const getSelectedField = (): FormField | null => {
    if (selectedNestedPath !== null) {
      const section = fields[selectedNestedPath.sectionIndex];
      if (section?.fields && section.fields[selectedNestedPath.fieldIndex]) {
        return section.fields[selectedNestedPath.fieldIndex];
      }
    } else if (selectedFieldIndex !== null) {
      return fields[selectedFieldIndex];
    }
    return null;
  };

  const handleUpdateSelectedField = (updatedField: FormField) => {
    if (selectedNestedPath !== null) {
      // Update nested field
      const section = { ...fields[selectedNestedPath.sectionIndex] };
      if (section.fields) {
        const updatedFields = [...section.fields];
        updatedFields[selectedNestedPath.fieldIndex] = updatedField;
        section.fields = updatedFields;
        onUpdateField(selectedNestedPath.sectionIndex, section);
      }
    } else if (selectedFieldIndex !== null) {
      // Update top-level field
      onUpdateField(selectedFieldIndex, updatedField);
    }
  };

  const handleDeleteSelectedField = () => {
    if (selectedNestedPath !== null) {
      // Delete nested field
      const section = { ...fields[selectedNestedPath.sectionIndex] };
      if (section.fields) {
        const updatedFields = [...section.fields];
        updatedFields.splice(selectedNestedPath.fieldIndex, 1);
        section.fields = updatedFields;
        onUpdateField(selectedNestedPath.sectionIndex, section);
      }
      setSelectedNestedPath(null);
    } else if (selectedFieldIndex !== null) {
      // Delete top-level field
      onDeleteField(selectedFieldIndex);
      setSelectedFieldIndex(null);
    }
  };

  const handleCloseEditor = () => {
    setSelectedFieldIndex(null);
    setSelectedNestedPath(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
      {/* Canvas Area */}
      <div className="lg:col-span-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
        >
          <div className="bg-indigo-500 px-4 sm:px-6 py-3 sm:py-4 border-b border-indigo-600">
            <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Canvas
            </h3>
            <p className="text-indigo-100 text-xs sm:text-sm mt-1">
              {sortedFields.length} field{sortedFields.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div
            ref={setCanvasRef}
            className={`p-4 sm:p-6 min-h-[500px] transition-all ${
              isOver ? 'bg-indigo-50/50' : 'bg-gray-50/30'
            }`}
          >
            {sortedFields.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-[400px] text-center"
              >
                <motion.div
                  className="w-24 h-24 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 border border-indigo-200"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <svg className="w-12 h-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </motion.div>
                <h4 className="text-2xl font-semibold text-gray-900 mb-2">
                  Drop fields here
                </h4>
                <p className="text-gray-500 max-w-sm">
                  Drag components from the palette to build your form
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
                          index={actualIndex}
                          isSelected={selectedFieldIndex === actualIndex && selectedNestedPath === null}
                          onClick={() => handleTopLevelFieldClick(actualIndex)}
                          onAddFieldToSection={onAddFieldToSection}
                          onNestedFieldClick={handleNestedFieldClick}
                          parentSectionIndex={field.type === 'section' ? actualIndex : undefined}
                          selectedNestedPath={selectedNestedPath}
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
      <div className="lg:col-span-2">
        <AnimatePresence mode="wait">
          {getSelectedField() ? (
            <motion.div
              key="editor"
              initial={{ opacity: 0, x: 20, rotate: 2 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              exit={{ opacity: 0, x: 20, rotate: -2 }}
            >
              <FieldEditor
                field={getSelectedField()!}
                onUpdate={handleUpdateSelectedField}
                onDelete={handleDeleteSelectedField}
                onClose={handleCloseEditor}
              />
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm"
            >
              <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4 border border-gray-300">
                <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <p className="text-gray-900 font-semibold text-lg mb-1">No selection</p>
              <p className="text-gray-500 text-sm">Click a field to edit its properties</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

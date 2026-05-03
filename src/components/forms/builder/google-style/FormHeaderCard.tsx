'use client';

import React from 'react';

interface FormHeaderCardProps {
  title: string;
  description: string;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
}

export function FormHeaderCard({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
}: FormHeaderCardProps) {
  return (
    <div
      className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200"
      style={{ borderTop: '10px solid #673ab7' }}
    >
      <div className="p-6">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Form title"
          className="w-full text-3xl font-medium text-gray-800 border-b-2 border-transparent focus:border-blue-400 outline-none pb-1 bg-transparent"
        />

        {/* Description */}
        <input
          type="text"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Form description"
          className="w-full text-sm text-gray-600 mt-3 border-b border-transparent focus:border-blue-400 outline-none pb-1 bg-transparent"
        />
      </div>
    </div>
  );
}

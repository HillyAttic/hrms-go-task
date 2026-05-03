'use client';

import React, { useState } from 'react';
import { MoreVertical, Copy, Trash2, Copy as DocumentDuplicateIcon } from 'lucide-react';

interface QuestionMenuProps {
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleRequired: () => void;
  isRequired: boolean;
}

export function QuestionMenu({
  onDuplicate,
  onDelete,
  onToggleRequired,
  isRequired,
}: QuestionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = () => {
    if (confirm('Delete this question?')) {
      onDelete();
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          p-2 text-gray-600 hover:text-purple-600
          hover:bg-purple-50 rounded-full transition-colors
        "
        title="More options"
      >
        <MoreVertical size={20} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-10 bg-white shadow-lg rounded-md border border-gray-200 py-2 z-[9999] min-w-[160px]">
          <button
            onClick={() => {
              onDuplicate();
              setIsOpen(false);
            }}
            className="
              w-full px-4 py-2 text-left text-sm text-gray-700
              hover:bg-purple-50 hover:text-purple-900
              transition-colors flex items-center space-x-2
            "
          >
            <Copy className="w-4 h-4" />
            <span>Duplicate</span>
          </button>

          <button
            onClick={onToggleRequired}
            className="
              w-full px-4 py-2 text-left text-sm text-gray-700
              hover:bg-purple-50 hover:text-purple-900
              transition-colors flex items-center justify-between
            "
          >
            <span>Required</span>
            <input
              type="checkbox"
              checked={isRequired}
              readOnly
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
          </button>

          <div className="border-t border-gray-200 my-1" />

          <button
            onClick={handleDelete}
            className="
              w-full px-4 py-2 text-left text-sm text-red-600
              hover:bg-red-50 hover:text-red-900
              transition-colors flex items-center space-x-2
            "
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      )}

      {/* Backdrop to close menu */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

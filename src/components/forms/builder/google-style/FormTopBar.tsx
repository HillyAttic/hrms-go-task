'use client';

import React from 'react';
import { Eye, Settings, Share2, ArrowLeft } from 'lucide-react';

interface FormTopBarProps {
  title: string;
  isSaving: boolean;
  lastSaved: Date | null;
  isPublished?: boolean;
  onSettingsClick: () => void;
  onPreviewClick: () => void;
  onPublishClick?: () => void;
  onClose: () => void;
}

export function FormTopBar({
  title,
  isSaving,
  lastSaved,
  isPublished = false,
  onSettingsClick,
  onPreviewClick,
  onPublishClick,
  onClose,
}: FormTopBarProps) {
  const formatLastSaved = (date: Date | null) => {
    if (!date) return 'Saving...';
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="bg-white shadow-sm sticky top-0 z-30">
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2">
        {/* Back Button */}
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors flex-shrink-0"
          title="Back to forms"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Logo and Title */}
        <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial sm:mr-2">
          <svg viewBox="0 0 48 48" className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
            <path fill="#673ab7" d="M29 8H11a3 3 0 00-3 3v26a3 3 0 003 3h26a3 3 0 003-3V19z"/>
            <path fill="#b39ddb" d="M29 8v8a3 3 0 003 3h8z"/>
            <rect x="15" y="22" width="18" height="2" rx="1" fill="white"/>
            <rect x="15" y="27" width="18" height="2" rx="1" fill="white"/>
            <rect x="15" y="32" width="10" height="2" rx="1" fill="white"/>
          </svg>
          <div className="flex flex-col min-w-0">
            <div className="font-medium text-gray-800 text-sm sm:text-base leading-tight truncate">
              {title || 'Untitled form'}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs text-gray-400 truncate">
                {isSaving ? 'Saving...' : `Saved ${formatLastSaved(lastSaved)}`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 hidden sm:block" />

        {/* Action buttons */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <button
            onClick={onPreviewClick}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
            title="Preview"
          >
            <Eye size={18} />
          </button>

          <button
            onClick={onSettingsClick}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
            title="Settings"
          >
            <Settings size={18} />
          </button>

          {onPublishClick && (
            <button
              onClick={onPublishClick}
              className={`px-2.5 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                isPublished
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
              title={isPublished ? 'Form published' : 'Publish form'}
            >
              <Share2 size={14} className="sm:w-4 sm:h-4" />
              <span>{isPublished ? 'Published' : 'Publish'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

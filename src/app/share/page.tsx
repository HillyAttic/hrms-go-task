"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SharePage() {
  const router = useRouter();
  const [shareData, setShareData] = useState<{
    title?: string;
    text?: string;
    url?: string;
    files?: File[];
  } | null>(null);

  useEffect(() => {
    // Handle share target data
    const handleShare = async () => {
      if (typeof window === 'undefined') return;

      // Check if this is a share target request
      const urlParams = new URLSearchParams(window.location.search);
      const title = urlParams.get('title');
      const text = urlParams.get('text');
      const url = urlParams.get('url');

      if (title || text || url) {
        setShareData({ title: title || undefined, text: text || undefined, url: url || undefined });
      }
    };

    handleShare();
  }, []);

  const handleCreateTask = () => {
    // Navigate to task creation with shared data
    const params = new URLSearchParams();
    if (shareData?.title) params.set('title', shareData.title);
    if (shareData?.text) params.set('description', shareData.text);
    if (shareData?.url) params.set('url', shareData.url);
    
    router.push(`/tasks/new?${params.toString()}`);
  };

  const handleCreateNote = () => {
    // Navigate to notes with shared data
    const params = new URLSearchParams();
    if (shareData?.title) params.set('title', shareData.title);
    if (shareData?.text) params.set('content', shareData.text);
    
    router.push(`/notes/new?${params.toString()}`);
  };

  if (!shareData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-dark-4 dark:text-dark-6">Processing shared content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full bg-card border border-stroke dark:border-stroke-dark rounded-lg shadow-hard p-6">
        <h1 className="text-2xl font-bold text-dark dark:text-white mb-4">
          Shared Content
        </h1>

        <div className="space-y-4 mb-6">
          {shareData.title && (
            <div>
              <label className="text-sm font-medium text-dark-4 dark:text-dark-6">Title</label>
              <p className="text-dark dark:text-white mt-1">{shareData.title}</p>
            </div>
          )}

          {shareData.text && (
            <div>
              <label className="text-sm font-medium text-dark-4 dark:text-dark-6">Content</label>
              <p className="text-dark dark:text-white mt-1">{shareData.text}</p>
            </div>
          )}

          {shareData.url && (
            <div>
              <label className="text-sm font-medium text-dark-4 dark:text-dark-6">URL</label>
              <a 
                href={shareData.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-foreground hover:underline mt-1 block"
              >
                {shareData.url}
              </a>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-dark-4 dark:text-dark-6">
            What would you like to do?
          </h2>

          <button
            onClick={handleCreateTask}
            className="w-full flex items-center justify-between p-4 bg-foreground text-background rounded-md border-2 border-border hover:bg-foreground/90 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Create Task</span>
            </div>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={handleCreateNote}
            className="w-full flex items-center justify-between p-4 bg-card border border-stroke dark:border-stroke-dark rounded-lg hover:bg-gray-2 transition-colors"
          >
            <div className="flex items-center space-x-3 text-dark dark:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Create Note</span>
            </div>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={() => router.push('/dashboard')}
            className="w-full text-center text-dark-4 dark:text-dark-6 hover:text-dark dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

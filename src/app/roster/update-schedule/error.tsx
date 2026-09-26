'use client';

import { useEffect } from 'react';

export default function UpdateScheduleError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[UpdateSchedule] Page error:', error);
    }, [error]);

    const handleClearCacheAndReload = async () => {
        try {
            // Clear all caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
                console.log('[Recovery] All caches cleared');
            }

            // Unregister all service workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(reg => reg.unregister()));
                console.log('[Recovery] All service workers unregistered');
            }

            // Force reload from server
            window.location.reload();
        } catch (e) {
            console.error('[Recovery] Error during cache clear:', e);
            window.location.reload();
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 max-w-md w-full text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                </div>

                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Something went wrong
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    The schedule page encountered an error. This might be due to cached data from a previous version.
                </p>

                <div className="space-y-3">
                    <button
                        onClick={reset}
                        className="w-full px-4 py-2.5 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors font-medium"
                    >
                        Try Again
                    </button>
                    <button
                        onClick={handleClearCacheAndReload}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                    >
                        Clear Cache & Reload
                    </button>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
                    If the problem persists, try clearing your browser data or opening in a new tab.
                </p>
            </div>
        </div>
    );
}

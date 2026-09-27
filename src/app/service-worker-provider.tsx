"use client";

import { useEffect, useState } from 'react';
import { useServiceWorker } from '@/hooks/use-service-worker';
import { useResponsive } from '@/hooks/use-responsive';
import { TouchOptimizedButton } from '@/components/ui/touch-optimized-input';
import { setupBFCacheHandling } from '@/lib/bfcache-helper';
import { InstallPrompt } from '@/components/pwa/install-prompt';
import { NotificationPermissionPrompt } from '@/components/pwa/notification-permission-prompt';

interface ServiceWorkerProviderProps {
  children: React.ReactNode;
}

export function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  const { 
    isSupported, 
    isRegistered, 
    isOnline, 
    updateAvailable, 
    updateServiceWorker,
    offlineQueueLength 
  } = useServiceWorker();
  
  const { device, isTouchDevice } = useResponsive();
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [showOfflineNotification, setShowOfflineNotification] = useState(false);

  // Setup back/forward cache handling
  useEffect(() => {
    setupBFCacheHandling();
  }, []);

  // Show update notification when available
  useEffect(() => {
    if (updateAvailable) {
      setShowUpdateNotification(true);
    }
  }, [updateAvailable]);

  // Show offline notification when going offline
  useEffect(() => {
    if (!isOnline) {
      setShowOfflineNotification(true);
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setShowOfflineNotification(false);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowOfflineNotification(false);
    }
  }, [isOnline]);

  const handleUpdate = async () => {
    setShowUpdateNotification(false);
    await updateServiceWorker();
  };

  const dismissUpdateNotification = () => {
    setShowUpdateNotification(false);
  };

  const dismissOfflineNotification = () => {
    setShowOfflineNotification(false);
  };

  return (
    <>
      {children}
      
      {/* Install Prompt */}
      <InstallPrompt />
      
      {/* Update Available Notification */}
      {showUpdateNotification && (
        <div className="fixed top-4 right-4 z-[9999] max-w-sm">
          <div className="bg-card border border-stroke dark:border-stroke-dark rounded-lg shadow-hard p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg 
                  className="w-6 h-6 text-blue-500" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-dark dark:text-white">
                  Update Available
                </h4>
                <p className="text-sm text-dark-4 dark:text-dark-6 mt-1">
                  A new version of the app is available. Update now for the latest features and improvements.
                </p>
                <div className="flex space-x-2 mt-3">
                  <TouchOptimizedButton
                    variant="primary"
                    size="sm"
                    touchTargetSize={isTouchDevice ? 'md' : 'sm'}
                    onClick={handleUpdate}
                  >
                    Update Now
                  </TouchOptimizedButton>
                  <TouchOptimizedButton
                    variant="ghost"
                    size="sm"
                    touchTargetSize={isTouchDevice ? 'md' : 'sm'}
                    onClick={dismissUpdateNotification}
                  >
                    Later
                  </TouchOptimizedButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offline Notification */}
      {showOfflineNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] max-w-sm">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg shadow-hard p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg 
                  className="w-6 h-6 text-yellow-600 dark:text-yellow-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  You're Offline
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  {offlineQueueLength > 0 
                    ? `${offlineQueueLength} action${offlineQueueLength !== 1 ? 's' : ''} queued for when you're back online.`
                    : 'Some features may be limited until you reconnect.'
                  }
                </p>
              </div>
              <TouchOptimizedButton
                variant="ghost"
                size="sm"
                touchTargetSize="sm"
                onClick={dismissOfflineNotification}
                className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </TouchOptimizedButton>
            </div>
          </div>
        </div>
      )}

      {/* Connection Status Indicator (Mobile) */}
      {device.type === 'mobile' && !isOnline && (
        <div className="fixed bottom-4 left-4 z-50">
          <div className="bg-red-500 text-white px-3 py-2 rounded-full text-xs font-medium flex items-center space-x-2">
            <div className="w-2 h-2 bg-card rounded-full animate-pulse" />
            <span>Offline</span>
          </div>
        </div>
      )}

      {/* Offline Queue Status (Development) */}
      {process.env.NODE_ENV === 'development' && offlineQueueLength > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-blue-500 text-white px-3 py-2 rounded-full text-xs font-medium">
            Queue: {offlineQueueLength}
          </div>
        </div>
      )}
    </>
  );
}
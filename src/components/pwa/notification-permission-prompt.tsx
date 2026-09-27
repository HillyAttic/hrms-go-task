"use client";

import { useState, useEffect } from 'react';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { TouchOptimizedButton } from '@/components/ui/touch-optimized-input';
import { useResponsive } from '@/hooks/use-responsive';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { checkNotificationSupport } from '@/lib/firebase-messaging';

export function NotificationPermissionPrompt() {
  const { user: currentUser } = useEnhancedAuth();
  const { isSupported, permission, isLoading, requestPermission, isEnabled } = usePushNotifications();
  const { isTouchDevice } = useResponsive();
  const [isVisible, setIsVisible] = useState(true);
  const [notificationInfo, setNotificationInfo] = useState<ReturnType<typeof checkNotificationSupport> | null>(null);

  useEffect(() => {
    setNotificationInfo(checkNotificationSupport());
  }, []);

  // Don't show if:
  // - User is not signed in (CRITICAL FIX)
  // - Not supported
  // - Already granted or denied
  // - User dismissed
  // - iOS device not in PWA mode
  if (!currentUser || !isSupported || permission === 'granted' || permission === 'denied' || !isVisible) {
    return null;
  }

  // iOS requires PWA installation
  if (notificationInfo?.isIOS && notificationInfo?.requiresPWA && !notificationInfo?.isPWA) {
    return null; // IOSPWAPrompt will handle this
  }

  const handleEnable = async () => {
    const success = await requestPermission();
    if (success) {
      setIsVisible(false);
    }
  };

  return (
    <div className="fixed top-20 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-[9998]">
      <div className="bg-card border border-stroke dark:border-stroke-dark rounded-lg shadow-hard-2 p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg 
              className="w-10 h-10 text-foreground" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-dark dark:text-white">
              Enable Push Notifications
            </h4>
            <p className="text-sm text-dark-4 dark:text-dark-6 mt-1">
              Get instant updates about tasks, attendance, and team activities even when the app is closed.
              {notificationInfo?.isIOS && notificationInfo?.isPWA && (
                <span className="block mt-1 text-xs text-foreground">
                  ✓ Running as PWA - notifications supported
                </span>
              )}
            </p>
            <div className="flex space-x-2 mt-3">
              <TouchOptimizedButton
                variant="primary"
                size="sm"
                touchTargetSize={isTouchDevice ? 'md' : 'sm'}
                onClick={handleEnable}
                disabled={isLoading}
              >
                {isLoading ? 'Enabling...' : 'Enable Notifications'}
              </TouchOptimizedButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

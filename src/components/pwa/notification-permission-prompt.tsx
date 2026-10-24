"use client";

import { useState, useEffect } from 'react';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { Button } from '@/components/ui/button';
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
      <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/85 p-4 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0B1430]/90">
        <div className="flex items-start gap-3">
          {/* Brand gradient badge — matches the dashboard/header glass cards */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0447FD] to-[#7F1BFF] shadow-lg shadow-indigo-500/25">
            <svg
              className="h-5 w-5 text-white"
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
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Enable Push Notifications
            </h4>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Get instant updates about tasks, attendance, and team activities even when the app is closed.
              {notificationInfo?.isIOS && notificationInfo?.isPWA && (
                <span className="mt-1 block text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  ✓ Running as PWA - notifications supported
                </span>
              )}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                onClick={handleEnable}
                loading={isLoading}
                size={isTouchDevice ? 'lg' : 'default'}
                className="rounded-xl text-white transition-all hover:-translate-y-0.5"
              >
                {isLoading ? 'Enabling...' : 'Enable Notifications'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

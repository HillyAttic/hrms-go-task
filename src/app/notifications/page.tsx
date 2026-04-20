"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, Check, X } from "lucide-react";
import { useEnhancedAuth } from "@/contexts/enhanced-auth.context";
import { authenticatedFetch } from "@/lib/api-client";
import { useNotifications } from "@/hooks/use-notifications";
import {
  requestNotificationPermission,
  requestNotificationPermissionMobile,
  saveFCMToken,
  onForegroundMessage,
  deleteFCMToken,
  isMobileDevice,
  isIOSDevice,
  isStandalonePWA,
  getIOSVersion
} from "@/lib/firebase-messaging";
import { toast } from "react-toastify";

interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: any;
  data?: {
    taskId?: string;
    url?: string;
    type?: string;
  };
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isAdmin } = useEnhancedAuth();
  const { notifications, loading, markAsRead: markNotificationRead, refetch } = useNotifications();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  // Check notification permission and FCM token on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // Check if user already has an FCM token
    const checkExistingToken = async () => {
      if (!user) return;

      try {
        const response = await authenticatedFetch(`/api/notifications/check-token?userId=${encodeURIComponent(user.uid)}`);

        // 200 = token exists, 404 = no token (both are valid responses)
        if (response.ok) {
          const data = await response.json();
          if (data.hasToken && data.exists) {
            setFcmToken('exists'); // Set a placeholder to indicate token exists
            console.log('Existing FCM token found');
          }
        } else if (response.status === 404) {
          // No token found - this is expected for users who haven't enabled notifications
          console.log('No FCM token found - user needs to enable notifications');
        } else {
          // Other errors
          console.error('Error checking token:', response.status);
        }
      } catch (error) {
        console.error('Error checking existing token:', error);
      }
    };

    checkExistingToken();
  }, [user]);

  // Request notification permission — FAST, no redundant checks
  const handleEnableNotifications = async () => {
    if (!user) {
      toast.error("Please log in to enable notifications");
      return;
    }

    // Show loading state immediately so user sees instant feedback
    setIsEnabling(true);

    try {
      const isMobile = isMobileDevice();
      const isIOS = isIOSDevice();

      // iOS-specific check (fast, no async work)
      if (isIOS && !isStandalonePWA()) {
        toast.error("On iOS, please add this app to your home screen first", { autoClose: 8000 });
        setIsEnabling(false);
        return;
      }

      if (isIOS) {
        const iosVersion = getIOSVersion();
        if (iosVersion && iosVersion < 16.4) {
          toast.error('Push notifications require iOS 16.4 or later');
          setIsEnabling(false);
          return;
        }
      }

      // Request permission + get token in one shot (the lib handles everything)
      const token = isMobile
        ? await requestNotificationPermissionMobile()
        : await requestNotificationPermission();

      if (token) {
        // Update UI immediately while save happens in background
        setFcmToken(token);
        setNotificationPermission('granted');

        // Save token to server (don't block UI on this)
        saveFCMToken(user.uid, token).then(saved => {
          if (saved) {
            toast.success("Notifications enabled!");
          } else {
            toast.error("Failed to save notification token");
          }
        });
      } else {
        toast.error("Failed to get notification permission");
      }
    } catch (error: any) {
      console.error("Error enabling notifications:", error);
      toast.error(error.message || "Failed to enable notifications", { autoClose: 8000 });
    } finally {
      setIsEnabling(false);
    }
  };

  // Disable notifications
  const handleDisableNotifications = async () => {
    if (!user) return;

    try {
      await deleteFCMToken(user.uid);
      setFcmToken(null);
      toast.success("Notifications disabled");
    } catch (error) {
      console.error("Error disabling notifications:", error);
      toast.error("Failed to disable notifications");
    }
  };

  // Clear cache and reload
  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      // Delete FCM token first if user is logged in
      if (user) {
        try {
          await deleteFCMToken(user.uid);
          console.log('[FCM] Token deleted');
        } catch (error) {
          console.error('[FCM] Error deleting token:', error);
        }
      }

      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('[Cache] Cleared all caches');
      }

      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
        console.log('[SW] Unregistered all service workers');
      }

      toast.success("Cache cleared! Reloading page...", { autoClose: 2000 });

      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast.error("Failed to clear cache");
      setIsClearing(false);
    }
  };

  // Listen for foreground messages
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onForegroundMessage((payload) => {
      console.log("[Foreground] Message received:", payload);

      // Refresh notifications list to show the new notification
      refetch();

      // DO NOT show toast here - service worker already displayed the notification
      // This prevents duplicate notifications
    });

    return unsubscribe;
  }, [user, refetch]);

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    markNotificationRead(notification.id);

    if (notification.data?.url) {
      // Set flag to prevent AuthWrapper from interfering
      sessionStorage.setItem('notificationNavigation', 'true');

      // Use router.push instead of window.location.href to avoid full page reload
      router.push(notification.data.url);

      // Clear flag after navigation completes
      setTimeout(() => {
        sessionStorage.removeItem('notificationNavigation');
      }, 2000);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 sm:p-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="flex justify-center">
            <div className="p-3 sm:p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
              <Bell className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Notifications
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
            Please log in to view notifications
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-20 sm:pb-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Notifications
        </h1>
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
          Manage your push notifications and view recent alerts
        </p>
      </div>

      {/* Notification Permission Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className={`p-2 sm:p-3 rounded-full flex-shrink-0 ${notificationPermission === 'granted'
              ? 'bg-green-100 dark:bg-green-900'
              : 'bg-gray-100 dark:bg-gray-700'
              }`}>
              {notificationPermission === 'granted' ? (
                <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
              ) : (
                <BellOff className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                Push Notifications
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {notificationPermission === 'granted'
                  ? 'Notifications are enabled'
                  : 'Enable notifications to receive task updates'}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {notificationPermission === 'granted' && fcmToken ? (
              <button
                disabled
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-green-600 text-white text-sm sm:text-base rounded-lg font-medium cursor-not-allowed opacity-90 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Enabled
              </button>
            ) : (
              <button
                onClick={handleEnableNotifications}
                disabled={isEnabling}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-blue-600 text-white text-sm sm:text-base rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2"
              >
                {isEnabling ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Enabling...
                  </>
                ) : (
                  'Enable Notifications'
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Clear Cache Button - Admin only */}
      {isAdmin && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4 sm:mb-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                Notifications Not Working?
              </h4>
              <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-300 mb-3">
                If you're seeing errors or notifications aren't working after an update, try clearing your browser cache and reloading the page.
              </p>
              <button
                onClick={handleClearCache}
                disabled={isClearing}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClearing ? 'Clearing Cache...' : 'Clear Cache & Reload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS PWA Info Card */}
      {isIOSDevice() && !isStandalonePWA() && notificationPermission !== 'granted' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs sm:text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                iOS Users: Add to Home Screen Required
              </h4>
              <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-300 mb-2">
                To enable push notifications on iOS, you need to add this app to your home screen first:
              </p>
              <ol className="text-xs sm:text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
                <li>Tap the Share button in Safari</li>
                <li>Scroll down and tap "Add to Home Screen"</li>
                <li>Open the app from your home screen</li>
                <li>Return here to enable notifications</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Info Card */}
      {isMobileDevice() && notificationPermission !== 'granted' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs sm:text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                Mobile Device Detected
              </h4>
              <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-300">
                Make sure notifications are enabled in your device settings and browser settings for the best experience.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
            Recent Notifications
          </h2>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading ? (
            <div className="p-6 sm:p-8 text-center text-gray-500 dark:text-gray-400 text-sm sm:text-base">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-gray-500 dark:text-gray-400 text-sm sm:text-base">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <span className="flex-shrink-0 relative flex items-center justify-center">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75 animate-ping"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600 shadow-lg shadow-blue-500/50"></span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                      {notification.body}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400">
                      {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : 'Just now'}
                    </p>
                  </div>

                  {!notification.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markNotificationRead(notification.id);
                      }}
                      className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from 'react';
import { getFCMToken, onForegroundMessage, saveFCMToken, deleteFCMToken } from '@/lib/firebase-messaging';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';

export function usePushNotifications() {
  const { user: currentUser } = useEnhancedAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [token, setToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const supported = 
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window;
    
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Request notification permission and get FCM token
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return false;
    }

    if (!currentUser?.uid) {
      setError('User not authenticated');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        setError('Notification permission denied');
        return false;
      }

      // Get FCM token
      const fcmToken = await getFCMToken();
      
      if (!fcmToken) {
        setError('Failed to get FCM token');
        return false;
      }

      setToken(fcmToken);

      // Save token to Firestore
      await saveFCMToken(currentUser.uid, fcmToken);

      console.log('[Push] Notifications enabled successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enable notifications';
      setError(errorMessage);
      console.error('[Push] Error enabling notifications:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, currentUser]);

  // Disable notifications
  const disableNotifications = useCallback(async () => {
    if (!currentUser?.uid) return false;

    try {
      await deleteFCMToken(currentUser.uid);
      setToken(null);
      console.log('[Push] Notifications disabled');
      return true;
    } catch (err) {
      console.error('[Push] Error disabling notifications:', err);
      return false;
    }
  }, [currentUser]);

  // Listen for foreground messages
  useEffect(() => {
    if (!isSupported || permission !== 'granted') return;

    const unsubscribe = onForegroundMessage((payload) => {
      console.log('[Push] Foreground message:', payload);

      // Show notification when app is in foreground
      const { notification, data } = payload;
      
      if (notification) {
        const notificationTitle = notification.title || 'EdVentureHub Dashboard';
        const notificationOptions = {
          body: notification.body || '',
          icon: notification.icon || '/images/logo/logo-icon.svg',
          badge: '/images/logo/logo-icon.svg',
          tag: data?.notificationId || 'edventurehub-' + Date.now(),
          data: {
            url: data?.url || '/notifications',
            ...data,
          },
          requireInteraction: true,
        };

        // Show browser notification
        if (Notification.permission === 'granted') {
          new Notification(notificationTitle, notificationOptions);
        }
      }
    });

    return unsubscribe;
  }, [isSupported, permission]);

  // Auto-request permission if user is logged in and hasn't decided yet
  useEffect(() => {
    if (currentUser?.uid && isSupported && permission === 'default') {
      // Don't auto-request, let user trigger it
      console.log('[Push] Notifications available, waiting for user action');
    }
  }, [currentUser, isSupported, permission]);

  // Setup token refresh listener when user is authenticated and has granted permission
  useEffect(() => {
    if (!currentUser?.uid || permission !== 'granted') return;

    console.log('[Push] Setting up token refresh listener');
    const { setupTokenRefreshListener } = require('@/lib/firebase-messaging');
    
    const cleanup = setupTokenRefreshListener(currentUser.uid, (newToken: string) => {
      console.log('[Push] Token refreshed:', newToken.substring(0, 20) + '...');
      setToken(newToken);
    });

    return cleanup;
  }, [currentUser, permission]);

  return {
    isSupported,
    permission,
    token,
    isLoading,
    error,
    requestPermission,
    disableNotifications,
    isEnabled: permission === 'granted' && !!token,
  };
}

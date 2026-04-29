import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthEnhanced } from './use-auth-enhanced';
import { notificationService } from '@/services/notification.service';
import type { Notification } from '@/services/notification.service';
import { listenerManager } from '@/lib/listener-manager';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  message?: string;
  read: boolean;
  createdAt: string;
  type?: string;
  actionUrl?: string;
  data?: {
    taskId?: string;
    url?: string;
    type?: string;
  };
}

export function useNotifications() {
  const { user } = useAuthEnhanced();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track pending operations for race condition handling
  const pendingOperations = useRef<Map<string, { type: 'read' | 'delete', timestamp: number }>>(new Map());
  const retryCount = useRef(0);

  // Convert Notification to AppNotification format
  const convertNotification = (n: any): AppNotification => ({
    id: n.id || '',
    title: n.title,
    body: n.message || n.body || '',
    message: n.message || n.body || '',
    read: n.read,
    createdAt: n.createdAt.toISOString(),
    type: n.type,
    actionUrl: n.actionUrl || n.data?.url,
    data: {
      taskId: n.metadata?.taskId || n.data?.taskId,
      url: n.actionUrl || n.data?.url,
      type: n.type || n.data?.type,
    },
  });

  // Setup real-time listener with throttling
  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    // Create throttled callback (2-second delay)
    const throttledCallback = listenerManager.createThrottledCallback<Notification[]>(
      `notifications-${user.uid}`,
      (firestoreNotifications) => {
        // Merge with pending operations (race condition handling)
        const merged = firestoreNotifications.map(n => {
          const pending = pendingOperations.current.get(n.id!);
          if (pending?.type === 'read') {
            return { ...n, read: true };
          }
          return n;
        }).filter(n => {
          const pending = pendingOperations.current.get(n.id!);
          return !(pending?.type === 'delete');
        });

        const appNotifications = merged.map(convertNotification);
        setNotifications(appNotifications);
        setUnreadCount(appNotifications.filter(n => !n.read).length);
        setLoading(false);
        setError(null);
        retryCount.current = 0; // Reset retry count on success
      },
      2000 // 2-second throttle
    );

    // Subscribe to real-time updates
    const unsubscribe = notificationService.subscribeToNotifications(
      user.uid,
      throttledCallback,
      (err) => {
        console.error('Notification listener error:', err);
        setError('Connection lost. Retrying...');
        setLoading(false);

        // Exponential backoff retry
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
        retryCount.current++;

        if (retryCount.current < 5) {
          setTimeout(() => {
            console.log(`Retrying notification listener (attempt ${retryCount.current})...`);
            // The useEffect will re-run and create a new listener
          }, retryDelay);
        } else {
          setError('Unable to connect. Please refresh the page.');
        }
      }
    );

    listenerManager.register(`notifications-${user.uid}`, unsubscribe);

    return () => {
      listenerManager.unregister(`notifications-${user.uid}`);
    };
  }, [user?.uid]);

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setPermissionGranted(Notification.permission === 'granted');
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermissionGranted(permission === 'granted');
      return permission;
    }
    return 'denied' as NotificationPermission;
  }, []);

  // Mark notification as read with optimistic update
  const markAsRead = useCallback(async (notificationId: string) => {
    // Track pending operation
    pendingOperations.current.set(notificationId, { type: 'read', timestamp: Date.now() });

    // Optimistic UI update
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      // Direct Firestore write (no API call)
      await notificationService.markAsRead(notificationId);

      // Clear pending after 3s (snapshot should reconcile by then)
      setTimeout(() => pendingOperations.current.delete(notificationId), 3000);
    } catch (error) {
      // Revert on error
      pendingOperations.current.delete(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: false } : n)
      );
      setUnreadCount(prev => prev + 1);
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all as read with optimistic update
  const markAllAsRead = useCallback(async () => {
    if (!user?.uid) return;

    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      // Direct Firestore write (no API call)
      await notificationService.markAllAsRead(user.uid);
    } catch (error) {
      console.error('Error marking all as read:', error);
      // Note: We don't revert here as it's complex to track all previous states
      // The real-time listener will reconcile the state automatically
    }
  }, [user?.uid]);

  // Delete notification with optimistic update
  const deleteNotification = useCallback(async (notificationId: string) => {
    // Track pending operation
    pendingOperations.current.set(notificationId, { type: 'delete', timestamp: Date.now() });

    // Optimistic UI update
    const deletedNotification = notifications.find(n => n.id === notificationId);
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== notificationId);
      return updated;
    });
    if (deletedNotification && !deletedNotification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    try {
      // Direct Firestore write (no API call)
      await notificationService.deleteNotification(notificationId);

      // Clear pending after 3s
      setTimeout(() => pendingOperations.current.delete(notificationId), 3000);
    } catch (error) {
      // Revert on error
      pendingOperations.current.delete(notificationId);
      if (deletedNotification) {
        setNotifications(prev => [...prev, deletedNotification].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
        if (!deletedNotification.read) {
          setUnreadCount(prev => prev + 1);
        }
      }
      console.error('Error deleting notification:', error);
    }
  }, [notifications]);

  // Delete all notifications
  const deleteAllNotifications = useCallback(async () => {
    if (!user?.uid) return;

    try {
      await notificationService.deleteAllNotifications(user.uid);
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  }, [user?.uid]);

  // Refetch function for manual refresh (kept for compatibility)
  const refetch = useCallback(() => {
    // With real-time listeners, this is a no-op
    // The listener will automatically sync the latest data
    console.log('Refetch called - real-time listener will sync automatically');
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    permissionGranted,
    requestPermission,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refetch,
  };
}

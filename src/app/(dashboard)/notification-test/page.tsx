"use client";

import { useState } from 'react';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';

export default function NotificationTestPage() {
  const { user: currentUser } = useEnhancedAuth();
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const checkSetup = async () => {
    setLoading(true);
    setStatus('Checking setup...\n');

    const checks: string[] = [];

    // 1. Check VAPID key
    const rawVapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const vapidKey = (rawVapidKey || '').trim();
    if (vapidKey) {
      const hasWhitespace = rawVapidKey !== vapidKey;
      checks.push(`✅ VAPID key configured (length: ${vapidKey.length}${hasWhitespace ? ' ⚠️ HAD TRAILING WHITESPACE!' : ''})`);
    } else {
      checks.push('❌ VAPID key NOT configured - restart dev server');
    }

    // 2. Check browser support
    if ('Notification' in window && 'serviceWorker' in navigator) {
      checks.push('✅ Browser supports notifications');
    } else {
      checks.push('❌ Browser does NOT support notifications');
    }

    // 3. Check permission
    const permission = Notification.permission;
    if (permission === 'granted') {
      checks.push('✅ Notification permission granted');
    } else if (permission === 'denied') {
      checks.push('❌ Notification permission DENIED - reset in browser settings');
    } else {
      checks.push('⚠️ Notification permission not requested - click Enable Notifications');
    }

    // 4. Check service worker
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      if (registration?.active) {
        checks.push('✅ Service worker active');
      } else {
        checks.push('⚠️ Service worker NOT active - refresh page');
      }
    } catch (error) {
      checks.push('❌ Service worker check failed');
    }

    // 5. Check FCM token
    if (currentUser) {
      try {
        const { authenticatedFetch } = await import('@/lib/api-client');
        const response = await authenticatedFetch('/api/notifications/debug');
        if (response.ok) {
          const data = await response.json();
          if (data.fcmToken.registered) {
            checks.push('✅ FCM token registered');
          } else {
            checks.push('⚠️ FCM token NOT registered - enable notifications first');
          }
        } else {
          checks.push('⚠️ FCM token NOT registered - enable notifications first');
        }
      } catch (error) {
        checks.push('⚠️ FCM token NOT registered - enable notifications first');
      }
    } else {
      checks.push('⚠️ Not logged in');
    }

    setStatus(checks.join('\n'));
    setLoading(false);
  };

  const sendTestNotification = async () => {
    if (!currentUser) {
      setStatus('❌ Please log in first');
      return;
    }

    setLoading(true);
    setStatus('Sending test notification...\n');

    try {
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Notification',
          description: 'This is a test notification to verify push notifications are working',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          priority: 'high',
          status: 'pending',
          assignedTo: [currentUser.uid],
        }),
      });

      if (response.ok) {
        setStatus('✅ Test notification sent! Check your device.\n\nIf you don\'t see it:\n1. Check browser console for errors\n2. Make sure notifications are enabled\n3. Try refreshing the page');
      } else {
        const error = await response.json();
        setStatus(`❌ Failed to send: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    setLoading(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Notification Test</h1>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-bold mb-4">Quick Test</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          This page will help you verify that push notifications are working correctly.
        </p>

        <div className="flex gap-4 mb-6">
          <button
            onClick={checkSetup}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Check Setup'}
          </button>

          <button
            onClick={sendTestNotification}
            disabled={loading || !currentUser}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Test Notification'}
          </button>
        </div>

        {status && (
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <pre className="text-sm whitespace-pre-wrap font-mono">{status}</pre>
          </div>
        )}
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg mb-6">
        <h3 className="text-lg font-bold mb-3">Expected Notification</h3>
        <p className="text-sm mb-2">When the test notification is sent, you should see:</p>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>Title: "New Task Assigned"</li>
          <li>Body: "You have been assigned a new task: Test Notification"</li>
          <li>Action buttons: "Open" and "Dismiss"</li>
          <li>Icon: EdVentureHub logo</li>
        </ul>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
        <h3 className="text-lg font-bold mb-3">Troubleshooting Steps</h3>
        <ol className="list-decimal list-inside text-sm space-y-2">
          <li>Click "Check Setup" - all items should show ✅</li>
          <li>If VAPID key is missing, restart your dev server</li>
          <li>If permission not granted, go to <a href="/notifications" className="text-blue-600 underline">/notifications</a> and enable</li>
          <li>If service worker not active, refresh the page</li>
          <li>If FCM token not registered, enable notifications first</li>
          <li>Once all checks pass, click "Send Test Notification"</li>
          <li>Check your device for the notification (should appear within 1-2 seconds)</li>
        </ol>
      </div>
    </div>
  );
}

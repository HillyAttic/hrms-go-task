"use client";

import { useState } from 'react';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { sendTestNotification, checkNotificationSetup } from '@/lib/notifications/test-notification';
import { diagnoseNotifications } from '@/lib/notifications/notification-diagnostics';

export default function TestNotificationsPage() {
  const { user: currentUser } = useEnhancedAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  const handleTestNotification = async () => {
    if (!currentUser) {
      alert('Please sign in first');
      return;
    }

    setLoading(true);
    try {
      const result = await sendTestNotification(currentUser.uid);
      setResult(result);
      alert('Test notification sent! Check your device.');
    } catch (error) {
      console.error('Test failed:', error);
      alert('Test failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckSetup = async () => {
    setLoading(true);
    try {
      const setup = await checkNotificationSetup();
      const diag = await diagnoseNotifications(currentUser?.uid);
      setDiagnostics({ setup, diag });
    } catch (error) {
      console.error('Check failed:', error);
      alert('Check failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test Push Notifications</h1>

      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-dark p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="flex gap-4">
            <button
              onClick={handleTestNotification}
              disabled={loading || !currentUser}
              className="px-4 py-2 bg-foreground text-background rounded-md border-2 border-border font-semibold hover:bg-foreground/90 disabled:opacity-50"
            >
              Send Test Notification
            </button>
            <button
              onClick={handleCheckSetup}
              disabled={loading}
              className="px-4 py-2 bg-secondary text-white rounded hover:bg-secondary/90 disabled:opacity-50"
            >
              Check Setup
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
            <h3 className="font-semibold mb-2">Test Result</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        {diagnostics && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
            <h3 className="font-semibold mb-4">Diagnostics</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Setup Status</h4>
                <ul className="text-sm space-y-1">
                  <li>✓ Service Worker Supported: {diagnostics.setup.serviceWorkerSupported ? 'Yes' : 'No'}</li>
                  <li>✓ Notification Supported: {diagnostics.setup.notificationSupported ? 'Yes' : 'No'}</li>
                  <li>✓ Push Manager Supported: {diagnostics.setup.pushManagerSupported ? 'Yes' : 'No'}</li>
                  <li>✓ Permission: {diagnostics.setup.permission}</li>
                  <li>✓ Service Worker Registered: {diagnostics.setup.serviceWorkerRegistered ? 'Yes' : 'No'}</li>
                  <li>✓ Service Worker Active: {diagnostics.setup.serviceWorkerActive ? 'Yes' : 'No'}</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Detailed Diagnostics</h4>
                <ul className="text-sm space-y-1">
                  <li>✓ Supported: {diagnostics.diag.supported ? 'Yes' : 'No'}</li>
                  <li>✓ Permission: {diagnostics.diag.permission}</li>
                  <li>✓ VAPID Key Configured: {diagnostics.diag.vapidKeyConfigured ? 'Yes' : 'No'}</li>
                  <li>✓ FCM Token Exists: {diagnostics.diag.fcmTokenExists ? 'Yes' : 'No'}</li>
                </ul>
              </div>

              {diagnostics.diag.issues.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded">
                  <h4 className="font-medium mb-2 text-red-700 dark:text-red-300">Issues Found</h4>
                  <ul className="text-sm space-y-1 text-red-600 dark:text-red-400">
                    {diagnostics.diag.issues.map((issue: string, i: number) => (
                      <li key={i}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {diagnostics.diag.recommendations.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded">
                  <h4 className="font-medium mb-2 text-yellow-700 dark:text-yellow-300">Recommendations</h4>
                  <ul className="text-sm space-y-1 text-yellow-600 dark:text-yellow-400">
                    {diagnostics.diag.recommendations.map((rec: string, i: number) => (
                      <li key={i}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h3 className="font-semibold mb-2">Instructions</h3>
          <ol className="text-sm space-y-2 list-decimal list-inside">
            <li>Make sure you're signed in</li>
            <li>Click "Check Setup" to verify your notification configuration</li>
            <li>If there are issues, follow the recommendations</li>
            <li>Enable notifications when prompted</li>
            <li>Click "Send Test Notification" to test</li>
            <li>Check your device for the notification</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

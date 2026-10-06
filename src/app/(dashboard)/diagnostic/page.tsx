"use client";

import { useState, useEffect } from 'react';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';

export default function DiagnosticPage() {
  const { user: currentUser } = useEnhancedAuth();
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      checks: [],
      errors: [],
      warnings: [],
      success: [],
    };

    // Check 1: User Authentication
    if (currentUser) {
      diagnostics.success.push('✅ User is authenticated: ' + currentUser.email);
      diagnostics.checks.push({ name: 'Authentication', status: 'PASS', details: currentUser.uid });
    } else {
      diagnostics.errors.push('❌ User is NOT authenticated');
      diagnostics.checks.push({ name: 'Authentication', status: 'FAIL', details: 'Please sign in' });
    }

    // Check 2: Browser Support
    const hasNotification = 'Notification' in window;
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasPushManager = 'PushManager' in window;

    if (hasNotification && hasServiceWorker && hasPushManager) {
      diagnostics.success.push('✅ Browser supports push notifications');
      diagnostics.checks.push({ name: 'Browser Support', status: 'PASS', details: 'All APIs available' });
    } else {
      diagnostics.errors.push('❌ Browser does NOT support push notifications');
      diagnostics.checks.push({
        name: 'Browser Support',
        status: 'FAIL',
        details: `Notification: ${hasNotification}, SW: ${hasServiceWorker}, Push: ${hasPushManager}`
      });
    }

    // Check 3: Notification Permission
    if (hasNotification) {
      const permission = Notification.permission;
      if (permission === 'granted') {
        diagnostics.success.push('✅ Notification permission: GRANTED');
        diagnostics.checks.push({ name: 'Permission', status: 'PASS', details: permission });
      } else if (permission === 'denied') {
        diagnostics.errors.push('❌ Notification permission: DENIED - Reset in browser settings');
        diagnostics.checks.push({ name: 'Permission', status: 'FAIL', details: permission });
      } else {
        diagnostics.warnings.push('⚠️ Notification permission: NOT REQUESTED - Click "Enable Notifications"');
        diagnostics.checks.push({ name: 'Permission', status: 'WARN', details: permission });
      }
    }

    // Check 4: Service Worker
    if (hasServiceWorker) {
      try {
        const registration = await navigator.serviceWorker.getRegistration('/');
        if (registration?.active) {
          diagnostics.success.push('✅ Service worker is ACTIVE');
          diagnostics.checks.push({
            name: 'Service Worker',
            status: 'PASS',
            details: registration.active.scriptURL
          });
        } else {
          diagnostics.warnings.push('⚠️ Service worker NOT active - Refresh page');
          diagnostics.checks.push({ name: 'Service Worker', status: 'WARN', details: 'Not active' });
        }
      } catch (error) {
        diagnostics.errors.push('❌ Service worker check failed');
        diagnostics.checks.push({ name: 'Service Worker', status: 'FAIL', details: String(error) });
      }
    }

    // Check 5: VAPID Key
    const rawVapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const vapidKey = (rawVapidKey || '').trim();
    if (vapidKey) {
      const hasWhitespace = rawVapidKey !== vapidKey;
      diagnostics.success.push(`✅ VAPID key is configured (length: ${vapidKey.length}${hasWhitespace ? ', WARNING: had trailing whitespace that was trimmed!' : ''})`);
      diagnostics.checks.push({
        name: 'VAPID Key',
        status: hasWhitespace ? 'WARN' : 'PASS',
        details: `${vapidKey.substring(0, 10)}...${vapidKey.substring(vapidKey.length - 10)} (raw: ${rawVapidKey?.length}, trimmed: ${vapidKey.length})`
      });
    } else {
      diagnostics.errors.push('❌ VAPID key NOT configured - Check .env.local');
      diagnostics.checks.push({ name: 'VAPID Key', status: 'FAIL', details: 'Missing' });
    }

    // Check 6: FCM Token (if user is authenticated)
    if (currentUser) {
      try {
        const { authenticatedFetch } = await import('@/lib/api-client');
        const response = await authenticatedFetch(`/api/notifications/debug`);
        if (response.ok) {
          const data = await response.json();
          if (data.fcmToken.registered) {
            diagnostics.success.push('✅ FCM token is registered');
            diagnostics.checks.push({
              name: 'FCM Token',
              status: 'PASS',
              details: `Last updated: ${data.fcmToken.lastUpdated}`
            });
          } else {
            diagnostics.warnings.push('⚠️ FCM token NOT registered - Enable notifications first');
            diagnostics.checks.push({ name: 'FCM Token', status: 'WARN', details: 'Not registered' });
          }
        } else {
          diagnostics.warnings.push('⚠️ FCM token NOT registered - Enable notifications first');
          diagnostics.checks.push({ name: 'FCM Token', status: 'WARN', details: 'Not registered' });
        }
      } catch (error) {
        diagnostics.warnings.push('⚠️ FCM token NOT registered - Enable notifications first');
        diagnostics.checks.push({ name: 'FCM Token', status: 'WARN', details: 'Not registered' });
      }
    }

    setResults(diagnostics);
    setLoading(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, [currentUser]);

  if (!results) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Running diagnostics...</p>
        </div>
      </div>
    );
  }

  const allPassed = results.errors.length === 0 && results.warnings.length === 0;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Push Notification Diagnostics</h1>

      {/* Overall Status */}
      <div className={`p-6 rounded-lg mb-6 ${allPassed ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500' :
          results.errors.length > 0 ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500' :
            'bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-500'
        }`}>
        <h2 className="text-2xl font-bold mb-2">
          {allPassed ? '✅ All Checks Passed!' :
            results.errors.length > 0 ? '❌ Issues Found' :
              '⚠️ Warnings Found'}
        </h2>
        <p className="text-sm">
          {allPassed ? 'Your push notifications should be working!' :
            'Please fix the issues below to enable push notifications.'}
        </p>
      </div>

      {/* Errors */}
      {results.errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg mb-6">
          <h3 className="text-lg font-bold text-red-700 dark:text-red-300 mb-3">
            Errors ({results.errors.length})
          </h3>
          <ul className="space-y-2">
            {results.errors.map((error: string, i: number) => (
              <li key={i} className="text-red-600 dark:text-red-400">{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {results.warnings.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg mb-6">
          <h3 className="text-lg font-bold text-yellow-700 dark:text-yellow-300 mb-3">
            Warnings ({results.warnings.length})
          </h3>
          <ul className="space-y-2">
            {results.warnings.map((warning: string, i: number) => (
              <li key={i} className="text-yellow-600 dark:text-yellow-400">{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Success */}
      {results.success.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg mb-6">
          <h3 className="text-lg font-bold text-green-700 dark:text-green-300 mb-3">
            Passed Checks ({results.success.length})
          </h3>
          <ul className="space-y-2">
            {results.success.map((success: string, i: number) => (
              <li key={i} className="text-green-600 dark:text-green-400">{success}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Detailed Checks */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg mb-6">
        <h3 className="text-lg font-bold mb-4">Detailed Check Results</h3>
        <div className="space-y-3">
          {results.checks.map((check: any, i: number) => (
            <div key={i} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="flex-1">
                <div className="font-medium">{check.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{check.details}</div>
              </div>
              <div className={`px-3 py-1 rounded text-sm font-medium ${check.status === 'PASS' ? 'bg-green-100 text-green-700' :
                  check.status === 'FAIL' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                }`}>
                {check.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Running...' : 'Run Again'}
        </button>
        <a
          href="/notifications"
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 inline-block"
        >
          Go to Notifications Page
        </a>
      </div>

      {/* Next Steps */}
      <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="text-lg font-bold mb-3">Next Steps</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Fix any errors shown above</li>
          <li>Go to /notifications and click "Enable Notifications"</li>
          <li>Grant permission when browser asks</li>
          <li>Run diagnostics again to verify</li>
          <li>Create a test task and assign it to yourself</li>
          <li>You should see a notification appear!</li>
        </ol>
      </div>
    </div>
  );
}

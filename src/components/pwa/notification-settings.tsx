"use client";

import { usePushNotifications } from '@/hooks/use-push-notifications';
import { TouchOptimizedButton } from '@/components/ui/touch-optimized-input';
import { useResponsive } from '@/hooks/use-responsive';
import { NotificationSetupGuide } from './notification-setup-guide';

export function NotificationSettings() {
  const { 
    isSupported, 
    permission, 
    isEnabled, 
    isLoading, 
    error,
    requestPermission, 
    disableNotifications 
  } = usePushNotifications();
  const { isTouchDevice } = useResponsive();

  if (!isSupported) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Push Notifications Not Supported
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              Your browser doesn't support push notifications. Try using Chrome, Firefox, or Edge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <NotificationSetupGuide />
      
      <div className="flex items-center justify-between p-4 bg-card border border-stroke dark:border-stroke-dark rounded-lg">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-muted'}`} />
          <div>
            <h3 className="text-sm font-medium text-dark dark:text-white">
              Push Notifications
            </h3>
            <p className="text-xs text-dark-4 dark:text-dark-6 mt-0.5">
              {permission === 'granted' 
                ? 'Enabled - You will receive notifications' 
                : permission === 'denied'
                ? 'Blocked - Enable in browser settings'
                : 'Not enabled - Click to enable'}
            </p>
          </div>
        </div>
        
        {permission === 'default' && (
          <TouchOptimizedButton
            variant="primary"
            size="sm"
            touchTargetSize={isTouchDevice ? 'md' : 'sm'}
            onClick={requestPermission}
            disabled={isLoading}
          >
            {isLoading ? 'Enabling...' : 'Enable'}
          </TouchOptimizedButton>
        )}
        
        {permission === 'granted' && isEnabled && (
          <TouchOptimizedButton
            variant="ghost"
            size="sm"
            touchTargetSize={isTouchDevice ? 'md' : 'sm'}
            onClick={disableNotifications}
          >
            Disable
          </TouchOptimizedButton>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {permission === 'denied' && (
        <div className="p-4 bg-muted border border-stroke dark:border-stroke-dark rounded-lg">
          <h4 className="text-sm font-medium text-dark dark:text-white mb-2">
            How to enable notifications:
          </h4>
          <ol className="text-sm text-dark-4 dark:text-dark-6 space-y-1 list-decimal list-inside">
            <li>Click the lock icon in your browser's address bar</li>
            <li>Find "Notifications" in the permissions list</li>
            <li>Change the setting to "Allow"</li>
            <li>Refresh this page</li>
          </ol>
        </div>
      )}

      <div className="p-4 bg-muted border border-stroke dark:border-stroke-dark rounded-lg">
        <h4 className="text-sm font-medium text-dark dark:text-white mb-2">
          What you'll receive:
        </h4>
        <ul className="text-sm text-dark-4 dark:text-dark-6 space-y-1">
          <li className="flex items-start space-x-2">
            <svg className="w-4 h-4 text-foreground flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>New task assignments</span>
          </li>
          <li className="flex items-start space-x-2">
            <svg className="w-4 h-4 text-foreground flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Attendance reminders</span>
          </li>
          <li className="flex items-start space-x-2">
            <svg className="w-4 h-4 text-foreground flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Team updates</span>
          </li>
          <li className="flex items-start space-x-2">
            <svg className="w-4 h-4 text-foreground flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Important system alerts</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

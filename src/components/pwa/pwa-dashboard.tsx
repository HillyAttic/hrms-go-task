"use client";

import { useState } from 'react';
import { NotificationSettings } from './notification-settings';
import { TestNotificationButton } from './test-notification-button';
import { PWAStatus } from './pwa-status';
import { usePWAInstall } from '@/hooks/use-pwa-install';

export function PWADashboard() {
  const [activeTab, setActiveTab] = useState<'notifications' | 'install' | 'status'>('notifications');
  const { isInstalled, isInstallable, promptInstall } = usePWAInstall();

  return (
    <div className="bg-white dark:bg-gray-dark border border-stroke dark:border-stroke-dark rounded-lg shadow-card">
      {/* Tabs */}
      <div className="border-b border-stroke dark:border-stroke-dark">
        <div className="flex">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'notifications'
                ? 'text-primary border-b-2 border-primary'
                : 'text-dark-4 dark:text-dark-6 hover:text-dark dark:hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span>Notifications</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('install')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'install'
                ? 'text-primary border-b-2 border-primary'
                : 'text-dark-4 dark:text-dark-6 hover:text-dark dark:hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>Install App</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'status'
                ? 'text-primary border-b-2 border-primary'
                : 'text-dark-4 dark:text-dark-6 hover:text-dark dark:hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Status</span>
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-dark dark:text-white mb-2">
                Push Notifications
              </h2>
              <p className="text-sm text-dark-4 dark:text-dark-6 mb-4">
                Stay updated with real-time notifications about tasks, attendance, and team activities.
              </p>
            </div>
            
            <NotificationSettings />
            <TestNotificationButton />
          </div>
        )}

        {activeTab === 'install' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-dark dark:text-white mb-2">
                Install EdVentureHub Dashboard
              </h2>
              <p className="text-sm text-dark-4 dark:text-dark-6 mb-4">
                Install the app for a native experience with offline support and quick access.
              </p>
            </div>

            {isInstalled ? (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                      App Installed
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      EdVentureHub Dashboard is installed and ready to use. You can access it from your home screen or app launcher.
                    </p>
                  </div>
                </div>
              </div>
            ) : isInstallable ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    Benefits of Installing:
                  </h3>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li className="flex items-start space-x-2">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Quick access from home screen</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Works offline with cached data</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Native app experience</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Faster load times</span>
                    </li>
                  </ul>
                </div>
                
                <button
                  onClick={promptInstall}
                  className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  Install Now
                </button>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-stroke dark:border-stroke-dark rounded-lg">
                <p className="text-sm text-dark-4 dark:text-dark-6">
                  Installation is not available at this time. This could be because:
                </p>
                <ul className="text-sm text-dark-4 dark:text-dark-6 mt-2 space-y-1 list-disc list-inside">
                  <li>The app is already installed</li>
                  <li>Your browser doesn't support PWA installation</li>
                  <li>You're browsing in incognito/private mode</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'status' && (
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-dark dark:text-white mb-2">
                PWA Status
              </h2>
              <p className="text-sm text-dark-4 dark:text-dark-6">
                View the current status of Progressive Web App features.
              </p>
            </div>
            <PWAStatus />
          </div>
        )}
      </div>
    </div>
  );
}

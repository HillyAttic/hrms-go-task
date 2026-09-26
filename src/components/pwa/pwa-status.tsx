"use client";

import { useEffect, useState } from 'react';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { useServiceWorker } from '@/hooks/use-service-worker';
import { useBackgroundSync } from '@/hooks/use-background-sync';

interface CacheInfo {
  used: number;
  available: number;
  percentage: number;
}

export function PWAStatus() {
  const { isInstalled, isInstallable, promptInstall } = usePWAInstall();
  const { isOnline, isRegistered, getCacheUsage, clearCache } = useServiceWorker();
  const { isSupported: syncSupported, registerPeriodicSync, getPeriodicSyncs } = useBackgroundSync();
  
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [periodicSyncs, setPeriodicSyncs] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadCacheInfo();
    loadPeriodicSyncs();
  }, []);

  const loadCacheInfo = async () => {
    const info = await getCacheUsage();
    setCacheInfo(info);
  };

  const loadPeriodicSyncs = async () => {
    const syncs = await getPeriodicSyncs();
    setPeriodicSyncs(syncs);
  };

  const handleClearCache = async () => {
    if (confirm('Are you sure you want to clear all cached data?')) {
      await clearCache();
      await loadCacheInfo();
    }
  };

  const handleEnablePeriodicSync = async () => {
    const success = await registerPeriodicSync('update-dashboard-data', 24 * 60 * 60 * 1000);
    if (success) {
      await loadPeriodicSyncs();
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!showDetails) {
    return (
      <button
        onClick={() => setShowDetails(true)}
        className="fixed bottom-20 right-4 bg-accent text-accent-foreground border-2 border-border p-3 rounded-full hover:bg-accent/90 transition-colors z-40"
        aria-label="Show PWA Status"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white dark:bg-gray-dark border border-stroke dark:border-stroke-dark rounded-lg shadow-card-2 p-4 z-50 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-dark dark:text-white">PWA Status</h3>
        <button
          onClick={() => setShowDetails(false)}
          className="text-dark-4 dark:text-dark-6 hover:text-dark dark:hover:text-white"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        {/* Installation Status */}
        <div className="flex items-center justify-between p-3 bg-gray-2 dark:bg-gray-dark rounded-lg">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isInstalled ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-sm text-dark dark:text-white">Installed</span>
          </div>
          {isInstallable && !isInstalled && (
            <button
              onClick={promptInstall}
              className="text-xs text-foreground hover:underline"
            >
              Install
            </button>
          )}
        </div>

        {/* Online Status */}
        <div className="flex items-center justify-between p-3 bg-gray-2 dark:bg-gray-dark rounded-lg">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-dark dark:text-white">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Service Worker Status */}
        <div className="flex items-center justify-between p-3 bg-gray-2 dark:bg-gray-dark rounded-lg">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isRegistered ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-sm text-dark dark:text-white">Service Worker</span>
          </div>
        </div>

        {/* Cache Info */}
        {cacheInfo && (
          <div className="p-3 bg-gray-2 dark:bg-gray-dark rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-dark dark:text-white">Cache Storage</span>
              <button
                onClick={handleClearCache}
                className="text-xs text-red-500 hover:underline"
              >
                Clear
              </button>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-dark-4 dark:text-dark-6">
                <span>Used: {formatBytes(cacheInfo.used)}</span>
                <span>{cacheInfo.percentage}%</span>
              </div>
              <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-foreground h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(cacheInfo.percentage, 100)}%` }}
                />
              </div>
              <div className="text-xs text-dark-4 dark:text-dark-6">
                Available: {formatBytes(cacheInfo.available)}
              </div>
            </div>
          </div>
        )}

        {/* Background Sync */}
        {syncSupported && (
          <div className="p-3 bg-gray-2 dark:bg-gray-dark rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-dark dark:text-white">Background Sync</span>
              <div className="w-2 h-2 rounded-full bg-green-500" />
            </div>
            {periodicSyncs.length > 0 ? (
              <div className="text-xs text-dark-4 dark:text-dark-6">
                Active syncs: {periodicSyncs.join(', ')}
              </div>
            ) : (
              <button
                onClick={handleEnablePeriodicSync}
                className="text-xs text-foreground hover:underline"
              >
                Enable periodic updates
              </button>
            )}
          </div>
        )}

        {/* Display Mode */}
        <div className="p-3 bg-gray-2 dark:bg-gray-dark rounded-lg">
          <div className="text-sm text-dark dark:text-white mb-1">Display Mode</div>
          <div className="text-xs text-dark-4 dark:text-dark-6">
            {isInstalled ? 'Standalone' : 'Browser'}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-stroke dark:border-stroke-dark">
        <button
          onClick={loadCacheInfo}
          className="w-full text-sm text-foreground hover:underline"
        >
          Refresh Status
        </button>
      </div>
    </div>
  );
}

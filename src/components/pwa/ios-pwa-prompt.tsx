"use client";

import { useState, useEffect } from 'react';
import { isIOSDevice, isStandalonePWA, getIOSVersion } from '@/lib/firebase-messaging';

export function IOSPWAPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Only show on iOS devices that aren't already running as PWA
    const isIOS = isIOSDevice();
    const isPWA = isStandalonePWA();
    const iosVersion = getIOSVersion();
    
    // iOS 16.4+ supports web push, but only in PWA mode
    if (isIOS && !isPWA && iosVersion && iosVersion >= 16) {
      // Check if user has dismissed this before
      const dismissed = localStorage.getItem('ios-pwa-prompt-dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('ios-pwa-prompt-dismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-primary p-4 shadow-lg">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg 
              className="w-8 h-8 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" 
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white">
              Install EdVentureHub Dashboard
            </h4>
            <p className="text-sm text-white/90 mt-1">
              To receive push notifications on iOS, install this app to your home screen:
            </p>
            <ol className="text-xs text-white/80 mt-2 space-y-1 list-decimal list-inside">
              <li>Tap the Share button in Safari</li>
              <li>Scroll down and tap "Add to Home Screen"</li>
              <li>Tap "Add" to install</li>
            </ol>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-white/80 hover:text-white"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

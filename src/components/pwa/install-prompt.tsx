"use client";

import { useEffect, useState } from 'react';
import { TouchOptimizedButton } from '@/components/ui/touch-optimized-input';
import { useResponsive } from '@/hooks/use-responsive';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const { isTouchDevice } = useResponsive();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if the early inline script (in layout.tsx) already captured the prompt
    const earlyPrompt = (window as any).__pwaInstallPrompt as BeforeInstallPromptEvent | undefined;
    if (earlyPrompt) {
      setDeferredPrompt(earlyPrompt);
      setShowPrompt(true);
      // Clear it so we don't re-use a stale reference
      (window as any).__pwaInstallPrompt = null;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show prompt instantly
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else {
      console.log('User dismissed the install prompt');
      // Don't hide the prompt, keep showing it
    }
  };

  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-[9999]">
      <div className="bg-white dark:bg-gray-dark border border-stroke dark:border-stroke-dark rounded-lg shadow-card-2 p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg
              className="w-10 h-10 text-primary"
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
            <h4 className="text-sm font-semibold text-dark dark:text-white">
              Install EdVentureHub Dashboard
            </h4>
            <p className="text-sm text-dark-4 dark:text-dark-6 mt-1">
              Install the app for quick access, offline support, and a native app experience.
            </p>
            <div className="flex space-x-2 mt-3">
              <TouchOptimizedButton
                variant="primary"
                size="sm"
                touchTargetSize={isTouchDevice ? 'md' : 'sm'}
                onClick={handleInstall}
              >
                Install Now
              </TouchOptimizedButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

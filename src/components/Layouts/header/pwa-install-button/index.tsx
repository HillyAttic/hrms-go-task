"use client";

import { useServiceWorker } from "@/hooks/use-service-worker";
import { useResponsive } from "@/hooks/use-responsive";
import { useEffect, useState, useCallback } from "react";
import { useModal } from "@/contexts/modal-context";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstallButton() {
  const { device, isTouchDevice } = useResponsive();
  const { isSupported } = useServiceWorker();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const { openModal, closeModal } = useModal();
  useEffect(() => {
    if (showInstructions) openModal();
    else closeModal();
  }, [showInstructions, openModal, closeModal]);

  useEffect(() => {
    // Detect iOS and Android
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /android/i.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if app is already installed
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;

      const installed = isStandalone || isFullscreen || isIOSStandalone;
      setIsInstalled(installed);

      // Reduced logging for cleaner console

      return installed;
    };

    const installed = checkIfInstalled();

    // Check if the early inline script (in layout.tsx) already captured the prompt
    const earlyPrompt = (window as any).__pwaInstallPrompt as BeforeInstallPromptEvent | undefined;
    if (earlyPrompt && !installed) {
      setDeferredPrompt(earlyPrompt);
      setIsInstallable(true);
      // Clear it so we don't re-use a stale reference
      (window as any).__pwaInstallPrompt = null;
    }

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[SW] beforeinstallprompt captured');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    // For mobile devices, show install button if not installed
    if ((iOS || isAndroid) && !installed) {
      setIsInstallable(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    console.log('[PWA Install] Button clicked', { isIOS, hasDeferredPrompt: !!deferredPrompt });

    if (isIOS) {
      setShowInstructions(true);
      return;
    }

    // For Android/Chrome with deferred prompt
    if (deferredPrompt) {
      try {
        console.log('[PWA Install] Showing install prompt...');
        await deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;
        console.log('[PWA Install] User choice:', outcome);

        if (outcome === 'accepted') {
          console.log('[PWA Install] User accepted the install prompt');
          setIsInstalled(true);
        }

        setDeferredPrompt(null);
        setIsInstallable(false);
      } catch (error) {
        console.error('[PWA Install] Error during installation:', error);
        setShowInstructions(true);
      }
    } else {
      // No deferred prompt - show manual instructions
      setShowInstructions(true);
    }
  }, [isIOS, deferredPrompt]);

  const closeInstructions = useCallback(() => {
    setShowInstructions(false);
  }, []);

  // Enhanced mobile detection for visibility
  const isMobileDevice = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isMobileScreen = typeof window !== 'undefined' && window.innerWidth < 768;
    const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    return isMobileUA || (isMobileScreen && isTouchDevice) || device.type === 'mobile';
  };

  // Don't show button if not mobile, not supported, not installable, or already installed
  if (!isMobileDevice() || !isSupported || !isInstallable || isInstalled) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className={`
          group rounded-full bg-gray-3 p-[5px] text-[#111928] outline-1 outline-primary 
          focus-visible:outline dark:bg-[#020D1A] dark:text-current
          hover:bg-gray-4 dark:hover:bg-[#FFFFFF1A] transition-colors
          ${isTouchDevice ? 'min-h-[44px] min-w-[44px]' : 'min-h-[36px] min-w-[36px]'}
        `}
        aria-label="Install App"
        title={isIOS ? "Add to Home Screen" : "Install JPCO Dashboard"}
      >
        <span className="sr-only">Install App</span>
        <div className={`
          flex items-center justify-center
          ${isTouchDevice ? 'h-[34px] w-[34px]' : 'h-[26px] w-[26px]'}
        `}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            className="text-current"
          >
            <g clipPath="url(#clip0_11570_87998)">
              <path
                d="M18 20.25V3.75C18 2.92157 17.3284 2.25 16.5 2.25L7.5 2.25C6.67157 2.25 6 2.92157 6 3.75L6 20.25C6 21.0784 6.67157 21.75 7.5 21.75H16.5C17.3284 21.75 18 21.0784 18 20.25Z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 10.1055L12 17.6055"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9.75 15.3555L12 17.6055L14.25 15.3555"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10.5 4.5H13.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </g>
            <defs>
              <clipPath id="clip0_11570_87998">
                <rect width="24" height="24" fill="white" />
              </clipPath>
            </defs>
          </svg>
        </div>
      </button>

      {/* Installation Instructions Modal */}
      {showInstructions && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
          onClick={closeInstructions}
        >
          <div
            className="bg-white dark:bg-gray-dark rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Install JPCO Dashboard
              </h3>
              <button
                onClick={closeInstructions}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
              {isIOS ? (
                <>
                  <p className="font-medium">Follow these steps to install on iOS:</p>
                  <ol className="list-decimal list-inside space-y-2 pl-2">
                    <li>Open this page in <strong>Safari</strong> browser</li>
                    <li>Tap the <strong>Share</strong> button (square with arrow) at the bottom</li>
                    <li>Scroll down and select <strong>"Add to Home Screen"</strong></li>
                    <li>Choose a name for the app (or use default)</li>
                    <li>Tap <strong>"Add"</strong> in the top-right corner</li>
                    <li>The app icon will appear on your home screen</li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="font-medium">Follow these steps to install on Android:</p>
                  <ol className="list-decimal list-inside space-y-2 pl-2">
                    <li>Open this page in <strong>Chrome</strong> browser</li>
                    <li>Look for the <strong>"Add to Home screen"</strong> prompt at the bottom</li>
                    <li>Tap <strong>"Install"</strong> or <strong>"Add to Home screen"</strong></li>
                    <li>Confirm the installation when prompted</li>
                    <li>The app icon will appear on your home screen</li>
                  </ol>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                    Note: If you don't see the install prompt, try accessing the page via HTTPS or check your browser settings.
                  </p>
                </>
              )}
            </div>

            <button
              onClick={closeInstructions}
              className="mt-6 w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

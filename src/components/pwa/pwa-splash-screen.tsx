'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const DotLottieReact = dynamic(() => import('@lottiefiles/dotlottie-react').then(mod => mod.DotLottieReact), { ssr: false });

export function PWASplashScreen() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  (window.navigator as any).standalone === true;

    const hasSeenSplash = sessionStorage.getItem('pwa-splash-shown');

    if (isPWA && !hasSeenSplash) {
      setShow(true);
      sessionStorage.setItem('pwa-splash-shown', 'true');

      setTimeout(() => {
        setShow(false);
      }, 2000);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020d1a]">
      <div className="w-64 h-64">
        <DotLottieReact
          src="https://lottie.host/bb6fce6a-9e65-430d-8310-8138c178d463/XCPRVDtq3D.lottie"
          loop
          autoplay
        />
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

export function PWASplashScreen() {
  const [show, setShow] = useState(false);
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  (window.navigator as any).standalone === true;

    const hasSeenSplash = sessionStorage.getItem('pwa-splash-shown');

    if (isPWA && !hasSeenSplash) {
      fetch('/animations/infinity-loop.json')
        .then(res => res.json())
        .then(data => {
          setAnimationData(data);
          setShow(true);
          sessionStorage.setItem('pwa-splash-shown', 'true');

          setTimeout(() => {
            setShow(false);
          }, 2000);
        })
        .catch(err => {
          console.error('Failed to load splash animation:', err);
        });
    }
  }, []);

  if (!show || !animationData) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020d1a]">
      <div className="w-64 h-64">
        <Lottie
          animationData={animationData}
          loop={true}
          autoplay={true}
        />
      </div>
    </div>
  );
}

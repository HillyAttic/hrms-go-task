"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Handles notification clicks from service worker
 * Listens for messages from service worker and navigates to the appropriate URL
 */
export function NotificationClickHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
        const url = event.data.url;
        console.log('[NotificationClick] Navigating to:', url);

        // Navigate to the URL
        if (url) {
          // Set flag to prevent AuthWrapper from interfering
          sessionStorage.setItem('notificationNavigation', 'true');

          // Salary-slip deep links carry the period as query params; the page reads
          // it from sessionStorage, so hand it over before navigating.
          let target = url;
          try {
            const parsed = new URL(url, window.location.origin);
            const month = parsed.searchParams.get('month');
            const year = parsed.searchParams.get('year');
            if (month !== null && year !== null) {
              sessionStorage.setItem('salarySlipMonth', month);
              sessionStorage.setItem('salarySlipYear', year);
              window.dispatchEvent(
                new CustomEvent('salarySlipFilterChange', {
                  detail: { month: Number(month), year: Number(year) },
                })
              );
              parsed.searchParams.delete('month');
              parsed.searchParams.delete('year');
              target = parsed.pathname + (parsed.search || '');
            }
          } catch {
            target = url;
          }

          router.push(target);

          // Clear flag after navigation completes
          setTimeout(() => {
            sessionStorage.removeItem('notificationNavigation');
          }, 2000);
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [router]);

  return null;
}

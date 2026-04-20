'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useEnhancedAuth();

  useEffect(() => {
    if (!loading) {
      // Check if navigation is from notification click
      const isNotificationNavigation = typeof window !== 'undefined' &&
        sessionStorage.getItem('notificationNavigation') === 'true';

      if (isNotificationNavigation) {
        console.log('[Home] Skipping redirect - notification navigation in progress');
        return;
      }

      if (user) {
        // If user is authenticated, redirect to dashboard
        router.push('/dashboard');
      } else {
        // If user is not authenticated, redirect to sign-in
        router.push('/auth/sign-in');
      }
    }
  }, [user, loading, router]);

  // Show loading state while checking authentication
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

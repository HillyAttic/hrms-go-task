'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { Sidebar } from '@/components/Layouts/sidebar';
import { Header } from '@/components/Layouts/header';
import { MobileBottomNav } from '@/components/Layouts/mobile-bottom-nav';

interface AuthWrapperProps {
  children: React.ReactNode;
}

const publicRoutes = [
  '/auth/sign-in',
  '/auth/forgot-password',
  '/auth/reset-password',
];

const authRoutes = [
  '/auth/sign-in',
  '/auth/forgot-password',
];

// Routes that should render without header (but keep sidebar)
const noHeaderRoutes = [
  '/forms/builder',
];

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { user, loading } = useEnhancedAuth();
  const router = useRouter();
  const pathname = usePathname();
  const lastNavigationRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (loading) return;

    // Check if navigation is from notification click
    const isNotificationNavigation = typeof window !== 'undefined' &&
      sessionStorage.getItem('notificationNavigation') === 'true';

    if (isNotificationNavigation) {
      console.log('[AuthWrapper] Skipping redirect - notification navigation in progress');
      return;
    }

    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

    // Helper to navigate only if different from last navigation
    const navigateTo = (path: string) => {
      if (isMounted && lastNavigationRef.current !== path) {
        lastNavigationRef.current = path;
        router.push(path);
      }
    };

    if (!user && !isPublicRoute) {
      // User is not authenticated and trying to access protected route
      navigateTo('/auth/sign-in');
      return;
    }

    if (user && isAuthRoute) {
      // User is authenticated and trying to access auth routes
      navigateTo('/dashboard');
      return;
    }

    if (user && pathname === '/') {
      // Authenticated user on root path
      navigateTo('/dashboard');
      return;
    }

    return () => {
      isMounted = false;
    };
  }, [user, loading, pathname, router]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // Show loading for redirects
  if (!user && !isPublicRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  // For auth pages, render without sidebar and header
  if (isPublicRoute) {
    return (
      <div className="min-h-screen bg-gray-2 dark:bg-[#020d1a]">
        <main className="flex-1 mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10">
          {children}
        </main>
      </div>
    );
  }

  // Check if current route should hide header on desktop only
  const shouldHideHeaderOnDesktop = noHeaderRoutes.some(route => pathname.startsWith(route));

  // For protected pages, render with sidebar and conditionally with header
  return (
    <div className="flex min-h-screen bg-gray-2 dark:bg-[#020d1a]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Show header on mobile always, hide on desktop for specific routes */}
        <div className={shouldHideHeaderOnDesktop ? 'md:hidden' : ''}>
          <Header />
        </div>
        <main
          id="main-content"
          className={`flex-1 mx-auto w-full max-w-screen-2xl overflow-x-hidden pb-20 md:pb-10 ${
            shouldHideHeaderOnDesktop ? '' : 'p-4 md:p-6 2xl:p-10'
          }`}
          role="main"
          aria-label="Main content"
        >
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
};
'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { installAuthFailureHandler } from '@/lib/api-client';
import { Sidebar } from '@/components/Layouts/sidebar';
import { Header } from '@/components/Layouts/header';
import { MobileBottomNav } from '@/components/Layouts/mobile-bottom-nav';

// At module scope, not in an effect: child pages fetch in their own effects, which
// React runs before the parent's, so an effect here would install too late.
if (typeof window !== 'undefined') {
  installAuthFailureHandler();
}

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
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-border border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // Show loading for redirects
  if (!user && !isPublicRoute) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-border border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  // For auth pages, render without sidebar and header
  if (isPublicRoute) {
    return (
      <div className="min-h-screen bg-surface">
        <main className="mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10">
          {children}
        </main>
      </div>
    );
  }

  // Check if current route should hide header on desktop only
  const shouldHideHeaderOnDesktop = noHeaderRoutes.some(route => pathname.startsWith(route));

  // For protected pages, render with sidebar and conditionally with header
  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Show header on mobile always, hide on desktop for specific routes */}
        <div className={shouldHideHeaderOnDesktop ? 'md:hidden' : ''}>
          <Header />
        </div>
        {/*
          The shell owns max-width and padding. Pages must not add their own outer
          padding (several previously did, e.g. `p-6` / `max-w-[1080px]`).
          pb-20 on mobile clears the fixed bottom nav.
        */}
        <main
          id="main-content"
          className={`mx-auto w-full max-w-screen-2xl flex-1 overflow-x-hidden pb-24 md:pb-10 ${
            shouldHideHeaderOnDesktop ? '' : 'px-4 py-6 md:px-6 md:py-8 2xl:px-10'
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
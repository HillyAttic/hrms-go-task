'use client';

import React, { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthEnhanced } from '@/hooks/use-auth-enhanced';
import { UserRole } from '@/types/auth.types';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { UnauthorizedPage } from './UnauthorizedPage';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requiredPermissions?: string[];
  fallback?: ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requiredPermissions,
  fallback,
  redirectTo = '/auth/sign-in',
  requireAuth = true,
}) => {
  const { 
    user, 
    loading, 
    hasRole, 
    hasPermission,
    isAuthenticated 
  } = useAuthEnhanced();
  const router = useRouter();

  // Show loading spinner while authentication state is being determined
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-label="Loading…">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to sign-in if authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated()) {
    router.push(redirectTo);
    return (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-label="Loading…">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Check role-based access
  if (allowedRoles && allowedRoles.length > 0) {
    if (!hasRole(allowedRoles)) {
      return fallback || <UnauthorizedPage />;
    }
  }

  // Check permission-based access
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(permission => 
      hasPermission(permission)
    );
    
    if (!hasAllPermissions) {
      return fallback || <UnauthorizedPage />;
    }
  }

  // Render children if all checks pass
  return <>{children}</>;
};

// Higher-order component for protecting pages
export const withProtectedRoute = (
  Component: React.ComponentType<any>,
  options: Omit<ProtectedRouteProps, 'children'> = {}
) => {
  return function ProtectedComponent(props: any) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
};

// Specific route protectors for common use cases
export const AdminRoute: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({ 
  children, 
  fallback 
}) => (
  <ProtectedRoute allowedRoles={['admin']} fallback={fallback}>
    {children}
  </ProtectedRoute>
);

export const ManagerRoute: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({ 
  children, 
  fallback 
}) => (
  <ProtectedRoute allowedRoles={['admin', 'manager']} fallback={fallback}>
    {children}
  </ProtectedRoute>
);

export const EmployeeRoute: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({ 
  children, 
  fallback 
}) => (
  <ProtectedRoute allowedRoles={['admin', 'manager', 'employee']} fallback={fallback}>
    {children}
  </ProtectedRoute>
);
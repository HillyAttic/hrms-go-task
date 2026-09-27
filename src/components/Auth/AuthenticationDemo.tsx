'use client';

import React from 'react';
import { useAuthEnhanced } from '@/hooks/use-auth-enhanced';
import { AdminGuard } from '@/components/Auth/PermissionGuard';

/**
 * Demo component showing how the Authentication menu item protection works
 */
export const AuthenticationDemo: React.FC = () => {
  const { user, claims, loading, isAdmin, getRoleDisplayName } = useAuthEnhanced();

  if (loading) {
    return (
      <div className="p-6 bg-card rounded-lg shadow-sm border">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-card rounded-lg shadow-sm border space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Authentication Protection Demo</h3>
      
      {user ? (
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            <strong>Current User:</strong> {user.email}
          </div>
          <div className="text-sm text-muted-foreground">
            <strong>Role:</strong> {getRoleDisplayName()}
          </div>
          <div className="text-sm text-muted-foreground">
            <strong>Is Admin:</strong> {isAdmin ? 'Yes' : 'No'}
          </div>
          
          <div className="mt-4 p-4 bg-muted rounded-md">
            <h4 className="font-medium text-foreground mb-2">Authentication Menu Visibility Test:</h4>
            
            <AdminGuard 
              fallback={
                <div className="text-red-600 text-sm">
                  ❌ Authentication menu is hidden - You need admin role to see it
                </div>
              }
            >
              <div className="text-green-600 text-sm">
                ✅ Authentication menu is visible - You have admin access
              </div>
            </AdminGuard>
          </div>

          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-md">
            <h4 className="font-medium text-foreground mb-2">How it works:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• The Authentication menu item in the sidebar is wrapped with <code>AdminGuard</code></li>
              <li>• Only users with 'admin' role can see the Authentication menu</li>
              <li>• Non-admin users (employee, manager) won't see the menu at all</li>
              <li>• This protects access to Sign In, Sign Up, and Forgot Password pages</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="text-muted-foreground">
          <p>No user is currently authenticated.</p>
          <p className="text-sm mt-2">Sign in to test the authentication protection.</p>
        </div>
      )}
    </div>
  );
};
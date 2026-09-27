'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthEnhanced } from '@/hooks/use-auth-enhanced';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const UnauthorizedPage: React.FC = () => {
  const router = useRouter();
  const { user, getRoleDisplayName } = useAuthEnhanced();

  const handleGoBack = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push('/dashboard');
  };

  const handleSignOut = () => {
    router.push('/auth/sign-in');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          {/* Lock Icon */}
          <div className="mx-auto h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          <h2 className="mt-6 text-3xl font-extrabold text-foreground">
            Access Denied
          </h2>
          
          <p className="mt-2 text-sm text-muted-foreground">
            You don't have permission to access this page.
          </p>

          {user && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Current Role:</span> {getRoleDisplayName()}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-medium">Email:</span> {user.email}
              </p>
            </div>
          )}

          <div className="mt-6 space-y-3">
            <Button
              onClick={handleGoBack}
              variant="outline"
              className="w-full"
            >
              Go Back
            </Button>
            
            <Button
              onClick={handleGoHome}
              className="w-full"
            >
              Go to Dashboard
            </Button>

            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="w-full text-sm"
            >
              Sign Out
            </Button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              If you believe this is an error, please contact your administrator.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthEnhanced } from '@/hooks/use-auth-enhanced';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const UnauthorizedPage: React.FC = () => {
  const router = useRouter();
  const { user, getRoleDisplayName, signOut } = useAuthEnhanced();

  const handleGoBack = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push('/dashboard');
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/sign-in');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          {/* Lock Icon */}
          <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              focusable="false"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          <h1 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Access Denied
          </h1>

          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            You don’t have permission to access this page.
          </p>

          {user && (
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">Current Role:</span> {getRoleDisplayName()}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
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
            <p className="text-xs text-gray-500 dark:text-gray-400">
              If you believe this is an error, please contact your administrator.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
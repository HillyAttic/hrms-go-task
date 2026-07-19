'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Input } from '@/components/Form/Input';
import { Button } from '@/components/Form/Button';
import { Logo } from '@/components/logo';
import Link from 'next/link';

function AuthActionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    if (!oobCode || !mode) {
      setError('Invalid or missing action code');
      setIsVerifying(false);
      return;
    }

    if (mode === 'resetPassword') {
      verifyPasswordResetCode(auth, oobCode)
        .then((userEmail) => {
          setEmail(userEmail);
          setIsVerifying(false);
        })
        .catch((error) => {
          console.error('Error verifying reset code:', error);
          setError('Invalid or expired reset link');
          setIsVerifying(false);
        });
    } else {
      setError('Unsupported action mode');
      setIsVerifying(false);
    }
  }, [oobCode, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await confirmPasswordReset(auth, oobCode!, newPassword);
      router.push('/auth/signin?reset=success');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      setError(error.message || 'Failed to reset password');
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-wrap items-center">
          <div className="hidden xl:block xl:w-1/2">
            <div className="px-26 py-17.5 text-center">
              <div className="mb-8">
                <Logo />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-black dark:text-white sm:text-title-xl2">
                EdVentureHub Admin Dashboard
              </h2>
              <p className="text-black dark:text-white">
                Securely manage your account
              </p>
            </div>
          </div>

          <div className="w-full border-stroke dark:border-strokedark xl:w-1/2 xl:border-l-2">
            <div className="w-full p-4 sm:p-12.5 xl:p-17.5">
              <div className="mb-8 text-center">
                <Logo />
                <h2 className="mt-6 text-2xl font-bold text-black dark:text-white sm:text-title-xl2">
                  Verifying Reset Link
                </h2>
                <p className="mt-4 text-black dark:text-white">
                  Please wait while we verify your password reset link...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-wrap items-center">
          <div className="hidden xl:block xl:w-1/2">
            <div className="px-26 py-17.5 text-center">
              <div className="mb-8">
                <Logo />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-black dark:text-white sm:text-title-xl2">
                EdVentureHub Admin Dashboard
              </h2>
              <p className="text-black dark:text-white">
                Securely manage your account
              </p>
            </div>
          </div>

          <div className="w-full border-stroke dark:border-strokedark xl:w-1/2 xl:border-l-2">
            <div className="w-full p-4 sm:p-12.5 xl:p-17.5">
              <div className="mb-8 text-center">
                <Logo />
                <h2 className="mt-6 text-2xl font-bold text-black dark:text-white sm:text-title-xl2">
                  Reset Link Error
                </h2>
              </div>

              <div className="rounded-lg border border-danger bg-danger/10 p-4 text-center">
                <p className="text-danger font-semibold">{error}</p>
              </div>

              <div className="mt-6 text-center">
                <p className="font-medium text-black dark:text-white">
                  <Link href="/auth/forgot-password" className="text-primary hover:underline">
                    Request a new reset link
                  </Link>
                  {' or '}
                  <Link href="/auth/signin" className="text-primary hover:underline">
                    Back to sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="flex flex-wrap items-center">
        <div className="hidden xl:block xl:w-1/2">
          <div className="px-26 py-17.5 text-center">
            <div className="mb-8">
              <Logo />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-black dark:text-white sm:text-title-xl2">
              EdVentureHub Admin Dashboard
            </h2>
            <p className="text-black dark:text-white">
              Securely manage your account
            </p>
          </div>
        </div>

        <div className="w-full border-stroke dark:border-strokedark xl:w-1/2 xl:border-l-2">
          <div className="w-full p-4 sm:p-12.5 xl:p-17.5">
            <div className="mb-8 text-center">
              <Logo />
              <h2 className="mt-6 text-2xl font-bold text-black dark:text-white sm:text-title-xl2">
                Reset Your Password
              </h2>
              <p className="text-black dark:text-white">
                Enter a new password for <strong>{email}</strong>
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <Input
                label="New Password"
                type="password"
                name="newPassword"
                placeholder="Enter new password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
              />

              <Input
                label="Confirm New Password"
                type="password"
                name="confirmPassword"
                placeholder="Confirm new password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />

              {error && (
                <div className="mb-4 rounded-lg border border-danger bg-danger/10 p-3">
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}

              <div className="mb-5">
                <Button
                  type="submit"
                  isLoading={isLoading}
                  disabled={isLoading}
                >
                  Reset Password
                </Button>
              </div>

              <div className="mt-6 text-center">
                <p className="font-medium text-black dark:text-white">
                  <Link href="/auth/signin" className="text-primary hover:underline">
                    Back to sign in
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthActionPage() {
  return (
    <Suspense fallback={
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex items-center justify-center p-12">
          <p className="text-black dark:text-white">Loading...</p>
        </div>
      </div>
    }>
      <AuthActionContent />
    </Suspense>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/logo';
import { Input } from '@/components/Form/Input';
import { Button } from '@/components/Form/Button';
import { useNotification } from '@/contexts/notification.context';

interface ForgotPasswordFormData {
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

const EMPTY_FORM: ForgotPasswordFormData = {
  email: '',
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
};

const ForgotPasswordPage = () => {
  const [formData, setFormData] = useState<ForgotPasswordFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof ForgotPasswordFormData, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { addNotification } = useNotification();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name as keyof ForgotPasswordFormData]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof ForgotPasswordFormData];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Partial<Record<keyof ForgotPasswordFormData, string>> = {};

    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Enter your current password';
    }
    if (!formData.newPassword || formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }
    if (formData.newPassword !== formData.confirmNewPassword) {
      newErrors.confirmNewPassword = "Passwords don't match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        addNotification({
          type: 'error',
          message: result.message || 'Could not change your password',
        });
        return;
      }

      addNotification({
        type: 'success',
        message: 'Password changed successfully! Please sign in with your new password.',
      });
      setFormData(EMPTY_FORM);
      setTimeout(() => router.push('/auth/signin'), 2000);
    } catch {
      addNotification({ type: 'error', message: 'An error occurred while changing your password' });
    } finally {
      setIsLoading(false);
    }
  };

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
                Change Password
              </h2>
              <p className="text-black dark:text-white">
                Confirm your current password and choose a new one
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <Input
                label="Email Address"
                type="email"
                name="email"
                placeholder="Enter your email"
                error={errors.email}
                required
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
              />

              <Input
                label="Current Password"
                type="password"
                name="currentPassword"
                placeholder="Enter current password"
                error={errors.currentPassword}
                required
                value={formData.currentPassword}
                onChange={handleChange}
                disabled={isLoading}
              />
              <p className="-mt-3 mb-5 text-xs text-gray-500 dark:text-gray-400">
                This is the password you currently sign in with
              </p>

              <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                <Input
                  label="New Password"
                  type="password"
                  name="newPassword"
                  placeholder="Enter new password"
                  error={errors.newPassword}
                  required
                  value={formData.newPassword}
                  onChange={handleChange}
                  disabled={isLoading}
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  name="confirmNewPassword"
                  placeholder="Confirm password"
                  error={errors.confirmNewPassword}
                  required
                  value={formData.confirmNewPassword}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>

              <div className="mt-2 flex gap-3">
                <div className="flex-1">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => router.push('/auth/signin')}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
                <div className="flex-1">
                  <Button type="submit" isLoading={isLoading} disabled={isLoading}>
                    Save Changes
                  </Button>
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="font-medium text-black dark:text-white">
                  Remember your password?{' '}
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
};

export default ForgotPasswordPage;

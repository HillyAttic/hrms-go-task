'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EmailIcon, PasswordIcon } from '@/assets/icons';
import { AuthCard, authLinkClass } from '@/components/Auth/AuthCard';
import { AuthField } from '@/components/Auth/AuthField';
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
      setTimeout(() => router.push('/auth/sign-in'), 2000);
    } catch {
      addNotification({ type: 'error', message: 'An error occurred while changing your password' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title="Change password"
      subtitle="Confirm your current password and choose a new one"
      className="max-w-[440px] sm:max-w-[600px]"
    >
      <form onSubmit={handleSubmit}>
        <div className="auth-form-grid grid grid-cols-1 gap-5 sm:grid-cols-2">
          <AuthField
            label="Email Address"
            type="email"
            name="email"
            placeholder="you@company.com"
            autoComplete="email"
            error={errors.email}
            required
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading}
            icon={<EmailIcon width="20" height="20" />}
          />

          <AuthField
            label="Current Password"
            type="password"
            name="currentPassword"
            placeholder="Enter current password"
            autoComplete="current-password"
            error={errors.currentPassword}
            hint="This is the password you currently sign in with"
            required
            value={formData.currentPassword}
            onChange={handleChange}
            disabled={isLoading}
            icon={<PasswordIcon width="20" height="20" />}
          />

          <AuthField
            label="New Password"
            type="password"
            name="newPassword"
            placeholder="Enter new password"
            autoComplete="new-password"
            error={errors.newPassword}
            required
            value={formData.newPassword}
            onChange={handleChange}
            disabled={isLoading}
            icon={<PasswordIcon width="20" height="20" />}
          />

          <AuthField
            label="Confirm New Password"
            type="password"
            name="confirmNewPassword"
            placeholder="Confirm password"
            autoComplete="new-password"
            error={errors.confirmNewPassword}
            required
            value={formData.confirmNewPassword}
            onChange={handleChange}
            disabled={isLoading}
            icon={<PasswordIcon width="20" height="20" />}
          />
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => router.push('/auth/sign-in')}
            disabled={isLoading}
            className="auth-neu-ghost flex-1 rounded-full py-4 text-[15px] font-semibold text-dark-4 dark:text-dark-6"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="auth-neu-btn flex flex-1 items-center justify-center gap-2 rounded-full py-4 text-[15px] font-semibold tracking-wide text-white"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
            {isLoading && (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-t-transparent" />
            )}
          </button>
        </div>

        <p className="mt-6 text-center text-sm">
          <span className="text-dark-5 dark:text-dark-6">Remember your password? </span>
          <Link href="/auth/sign-in" className={authLinkClass}>
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthCard>
  );
};

export default ForgotPasswordPage;

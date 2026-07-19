'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Input } from '@/components/Form/Input';
import { Button } from '@/components/Form/Button';
import { useNotification } from '@/contexts/notification.context';
import { resetPassword } from '@/lib/auth';
import { useParams, useRouter } from 'next/navigation';

interface ResetPasswordFormData {
  newPassword: string;
  confirmNewPassword: string;
}

const ResetPasswordPage = () => {
  const [formData, setFormData] = useState<ResetPasswordFormData>({
    newPassword: '',
    confirmNewPassword: ''
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof ResetPasswordFormData, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { addNotification } = useNotification();
  const router = useRouter();
  const { token } = useParams();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name as keyof ResetPasswordFormData]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof ResetPasswordFormData];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Partial<Record<keyof ResetPasswordFormData, string>> = {};
    
    if (!formData.newPassword || formData.newPassword.length < 8 || !/(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])/.test(formData.newPassword)) {
      newErrors.newPassword = 'Password must be at least 8 characters and contain at least one number and one special character';
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
      // Ensure token is a string (as it might be an array)
      const tokenString = Array.isArray(token) ? token[0] : token;
      
      // Check if token is undefined
      if (!tokenString) {
        addNotification({ 
          type: 'error', 
          message: 'Invalid reset token' 
        });
        return;
      }
      
      const result = await resetPassword(tokenString, formData.newPassword);
      if (result.success) {
        addNotification({ 
          type: 'success', 
          message: result.message || 'Password reset successfully!' 
        });
        // Redirect to sign in page after successful reset
        setTimeout(() => {
          router.push('/auth/signin');
        }, 2000);
      } else {
        addNotification({ 
          type: 'error', 
          message: result.message || 'Something went wrong during password reset' 
        });
      }
    } catch (error) {
      addNotification({ 
        type: 'error', 
        message: 'An error occurred during password reset' 
      });
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
                Reset Password
              </h2>
              <p className="text-black dark:text-white">
                Enter your new password
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <Input
                label="New Password"
                type="password"
                name="newPassword"
                placeholder="Enter your new password"
                error={errors.newPassword}
                required
                value={formData.newPassword}
                onChange={handleChange}
              />

              <Input
                label="Confirm New Password"
                type="password"
                name="confirmNewPassword"
                placeholder="Re-enter your new password"
                error={errors.confirmNewPassword}
                required
                value={formData.confirmNewPassword}
                onChange={handleChange}
              />

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

export default ResetPasswordPage;
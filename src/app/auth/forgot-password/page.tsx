'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Input } from '@/components/Form/Input';
import { Button } from '@/components/Form/Button';
import { useNotification } from '@/contexts/notification.context';
import { requestPasswordReset } from '@/lib/auth';

interface ForgotPasswordFormData {
  email: string;
}

const ForgotPasswordPage = () => {
  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: ''
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof ForgotPasswordFormData, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { addNotification } = useNotification();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
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
      const result = await requestPasswordReset(formData.email);
      if (result.success) {
        addNotification({ 
          type: 'success', 
          message: result.message || 'Password reset link sent to your email!' 
        });
        setIsSubmitted(true); // Show success message
      } else {
        addNotification({ 
          type: 'error', 
          message: result.message || 'Something went wrong during password reset request' 
        });
      }
    } catch (error) {
      addNotification({ 
        type: 'error', 
        message: 'An error occurred during password reset request' 
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
                Forgot Password?
              </h2>
              <p className="text-black dark:text-white">
                Enter your email and we'll send you a reset link
              </p>
            </div>

            {isSubmitted ? (
              <div className="rounded-lg border border-success bg-success/10 p-4 text-center">
                <h3 className="mb-2 text-xl font-bold text-success">Check your email!</h3>
                <p className="text-black dark:text-white">
                  We've sent a password reset link to <strong>{formData.email}</strong>. 
                  Please check your inbox and follow the instructions.
                </p>
              </div>
            ) : (
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
                />

                <div className="mb-5">
                  <Button 
                    type="submit" 
                    isLoading={isLoading}
                    disabled={isLoading}
                  >
                    Send Reset Link
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
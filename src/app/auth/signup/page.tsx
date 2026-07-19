'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Input } from '@/components/Form/Input';
import { Button } from '@/components/Form/Button';
import { useNotification } from '@/contexts/notification.context';
import { signUp } from '@/lib/auth';

interface SignUpFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

const SignUpPage = () => {
  const [formData, setFormData] = useState<SignUpFormData>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof SignUpFormData, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { addNotification } = useNotification();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name as keyof SignUpFormData]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof SignUpFormData];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Partial<Record<keyof SignUpFormData, string>> = {};
    
    if (!formData.fullName || formData.fullName.length < 3) {
      newErrors.fullName = 'Name must be at least 3 characters';
    }
    
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password || formData.password.length < 8 || !/(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])/.test(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters and contain at least one number and one special character';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }
    
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms and conditions';
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
      const result = await signUp(formData);
      if (result.success) {
        addNotification({ 
          type: 'success', 
          message: result.message || 'Account created successfully!' 
        });
        // Optionally redirect to sign in page after successful registration
      } else {
        addNotification({ 
          type: 'error', 
          message: result.message || 'Something went wrong during registration' 
        });
      }
    } catch (error) {
      addNotification({ 
        type: 'error', 
        message: 'An error occurred during registration' 
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
              Join EdVentureHub Today
            </h2>
            <p className="text-black dark:text-white">
              Create an account to access all features of our platform
            </p>
          </div>
        </div>

        <div className="w-full border-stroke dark:border-strokedark xl:w-1/2 xl:border-l-2">
          <div className="w-full p-4 sm:p-12.5 xl:p-17.5">
            <div className="mb-8 text-center">
              <Logo />
              <h2 className="mt-6 text-2xl font-bold text-black dark:text-white sm:text-title-xl2">
                Sign Up
              </h2>
              <p className="text-black dark:text-white">
                Create your account to get started
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <Input
                label="Full Name"
                type="text"
                name="fullName"
                placeholder="Enter your full name"
                error={errors.fullName}
                required
                value={formData.fullName}
                onChange={handleChange}
              />

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

              <Input
                label="Password"
                type="password"
                name="password"
                placeholder="Enter your password"
                error={errors.password}
                required
                value={formData.password}
                onChange={handleChange}
              />

              <Input
                label="Confirm Password"
                type="password"
                name="confirmPassword"
                placeholder="Re-enter your password"
                error={errors.confirmPassword}
                required
                value={formData.confirmPassword}
                onChange={handleChange}
              />

              <div className="mb-4 flex">
                <div className="mr-4 mt-1 flex h-5 items-center pb-2">
                  <input
                    id="acceptTerms"
                    name="acceptTerms"
                    type="checkbox"
                    className="peer sr-only"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                  />
                  <label
                    htmlFor="acceptTerms"
                    className={`${
                      formData.acceptTerms ? 'bg-primary' : 'bg-white dark:bg-boxdark-2'
                    } flex h-5 w-5 items-center justify-center rounded border ${
                      errors.acceptTerms
                        ? '!border-red dark:!border-red'
                        : 'border-stroke dark:border-form-strokedark'
                    } peer-checked:before:block`}
                  >
                    <span className="hidden">
                      <svg
                        className="h-3.5 w-3.5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={4}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </span>
                  </label>
                </div>
                <label
                  htmlFor="acceptTerms"
                  className="text-sm font-medium text-black dark:text-white"
                >
                  I agree to the{' '}
                  <Link href="/terms" className="text-primary hover:underline">
                    Terms and Conditions
                  </Link>
                </label>
              </div>
              {errors.acceptTerms && (
                <p className="mt-1 text-sm text-red">
                  {errors.acceptTerms}
                </p>
              )}

              <div className="mb-5">
                <Button 
                  type="submit" 
                  isLoading={isLoading}
                  disabled={isLoading}
                >
                  Create Account
                </Button>
              </div>

              <div className="mt-6 text-center">
                <p className="font-medium text-black dark:text-white">
                  Already have an account?{' '}
                  <Link href="/auth/signin" className="text-primary hover:underline">
                    Sign in
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

import { AdminGuard } from '@/components/Auth/PermissionGuard';

export default function ProtectedSignUpPage() {
  return (
    <AdminGuard>
      <SignUpPage />
    </AdminGuard>
  );
};
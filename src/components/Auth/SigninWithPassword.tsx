"use client";
import { EmailIcon, PasswordIcon } from "@/assets/icons";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Checkbox } from "../FormElements/checkbox";
import { AuthField } from "./AuthField";
import { authLinkClass } from "./AuthCard";
import { useEnhancedAuth } from "@/contexts/enhanced-auth.context";

export default function SigninWithPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, user } = useEnhancedAuth();

  const [data, setData] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Check for password reset success message
  useEffect(() => {
    const resetSuccess = searchParams.get('reset');
    if (resetSuccess === 'success') {
      setSuccessMessage('Password reset successful! You can now sign in with your new password.');
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({
      ...data,
      [e.target.name]: e.target.value,
    });
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn(data.email, data.password);

      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error || 'Sign in failed');
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {successMessage && (
        <div
          role="status"
          className="auth-neu-well mb-5 rounded-2xl border border-green-500/25 px-4 py-3 text-sm font-medium text-green-700 dark:text-green-400"
        >
          {successMessage}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="auth-neu-well mb-5 rounded-2xl border border-red-500/25 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400"
        >
          {error}
        </div>
      )}

      <div className="space-y-5">
        <AuthField
          type="email"
          label="Email"
          name="email"
          placeholder="you@company.com"
          value={data.email}
          onChange={handleChange}
          autoComplete="email"
          icon={<EmailIcon width="20" height="20" />}
          required
        />

        <AuthField
          type="password"
          label="Password"
          name="password"
          placeholder="Enter your password"
          value={data.password}
          onChange={handleChange}
          autoComplete="current-password"
          icon={<PasswordIcon width="20" height="20" />}
          required
        />
      </div>

      <div className="mb-6 mt-5 flex items-center justify-between gap-3 text-sm font-medium">
        <Checkbox
          label="Remember me"
          name="remember"
          withIcon="check"
          minimal
          radius="md"
          onChange={(e) =>
            setData({
              ...data,
              remember: e.target.checked,
            })
          }
        />

        <Link href="/auth/forgot-password" className={authLinkClass}>
          Forgot password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="auth-neu-btn flex w-full items-center justify-center gap-2 rounded-full py-4 text-[15px] font-semibold tracking-wide text-white"
      >
        {loading ? 'Signing In...' : 'Sign In'}
        {loading && (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-t-transparent" />
        )}
      </button>
    </form>
  );
}

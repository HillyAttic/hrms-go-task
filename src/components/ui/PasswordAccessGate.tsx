'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogOut,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';
import { authenticatedFetch } from '@/lib/api-client';

/**
 * A reusable client-side page lock.
 *
 * HONEST SECURITY POSTURE — read before relying on this:
 *   • It is a UX speed bump over an already-authenticated session, nothing more.
 *   • The password is stored in PLAINTEXT in localStorage when "remember me" is on.
 *   • There is no server session, no token, and no expiry — re-locking is purely
 *     local state, and the console can be re-opened by anyone who has the password.
 *   • The real authorization boundary is the role check on each API route.
 * Do not describe this to anyone as securing the data.
 */
export interface PasswordAccessGateConfig {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  apiEndpoint: string;
  storageKeyPrefix: string;
  gradient?: string;
}

interface PasswordAccessGateProps {
  config: PasswordAccessGateConfig;
  children: React.ReactNode;
}

export function PasswordAccessGate({ config, children }: PasswordAccessGateProps) {
  const {
    title,
    subtitle,
    icon: Icon,
    apiEndpoint,
    storageKeyPrefix,
    gradient = 'from-violet-600 via-purple-600 to-indigo-700',
  } = config;

  const passwordKey = `${storageKeyPrefix}_access_password`;
  const rememberKey = `${storageKeyPrefix}_access_remember`;

  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const bootstrapped = useRef(false);

  const verify = async (candidate: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const response = await authenticatedFetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: candidate.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      return { ok: data?.success === true, error: data?.error };
    } catch {
      return { ok: false, error: 'Failed to verify password' };
    }
  };

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const saved = localStorage.getItem(passwordKey);
    const remembered = localStorage.getItem(rememberKey) === 'true';

    if (saved && remembered) {
      // Silent: a stale saved password should land on the prompt, not on a toast.
      verify(saved).then(({ ok }) => {
        if (ok) {
          setUnlocked(true);
        } else {
          localStorage.removeItem(passwordKey);
          localStorage.removeItem(rememberKey);
          setRememberMe(false);
        }
        setVerifying(false);
      });
      return;
    }

    setRememberMe(remembered);
    setVerifying(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password.trim()) {
      toast.error('Please enter a password');
      return;
    }

    setVerifying(true);
    const { ok, error } = await verify(password);
    setVerifying(false);

    if (!ok) {
      toast.error(error || 'Incorrect password');
      setPassword('');
      return;
    }

    if (rememberMe) {
      localStorage.setItem(passwordKey, password.trim());
      localStorage.setItem(rememberKey, 'true');
    } else {
      localStorage.removeItem(passwordKey);
      localStorage.removeItem(rememberKey);
    }

    setUnlocked(true);
    setPassword('');
    toast.success('Access granted');
  };

  const handleLock = () => {
    localStorage.removeItem(passwordKey);
    localStorage.removeItem(rememberKey);
    setUnlocked(false);
    setRememberMe(false);
    toast.success(`${title} locked`);
  };

  if (verifying && !unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-violet-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Verifying saved credentials...
          </p>
        </div>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <div className={`relative bg-gradient-to-br ${gradient} px-6 py-8 text-center`}>
            <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-white/5 blur-xl" />
            <div className="absolute -bottom-8 right-0 h-32 w-32 rounded-full bg-pink-400/10 blur-2xl" />
            <div className="absolute right-10 top-4 h-16 w-16 rounded-full bg-amber-300/10 blur-lg" />

            <div className="relative">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/20 backdrop-blur-sm">
                <Icon className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-extrabold text-white">{title}</h1>
              <p className="mt-1 text-sm text-purple-200">🔒 {subtitle}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
              <p className="text-xs text-amber-800 dark:text-amber-200">
                This panel is password protected. Access is logged.
              </p>
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                autoFocus
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div
              role="checkbox"
              aria-checked={rememberMe}
              tabIndex={0}
              onClick={() => setRememberMe((prev) => !prev)}
              onKeyDown={(event) => {
                if (event.key === ' ' || event.key === 'Enter') {
                  event.preventDefault();
                  setRememberMe((prev) => !prev);
                }
              }}
              className="flex cursor-pointer items-center gap-2 select-none"
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                  rememberMe
                    ? 'border-violet-600 bg-violet-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {rememberMe && (
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-white" fill="none">
                    <path
                      d="M3 8.5l3 3 7-7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-300">Remember me</span>
            </div>

            <button
              type="submit"
              disabled={verifying || !password.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 font-semibold text-white transition-colors hover:from-violet-500 hover:to-indigo-500 disabled:from-gray-400 disabled:to-gray-400"
            >
              {verifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Unlock {title}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleLock}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-xs text-white shadow-lg"
      >
        <LogOut className="h-3.5 w-3.5" />
        Lock Panel
      </button>
      {children}
    </>
  );
}

export default PasswordAccessGate;

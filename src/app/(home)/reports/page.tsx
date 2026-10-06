'use client';

import React, { useState, useEffect } from 'react';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { useRouter } from 'next/navigation';
import { ReportsView } from '@/components/reports/ReportsView';

export default function ReportsPage() {
  const { isManager, loading: authLoading } = useEnhancedAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isManager) {
      router.push('/dashboard');
    }
  }, [isManager, authLoading, router]);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (authLoading || loading) {
    return (
      <div role="status" aria-label="Loading…" className="flex items-center justify-center min-h-screen">
        <div aria-hidden="true" className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isManager) {
    return (
      <div role="status" aria-label="Redirecting…" className="flex items-center justify-center min-h-screen">
        <div aria-hidden="true" className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <ReportsView />
    </div>
  );
}

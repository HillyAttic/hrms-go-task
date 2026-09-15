'use client';

import { IndianRupee } from 'lucide-react';
import { PasswordAccessGate } from '@/components/ui/PasswordAccessGate';

const config = {
  title: 'Payroll Panel',
  subtitle: 'Password required to access this page',
  icon: IndianRupee,
  apiEndpoint: '/api/payroll/verify-access',
  storageKeyPrefix: 'payroll',
};

export function PayrollAccessGate({ children }: { children: React.ReactNode }) {
  return <PasswordAccessGate config={config}>{children}</PasswordAccessGate>;
}

export default PayrollAccessGate;

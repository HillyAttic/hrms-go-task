'use client';

import { authenticatedFetch } from '@/lib/api-client';
import type {
  EmployeeSalary,
  PayrollSettings,
  SalaryCalculationResult,
  SalarySlipTemplate,
} from '@/types/payroll.types';

/**
 * Client-side payroll API wrapper.
 *
 * Every method swallows failures and returns null / [] / false: a rendering path
 * must never throw just because a request failed. All Firestore access lives
 * server-side behind these routes.
 */
const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function readJson<T>(response: Response): Promise<T | null> {
  if (!response.ok) return null;
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export const payrollService = {
  async getSettings(): Promise<PayrollSettings | null> {
    try {
      const response = await authenticatedFetch('/api/payroll/settings');
      return await readJson<PayrollSettings>(response);
    } catch {
      return null;
    }
  },

  async saveSettings(settings: Partial<PayrollSettings>): Promise<boolean> {
    try {
      const response = await authenticatedFetch('/api/payroll/settings', {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify(settings),
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  async calculateSalary(
    employeeId: string,
    month: number,
    year: number
  ): Promise<SalaryCalculationResult | null> {
    try {
      const response = await authenticatedFetch('/api/payroll/calculate', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ employeeId, month, year }),
      });
      return await readJson<SalaryCalculationResult>(response);
    } catch {
      return null;
    }
  },

  async generateSlips(
    employeeIds: string[],
    month: number,
    year: number,
    accessMap?: Record<string, boolean>
  ): Promise<EmployeeSalary[]> {
    try {
      const response = await authenticatedFetch('/api/payroll/generate', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ employeeIds, month, year, accessMap }),
      });
      const json = await readJson<{ slips?: EmployeeSalary[] }>(response);
      return json?.slips ?? [];
    } catch {
      return [];
    }
  },

  async getSlips(filters: {
    employeeId?: string;
    month?: number;
    year?: number;
    includeAll?: boolean;
  }): Promise<EmployeeSalary[]> {
    try {
      const params = new URLSearchParams();
      if (filters.employeeId) params.set('employeeId', filters.employeeId);
      if (filters.month !== undefined) params.set('month', String(filters.month));
      if (filters.year !== undefined) params.set('year', String(filters.year));
      if (filters.includeAll) params.set('includeAll', 'true');

      const query = params.toString();
      const response = await authenticatedFetch(`/api/payroll/slips${query ? `?${query}` : ''}`);
      const json = await readJson<EmployeeSalary[]>(response);
      return Array.isArray(json) ? json : [];
    } catch {
      return [];
    }
  },

  async getSlipById(id: string): Promise<EmployeeSalary | null> {
    try {
      const response = await authenticatedFetch(`/api/payroll/slips/${id}`);
      return await readJson<EmployeeSalary>(response);
    } catch {
      return null;
    }
  },

  async deleteSlip(id: string): Promise<boolean> {
    try {
      const response = await authenticatedFetch(`/api/payroll/slips/${id}`, { method: 'DELETE' });
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * Saves an edited slip. Identity is (employee, month, year), not a slip id, so
   * this also persists an edit to a row whose slip was never generated.
   */
  async saveSlip(payload: Record<string, unknown>): Promise<boolean> {
    try {
      const response = await authenticatedFetch('/api/payroll/slips', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  async updateSlipPan(slipId: string, pan: string): Promise<boolean> {
    try {
      const response = await authenticatedFetch(`/api/payroll/slips/${slipId}/pan`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ pan }),
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  async getTemplates(): Promise<SalarySlipTemplate[]> {
    try {
      const response = await authenticatedFetch('/api/payroll/templates');
      const json = await readJson<SalarySlipTemplate[]>(response);
      return Array.isArray(json) ? json : [];
    } catch {
      return [];
    }
  },

  async getTemplateById(id: string): Promise<SalarySlipTemplate | null> {
    try {
      const response = await authenticatedFetch(`/api/payroll/templates/${id}`);
      return await readJson<SalarySlipTemplate>(response);
    } catch {
      return null;
    }
  },

  async createTemplate(template: Omit<SalarySlipTemplate, 'id' | 'updatedAt'>): Promise<SalarySlipTemplate | null> {
    try {
      const response = await authenticatedFetch('/api/payroll/templates', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(template),
      });
      return await readJson<SalarySlipTemplate>(response);
    } catch {
      return null;
    }
  },

  async updateTemplate(id: string, template: Partial<SalarySlipTemplate>): Promise<boolean> {
    try {
      const response = await authenticatedFetch(`/api/payroll/templates/${id}`, {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify(template),
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  async deleteTemplate(id: string): Promise<boolean> {
    try {
      const response = await authenticatedFetch(`/api/payroll/templates/${id}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  async saveAccessConfig(accessConfig: Record<string, Record<string, boolean>>): Promise<boolean> {
    try {
      const response = await authenticatedFetch('/api/payroll/settings', {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ accessConfig }),
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  async updateSlipAccess(slipId: string, accessGranted: boolean): Promise<boolean> {
    try {
      const response = await authenticatedFetch(`/api/payroll/slips/${slipId}`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ accessGranted }),
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  async batchUpdateSlipAccess(
    updates: { slipId: string; accessGranted: boolean }[]
  ): Promise<boolean> {
    try {
      const response = await authenticatedFetch('/api/payroll/slips/batch-access', {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ updates }),
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};

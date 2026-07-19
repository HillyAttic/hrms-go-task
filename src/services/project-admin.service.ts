/**
 * Project Admin Service
 * Server-side service using Firebase Admin SDK for project operations
 */

import { createAdminService } from './admin-base.service';
import { Timestamp } from 'firebase-admin/firestore';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ProjectTeamMember {
  uid: string;
  name: string;
  email?: string;
  role?: string;
}

export interface ProjectClientSpoc {
  name: string;
  email?: string;
  phone?: string;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: Date | Timestamp | null;
}

export interface ProjectInvoice {
  raised: boolean;
  amount?: number;
  invoiceNumber?: string;
  raisedAt?: Date | Timestamp | null;
}

export interface ProjectProgress {
  percentage: number;
  milestones: ProjectMilestone[];
}

export interface Project {
  id?: string;
  projectNumber: string;

  // Core
  projectName: string;
  client: {
    id: string;
    name: string;
  };
  teamMembers: ProjectTeamMember[];
  clientSpoc: ProjectClientSpoc;

  // Dates
  startDate: Date | Timestamp;
  endDate?: Date | Timestamp | null;

  // Status
  status: 'wip' | 'completed' | 'pending_approval';

  // Financial
  projectValue: number;
  invoice: ProjectInvoice;

  // Progress
  progress: ProjectProgress;

  // Metadata
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ── Service ────────────────────────────────────────────────────────────────

const baseService = createAdminService<Project>('projects');

export const projectAdminService = {
  ...baseService,

  /**
   * Get all projects with search / status / team-member filters
   */
  async getAll(filters?: {
    status?: string;
    search?: string;
    teamMember?: string;
    clientId?: string;
    limit?: number;
  }): Promise<Project[]> {
    const options: any = {};

    // Status filter (server-side, indexed)
    if (filters?.status && filters.status !== 'all') {
      options.filters = [
        { field: 'status', operator: '==' as const, value: filters.status },
      ];
    }

    if (filters?.limit) {
      options.limit = filters.limit;
    }

    options.orderBy = { field: 'createdAt', direction: 'desc' as const };

    let projects = await baseService.getAll(options);

    // Client-side search
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      projects = projects.filter(
        (p) =>
          p.projectName.toLowerCase().includes(s) ||
          p.projectNumber?.toLowerCase().includes(s) ||
          p.client?.name?.toLowerCase().includes(s) ||
          p.clientSpoc?.name?.toLowerCase().includes(s) ||
          p.teamMembers?.some((m) => m.name.toLowerCase().includes(s))
      );
    }

    // Team-member filter
    if (filters?.teamMember && filters.teamMember !== 'all') {
      projects = projects.filter((p) =>
        p.teamMembers?.some((m) => m.uid === filters.teamMember)
      );
    }

    // Client filter
    if (filters?.clientId && filters.clientId !== 'all') {
      projects = projects.filter((p) => p.client?.id === filters.clientId);
    }

    return projects;
  },

  /**
   * Generate next project number  (PRJ-001, PRJ-002, …)
   */
  async generateProjectNumber(): Promise<string> {
    const projects = await baseService.getAll();

    let maxNumber = 0;
    projects.forEach((p) => {
      if (p.projectNumber) {
        const match = p.projectNumber.match(/^PRJ-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) maxNumber = num;
        }
      }
    });

    return `PRJ-${String(maxNumber + 1).padStart(3, '0')}`;
  },
};

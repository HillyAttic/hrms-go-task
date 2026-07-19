/**
 * Project Service
 * Client-side service for project Firebase operations
 */

import { createFirebaseService, QueryOptions } from './firebase.service';
import type {
  Project,
  ProjectTeamMember,
  ProjectClientSpoc,
  ProjectInvoice,
  ProjectProgress,
} from './project-admin.service';

// Re-export types so consumers can import from either service
export type {
  Project,
  ProjectTeamMember,
  ProjectClientSpoc,
  ProjectInvoice,
  ProjectProgress,
};

// ── Flat form-data shape (used by react-hook-form) ─────────────────────────

export interface ProjectFormData {
  projectName: string;
  clientId: string;
  clientName: string;
  teamMembers: ProjectTeamMember[];
  clientSpocName: string;
  clientSpocEmail?: string;
  clientSpocPhone?: string;
  startDate: string; // yyyy-mm-dd from <input type="date">
  endDate?: string;
  status: 'wip' | 'completed' | 'pending_approval';
  projectValue: number;
  invoiceRaised: boolean;
  invoiceAmount?: number;
  invoiceNumber?: string;
  invoiceRaisedAt?: string;
  progressPercentage: number;
  milestones: Array<{ id: string; title: string; completed: boolean }>;
}

// ── Service ────────────────────────────────────────────────────────────────

const projectFirebaseService = createFirebaseService<Project>('projects');

export const projectService = {
  /**
   * Get all projects with optional filters
   */
  async getAll(filters?: {
    status?: string;
    search?: string;
    teamMember?: string;
    page?: number;
    limit?: number;
  }): Promise<Project[]> {
    const options: QueryOptions = {};

    if (filters?.status && filters.status !== 'all') {
      options.filters = [
        { field: 'status', operator: '==', value: filters.status },
      ];
    }

    if (filters?.limit) {
      options.pagination = { pageSize: filters.limit };
    }

    options.orderByField = 'createdAt';
    options.orderDirection = 'desc';

    let projects = await projectFirebaseService.getAll(options);

    // Client-side search
    if (filters?.search) {
      projects = await projectFirebaseService.searchMultipleFields(
        ['projectName', 'projectNumber', 'client.name', 'clientSpoc.name'],
        filters.search,
        options
      );
    }

    // Team-member filter
    if (filters?.teamMember && filters.teamMember !== 'all') {
      const uid = filters.teamMember;
      projects = projects.filter((p) =>
        p.teamMembers?.some((m) => m.uid === uid)
      );
    }

    return projects;
  },

  /**
   * Get a project by ID
   */
  async getById(id: string): Promise<Project | null> {
    return projectFirebaseService.getById(id);
  },

  /**
   * Create a new project
   */
  async create(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    return projectFirebaseService.create(data);
  },

  /**
   * Update a project
   */
  async update(id: string, data: Partial<Omit<Project, 'id'>>): Promise<Project> {
    return projectFirebaseService.update(id, data);
  },

  /**
   * Delete a project
   */
  async delete(id: string): Promise<void> {
    return projectFirebaseService.delete(id);
  },

  /**
   * Bulk delete
   */
  async batchDelete(ids: string[]): Promise<void> {
    return projectFirebaseService.batchDelete(ids);
  },

  /**
   * Count projects
   */
  async count(filters?: { status?: string }): Promise<number> {
    const options: QueryOptions = {};

    if (filters?.status && filters.status !== 'all') {
      options.filters = [
        { field: 'status', operator: '==', value: filters.status },
      ];
    }

    return projectFirebaseService.count(options);
  },
};

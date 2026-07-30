/**
 * Project Admin Service
 * Server-side service using Firebase Admin SDK for project operations
 */

import { createAdminService } from './admin-base.service';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ProjectTeamMember {
  uid: string;
  name: string;
  email?: string;
  role?: string;
  isTeamLead?: boolean; // Marks this member as the Team Lead for the project
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

  // Linked Team (auto-created from project team members)
  linkedTeamId?: string;

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

  /**
   * Sync project team members to a linked team in the 'teams' collection.
   * Creates or updates a team with linkedProjectId matching this project.
   * The member with isTeamLead=true becomes the team leader.
   */
  async syncProjectTeam(
    projectId: string,
    projectName: string,
    teamMembers: ProjectTeamMember[]
  ): Promise<string> {
    console.log('[syncProjectTeam] Starting sync for project:', projectId, projectName);
    console.log('[syncProjectTeam] Team members:', teamMembers);

    try {
      // Get the project to find the linkedTeamId
      const project = await baseService.getById(projectId);
      console.log('[syncProjectTeam] Found project, linkedTeamId:', project?.linkedTeamId);
      let teamId = project?.linkedTeamId;

      // Find the team lead (member with isTeamLead=true)
      const teamLead = teamMembers.find((m) => m.isTeamLead);
      const leaderId = teamLead?.uid;
      const leaderName = teamLead?.name || '';

      // Map project team members to team members format.
      // IMPORTANT: Do NOT include fields that may be `undefined` (e.g. email) —
      // Firestore rejects documents with undefined values, which silently fails
      // the entire team write. Only include fields with definite values.
      const members = teamMembers.map((m) => {
        const member: { id: string; name: string; role: string; email?: string } = {
          id: m.uid,
          name: m.name,
          role: m.role || 'Employee',
        };
        if (m.email) member.email = m.email;
        return member;
      });

      const memberIds = teamMembers.map((m) => m.uid);

      // Prepare team data
      const teamData: any = {
        name: `${projectName} Team`,
        description: `Auto-created from project: ${projectName}`,
        leaderId: leaderId || null,
        leaderName: leaderName,
        memberIds: memberIds,
        members: members,
        status: 'active' as const,
        linkedProjectId: projectId,
        linkedProjectName: projectName,
        updatedAt: new Date(),
      };

      console.log('[syncProjectTeam] Team data to write:', teamData);

      if (teamId) {
        // Update existing linked team
        await adminDb.collection('teams').doc(teamId).update(teamData);
        console.log(`[syncProjectTeam] Updated team ${teamId} for project ${projectId}`);
      } else {
        // Create new team
        teamData.createdAt = new Date();
        const newTeamRef = await adminDb.collection('teams').add(teamData);
        teamId = newTeamRef.id;

        // Update project with linkedTeamId
        await baseService.update(projectId, { linkedTeamId: teamId });
        console.log(`[syncProjectTeam] Created team ${teamId} for project ${projectId}`);
      }

      return teamId;
    } catch (error) {
      console.error('[syncProjectTeam] Error syncing team:', error);
      throw error;
    }
  },
};

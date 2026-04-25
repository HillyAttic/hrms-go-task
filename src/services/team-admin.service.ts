/**
 * Team Admin Service
 * Server-side service using Firebase Admin SDK for team operations
 */

import { createAdminService } from './admin-base.service';
import { adminDb } from '@/lib/firebase-admin';

export interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  role: string;
}

export interface Team {
  id?: string;
  name: string;
  description: string;
  leaderId?: string;
  leaderName?: string;
  memberIds: string[];
  members: TeamMember[];
  status: 'active' | 'inactive' | 'archived';
  createdAt?: Date;
  updatedAt?: Date;
}

// Create base admin service
const baseService = createAdminService<Team>('teams');

/**
 * Populate team member details and leader name from employees collection
 */
async function populateTeamMembers(team: Team): Promise<Team> {
  console.log(`[populateTeamMembers] Processing team: ${team.name}`, {
    leaderId: team.leaderId,
    memberIds: team.memberIds,
    existingMembers: team.members?.length || 0,
  });

  // NOTE: Employee data is stored in the 'users' collection, NOT 'employees'
  // Field names: displayName (primary) or name (fallback)

  // Populate leader name
  let leaderName = '';
  if (team.leaderId) {
    try {
      const leaderDoc = await adminDb.collection('users').doc(team.leaderId).get();
      if (leaderDoc.exists) {
        const leaderData = leaderDoc.data()!;
        leaderName = leaderData.displayName || leaderData.name || '';
        console.log(`[populateTeamMembers] Found leader: ${leaderName}`);
      } else {
        console.log(`[populateTeamMembers] Leader not found in 'users' collection: ${team.leaderId}`);
      }
    } catch (error) {
      console.error(`[populateTeamMembers] Error fetching leader ${team.leaderId}:`, error);
    }
  }

  // Populate members array from memberIds
  const members: TeamMember[] = [];
  if (team.memberIds && team.memberIds.length > 0) {
    console.log(`[populateTeamMembers] Fetching ${team.memberIds.length} members from 'users' collection`);
    for (const memberId of team.memberIds) {
      try {
        const empDoc = await adminDb.collection('users').doc(memberId).get();
        if (empDoc.exists) {
          const emp = empDoc.data()!;
          const memberName = emp.displayName || emp.name || 'Unknown';
          const member: TeamMember = {
            id: memberId,
            name: memberName,
            role: emp.role || 'Employee',
          };
          // Only add avatar if it exists (avoid undefined)
          const avatarUrl = emp.avatar || emp.photoURL;
          if (avatarUrl) {
            member.avatar = avatarUrl;
          }
          members.push(member);
          console.log(`[populateTeamMembers] Added member: ${memberName}`);
        } else {
          console.log(`[populateTeamMembers] Member not found in 'users' collection: ${memberId}`);
        }
      } catch (error) {
        console.error(`[populateTeamMembers] Error fetching member ${memberId}:`, error);
      }
    }
  }

  const result = {
    ...team,
    leaderName,
    members,
  };

  console.log(`[populateTeamMembers] Result for ${team.name}:`, {
    leaderName: result.leaderName,
    membersCount: result.members.length,
    members: result.members.map(m => m.name),
  });

  return result;
}

/**
 * Team Admin Service - Server-side only
 */
export const teamAdminService = {
  ...baseService,

  /**
   * Get a team by ID with populated member details
   */
  async getById(id: string): Promise<Team | null> {
    const team = await baseService.getById(id);
    if (!team) return null;
    return await populateTeamMembers(team);
  },

  /**
   * Get all teams with optional filters
   */
  async getAll(filters?: {
    status?: string;
    department?: string;
    search?: string;
    limit?: number;
  }): Promise<Team[]> {
    const options: any = {
      filters: [],
    };

    // Add status filter
    if (filters?.status) {
      options.filters.push({
        field: 'status',
        operator: '==',
        value: filters.status,
      });
    }

    // Add department filter
    if (filters?.department) {
      options.filters.push({
        field: 'department',
        operator: '==',
        value: filters.department,
      });
    }

    // Add limit
    if (filters?.limit) {
      options.limit = filters.limit;
    }

    // Add default ordering
    options.orderBy = {
      field: 'createdAt',
      direction: 'desc' as const,
    };

    let teams = await baseService.getAll(options);

    // Apply search filter (client-side)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      teams = teams.filter(
        (team) =>
          team.name.toLowerCase().includes(searchLower) ||
          team.description?.toLowerCase().includes(searchLower)
      );
    }

    // Populate member details and leader name from employees collection
    const populatedTeams = await Promise.all(teams.map(populateTeamMembers));

    return populatedTeams;
  },

  /**
   * Add a member to a team
   */
  async addMember(id: string, member: TeamMember): Promise<Team> {
    const team = await baseService.getById(id);
    if (!team) {
      throw new Error('Team not found');
    }

    // Check if member already exists
    const memberExists = team.members.some((m) => m.id === member.id);
    if (memberExists) {
      throw new Error('Member already exists in team');
    }

    const updatedMembers = [...team.members, member];
    const updatedMemberIds = [...team.memberIds, member.id];

    return await baseService.update(id, {
      members: updatedMembers,
      memberIds: updatedMemberIds,
    });
  },

  /**
   * Remove a member from a team
   */
  async removeMember(id: string, memberId: string): Promise<Team> {
    const team = await baseService.getById(id);
    if (!team) {
      throw new Error('Team not found');
    }

    const updatedMembers = team.members.filter((m) => m.id !== memberId);
    const updatedMemberIds = team.memberIds.filter((id) => id !== memberId);

    return await baseService.update(id, {
      members: updatedMembers,
      memberIds: updatedMemberIds,
    });
  },

  /**
   * Update a team member's role
   */
  async updateMemberRole(
    teamId: string,
    memberId: string,
    newRole: string
  ): Promise<Team> {
    const team = await baseService.getById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    const updatedMembers = team.members.map((m) =>
      m.id === memberId ? { ...m, role: newRole } : m
    );

    return await baseService.update(teamId, { members: updatedMembers });
  },

  /**
   * Get teams by member ID
   * Optimized to use indexed Firestore queries instead of full collection scan
   */
  async getTeamsByMember(memberId: string): Promise<Team[]> {
    const { adminDb } = await import('@/lib/firebase-admin');

    console.log(`[Team Admin Service] Getting teams for member: ${memberId}`);

    // Query 1: Teams where user is in memberIds array (indexed query)
    const memberTeamsSnapshot = await adminDb
      .collection('teams')
      .where('memberIds', 'array-contains', memberId)
      .get();

    // Query 2: Teams where user is the leader (indexed query)
    const leaderTeamsSnapshot = await adminDb
      .collection('teams')
      .where('leaderId', '==', memberId)
      .get();

    // Combine and deduplicate team IDs
    const teamIds = new Set<string>();
    memberTeamsSnapshot.docs.forEach(doc => teamIds.add(doc.id));
    leaderTeamsSnapshot.docs.forEach(doc => teamIds.add(doc.id));

    console.log(`[Team Admin Service] Found ${teamIds.size} teams for member ${memberId}`);

    // Fetch full team documents with populated members
    const teams = await Promise.all(
      Array.from(teamIds).map(async (teamId) => {
        const team = await baseService.getById(teamId);
        return populateTeamMembers(team);
      })
    );

    return teams;
  },

  /**
   * Get teams by leader ID
   */
  async getTeamsByLeader(leaderId: string): Promise<Team[]> {
    return await baseService.getAll({
      filters: [
        {
          field: 'leaderId',
          operator: '==',
          value: leaderId,
        },
      ],
    });
  },

  /**
   * Get team member count
   */
  getMemberCount(team: Team): number {
    return team.members.length;
  },
};

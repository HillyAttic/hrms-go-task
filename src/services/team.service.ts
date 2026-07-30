/**
 * Team Service
 * Handles all team-related Firebase operations
 */

import { createFirebaseService, QueryOptions } from './firebase.service';

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
  linkedProjectId?: string;
  linkedProjectName?: string; // Name of the linked project (set when auto-synced from a project)
  createdAt?: Date;
  updatedAt?: Date;
}

// Create the Firebase service instance for teams
const teamFirebaseService = createFirebaseService<Team>('teams');

/**
 * Team Service API
 */
export const teamService = {
  /**
   * Get all teams with optional filters
   */
  async getAll(filters?: {
    status?: string;
    department?: string;
    search?: string;
    limit?: number;
  }): Promise<Team[]> {
    const options: QueryOptions = {
      filters: [],
    };

    // Add status filter
    if (filters?.status) {
      options.filters!.push({
        field: 'status',
        operator: '==',
        value: filters.status,
      });
    }

    // Add department filter
    if (filters?.department) {
      options.filters!.push({
        field: 'department',
        operator: '==',
        value: filters.department,
      });
    }

    // Add pagination
    if (filters?.limit) {
      options.pagination = {
        pageSize: filters.limit,
      };
    }

    // Add default ordering
    options.orderByField = 'createdAt';
    options.orderDirection = 'desc';

    let teams = await teamFirebaseService.getAll(options);

    // Apply search filter (client-side)
    if (filters?.search) {
      teams = await teamFirebaseService.searchMultipleFields(
        ['name', 'description', 'department'],
        filters.search,
        options
      );
    }

    return teams;
  },

  /**
   * Get a team by ID
   */
  async getById(id: string): Promise<Team | null> {
    return teamFirebaseService.getById(id);
  },

  /**
   * Create a new team
   */
  async create(
    data: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Team> {
    return teamFirebaseService.create(data);
  },

  /**
   * Update a team
   */
  async update(
    id: string,
    data: Partial<Omit<Team, 'id'>>
  ): Promise<Team> {
    return teamFirebaseService.update(id, data);
  },

  /**
   * Delete a team
   */
  async delete(id: string): Promise<void> {
    return teamFirebaseService.delete(id);
  },

  /**
   * Add a member to a team
   */
  async addMember(id: string, member: TeamMember): Promise<Team> {
    const team = await teamFirebaseService.getById(id);
    if (!team) {
      throw new Error('Team not found');
    }

    // Check if member already exists
    const memberExists = team.members.some((m) => m.id === member.id);
    if (memberExists) {
      throw new Error('Member already exists in team');
    }

    const updatedMembers = [...team.members, member];
    return teamFirebaseService.update(id, { members: updatedMembers });
  },

  /**
   * Remove a member from a team
   */
  async removeMember(id: string, memberId: string): Promise<Team> {
    const team = await teamFirebaseService.getById(id);
    if (!team) {
      throw new Error('Team not found');
    }

    const updatedMembers = team.members.filter((m) => m.id !== memberId);
    return teamFirebaseService.update(id, { members: updatedMembers });
  },

  /**
   * Update a team member's role
   */
  async updateMemberRole(
    teamId: string,
    memberId: string,
    newRole: string
  ): Promise<Team> {
    const team = await teamFirebaseService.getById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    const updatedMembers = team.members.map((m) =>
      m.id === memberId ? { ...m, role: newRole } : m
    );

    return teamFirebaseService.update(teamId, { members: updatedMembers });
  },

  /**
   * Get teams by member ID
   */
  async getTeamsByMember(memberId: string): Promise<Team[]> {
    const allTeams = await teamFirebaseService.getAll();
    console.log(`[Team Service] Getting teams for member: ${memberId}`);
    console.log(`[Team Service] Total teams in database: ${allTeams.length}`);
    
    const memberTeams = allTeams.filter((team) => {
      // Check if member is in the members array (by id)
      const isMember = team.members.some((m) => m.id === memberId);
      // Check if member is the leader
      const isLeader = team.leaderId === memberId;
      // Check if member is in memberIds array
      const isInMemberIds = team.memberIds && team.memberIds.includes(memberId);
      
      console.log(`[Team Service] Team "${team.name}" (${team.id}):`, {
        members: team.members.map(m => ({ id: m.id, name: m.name })),
        memberIds: team.memberIds,
        leaderId: team.leaderId,
        isMember,
        isLeader,
        isInMemberIds,
        willInclude: isMember || isLeader || isInMemberIds
      });
      
      return isMember || isLeader || isInMemberIds;
    });
    
    console.log(`[Team Service] Member ${memberId} is in ${memberTeams.length} teams`);
    return memberTeams;
  },

  /**
   * Get teams by leader ID
   */
  async getTeamsByLeader(leaderId: string): Promise<Team[]> {
    return teamFirebaseService.getAll({
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

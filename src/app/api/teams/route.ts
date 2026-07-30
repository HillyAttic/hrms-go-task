import { NextRequest, NextResponse } from 'next/server';
import { teamAdminService } from '@/services/team-admin.service';
import { teamSchema } from '@/lib/validation';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * Backfill teams from existing projects.
 * For every project that has teamMembers but no corresponding team in the teams collection,
 * create a team doc linked to that project.
 */
async function backfillTeamsFromProjects() {
  try {
    const { adminDb } = await import('@/lib/firebase-admin');

    // Get all existing teams to find which projects already have linked teams
    const teamsSnapshot = await adminDb.collection('teams').get();
    const projectsWithTeams = new Set<string>();
    teamsSnapshot.forEach((doc: any) => {
      const data = doc.data();
      if (data.linkedProjectId) {
        projectsWithTeams.add(data.linkedProjectId);
      }
    });

    console.log(`[Backfill] Found ${teamsSnapshot.size} teams, ${projectsWithTeams.size} already linked to projects`);

    // Get all projects
    const projectsSnapshot = await adminDb.collection('projects').get();
    let createdCount = 0;

    for (const projectDoc of projectsSnapshot.docs) {
      const projectId = projectDoc.id;
      const projectData = projectDoc.data();

      // Skip if project already has a linked team
      if (projectsWithTeams.has(projectId)) {
        continue;
      }

      // Skip if project has no team members
      if (!projectData.teamMembers || !Array.isArray(projectData.teamMembers) || projectData.teamMembers.length === 0) {
        continue;
      }

      // Find team lead
      const teamLead = projectData.teamMembers.find((m: any) => m.isTeamLead);

      // Map team members (without undefined fields)
      const members = projectData.teamMembers.map((m: any) => {
        const member: any = {
          id: m.uid,
          name: m.name,
          role: m.role || 'Employee',
        };
        if (m.email) member.email = m.email;
        return member;
      });

      const memberIds = projectData.teamMembers.map((m: any) => m.uid);

      // Create team doc
      const teamData: any = {
        name: `${projectData.projectName} Team`,
        description: `Auto-created from project: ${projectData.projectName}`,
        leaderId: teamLead?.uid || null,
        leaderName: teamLead?.name || '',
        memberIds: memberIds,
        members: members,
        status: 'active',
        linkedProjectId: projectId,
        linkedProjectName: projectData.projectName,
        createdAt: projectData.createdAt || new Date(),
        updatedAt: new Date(),
      };

      const teamRef = await adminDb.collection('teams').add(teamData);

      // Update project with linkedTeamId
      await adminDb.collection('projects').doc(projectId).update({
        linkedTeamId: teamRef.id,
      });

      createdCount++;
      console.log(`[Backfill] Created team for project: ${projectData.projectName} (${projectId})`);
    }

    console.log(`[Backfill] Created ${createdCount} teams from existing projects`);
    return createdCount;
  } catch (error) {
    console.error('[Backfill] Error during team backfill:', error);
    return 0;
  }
}

/**
 * GET /api/teams - List teams with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager', 'employee'].includes(userRole)) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }

    const { searchParams } = new URL(request.url);

    const filters = {
      status: searchParams.get('status') || undefined,
      department: searchParams.get('department') || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    };

    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== undefined)
    );

    let teams = await teamAdminService.getAll(cleanFilters);

    // Backfill: if no teams exist, create teams from projects that have team members
    if (teams.length === 0 && userRole === 'admin') {
      console.log('[API /api/teams GET] No teams found, triggering backfill from projects...');
      const backfillCount = await backfillTeamsFromProjects();
      if (backfillCount > 0) {
        console.log(`[API /api/teams GET] Backfill created ${backfillCount} teams, refetching...`);
        teams = await teamAdminService.getAll(cleanFilters);
      }
    }

    // Managers only see teams they lead or are a member of
    if (userRole === 'manager') {
      const userId = authResult.user.uid;
      teams = teams.filter(
        (team: any) => team.leaderId === userId || (team.memberIds && team.memberIds.includes(userId))
      );
    }

    return NextResponse.json({ success: true, data: teams, count: teams.length });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/teams - Create a new team
 */
export async function POST(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can create teams');
    }

    const body = await request.json();

    const validationResult = teamSchema.safeParse(body);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const validatedData = validationResult.data;

    // Use Admin SDK to look up employee names from 'users' collection
    const { adminDb } = await import('@/lib/firebase-admin');

    let leaderName = '';
    if (validatedData.leaderId) {
      const leaderDoc = await adminDb.collection('users').doc(validatedData.leaderId).get();
      if (leaderDoc.exists) {
        const leaderData = leaderDoc.data()!;
        leaderName = leaderData.displayName || leaderData.name || '';
      }
    }

    const members = [];
    if (validatedData.memberIds && validatedData.memberIds.length > 0) {
      for (const memberId of validatedData.memberIds) {
        const empDoc = await adminDb.collection('users').doc(memberId).get();
        if (empDoc.exists) {
          const emp = empDoc.data()!;
          const member: any = {
            id: memberId,
            name: emp.displayName || emp.name || 'Unknown',
            role: emp.role || 'Employee',
          };
          // Only add avatar if it exists (avoid undefined)
          const avatarUrl = emp.avatar || emp.photoURL;
          if (avatarUrl) {
            member.avatar = avatarUrl;
          }
          members.push(member);
        }
      }
    }

    const team = await teamAdminService.create({
      name: validatedData.name,
      description: validatedData.description || '',
      leaderId: validatedData.leaderId,
      leaderName,
      memberIds: validatedData.memberIds || [],
      members,
      status: validatedData.status || 'active',
    });

    return NextResponse.json(
      { success: true, data: team, message: 'Team created successfully' },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
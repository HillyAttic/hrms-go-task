import { NextRequest, NextResponse } from 'next/server';
import { projectAdminService } from '@/services/project-admin.service';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

// ── Validation Schemas ─────────────────────────────────────────────────────

const teamMemberSchema = z.object({
  uid: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email().optional(),
  role: z.string().optional(),
});

const milestoneSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  completed: z.boolean().default(false),
  completedAt: z.string().datetime().optional().nullable(),
});

const createProjectSchema = z.object({
  projectName: z.string().min(1, 'Project name is required').max(200),
  client: z.object({
    id: z.string().min(1, 'Client is required'),
    name: z.string().min(1),
  }),
  teamMembers: z.array(teamMemberSchema).min(1, 'At least one team member is required'),
  clientSpoc: z.object({
    name: z.string().min(1, 'Client SPOC name is required'),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional().nullable(),
  status: z.enum(['wip', 'completed', 'pending_approval']).default('wip'),
  projectValue: z.number().min(0, 'Project value cannot be negative'),
  invoice: z.object({
    raised: z.boolean().default(false),
    amount: z.number().min(0).optional(),
    invoiceNumber: z.string().optional(),
    raisedAt: z.string().datetime().optional().nullable(),
  }).default({ raised: false }),
  progress: z.object({
    percentage: z.number().min(0).max(100).default(0),
    milestones: z.array(milestoneSchema).default([]),
  }).default({ percentage: 0, milestones: [] }),
});

/**
 * GET /api/projects
 * List all projects with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const teamMember = searchParams.get('teamMember') || undefined;
    const clientId = searchParams.get('clientId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '1000');

    const projects = await projectAdminService.getAll({
      status,
      search,
      teamMember,
      clientId,
      limit,
    });

    return NextResponse.json({
      data: projects,
      total: projects.length,
    });
  } catch (error) {
    console.error('[API /api/projects] Error:', error);
    return handleApiError(error);
  }
}

/**
 * POST /api/projects
 * Create a new project
 */
export async function POST(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const body = await request.json();

    const validationResult = createProjectSchema.safeParse(body);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const data = validationResult.data;

    // Generate project number
    const projectNumber = await projectAdminService.generateProjectNumber();

    // Convert date strings to Date objects
    const projectData = {
      ...data,
      projectNumber,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      invoice: {
        ...data.invoice,
        raisedAt: data.invoice.raisedAt ? new Date(data.invoice.raisedAt) : null,
      },
      progress: {
        ...data.progress,
        milestones: data.progress.milestones.map((m) => ({
          ...m,
          completedAt: m.completedAt ? new Date(m.completedAt) : null,
        })),
      },
      createdBy: authResult.user.uid,
    };

    const newProject = await projectAdminService.create(projectData as any);

    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    console.error('[API /api/projects] Error:', error);
    return handleApiError(error);
  }
}

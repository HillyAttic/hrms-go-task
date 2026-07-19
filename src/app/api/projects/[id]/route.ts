import { NextRequest, NextResponse } from 'next/server';
import { projectAdminService } from '@/services/project-admin.service';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

// ── Validation Schema (all fields optional for partial update) ─────────────

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

const updateProjectSchema = z.object({
  projectName: z.string().min(1).max(200).optional(),
  client: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
  }).optional(),
  teamMembers: z.array(teamMemberSchema).min(1).optional(),
  clientSpoc: z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  status: z.enum(['wip', 'completed', 'pending_approval']).optional(),
  projectValue: z.number().min(0).optional(),
  invoice: z.object({
    raised: z.boolean(),
    amount: z.number().min(0).optional(),
    invoiceNumber: z.string().optional(),
    raisedAt: z.string().datetime().optional().nullable(),
  }).optional(),
  progress: z.object({
    percentage: z.number().min(0).max(100),
    milestones: z.array(milestoneSchema),
  }).optional(),
});

/**
 * GET /api/projects/[id]
 * Get a single project by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const { id } = await params;

    const project = await projectAdminService.getById(id);

    if (!project) {
      return ErrorResponses.notFound('Project');
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('[API /api/projects/[id]] GET Error:', error);
    return handleApiError(error);
  }
}

/**
 * PUT /api/projects/[id]
 * Update a project
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const { id } = await params;
    const body = await request.json();

    const validationResult = updateProjectSchema.safeParse(body);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    // Check if project exists
    const existingProject = await projectAdminService.getById(id);
    if (!existingProject) {
      return ErrorResponses.notFound('Project');
    }

    // Convert date strings to Date objects for update
    const updateData: any = { ...validationResult.data };

    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate !== undefined) {
      updateData.endDate = updateData.endDate ? new Date(updateData.endDate) : null;
    }
    if (updateData.invoice?.raisedAt) {
      updateData.invoice = {
        ...updateData.invoice,
        raisedAt: updateData.invoice.raisedAt ? new Date(updateData.invoice.raisedAt) : null,
      };
    }
    if (updateData.progress?.milestones) {
      updateData.progress = {
        ...updateData.progress,
        milestones: updateData.progress.milestones.map((m: any) => ({
          ...m,
          completedAt: m.completedAt ? new Date(m.completedAt) : null,
        })),
      };
    }

    const updatedProject = await projectAdminService.update(id, updateData);

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('[API /api/projects/[id]] PUT Error:', error);
    return handleApiError(error);
  }
}

/**
 * DELETE /api/projects/[id]
 * Delete a project
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const { id } = await params;

    // Check if project exists
    const existingProject = await projectAdminService.getById(id);
    if (!existingProject) {
      return ErrorResponses.notFound('Project');
    }

    await projectAdminService.delete(id);

    return NextResponse.json(
      { message: 'Project deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API /api/projects/[id]] DELETE Error:', error);
    return handleApiError(error);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { clientAdminService } from '@/services/client-admin.service';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

// Validation schema for client update
const updateClientSchema = z.object({
  clientName: z.string().min(1).max(100).optional(),
  serialNumber: z.string().optional(),
  businessName: z.string().optional(),
  taxIdentifiers: z.object({
    pan: z.string().optional(),
    tan: z.string().optional(),
    gstin: z.string().optional(),
  }).optional(),
  contact: z.object({
    email: z.string().optional(),
    phone: z.string().optional(),
  }).optional(),
  address: z.object({
    line1: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    zipCode: z.string().optional(),
  }).optional(),
  compliance: z.object({
    roc: z.boolean(),
    gstr1: z.boolean(),
    gst3b: z.boolean(),
    iff: z.boolean(),
    itr: z.boolean(),
    taxAudit: z.boolean(),
    accounting: z.boolean(),
    clientVisit: z.boolean(),
    bank: z.boolean(),
    tcs: z.boolean().default(false),
    tds: z.boolean().default(false),
    statutoryAudit: z.boolean().default(false),
  }).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

/**
 * GET /api/clients/[id]
 * Get a single client by ID
 * Validates Requirements: 1.3
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);
    
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    // Check role-based permissions
    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can access this resource');
    }

    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const { id } = await params;

    const client = await clientAdminService.getById(id);

    if (!client) {
      return ErrorResponses.notFound('Client');
    }

    return NextResponse.json(client);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/clients/[id]
 * Update a client
 * Validates Requirements: 1.3
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);
    
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    // Check role-based permissions
    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can access this resource');
    }

    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validationResult = updateClientSchema.safeParse(body);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const updateData = validationResult.data;

    // Check if client exists
    const existingClient = await clientAdminService.getById(id);
    if (!existingClient) {
      return ErrorResponses.notFound('Client');
    }

    // Update client
    const updatedClient = await clientAdminService.update(id, updateData);

    return NextResponse.json(updatedClient);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/clients/[id]
 * Delete a client
 * Validates Requirements: 1.6
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);
    
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    // Check role-based permissions
    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can access this resource');
    }

    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const { id } = await params;

    // Check if client exists
    const existingClient = await clientAdminService.getById(id);
    if (!existingClient) {
      return ErrorResponses.notFound('Client');
    }

    // Delete client
    await clientAdminService.delete(id);

    return NextResponse.json(
      { message: 'Client deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

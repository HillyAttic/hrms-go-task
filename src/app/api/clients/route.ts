import { NextRequest, NextResponse } from 'next/server';
import { clientAdminService } from '@/services/client-admin.service';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

// Validation schema for client creation
const createClientSchema = z.object({
  clientName: z.string().min(1, 'Client name is required').max(100),
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
  status: z.enum(['active', 'inactive']).default('active'),
});

/**
 * GET /api/clients
 * List all clients with optional pagination and filters
 * Uses Admin SDK to bypass Firestore security rules
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

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '1000');

    let clients = await clientAdminService.getAll({ status, search, limit });

    // Non-admin filtering: only show clients the admin has assigned to this user
    if (userRole !== 'admin') {
      const { adminDb } = await import('@/lib/firebase-admin');
      const accessSnapshot = await adminDb
        .collection('client_access')
        .where('userId', '==', authResult.user.uid)
        .limit(1)
        .get();

      if (accessSnapshot.empty) {
        // No access doc → user sees zero clients
        clients = [];
      } else {
        const allowedIds: string[] = accessSnapshot.docs[0].data().allowedClientIds || [];
        const allowedSet = new Set(allowedIds);
        clients = clients.filter((c: any) => c.id && allowedSet.has(c.id));
      }
    }

    return NextResponse.json({ data: clients, page, limit, total: clients.length });
  } catch (error) {
    console.error('[API /api/clients] Error:', error);
    return handleApiError(error);
  }
}

/**
 * POST /api/clients
 * Create a new client
 * Uses Admin SDK to bypass Firestore security rules
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
      return ErrorResponses.forbidden('Only managers and admins can create clients');
    }

    const body = await request.json();

    const validationResult = createClientSchema.safeParse(body);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const newClient = await clientAdminService.create(validationResult.data);

    return NextResponse.json(newClient, { status: 201 });
  } catch (error) {
    console.error('[API /api/clients] Error:', error);
    return handleApiError(error);
  }
}

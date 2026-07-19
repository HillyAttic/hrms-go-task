import { NextRequest, NextResponse } from 'next/server';
import { employeeAdminService } from '@/services/employee-admin.service';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

// Validation schema for employee creation
const createEmployeeSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required').max(50),
  name: z.string().min(1, 'Name is required').max(100),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email format'),
  phone: z.string().regex(/^\+?[\d\s\-()]*$/, 'Invalid phone format').optional().default(''),
  department: z.string().optional(),
  dateOfBirth: z.string().optional(),
  salary: z.number().optional(),
  dateOfJoining: z.string().optional(),
  role: z.enum(['Manager', 'Admin', 'Employee']),
  status: z.enum(['active', 'on-leave', 'resigned']).default('active'),
  password: z.string().optional(),
  // Manager info
  managerId: z.string().optional(),
  managerName: z.string().optional(),
  reportees: z.array(z.object({
    id: z.string(),
    name: z.string(),
    employeeId: z.string(),
  })).optional(),
  // Probation & Promotion
  probationDuration: z.number().optional(),
  probationEndDate: z.string().optional(),
  workAnniversary: z.string().optional(),
  salaryChanges: z.array(z.object({
    date: z.string(),
    oldSalary: z.number(),
    newSalary: z.number(),
    reason: z.enum(['probation', 'promotion', 'revision']),
    notes: z.string().optional(),
  })).optional(),
  promotionDate: z.string().optional(),
  promotionDetails: z.string().optional(),
  // Documents
  documents: z.object({
    addressProof: z.union([z.string(), z.object({
      url: z.string(),
      path: z.string().optional(),
      name: z.string().optional(),
      size: z.number().optional(),
      mimeType: z.string().optional(),
    })]).optional(),
    cancelledCheque: z.union([z.string(), z.object({
      url: z.string(),
      path: z.string().optional(),
      name: z.string().optional(),
      size: z.number().optional(),
      mimeType: z.string().optional(),
    })]).optional(),
    aadhaarCard: z.union([z.string(), z.object({
      url: z.string(),
      path: z.string().optional(),
      name: z.string().optional(),
      size: z.number().optional(),
      mimeType: z.string().optional(),
    })]).optional(),
    panCard: z.union([z.string(), z.object({
      url: z.string(),
      path: z.string().optional(),
      name: z.string().optional(),
      size: z.number().optional(),
      mimeType: z.string().optional(),
    })]).optional(),
    resignationLetter: z.union([z.string(), z.object({
      url: z.string(),
      path: z.string().optional(),
      name: z.string().optional(),
      size: z.number().optional(),
      mimeType: z.string().optional(),
    })]).optional(),
    salarySlips: z.array(z.union([z.string(), z.object({
      url: z.string(),
      path: z.string().optional(),
      name: z.string().optional(),
      size: z.number().optional(),
      mimeType: z.string().optional(),
    })])).optional(),
    marksheet10th: z.union([z.string(), z.object({
      url: z.string(),
      path: z.string().optional(),
      name: z.string().optional(),
      size: z.number().optional(),
      mimeType: z.string().optional(),
    })]).optional(),
    marksheet12th: z.union([z.string(), z.object({
      url: z.string(),
      path: z.string().optional(),
      name: z.string().optional(),
      size: z.number().optional(),
      mimeType: z.string().optional(),
    })]).optional(),
    degree: z.union([z.string(), z.object({
      url: z.string(),
      path: z.string().optional(),
      name: z.string().optional(),
      size: z.number().optional(),
      mimeType: z.string().optional(),
    })]).optional(),
  }).optional(),
});

/**
 * GET /api/employees
 * List all employees with optional pagination and filters
 * Uses Admin SDK to bypass Firestore security rules
 * Validates Requirements: 5.1, 5.7, 5.8
 */
export async function GET(request: NextRequest) {
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

    console.log('[API /api/employees] GET request received');

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = parseInt(searchParams.get('limit') || '1000');

    console.log('[API /api/employees] Filters:', { status, search, limit });

    // Managers only see employees assigned to them via manager-hierarchies
    if (userRole === 'manager') {
      const { adminDb } = await import('@/lib/firebase-admin');

      const hierarchySnapshot = await adminDb
        .collection('manager-hierarchies')
        .where('managerId', '==', authResult.user.uid)
        .limit(1)
        .get();

      if (hierarchySnapshot.empty) {
        return NextResponse.json({ data: [], total: 0 });
      }

      const hierarchy = hierarchySnapshot.docs[0].data();
      const employeeIds: string[] = hierarchy.employeeIds || [];

      if (employeeIds.length === 0) {
        return NextResponse.json({ data: [], total: 0 });
      }

      // Fetch employee docs individually (avoids Firestore 'in' 30-item limit)
      const employeeDocs = await Promise.all(
        employeeIds.map((id: string) => adminDb.collection('users').doc(id).get())
      );

      let employees = employeeDocs
        .filter((doc) => doc.exists)
        .map((doc) => {
          const data = doc.data()!;
          return {
            id: doc.id,
            employeeId: data.employeeId || data.uid || doc.id,
            name: data.displayName || data.name || '',
            email: data.email || '',
            phone: data.phoneNumber || data.phone || '',
            role: employeeAdminService.mapUserRoleToEmployeeRole(data.role),
            status: (data.status as 'active' | 'on-leave' | 'resigned') || 'active',
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
          };
        });

      // Apply status filter
      if (status) {
        employees = employees.filter((emp) => emp.status === status);
      }

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        employees = employees.filter(
          (emp) =>
            emp.name.toLowerCase().includes(searchLower) ||
            emp.email.toLowerCase().includes(searchLower) ||
            emp.employeeId.toLowerCase().includes(searchLower)
        );
      }

      console.log(`[API /api/employees] Manager ${authResult.user.uid} - Returning ${employees.length} assigned employees`);

      return NextResponse.json({ data: employees, total: employees.length });
    }

    // Admins see all employees
    const employees = await employeeAdminService.getAll({
      status,
      search,
      limit,
    });

    console.log(`[API /api/employees] Returning ${employees.length} employees`);

    return NextResponse.json({
      data: employees,
      total: employees.length,
    });
  } catch (error) {
    console.error('[API /api/employees] Error:', error);
    return handleApiError(error);
  }
}

/**
 * POST /api/employees
 * Create a new employee
 * Validates Requirements: 5.2
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();

    console.log('=== EMPLOYEE CREATE REQUEST ===');
    console.log('Employee ID:', body.employeeId);
    console.log('Email:', body.email);

    // Validate request body
    const validationResult = createEmployeeSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.flatten());
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const employeeData = validationResult.data;

    // Extract password from the data
    const { password, ...employeeWithoutPassword } = employeeData;

    // Create employee using Admin SDK
    console.log('Calling employeeAdminService.create...');
    const newEmployee = await employeeAdminService.create(employeeWithoutPassword, password || '');
    console.log('Employee created successfully:', newEmployee.id);

    return NextResponse.json(newEmployee, { status: 201 });
  } catch (error: any) {
    console.error('=== EMPLOYEE CREATE ERROR ===');
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      code: error.code,
      stack: error.stack
    });

    // Handle specific Firebase Auth errors
    if (error.code === 'auth/invalid-phone-number') {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use 10 digits or E.164 format (+919876543210)' },
        { status: 400 }
      );
    }

    if (error.code === 'auth/phone-number-already-exists') {
      return NextResponse.json(
        { error: 'Phone number already registered' },
        { status: 409 }
      );
    }

    if (error.code === 'auth/weak-password') {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Handle Firebase auth errors
    if (error instanceof Error) {
      if (error.message.includes('auth/email-already-in-use') || error.message.includes('Email already exists')) {
        return ErrorResponses.conflict('Email already exists. This employee may have already been imported.');
      }

      if (error.message === 'Employee ID already exists') {
        return ErrorResponses.conflict('Employee ID already exists');
      }
    }

    return handleApiError(error);
  }
}
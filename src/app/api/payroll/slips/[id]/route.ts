import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuthToken } from '@/lib/server-auth';
import { ErrorResponses, handleApiError } from '@/lib/api-error-handler';
import { payrollAdminService } from '@/services/payroll-admin.service';
import { hasAccessToEmployee } from '@/lib/manager-access';

const updateSlipSchema = z.object({
  grossSalary: z.number().optional(),
  paidDays: z.number().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  pan: z.string().nullable().optional(),
  doj: z.string().nullable().optional(),
  salaryBreakup: z
    .object({
      basic: z.number(),
      hra: z.number(),
      special: z.number(),
      totalDeductions: z.number(),
      netSalary: z.number(),
      epf: z.number().optional(),
      esi: z.number().optional(),
      professionalTax: z.number().optional(),
      tds: z.number().optional(),
      loanRecovery: z.number().optional(),
      otherDeduction: z.number().optional(),
      leaveDeduction: z.number().optional(),
    })
    .optional(),
  attendanceBreakdown: z
    .object({
      present: z.number(),
      wfh: z.number(),
      approvedLeave: z.number(),
      unapprovedLeave: z.number(),
      halfDay: z.number(),
      holiday: z.number(),
      paidLeave: z.number(),
      leaveTaken: z.number(),
      unpaidLeave: z.number(),
      paidDays: z.number(),
    })
    .optional(),
});

const accessSchema = z.object({ accessGranted: z.boolean() });

/**
 * Managers may only touch slips belonging to their assignees. Admins pass through.
 * Returns a response to send back, or null when the caller is allowed to continue.
 */
async function guardManagerAccess(
  uid: string,
  role: string,
  slipEmployeeId: string,
  verb: string
) {
  if (role === 'admin') return null;
  if (role !== 'manager') return ErrorResponses.forbidden(`Only admins and managers can ${verb}`);

  const allowed = await hasAccessToEmployee(uid, role, slipEmployeeId);
  if (!allowed) {
    return ErrorResponses.forbidden('You can only manage slips for your assigned employees');
  }
  return null;
}

/** GET /api/payroll/slips/[id] — any authenticated user, with per-document checks. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();

    const { id } = await params;
    const { uid, claims } = authResult.user;

    const slip = await payrollAdminService.getSlipById(id);
    if (!slip) return ErrorResponses.notFound('Salary slip');

    if (claims.role === 'employee') {
      if (slip.employeeId !== uid || slip.accessGranted !== true) {
        return ErrorResponses.forbidden('You do not have access to this salary slip');
      }
    } else if (claims.role === 'manager' && slip.employeeId !== uid) {
      const allowed = await hasAccessToEmployee(uid, claims.role, slip.employeeId);
      if (!allowed) {
        return ErrorResponses.forbidden('You can only view slips for your assigned employees');
      }
    }

    return NextResponse.json(slip);
  } catch (error) {
    console.error('[Payroll] Error reading salary slip', error);
    return handleApiError(error);
  }
}

/** DELETE /api/payroll/slips/[id] — admin | manager. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();

    const { id } = await params;
    const { uid, claims } = authResult.user;

    const slip = await payrollAdminService.getSlipById(id);
    if (!slip) return ErrorResponses.notFound('Salary slip');

    const denied = await guardManagerAccess(uid, claims.role, slip.employeeId, 'delete salary slips');
    if (denied) return denied;

    await payrollAdminService.deleteSlips([id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Payroll] Error deleting salary slip', error);
    return handleApiError(error);
  }
}

/** PUT /api/payroll/slips/[id] — admin | manager. Edits an existing slip in place. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();

    const { id } = await params;
    const { uid, claims } = authResult.user;

    const slip = await payrollAdminService.getSlipById(id);
    if (!slip) return ErrorResponses.notFound('Salary slip');

    const denied = await guardManagerAccess(uid, claims.role, slip.employeeId, 'edit salary slips');
    if (denied) return denied;

    const validated = updateSlipSchema.parse(await request.json());
    await payrollAdminService.updateSlip(id, validated);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Payroll] Error updating salary slip', error);
    return handleApiError(error);
  }
}

/**
 * PATCH /api/payroll/slips/[id] — admin | manager. Grants/revokes employee access.
 * The employee is notified only on a false -> true transition, never on revoke.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();

    const { id } = await params;
    const { uid, claims } = authResult.user;

    const slip = await payrollAdminService.getSlipById(id);
    if (!slip) return ErrorResponses.notFound('Salary slip');

    const denied = await guardManagerAccess(
      uid,
      claims.role,
      slip.employeeId,
      'change salary slip access'
    );
    if (denied) return denied;

    const validated = accessSchema.parse(await request.json());
    const previousAccessGranted = slip.accessGranted === true;

    await payrollAdminService.updateSlip(id, { accessGranted: validated.accessGranted });

    let notificationSent = false;
    if (validated.accessGranted && !previousAccessGranted) {
      notificationSent = await payrollAdminService.notifySlipAvailable(
        { id, employeeId: slip.employeeId, month: slip.month, year: slip.year },
        'salary-slip-access'
      );
    }

    return NextResponse.json({ success: true, notificationSent });
  } catch (error) {
    console.error('[Payroll] Error updating salary slip access', error);
    return handleApiError(error);
  }
}

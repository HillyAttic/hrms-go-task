import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/server-auth';
import { ErrorResponses, handleApiError } from '@/lib/api-error-handler';
import { payrollAdminService } from '@/services/payroll-admin.service';
import { getAccessibleEmployeeIds, hasAccessToEmployee } from '@/lib/manager-access';

/**
 * GET /api/payroll/slips — the access-control hub for salary slips.
 *
 * Query: employeeId?, month?, year?, includeAll=true
 *   employee                -> own slips only, and only accessGranted ones
 *   admin/manager + id      -> that employee (managers must own the hierarchy entry)
 *   admin + includeAll      -> every slip for the period
 *   manager + includeAll    -> every slip for their assignees
 *   admin/manager, no id    -> their own slips (self-service)
 *
 * Response is a raw EmployeeSalary[] — no wrapper, no success flag.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();

    const { uid, claims } = authResult.user;
    const role = claims.role;

    const params = request.nextUrl.searchParams;
    const employeeIdParam = params.get('employeeId');
    const monthParam = params.get('month');
    const yearParam = params.get('year');
    const includeAll = params.get('includeAll');

    const filters: {
      employeeId?: string;
      month?: number;
      year?: number;
      accessGranted?: boolean;
    } = {};

    const month = monthParam ? parseInt(monthParam, 10) : NaN;
    const year = yearParam ? parseInt(yearParam, 10) : NaN;
    if (Number.isInteger(month)) filters.month = month;
    if (Number.isInteger(year)) filters.year = year;

    // Managers asking for everything: Firestore `in` queries cap at 30 values, so
    // fetching by hierarchy id list would break past 30 reports. Fetch the period
    // and filter in memory instead.
    if (role === 'manager' && !employeeIdParam && includeAll === 'true') {
      const accessibleIds = await getAccessibleEmployeeIds(uid, role);
      const slips = await payrollAdminService.getSlips({
        month: filters.month,
        year: filters.year,
      });
      return NextResponse.json(slips.filter((slip) => accessibleIds.includes(slip.employeeId)));
    }

    if (role === 'employee') {
      filters.employeeId = uid;
      filters.accessGranted = true;
    } else if (employeeIdParam) {
      if (role === 'manager' && employeeIdParam !== uid) {
        const allowed = await hasAccessToEmployee(uid, role, employeeIdParam);
        if (!allowed) {
          return ErrorResponses.forbidden('You can only view slips for your assigned employees');
        }
      }
      filters.employeeId = employeeIdParam;
      if (includeAll !== 'true') filters.accessGranted = true;
    } else if (role === 'admin' && includeAll === 'true') {
      // Every slip for the period — no employee or access filter.
    } else {
      filters.employeeId = uid;
      filters.accessGranted = true;
    }

    let slips = await payrollAdminService.getSlips(filters);

    // Defense in depth: the query already enforced this, so anything dropped here
    // means the filter above was wrong. Loud on purpose.
    if (filters.employeeId) {
      const before = slips.length;
      const requiredEmployeeId = filters.employeeId;
      const requireGranted = filters.accessGranted === true;
      slips = slips.filter(
        (slip) =>
          slip.employeeId === requiredEmployeeId && (!requireGranted || slip.accessGranted === true)
      );
      if (slips.length !== before) {
        console.error(
          `[Payroll] SECURITY VIOLATION — dropped ${before - slips.length} slip(s) for user ${uid} (role ${role})`
        );
      }
    }

    return NextResponse.json(slips);
  } catch (error) {
    console.error('[Payroll] Error fetching salary slips', error);
    return handleApiError(error);
  }
}

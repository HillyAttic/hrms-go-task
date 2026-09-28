/**
 * The Edit button in Generate Slips has to persist the salary it saves, including
 * for an employee whose slip was never generated. `generateSlips` refuses to
 * overwrite, so `upsertSlip` is what makes that edit stick.
 */

// A factory, not an automock: automocking this module loads the real one, which
// pulls in firebase-admin's ESM-only `jose` and blows up on the import.
jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {},
  adminMessaging: { send: jest.fn() },
}));

const SLIP_ID = 'slip-existing';
const EMPLOYEE_ID = 'emp-1';

const editedSlip = {
  employeeId: EMPLOYEE_ID,
  name: 'Aruna Gude',
  employeeCode: 'EMP101',
  month: 8,
  year: 2026,
  totalDaysInMonth: 30,
  paidDays: 24,
  grossSalary: 100000,
  designation: 'Engineer',
  department: 'e-Learning Department',
  pan: 'ABCDE1234F',
  doj: '2023-04-17',
  attendanceBreakdown: {
    present: 22,
    wfh: 2,
    approvedLeave: 1,
    unapprovedLeave: 1,
    halfDay: 0,
    holiday: 4,
    paidLeave: 1,
    leaveTaken: 2,
    unpaidLeave: 1,
    paidDays: 24,
  },
  salaryBreakup: {
    basic: 50000,
    hra: 40000,
    special: 10000,
    totalDeductions: 5000,
    netSalary: 95000,
  },
};

/** A doc ref whose `set`/`update` we can inspect after the call. */
const makeDocRef = (id: string) => ({ id, set: jest.fn(), update: jest.fn() });

function mockAdminDb(options: { existing: boolean }) {
  const existingRef = makeDocRef(SLIP_ID);
  const createdRef = makeDocRef('slip-new');

  const matches = {
    empty: !options.existing,
    docs: options.existing
      ? [{ id: SLIP_ID, data: () => ({ accessGranted: false, slipNumber: 'KEPT-0001' }) }]
      : [],
    forEach: jest.fn(),
  };

  const query: any = {
    where: jest.fn(() => query),
    limit: jest.fn(() => query),
    get: jest.fn(async () => matches),
    doc: jest.fn((id?: string) => (id === SLIP_ID ? existingRef : createdRef)),
    collection: jest.fn(() => query),
  };

  const db = { collection: jest.fn(() => query) };
  require('@/lib/firebase-admin').adminDb = db;
  return { db, existingRef, createdRef, query };
}

describe('salary slip edit persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates the slip already on file instead of creating a second one', async () => {
    const { existingRef, createdRef } = mockAdminDb({ existing: true });
    const { payrollAdminService } = require('@/services/payroll-admin.service');

    const saved = await payrollAdminService.upsertSlip(editedSlip, {
      accessGranted: true,
      generatedBy: 'admin-1',
    });

    expect(existingRef.update).toHaveBeenCalledTimes(1);
    expect(existingRef.update).toHaveBeenCalledWith(editedSlip);
    expect(createdRef.set).not.toHaveBeenCalled();
    expect(saved.id).toBe(SLIP_ID);
    // The row's own access grant and slip number survive an edit.
    expect(saved.slipNumber).toBe('KEPT-0001');
    expect(saved.accessGranted).toBe(false);
  });

  it('creates the slip when the employee has none, so a calculated row can be edited', async () => {
    const { existingRef, createdRef } = mockAdminDb({ existing: false });
    const { payrollAdminService } = require('@/services/payroll-admin.service');

    const saved = await payrollAdminService.upsertSlip(editedSlip, {
      accessGranted: true,
      generatedBy: 'admin-1',
    });

    expect(existingRef.update).not.toHaveBeenCalled();
    expect(createdRef.set).toHaveBeenCalledTimes(1);

    const written = createdRef.set.mock.calls[0][0];
    // The edited figures are what gets stored — not a server-side recalculation,
    // which would silently discard everything the admin typed.
    expect(written.grossSalary).toBe(100000);
    expect(written.salaryBreakup).toEqual(editedSlip.salaryBreakup);
    expect(written.attendanceBreakdown).toEqual(editedSlip.attendanceBreakdown);
    expect(written.paidDays).toBe(24);
    expect(saved.id).toBe('slip-new');
    expect(saved.accessGranted).toBe(true);
  });

  it('never notifies the employee: an edit is not a publication', async () => {
    mockAdminDb({ existing: false });
    const adminMessaging = require('@/lib/firebase-admin').adminMessaging;

    const { payrollAdminService } = require('@/services/payroll-admin.service');
    await payrollAdminService.upsertSlip(editedSlip, {
      accessGranted: true,
      generatedBy: 'admin-1',
    });

    expect(adminMessaging.send).not.toHaveBeenCalled();
  });
});

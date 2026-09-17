#!/usr/bin/env tsx
/**
 * READ-ONLY diagnostic for "Update Employee does nothing".
 * Runs every real users doc through BOTH schemas the update path uses:
 *   1. the modal's client schema (src/components/employees/EmployeeModal.tsx)
 *   2. the route's server schema (src/app/api/employees/[id]/route.ts)
 * Schemas are extracted verbatim from source so this cannot drift.
 *
 * Usage: npx tsx scripts/diagnose-employee-update.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import * as admin from 'firebase-admin';
import { z } from 'zod';

const envText = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!)),
  projectId: 'hrms-82eb5',
});
const db = admin.firestore();

/** Pull `const <name> = z.object({ ... });` out of a source file and build a real zod schema. */
function extractSchema(file: string, varName: string): z.ZodTypeAny {
  const src = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
  const start = src.indexOf(`const ${varName} = z.object({`);
  const end = src.indexOf('\n});', start);
  if (start === -1 || end === -1) throw new Error(`Could not locate ${varName} in ${file}`);
  const schemaSrc = src.slice(start, end + 4);
  // eslint-disable-next-line no-new-func
  return new Function('z', `${schemaSrc}; return ${varName};`)(z);
}

const modalSchema = extractSchema('src/components/employees/EmployeeModal.tsx', 'employeeFormSchema');
const routeSchema = extractSchema('src/app/api/employees/[id]/route.ts', 'updateEmployeeSchema');

(async () => {
  const snap = await db.collection('users').get();
  const blocked: string[] = [];

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    // --- exactly what employeeAdminService.getById() returns ---
    const employee = {
      id: docSnap.id,
      employeeId: data.employeeId || data.uid || docSnap.id,
      name: data.displayName || data.name || '',
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      email: data.email || '',
      phone: data.phoneNumber || data.phone || '',
      department: data.department || '',
      dateOfBirth: data.dateOfBirth || '',
      salary: data.salary || undefined,
      dateOfJoining: data.dateOfJoining || '',
      role: (data.role === 'admin' ? 'Admin' : data.role === 'manager' ? 'Manager' : 'Employee') as any,
      status: (data.status || 'active') as any,
      managerId: data.managerId || '',
      managerName: data.managerName || '',
      probationDuration: data.probationDuration || undefined,
      probationEndDate: data.probationEndDate || '',
      workAnniversary: data.workAnniversary || '',
      salaryChanges: data.salaryChanges || [],
      promotionDate: data.promotionDate || '',
      promotionDetails: data.promotionDetails || '',
      documents: data.documents || {},
      requireLocationTracking: data.requireLocationTracking ?? true,
    };

    // --- exactly what EmployeeModal's form holds after reset() ---
    const formValues = {
      ...employee,
      firstName: employee.firstName || employee.name.split(' ')[0] || '',
      lastName: employee.lastName || employee.name.split(' ').slice(1).join(' ') || '',
      password: '',
      confirmPassword: '',
      currentPassword: '',
    };

    const clientResult = modalSchema.safeParse(formValues);

    // --- exactly what page.tsx builds for the PUT body ---
    const payload: any = {
      firstName: formValues.firstName,
      lastName: formValues.lastName || '',
      name: [formValues.firstName, formValues.lastName].filter(Boolean).join(' '),
      email: employee.email,
      phone: employee.phone,
      department: employee.department || '',
      role: employee.role,
      status: employee.status,
      dateOfBirth: employee.dateOfBirth || '',
      salary: employee.salary || undefined,
      dateOfJoining: employee.dateOfJoining || '',
      managerId: employee.managerId || '',
      managerName: employee.managerName || '',
      probationDuration: employee.probationDuration || undefined,
      probationEndDate: employee.probationEndDate || '',
      workAnniversary: employee.workAnniversary || '',
      promotionDate: employee.promotionDate || '',
      promotionDetails: employee.promotionDetails || '',
      salaryChanges: employee.salaryChanges.length > 0 ? employee.salaryChanges : undefined,
      documents: employee.documents,
      requireLocationTracking: employee.requireLocationTracking ?? true,
    };
    const body = JSON.parse(JSON.stringify(payload));
    const serverResult = routeSchema.safeParse(body);

    const clientErr = clientResult.success ? null : clientResult.error.flatten().fieldErrors;
    const serverErr = serverResult.success ? null : serverResult.error.flatten().fieldErrors;

    const label = `${docSnap.id} | ${employee.name || '(no name)'} | employeeId=${employee.employeeId}`;
    if (!clientErr && !serverErr) {
      console.log(`OK    ${label}`);
    } else {
      blocked.push(label);
      console.log(`BLOCK ${label}`);
      if (clientErr) console.log('      client (button silently does nothing):', JSON.stringify(clientErr));
      if (serverErr) console.log('      server (400):', JSON.stringify(serverErr));
    }
  }

  console.log(`\n${blocked.length} of ${snap.size} employees cannot be updated.`);
})().catch((e) => { console.error(e); process.exit(1); });

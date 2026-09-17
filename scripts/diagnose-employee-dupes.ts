#!/usr/bin/env tsx
/** READ-ONLY: list every users doc matching an email, plus raw field presence. */
import * as fs from 'fs';
import * as path from 'path';
import * as admin from 'firebase-admin';

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

(async () => {
  const email = process.argv[2] || 'admin@hrms.com';
  const snap = await db.collection('users').where('email', '==', email).get();
  console.log(`docs with email=${email}: ${snap.size}`);

  for (const d of snap.docs) {
    const data = d.data();
    console.log('\n--- ' + d.id);
    console.log(JSON.stringify({
      employeeId: data.employeeId,
      displayName: data.displayName,
      name: data.name,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phoneNumber: data.phoneNumber,
      phone: data.phone,
      role: data.role,
      status: data.status,
      isActive: data.isActive,
      salary: data.salary,
      keys: Object.keys(data).sort(),
    }, null, 2));
  }

  // how many users docs are missing firstName entirely
  console.log('\n=== doc field coverage across all users ===');
  const all = await db.collection('users').get();
  let noFirstName = 0, noEmployeeId = 0, noPhone = 0, noStatus = 0, total = 0;
  for (const d of all.docs) {
    total++;
    const data = d.data();
    if (!data.firstName) noFirstName++;
    if (!data.employeeId) noEmployeeId++;
    if (!data.phoneNumber && !data.phone) noPhone++;
    if (!data.status) noStatus++;
  }
  console.log({ total, noFirstName, noEmployeeId, noPhone, noStatus });
})().catch((e) => { console.error(e); process.exit(1); });

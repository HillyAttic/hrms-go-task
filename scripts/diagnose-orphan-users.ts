#!/usr/bin/env tsx
/**
 * Read-only diagnosis: which accounts can sign in but are not employees?
 *
 * Login only checks Firebase Auth. Authorization checks users/{uid}. /employees
 * additionally requires employeeId. So there are three sets, and the interesting
 * rows are the ones in an earlier set but not a later one.
 *
 * Usage: npx tsx scripts/diagnose-orphan-users.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import * as admin from 'firebase-admin';

for (const file of ['.env', '.env.local']) {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!)),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'hrms-82eb5',
});
const db = admin.firestore();
const auth = admin.auth();

(async () => {
  const usersSnap = await db.collection('users').get();
  const profiles = new Map<string, any>();
  usersSnap.forEach((d) => profiles.set(d.id, d.data()));

  const authUsers: admin.auth.UserRecord[] = [];
  let page = await auth.listUsers(1000);
  authUsers.push(...page.users);
  while (page.pageToken) {
    page = await auth.listUsers(1000, page.pageToken);
    authUsers.push(...page.users);
  }

  console.log(`Firebase Auth accounts: ${authUsers.length}`);
  console.log(`users/{uid} profiles:   ${profiles.size}`);
  console.log(`users/{uid} w/ employeeId (shown at /employees): ${[...profiles.values()].filter((p) => p.employeeId).length}\n`);

  const byEmail = new Map(authUsers.map((u) => [u.email?.toLowerCase() ?? u.uid, u]));

  const orphans: string[] = [];
  const ghostProfiles: string[] = [];

  for (const u of authUsers) {
    const profile = profiles.get(u.uid);
    const flags: string[] = [];
    if (!profile) {
      flags.push('NO users/{uid} doc');
      orphans.push(u.uid);
    } else if (!profile.employeeId) {
      flags.push('users/{uid} has NO employeeId -> absent from /employees');
      orphans.push(u.uid);
    }
    if (u.disabled) flags.push('disabled');
    if (u.customClaims?.role) flags.push(`claim role=${u.customClaims.role}`);
    if (flags.length) {
      console.log(`  ${u.email ?? u.uid}`);
      console.log(`      uid=${u.uid}  ${flags.join(' | ')}`);
    }
  }

  for (const uid of profiles.keys()) {
    if (!byEmail.has(profiles.get(uid)?.email?.toLowerCase() ?? '') && !authUsers.some((u) => u.uid === uid)) {
      ghostProfiles.push(uid);
    }
  }

  console.log(`\nAccounts that can sign in but are NOT at /employees: ${orphans.length}`);
  orphans.forEach((uid) => {
    const u = authUsers.find((x) => x.uid === uid);
    console.log(`  - ${u?.email ?? uid} (${uid})`);
  });
  if (ghostProfiles.length) {
    console.log(`\nusers/{uid} docs with no Auth account (cannot sign in): ${ghostProfiles.length}`);
    ghostProfiles.forEach((uid) => console.log(`  - ${profiles.get(uid)?.email ?? uid} (${uid})`));
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

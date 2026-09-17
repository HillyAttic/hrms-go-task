#!/usr/bin/env tsx
/**
 * Regression check for "deleted employee comes back after refresh".
 *
 * A delete must take effect immediately and permanently:
 *   - users/{uid} doc deleted
 *   - Firebase Auth account deleted
 *   - gone from /employees
 *   - the deleted account's still-valid ID token is rejected, and does NOT
 *     re-create its profile (verifyAuthToken used to auto-create on the next request)
 *
 * Drives the live API on localhost:3000 against a throwaway admin account it
 * creates and cleans up itself. Requires `npm run dev` to be running.
 *
 * Usage: npx tsx scripts/repro-employee-delete.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import * as admin from 'firebase-admin';

const envText = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const env: Record<string, string> = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
for (const [k, v] of Object.entries(env)) if (!process.env[k]) process.env[k] = v;

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!)),
  projectId: 'hrms-82eb5',
});
const db = admin.firestore();
const auth = admin.auth();
let victimUid = '';
let ghostUid = '';
let shellUid = '';

async function cleanup() {
  for (const uid of [victimUid, ghostUid, shellUid]) {
    if (!uid) continue;
    await auth.deleteUser(uid).catch(() => {});
    await db.collection('users').doc(uid).delete().catch(() => {});
  }
}

const headers = (t: string) => ({ Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' });

async function idTokenFor(u: string) {
  const custom = await auth.createCustomToken(u);
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
    { method: 'POST', body: JSON.stringify({ token: custom, returnSecureToken: true }) }
  ).then((x) => x.json());
  if (!r.idToken) throw new Error('sign-in failed: ' + JSON.stringify(r));
  return r.idToken as string;
}

(async () => {
  // admin (the deleter) and a throwaway employee (the victim)
  // Must be a real employee admin (users/{uid}.employeeId set) — verifyAuthToken now
  // rejects accounts that are not in /employees, so a bare login cannot drive the API.
  const adminToken = await idTokenFor((await auth.getUserByEmail('admin@edventurehub.com')).uid);
  const victim = await auth.createUser({ email: `zz-repro-${Date.now()}@example.com`, password: 'Test1234!' });
  victimUid = victim.uid;
  await auth.setCustomUserClaims(victimUid, { role: 'admin' });
  await db.collection('users').doc(victimUid).set({
    employeeId: 'ZZTEST', displayName: 'ZZ Repro', firstName: 'ZZ', lastName: 'Repro',
    email: victim.email, phoneNumber: '', role: 'admin', status: 'active', isActive: true,
    createdAt: admin.firestore.Timestamp.now(), updatedAt: admin.firestore.Timestamp.now(),
  });
  const victimToken = await idTokenFor(victimUid);
  console.log(`throwaway users/${victimUid} (employeeId ZZTEST) created`);

  const listIds = async () =>
    ((await (await fetch('http://localhost:3000/api/employees', { headers: headers(adminToken) })).json()).data ?? []).map((e: any) => e.id);

  console.log(`in /employees before delete:  ${(await listIds()).includes(victimUid)}`);
  const alive = await fetch('http://localhost:3000/api/employees', { headers: headers(victimToken) });
  console.log(`victim's own token works:     ${alive.status === 200}`);

  const res = await fetch(`http://localhost:3000/api/employees/${victimUid}`, { method: 'DELETE', headers: headers(adminToken) });
  console.log(`\nDELETE -> ${res.status} ${await res.text()}`);

  const docGone = !(await db.collection('users').doc(victimUid).get()).exists;
  const authGone = !(await auth.getUser(victimUid).then(() => true).catch(() => false));
  const listGone = !(await listIds()).includes(victimUid);

  // the bit that used to resurrect them: stale token, immediate retry, then again after
  // the 5-minute profile cache would have expired
  const staleCall = await fetch('http://localhost:3000/api/employees', { headers: headers(victimToken) });
  const stillGone = !(await db.collection('users').doc(victimUid).get()).exists;

  // An account deleted before the delete also removed the Auth user: login survives,
  // profile is gone. verifyAuthToken used to auto-create one, handing the "deleted"
  // employee a working 'employee' session. It must now reject instead.
  const ghost = await auth.createUser({ email: `zz-ghost-${Date.now()}@example.com`, password: 'Test1234!' });
  ghostUid = ghost.uid;
  const ghostCall = await fetch('http://localhost:3000/api/employees', { headers: headers(await idTokenFor(ghostUid)) });
  const ghostRecreated = (await db.collection('users').doc(ghostUid).get()).exists;

  // A leftover login: users/{uid} exists (so verifyAuthToken finds a profile) but has no
  // employeeId, so /employees never lists it. This is the "user is not in the list yet can
  // still sign in" account — it must be rejected too, claim or no claim.
  const shell = await auth.createUser({ email: `zz-shell-${Date.now()}@example.com`, password: 'Test1234!' });
  shellUid = shell.uid;
  await auth.setCustomUserClaims(shellUid, { role: 'admin' });
  await db.collection('users').doc(shellUid).set({
    email: shell.email, displayName: 'ZZ Shell', role: 'admin', status: 'active', isActive: true,
    createdAt: admin.firestore.Timestamp.now(), updatedAt: admin.firestore.Timestamp.now(),
  });
  const shellCall = await fetch('http://localhost:3000/api/employees', { headers: headers(await idTokenFor(shellUid)) });

  console.log(`\nusers/${victimUid} deleted:      ${docGone ? 'PASS' : 'FAIL'}`);
  console.log(`auth account deleted:         ${authGone ? 'PASS' : 'FAIL'}`);
  console.log(`gone from /employees:         ${listGone ? 'PASS' : 'FAIL'}`);
  console.log(`stale token rejected:         ${staleCall.status === 401 ? 'PASS' : 'FAIL'} (${staleCall.status})`);
  console.log(`profile not re-created:       ${stillGone ? 'PASS' : 'FAIL'}`);
  console.log(`profile-less account:         ${ghostCall.status === 401 ? 'PASS' : 'FAIL'} (${ghostCall.status})`);
  console.log(`  ...and not re-created:      ${!ghostRecreated ? 'PASS' : 'FAIL'}`);
  console.log(`login without employeeId:     ${shellCall.status === 401 ? 'PASS' : 'FAIL'} (${shellCall.status})`);

  await cleanup();
  if (!docGone || !authGone || !listGone || staleCall.status !== 401 || !stillGone || ghostCall.status !== 401 || ghostRecreated || shellCall.status !== 401) process.exit(1);
})().catch(async (e) => { console.error(e); await cleanup(); process.exit(1); });

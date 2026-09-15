#!/usr/bin/env node
/**
 * Migration Script: Backfill payroll fields on every `users` doc
 *
 * Adds the four fields payroll reads and writes, so generating slips before any
 * configuration was saved does not produce ₹0 slips:
 *   doj -> null, pan -> null, designation -> '', grossSalary -> 0
 *
 * Usage:
 *   npm run migrate:employee-payroll
 */

import { config } from 'dotenv';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

config({ path: '.env.local' });

if (!getApps().length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID || 'hrms-82eb5';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (serviceAccountKey) {
    try {
      initializeApp({ credential: cert(JSON.parse(serviceAccountKey)), projectId });
    } catch (error) {
      console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', error);
      process.exit(1);
    }
  } else if (clientEmail && privateKey) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
  } else {
    console.error('❌ Error: Firebase credentials not found');
    console.error('Please set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env.local');
    process.exit(1);
  }
}

const db = getFirestore();
const BATCH_LIMIT = 499;

async function migrate() {
  console.log('🚀 Backfilling payroll fields on users...\n');

  const snapshot = await db.collection('users').get();
  console.log(`📊 Found ${snapshot.size} user(s)\n`);

  const DEFAULTS = {
    doj: null,
    pan: null,
    designation: '',
    grossSalary: 0,
  } as const;

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let batch = db.batch();
  let pending = 0;

  for (const doc of snapshot.docs) {
    processed += 1;
    const data = doc.data();
    const missing = (Object.keys(DEFAULTS) as Array<keyof typeof DEFAULTS>).filter(
      (field) => data[field] === undefined
    );

    if (missing.length === 0) {
      skipped += 1;
      continue;
    }

    const payload = {
      updatedAt: new Date(),
      ...Object.fromEntries(missing.map((field) => [field, DEFAULTS[field]])),
    };

    batch.update(doc.ref, payload as { [key: string]: any });
    pending += 1;
    updated += 1;

    if (pending >= BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }

  if (pending > 0) await batch.commit();

  console.log('\n═══════════════════════════════════════');
  console.log(`✨ Migration complete`);
  console.log(`   Processed : ${processed}`);
  console.log(`   Updated   : ${updated}`);
  console.log(`   Skipped   : ${skipped}`);
  console.log('═══════════════════════════════════════\n');
}

migrate().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});

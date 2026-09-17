/**
 * One-shot: upload the 2026 holiday list into the `holidays` collection.
 *
 * Usage: npx tsx --env-file=.env scripts/add-2026-holidays.ts
 *
 * Idempotent: doc id is the date. A date already present with the same name is
 * left alone; one present under a different name is renamed to match this list.
 *
 * ponytail: two source rows (Aug 14, Aug 16) had no holiday name and were
 * left out by decision. Add them to HOLIDAYS and re-run to include them.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '../src/lib/firebase-admin';

/** [YYYY-MM-DD, name, type] */
const HOLIDAYS: [string, string, string][] = [
  ['2026-01-01', 'New Year', 'Holiday'],
  ['2026-01-14', 'Makar Sankrant/Pongal', 'Holiday'],
  ['2026-01-26', 'Republic Day', 'Holiday'],
  ['2026-03-03', 'Holi', 'Holiday'],
  ['2026-03-21', 'Eid ul-Fitr', 'Optional'],
  ['2026-05-01', "International Workers' Day", 'Holiday'],
  ['2026-05-27', 'Eid ul-Zuha', 'Optional'],
  ['2026-08-15', 'Independence Day', 'Disconnect'],
  ['2026-08-28', 'Raksha Bandhan', 'Holiday'],
  ['2026-09-04', 'Janmashtmi', 'Optional'],
  ['2026-10-02', 'Gandhi Jayanti', 'Holiday'],
  ['2026-10-20', 'Dusshera', 'Holiday'],
  ['2026-11-09', 'Govardhan Puja', 'Holiday'],
  ['2026-11-11', 'Bhai Duj', 'Optional'],
  ['2026-12-14', 'EdVenture Day', 'Holiday'],
  ['2026-12-25', 'Christmas', 'Holiday'],
];

/** `YYYY-MM-DD` in local time — matches how the roster UI reads holidays. */
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

async function main() {
  const snapshot = await adminDb.collection('holidays').get();

  const existing = new Map<string, { id: string; name: string }>();
  snapshot.forEach((doc) => {
    const raw = doc.data().date;
    const parsed = raw?.toDate?.() ?? (raw ? new Date(raw) : null);
    if (parsed && !isNaN(parsed.getTime())) {
      existing.set(dayKey(parsed), { id: doc.id, name: doc.data().name });
    }
  });

  console.log(`${existing.size} existing holiday(s) in Firestore.\n`);

  const batch = adminDb.batch();
  let added = 0;
  let renamed = 0;

  for (const [date, name, type] of HOLIDAYS) {
    const current = existing.get(date);

    if (current && current.name === name) {
      console.log(`skip     ${date}  ${name} — already present`);
      continue;
    }

    if (current) {
      batch.update(adminDb.collection('holidays').doc(current.id), { name, type });
      console.log(`rename   ${date}  ${current.name} → ${name} (${type})`);
      renamed++;
      continue;
    }

    batch.set(adminDb.collection('holidays').doc(date), {
      date: Timestamp.fromDate(new Date(`${date}T00:00:00`)),
      name,
      type,
      createdAt: Timestamp.now(),
    });
    console.log(`add      ${date}  ${name} (${type})`);
    added++;
  }

  if (!added && !renamed) {
    console.log('\nAlready up to date.');
    return;
  }

  await batch.commit();
  console.log(`\nCommitted ${added} new, ${renamed} renamed.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\nFailed:', error);
    process.exit(1);
  });

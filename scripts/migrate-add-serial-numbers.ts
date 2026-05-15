/**
 * Migration Script: Add Serial Numbers to Existing Clients
 *
 * This script adds serialNumber field to all existing clients in Firestore.
 * It assigns sequential numbers (001, 002, 003, etc.) based on creation date.
 *
 * Usage: npm run migrate:serial-numbers
 */

import { adminDb } from '../src/lib/firebase-admin';

async function migrateSerialNumbers() {
  console.log('🚀 Starting migration: Add serial numbers to clients...\n');

  try {
    // Fetch all clients ordered by createdAt
    const clientsSnapshot = await adminDb
      .collection('clients')
      .orderBy('createdAt', 'asc')
      .get();

    if (clientsSnapshot.empty) {
      console.log('❌ No clients found in database.');
      return;
    }

    const totalClients = clientsSnapshot.size;
    console.log(`📊 Found ${totalClients} clients to migrate.\n`);

    // Process clients in batches (Firestore limit is 500 operations per batch)
    const batchSize = 499;
    let batch = adminDb.batch();
    let batchCount = 0;
    let processedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < clientsSnapshot.docs.length; i++) {
      const doc = clientsSnapshot.docs[i];
      const clientData = doc.data();

      // Skip if serialNumber already exists
      if (clientData.serialNumber) {
        console.log(`⏭️  Skipping ${clientData.clientName} - already has S.No: ${clientData.serialNumber}`);
        skippedCount++;
        continue;
      }

      // Generate serial number (001, 002, 003, etc.)
      const serialNumber = String(i + 1).padStart(3, '0');

      // Add to batch
      batch.update(doc.ref, {
        serialNumber: serialNumber,
        updatedAt: new Date(),
      });

      batchCount++;
      updatedCount++;

      console.log(`✅ [${i + 1}/${totalClients}] ${clientData.clientName} → S.No: ${serialNumber}`);

      // Commit batch when it reaches the limit
      if (batchCount === batchSize) {
        await batch.commit();
        console.log(`\n💾 Committed batch of ${batchCount} updates.\n`);
        batch = adminDb.batch();
        batchCount = 0;
      }

      processedCount++;
    }

    // Commit remaining updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`\n💾 Committed final batch of ${batchCount} updates.\n`);
    }

    console.log('\n✨ Migration completed successfully!');
    console.log(`📈 Summary:`);
    console.log(`   - Total clients: ${totalClients}`);
    console.log(`   - Updated: ${updatedCount}`);
    console.log(`   - Skipped (already had S.No): ${skippedCount}`);
    console.log(`   - Processed: ${processedCount}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateSerialNumbers()
  .then(() => {
    console.log('\n✅ Migration script finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });

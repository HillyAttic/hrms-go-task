#!/usr/bin/env node
/**
 * Migration Script: Add Client Numbers (CLN001, CLN002, etc.)
 * 
 * This script adds a unique client number to all existing clients in Firestore.
 * The client number format is CLN001, CLN002, CLN003, etc.
 * 
 * Usage:
 *   npm run migrate:client-numbers
 */

import { config } from 'dotenv';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID || 'hrms-82eb5';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      initializeApp({
        credential: cert(serviceAccount),
        projectId,
      });
    } catch (error) {
      console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', error);
      process.exit(1);
    }
  } else if (clientEmail && privateKey) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  } else {
    console.error('❌ Error: Firebase credentials not found');
    console.error('Please set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env.local');
    process.exit(1);
  }
}

const db = getFirestore();

interface Client {
  id: string;
  clientName: string;
  clientNumber?: string;
  createdAt?: any;
}

async function addClientNumbers() {
  try {
    console.log('🚀 Starting migration: Add client numbers...\n');

    // Get all clients
    const clientsSnapshot = await db.collection('clients').orderBy('createdAt', 'asc').get();
    
    if (clientsSnapshot.empty) {
      console.log('ℹ️  No clients found in database');
      return;
    }

    console.log(`📊 Found ${clientsSnapshot.size} clients\n`);

    const batch = db.batch();
    let updateCount = 0;
    let skipCount = 0;

    clientsSnapshot.docs.forEach((doc, index) => {
      const client = doc.data() as Client;
      
      // Skip if client already has a clientNumber
      if (client.clientNumber) {
        console.log(`⏭️  Skipping ${client.clientName} - already has number: ${client.clientNumber}`);
        skipCount++;
        return;
      }

      // Generate client number: CLN001, CLN002, etc.
      const clientNumber = `CLN${String(index + 1).padStart(3, '0')}`;
      
      batch.update(doc.ref, { clientNumber });
      console.log(`✅ ${clientNumber} - ${client.clientName}`);
      updateCount++;
    });

    // Commit the batch
    if (updateCount > 0) {
      console.log(`\n📝 Committing ${updateCount} updates...`);
      await batch.commit();
      console.log('✅ Migration completed successfully!\n');
    } else {
      console.log('\nℹ️  No updates needed - all clients already have numbers\n');
    }

    console.log('📊 Summary:');
    console.log(`   - Total clients: ${clientsSnapshot.size}`);
    console.log(`   - Updated: ${updateCount}`);
    console.log(`   - Skipped: ${skipCount}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
addClientNumbers()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

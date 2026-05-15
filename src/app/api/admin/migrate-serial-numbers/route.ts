import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * POST /api/admin/migrate-serial-numbers
 * Migration endpoint to add serial numbers to all existing clients
 * Admin only
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    // Check if user is admin
    const userRole = authResult.user.claims.role;
    if (userRole !== 'admin') {
      return ErrorResponses.forbidden('Only admins can run migrations');
    }

    console.log('🚀 Starting migration: Add serial numbers to clients...');

    // Fetch all clients ordered by createdAt
    const clientsSnapshot = await adminDb
      .collection('clients')
      .orderBy('createdAt', 'asc')
      .get();

    if (clientsSnapshot.empty) {
      return NextResponse.json({
        success: false,
        message: 'No clients found in database',
        stats: {
          total: 0,
          updated: 0,
          skipped: 0,
        },
      });
    }

    const totalClients = clientsSnapshot.size;
    console.log(`📊 Found ${totalClients} clients to migrate.`);

    // Process clients in batches (Firestore limit is 500 operations per batch)
    const batchSize = 499;
    let batch = adminDb.batch();
    let batchCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const updatedClients: Array<{ name: string; serialNumber: string }> = [];

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

      updatedClients.push({
        name: clientData.clientName,
        serialNumber: serialNumber,
      });

      console.log(`✅ [${i + 1}/${totalClients}] ${clientData.clientName} → S.No: ${serialNumber}`);

      // Commit batch when it reaches the limit
      if (batchCount === batchSize) {
        await batch.commit();
        console.log(`💾 Committed batch of ${batchCount} updates.`);
        batch = adminDb.batch();
        batchCount = 0;
      }
    }

    // Commit remaining updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`💾 Committed final batch of ${batchCount} updates.`);
    }

    console.log('✨ Migration completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      stats: {
        total: totalClients,
        updated: updatedCount,
        skipped: skippedCount,
      },
      updatedClients: updatedClients.slice(0, 10), // Return first 10 for preview
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return handleApiError(error);
  }
}

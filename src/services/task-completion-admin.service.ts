/**
 * Task Completion Admin Service
 * Server-side service for managing task completions using Firebase Admin SDK
 */

import { adminDb } from '@/lib/firebase-admin';
import { ClientTaskCompletion } from './task-completion.service';

/**
 * Task Completion Admin Service API
 */
export const taskCompletionAdminService = {
  /**
   * Get all completions for a specific recurring task
   */
  async getByTaskId(recurringTaskId: string): Promise<ClientTaskCompletion[]> {
    try {
      const snapshot = await adminDb
        .collection('task-completions')
        .where('recurringTaskId', '==', recurringTaskId)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as ClientTaskCompletion[];
    } catch (error) {
      console.error('[Task Completion Admin] Error getting by task ID:', error);
      throw error;
    }
  },

  /**
   * Get completions for a specific client and task
   */
  async getByClientAndTask(clientId: string, recurringTaskId: string): Promise<ClientTaskCompletion[]> {
    try {
      const snapshot = await adminDb
        .collection('task-completions')
        .where('clientId', '==', clientId)
        .where('recurringTaskId', '==', recurringTaskId)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as ClientTaskCompletion[];
    } catch (error) {
      console.error('[Task Completion Admin] Error getting by client and task:', error);
      throw error;
    }
  },

  /**
   * Create or update a task completion
   */
  async createOrUpdate(data: Omit<ClientTaskCompletion, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClientTaskCompletion> {
    try {
      // Check if completion already exists
      const existingSnapshot = await adminDb
        .collection('task-completions')
        .where('recurringTaskId', '==', data.recurringTaskId)
        .where('clientId', '==', data.clientId)
        .where('monthKey', '==', data.monthKey)
        .limit(1)
        .get();

      const now = new Date();
      
      // Prepare data for Firestore (convert Date objects to Firestore Timestamps)
      const firestoreData = {
        recurringTaskId: data.recurringTaskId,
        clientId: data.clientId,
        monthKey: data.monthKey,
        isCompleted: data.isCompleted,
        completedAt: data.completedAt || null,
        completedBy: data.completedBy || null,
        arnNumber: data.arnNumber || null,
        arnName: data.arnName || null,
        remark: data.remark || null,
        remarkBy: data.remarkBy || null,
      };

      if (!existingSnapshot.empty) {
        // Update existing
        const docRef = existingSnapshot.docs[0].ref;
        await docRef.update({
          ...firestoreData,
          updatedAt: now,
        });

        const updated = await docRef.get();
        return {
          id: updated.id,
          ...updated.data(),
          completedAt: updated.data()?.completedAt?.toDate?.() || updated.data()?.completedAt,
          createdAt: updated.data()?.createdAt?.toDate?.() || updated.data()?.createdAt,
          updatedAt: now,
        } as ClientTaskCompletion;
      } else {
        // Create new
        const docRef = await adminDb.collection('task-completions').add({
          ...firestoreData,
          createdAt: now,
          updatedAt: now,
        });

        const created = await docRef.get();
        return {
          id: created.id,
          ...created.data(),
          completedAt: created.data()?.completedAt?.toDate?.() || created.data()?.completedAt,
          createdAt: now,
          updatedAt: now,
        } as ClientTaskCompletion;
      }
    } catch (error) {
      console.error('[Task Completion Admin] Error creating/updating:', error);
      throw error;
    }
  },

  /**
   * Delete a task completion
   */
  async delete(id: string): Promise<void> {
    try {
      await adminDb.collection('task-completions').doc(id).delete();
    } catch (error) {
      console.error('[Task Completion Admin] Error deleting:', error);
      throw error;
    }
  },

  /**
   * Bulk upsert task completions using Firestore batch writes.
   * Fetches all existing completions for the task in one query,
   * then applies all creates/updates/deletes in batches of 499.
   */
  async bulkUpsert(
    recurringTaskId: string,
    completions: Array<{
      clientId: string;
      monthKey: string;
      isCompleted: boolean;
      arnNumber?: string;
      arnName?: string;
      remark?: string;
      remarkBy?: string;
    }>,
    completedBy: string
  ): Promise<{ total: number; written: number; deleted: number; skipped: number }> {
    try {
      // Step 1: Fetch all existing completions for this task in ONE query
      const existingSnapshot = await adminDb
        .collection('task-completions')
        .where('recurringTaskId', '==', recurringTaskId)
        .get();

      // Build lookup map: `${clientId}_${monthKey}` → docRef
      const existingMap = new Map<string, FirebaseFirestore.DocumentReference>();
      existingSnapshot.docs.forEach(doc => {
        const data = doc.data();
        existingMap.set(`${data.clientId}_${data.monthKey}`, doc.ref);
      });

      const now = new Date();
      const BATCH_SIZE = 499;
      let written = 0;
      let deleted = 0;
      let skipped = 0;

      // Step 2: Build list of batch operations
      const ops: Array<() => void> = [];
      let currentBatch = adminDb.batch();
      let opsInBatch = 0;
      const batches: FirebaseFirestore.WriteBatch[] = [currentBatch];

      const flushIfNeeded = () => {
        if (opsInBatch >= BATCH_SIZE) {
          currentBatch = adminDb.batch();
          batches.push(currentBatch);
          opsInBatch = 0;
        }
      };

      for (const comp of completions) {
        const key = `${comp.clientId}_${comp.monthKey}`;
        const existingRef = existingMap.get(key);

        if (comp.isCompleted || comp.remark) {
          // Write if completed OR if there's a remark to save
          const data = {
            recurringTaskId,
            clientId: comp.clientId,
            monthKey: comp.monthKey,
            isCompleted: comp.isCompleted,
            completedAt: comp.isCompleted ? now : null,
            completedBy: comp.isCompleted ? completedBy : null,
            arnNumber: comp.arnNumber || null,
            arnName: comp.arnName || null,
            remark: comp.remark || null,
            remarkBy: comp.remarkBy || null,
            updatedAt: now,
          };

          flushIfNeeded();
          if (existingRef) {
            currentBatch.update(existingRef, data);
          } else {
            const newRef = adminDb.collection('task-completions').doc();
            currentBatch.set(newRef, { ...data, createdAt: now });
          }
          opsInBatch++;
          written++;
        } else {
          // No completion and no remark — delete if exists
          if (existingRef) {
            flushIfNeeded();
            currentBatch.delete(existingRef);
            opsInBatch++;
            deleted++;
          } else {
            skipped++;
          }
        }
      }

      // Step 3: Commit all batches sequentially
      for (const batch of batches) {
        await batch.commit();
      }

      console.log('[Task Completion Admin] bulkUpsert summary:', { written, deleted, skipped, total: completions.length });
      console.log('[Task Completion Admin] remark-only records:', completions.filter(c => !c.isCompleted && c.remark).map(c => `${c.clientId}_${c.monthKey}`));

      return { total: completions.length, written, deleted, skipped };
    } catch (error) {
      console.error('[Task Completion Admin] Error in bulkUpsert:', error);
      throw error;
    }
  },
};

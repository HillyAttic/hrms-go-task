/**
 * Admin Base Service
 * Generic server-side service using Firebase Admin SDK
 * This bypasses Firestore security rules and should only be used in API routes
 */

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface QueryFilter {
  field: string;
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'not-in' | 'array-contains';
  value: any;
}

export interface QueryOptions {
  filters?: QueryFilter[];
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  limit?: number;
}

/**
 * Recursively convert Firestore Timestamp objects to JavaScript Dates.
 * Handles nested objects and arrays.
 */
function convertTimestampsToDates<T>(data: T): T {
  if (data === null || data === undefined) return data;

  // Firestore Timestamp (firebase-admin v11+)
  if (typeof (data as any).toDate === 'function') {
    return (data as any).toDate() as T;
  }

  // Plain Timestamp-like object { seconds, nanoseconds }
  if (
    typeof data === 'object' &&
    'seconds' in (data as any) &&
    'nanoseconds' in (data as any) &&
    Object.keys(data as any).length === 2
  ) {
    return new Date(
      ((data as any).seconds as number) * 1000 +
        ((data as any).nanoseconds as number) / 1_000_000
    ) as T;
  }

  // Array — recurse each element
  if (Array.isArray(data)) {
    return data.map(convertTimestampsToDates) as unknown as T;
  }

  // Plain object — recurse keys
  if (typeof data === 'object' && data.constructor === Object) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      result[key] = convertTimestampsToDates(value);
    }
    return result as T;
  }

  return data;
}

/**
 * Create an Admin SDK service for a Firestore collection
 * @param collectionName - Name of the Firestore collection
 */
export function createAdminService<T extends { id?: string }>(collectionName: string) {
  return {
    /**
     * Get all documents with optional filters
     */
    async getAll(options?: QueryOptions): Promise<T[]> {
      try {
        console.log(`[AdminService:${collectionName}] Fetching documents`);

        let query: any = adminDb.collection(collectionName);

        // Apply filters
        if (options?.filters) {
          for (const filter of options.filters) {
            query = query.where(filter.field, filter.operator, filter.value);
          }
        }

        // Apply ordering
        if (options?.orderBy) {
          query = query.orderBy(options.orderBy.field, options.orderBy.direction);
        }

        // Apply limit
        if (options?.limit) {
          query = query.limit(options.limit);
        }

        const snapshot = await query.get();
        console.log(`[AdminService:${collectionName}] Found ${snapshot.size} documents`);

        const documents: T[] = [];
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          documents.push({
            ...convertTimestampsToDates(data),
            id: doc.id,
          } as unknown as T);
        });

        return documents;
      } catch (error) {
        console.error(`[AdminService:${collectionName}] Error in getAll:`, error);
        throw error;
      }
    },

    /**
     * Get a single document by ID
     */
    async getById(id: string): Promise<T | null> {
      try {
        const doc = await adminDb.collection(collectionName).doc(id).get();

        if (!doc.exists) {
          return null;
        }

        const data = doc.data()!;
        return {
          ...convertTimestampsToDates(data),
          id: doc.id,
        } as unknown as T;
      } catch (error) {
        console.error(`[AdminService:${collectionName}] Error in getById:`, error);
        throw error;
      }
    },

    /**
     * Create a new document
     */
    async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
      try {
        console.log(`[AdminService:${collectionName}] Creating document`);

        const docData = {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const docRef = await adminDb.collection(collectionName).add(docData);
        console.log(`[AdminService:${collectionName}] Created document:`, docRef.id);

        return {
          ...docData,
          id: docRef.id,
        } as unknown as T;
      } catch (error) {
        console.error(`[AdminService:${collectionName}] Error in create:`, error);
        throw error;
      }
    },

    /**
     * Update a document
     */
    async update(id: string, data: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T> {
      try {
        console.log(`[AdminService:${collectionName}] Updating document:`, id);

        const docRef = adminDb.collection(collectionName).doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          throw new Error(`${collectionName} not found`);
        }

        const updateData = {
          ...data,
          updatedAt: new Date(),
        };

        await docRef.update(updateData);
        console.log(`[AdminService:${collectionName}] Updated document:`, id);

        // Return updated document
        return await this.getById(id) as T;
      } catch (error) {
        console.error(`[AdminService:${collectionName}] Error in update:`, error);
        throw error;
      }
    },

    /**
     * Delete a document
     */
    async delete(id: string): Promise<void> {
      try {
        console.log(`[AdminService:${collectionName}] Deleting document:`, id);
        await adminDb.collection(collectionName).doc(id).delete();
        console.log(`[AdminService:${collectionName}] Deleted document:`, id);
      } catch (error) {
        console.error(`[AdminService:${collectionName}] Error in delete:`, error);
        throw error;
      }
    },

    /**
     * Bulk delete documents
     */
    async bulkDelete(ids: string[]): Promise<{ success: string[]; failed: Array<{ id: string; error: string }> }> {
      const results = {
        success: [] as string[],
        failed: [] as Array<{ id: string; error: string }>,
      };

      for (const id of ids) {
        try {
          await this.delete(id);
          results.success.push(id);
        } catch (error) {
          results.failed.push({
            id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return results;
    },

    /**
     * Check if a document exists
     */
    async exists(id: string): Promise<boolean> {
      try {
        const doc = await adminDb.collection(collectionName).doc(id).get();
        return doc.exists;
      } catch (error) {
        console.error(`[AdminService:${collectionName}] Error in exists:`, error);
        return false;
      }
    },

    /**
     * Count documents with optional filters
     */
    async count(options?: QueryOptions): Promise<number> {
      try {
        let query: any = adminDb.collection(collectionName);

        // Apply filters
        if (options?.filters) {
          for (const filter of options.filters) {
            query = query.where(filter.field, filter.operator, filter.value);
          }
        }

        const snapshot = await query.get();
        return snapshot.size;
      } catch (error) {
        console.error(`[AdminService:${collectionName}] Error in count:`, error);
        throw error;
      }
    },
  };
}

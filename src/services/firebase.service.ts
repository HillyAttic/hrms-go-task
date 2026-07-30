/**
 * Generic Firebase Firestore Service Layer
 * Provides CRUD operations, pagination, search, and filtering for all entities
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  getDocsFromServer,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryConstraint,
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp,
  WhereFilterOp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Generic filter parameters for queries
 */
export interface FilterParams {
  field: string;
  operator: WhereFilterOp;
  value: any;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  pageSize?: number;
  lastDoc?: QueryDocumentSnapshot<DocumentData>;
}

/**
 * Query options combining filters, pagination, and sorting
 */
export interface QueryOptions {
  filters?: FilterParams[];
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  pagination?: PaginationParams;
  forceServerFetch?: boolean;
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  data: T[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/**
 * Error response structure
 */
export interface FirebaseServiceError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Generic Firebase Service Class
 */
export class FirebaseService<T extends { id?: string }> {
  private collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  /**
   * Recursively convert Firestore Timestamp objects to JavaScript Dates.
   * Handles nested objects and arrays so deeply nested date fields
   * (e.g. invoice.raisedAt, milestones[].completedAt) are also converted.
   */
  private convertTimestamps(data: any): any {
    if (data === null || data === undefined) return data;

    // Firestore Timestamp instance
    if (data instanceof Timestamp) {
      return data.toDate();
    }

    // Plain Timestamp-like object { seconds, nanoseconds }
    if (
      typeof data === 'object' &&
      'seconds' in data &&
      'nanoseconds' in data &&
      Object.keys(data).length === 2
    ) {
      return new Date(data.seconds * 1000 + data.nanoseconds / 1_000_000);
    }

    // Array — recurse each element
    if (Array.isArray(data)) {
      return data.map((item) => this.convertTimestamps(item));
    }

    // Plain object — recurse keys
    if (typeof data === 'object' && data.constructor === Object) {
      const result: Record<string, any> = {};
      Object.keys(data).forEach((key) => {
        result[key] = this.convertTimestamps(data[key]);
      });
      return result;
    }

    return data;
  }

  /**
   * Recursively remove undefined values from an object
   */
  private removeUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefinedValues(item));
    }

    if (typeof obj === 'object') {
      const cleaned: any = {};
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (value !== undefined) {
          cleaned[key] = this.removeUndefinedValues(value);
        }
      });
      return cleaned;
    }

    return obj;
  }

  /**
   * Convert Date objects to Firestore timestamps for storage (recursive)
   */
  private prepareForStorage(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    // Handle Date objects
    if (data instanceof Date) {
      return Timestamp.fromDate(data);
    }

    // Preserve Firestore Timestamp objects as-is
    if (data instanceof Timestamp) {
      return data;
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.prepareForStorage(item));
    }

    // Handle objects
    if (typeof data === 'object') {
      const prepared: any = {};
      Object.keys(data).forEach((key) => {
        const value = data[key];
        if (value !== undefined) {
          prepared[key] = this.prepareForStorage(value);
        }
      });
      return prepared;
    }

    return data;
  }

  /**
   * Build query constraints from options
   */
  private buildQueryConstraints(options?: QueryOptions): QueryConstraint[] {
    const constraints: QueryConstraint[] = [];

    // Add filters
    if (options?.filters && options.filters.length > 0) {
      options.filters.forEach((filter) => {
        constraints.push(where(filter.field, filter.operator, filter.value));
      });
    }

    // Add ordering
    if (options?.orderByField) {
      constraints.push(
        orderBy(options.orderByField, options.orderDirection || 'asc')
      );
    }

    // Add pagination
    if (options?.pagination?.lastDoc) {
      constraints.push(startAfter(options.pagination.lastDoc));
    }

    if (options?.pagination?.pageSize) {
      constraints.push(limit(options.pagination.pageSize));
    }

    return constraints;
  }

  /**
   * Handle Firebase errors and convert to service errors
   */
  private handleError(error: any): FirebaseServiceError {
    // Log the raw error for debugging
    console.error('Firebase Service Error Details:', {
      error,
      errorType: typeof error,
      errorConstructor: error?.constructor?.name,
      errorKeys: error && typeof error === 'object' ? Object.keys(error) : [],
      errorString: String(error),
      stack: error?.stack,
    });

    // Handle case where error is an empty object or null
    if (!error || (typeof error === 'object' && Object.keys(error).length === 0)) {
      return {
        code: 'unknown',
        message: 'An unknown error occurred. Please check your Firebase configuration and network connection.',
        details: { rawError: error },
      };
    }

    const serviceError: FirebaseServiceError = {
      code: error.code || 'unknown',
      message: error.message || 'An unknown error occurred',
      details: error,
    };

    // Map common Firebase errors to user-friendly messages
    switch (error.code) {
      case 'permission-denied':
        serviceError.message = 'You do not have permission to perform this action. Check Firestore security rules.';
        break;
      case 'not-found':
        serviceError.message = 'The requested resource was not found';
        break;
      case 'already-exists':
        serviceError.message = 'A resource with this identifier already exists';
        break;
      case 'resource-exhausted':
        serviceError.message = 'Resource quota exceeded. Please try again later';
        break;
      case 'unauthenticated':
        serviceError.message = 'You must be authenticated to perform this action';
        break;
      case 'unavailable':
        serviceError.message = 'Service is temporarily unavailable. Please try again';
        break;
      case 'failed-precondition':
        serviceError.message = 'Operation failed. The collection may require an index. Check Firebase console.';
        break;
    }

    return serviceError;
  }

  /**
   * Create a new document
   */
  async create(data: Omit<T, 'id'>): Promise<T> {
    try {
      const collectionRef = collection(db, this.collectionName);
      const preparedData = this.prepareForStorage(data);
      const now = Timestamp.now();
      const docRef = await addDoc(collectionRef, {
        ...preparedData,
        createdAt: now,
        updatedAt: now,
      });

      // Return data we already have — no extra Firestore read needed
      return {
        id: docRef.id,
        ...data,
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
      } as unknown as T;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get a document by ID
   */
  async getById(id: string): Promise<T | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return {
        id: docSnap.id,
        ...this.convertTimestamps(docSnap.data()),
      } as T;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get all documents with optional filtering, sorting, and pagination
   */
  async getAll(options?: QueryOptions & { forceServerFetch?: boolean }): Promise<T[]> {
    try {
      const collectionRef = collection(db, this.collectionName);
      const constraints = this.buildQueryConstraints(options);
      const q = query(collectionRef, ...constraints);

      // Use getDocsFromServer to bypass cache if forceServerFetch is true
      const querySnapshot = options?.forceServerFetch
        ? await getDocsFromServer(q)
        : await getDocs(q);
      const documents: T[] = [];

      querySnapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          ...this.convertTimestamps(doc.data()),
        } as T);
      });

      return documents;
    } catch (error) {
      console.error(`Error in FirebaseService.getAll for collection '${this.collectionName}':`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Get paginated results
   */
  async getPaginated(options?: QueryOptions): Promise<PaginatedResult<T>> {
    try {
      const pageSize = options?.pagination?.pageSize || 20;
      const collectionRef = collection(db, this.collectionName);

      // Request one extra document to check if there are more pages
      const constraints = this.buildQueryConstraints({
        ...options,
        pagination: {
          ...options?.pagination,
          pageSize: pageSize + 1,
        },
      });

      const q = query(collectionRef, ...constraints);

      // Use getDocsFromServer to bypass cache if forceServerFetch is true
      const querySnapshot = options?.forceServerFetch
        ? await getDocsFromServer(q)
        : await getDocs(q);

      const documents: T[] = [];
      let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
      let hasMore = false;

      const docs = querySnapshot.docs;
      docs.forEach((doc, index) => {
        if (index < pageSize) {
          documents.push({
            id: doc.id,
            ...this.convertTimestamps(doc.data()),
          } as T);
          lastDoc = doc;
        } else {
          hasMore = true;
        }
      });

      return {
        data: documents,
        lastDoc,
        hasMore,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update a document
   */
  async update(id: string, data: Partial<Omit<T, 'id'>>): Promise<T> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const preparedData = this.prepareForStorage(data);
      const now = Timestamp.now();

      await updateDoc(docRef, {
        ...preparedData,
        updatedAt: now,
      });

      // Return the merged data — no extra Firestore read needed
      return {
        id,
        ...data,
        updatedAt: now.toDate(),
      } as unknown as T;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete a document
   */
  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Search documents by a text field
   * Note: This performs client-side filtering. For production, consider using
   * Algolia, Elasticsearch, or Firebase Extensions for full-text search.
   */
  async search(searchField: string, searchTerm: string, options?: QueryOptions): Promise<T[]> {
    try {
      // Get all documents (with optional filters)
      const documents = await this.getAll(options);

      // Filter client-side for search term
      const searchLower = searchTerm.toLowerCase();
      return documents.filter((doc: any) => {
        const fieldValue = doc[searchField];
        if (typeof fieldValue === 'string') {
          return fieldValue.toLowerCase().includes(searchLower);
        }
        return false;
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Search across multiple fields
   */
  async searchMultipleFields(
    searchFields: string[],
    searchTerm: string,
    options?: QueryOptions
  ): Promise<T[]> {
    try {
      const documents = await this.getAll(options);
      const searchLower = searchTerm.toLowerCase();

      return documents.filter((doc: any) => {
        return searchFields.some((field) => {
          const fieldValue = doc[field];
          if (typeof fieldValue === 'string') {
            return fieldValue.toLowerCase().includes(searchLower);
          }
          if (Array.isArray(fieldValue)) {
            return fieldValue.some(
              (item) =>
                typeof item === 'string' &&
                item.toLowerCase().includes(searchLower)
            );
          }
          return false;
        });
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Count documents matching filters
   */
  async count(options?: QueryOptions): Promise<number> {
    try {
      const documents = await this.getAll(options);
      return documents.length;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check if a document exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Batch delete multiple documents
   */
  async batchDelete(ids: string[]): Promise<void> {
    try {
      const deletePromises = ids.map((id) => this.delete(id));
      await Promise.all(deletePromises);
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

/**
 * Create a service instance for a specific collection
 */
export function createFirebaseService<T extends { id?: string }>(
  collectionName: string
): FirebaseService<T> {
  return new FirebaseService<T>(collectionName);
}

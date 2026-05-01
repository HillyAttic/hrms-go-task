import { Timestamp } from 'firebase-admin/firestore';
import type {
  FormSubmission,
  FormSubmissionInput,
  FormSubmissionFilters,
} from '@/types/form.types';

const COLLECTION = 'form_submissions';

/**
 * Helper function to serialize Firestore Timestamp to ISO string
 */
function serializeSubmission(doc: FirebaseFirestore.DocumentSnapshot): FormSubmission {
  const data = doc.data();
  if (!data) {
    throw new Error('Document data is undefined');
  }

  return {
    id: doc.id,
    ...data,
    submittedAt: data.submittedAt?.toDate?.()?.toISOString() || data.submittedAt,
    files: data.files || [], // Explicitly include files array
  } as FormSubmission;
}

export const formSubmissionService = {
  /**
   * Get all form submissions with optional filters and pagination
   */
  async getAll(filters?: FormSubmissionFilters): Promise<{
    submissions: FormSubmission[];
    total: number;
  }> {
    const { adminDb } = await import('@/lib/firebase-admin');
    let query: FirebaseFirestore.Query = adminDb.collection(COLLECTION);

    if (filters?.formId) {
      query = query.where('formId', '==', filters.formId);
    }
    if (filters?.submittedBy) {
      query = query.where('submittedBy', '==', filters.submittedBy);
    }

    // Handle date range filters
    // Note: Using both >= and <= on same field requires composite index
    if (filters?.startDate && filters?.endDate) {
      query = query
        .where('submittedAt', '>=', Timestamp.fromDate(filters.startDate))
        .where('submittedAt', '<=', Timestamp.fromDate(filters.endDate));
    } else if (filters?.startDate) {
      query = query.where(
        'submittedAt',
        '>=',
        Timestamp.fromDate(filters.startDate)
      );
    } else if (filters?.endDate) {
      query = query.where(
        'submittedAt',
        '<=',
        Timestamp.fromDate(filters.endDate)
      );
    }

    query = query.orderBy('submittedAt', 'desc');

    // Get total count
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    // Apply pagination
    if (filters?.page && filters?.limit) {
      const offset = (filters.page - 1) * filters.limit;
      query = query.offset(offset).limit(filters.limit);
    } else if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const snapshot = await query.get();
    const submissions = snapshot.docs.map((doc) => serializeSubmission(doc));

    return { submissions, total };
  },

  /**
   * Get a single form submission by ID
   */
  async getById(id: string): Promise<FormSubmission | null> {
    const { adminDb } = await import('@/lib/firebase-admin');
    const doc = await adminDb.collection(COLLECTION).doc(id).get();

    if (!doc.exists) return null;

    return serializeSubmission(doc);
  },

  /**
   * Create a new form submission
   */
  async create(data: FormSubmissionInput): Promise<FormSubmission> {
    const { adminDb } = await import('@/lib/firebase-admin');
    const now = Timestamp.now();

    const docRef = adminDb.collection(COLLECTION).doc();
    const submission: Omit<FormSubmission, 'id'> = {
      ...data,
      submittedAt: now as any,
      isRead: false,
      isFlagged: false,
    };

    await docRef.set(submission);

    // Increment form template submission count
    const { formTemplateService } = await import('./form-template.service');
    await formTemplateService.incrementSubmissionCount(data.formId);

    return {
      id: docRef.id,
      ...submission,
    } as FormSubmission;
  },

  /**
   * Update an existing form submission
   */
  async update(
    id: string,
    data: Partial<Omit<FormSubmission, 'id' | 'submittedAt'>>
  ): Promise<FormSubmission | null> {
    const { adminDb } = await import('@/lib/firebase-admin');
    const ref = adminDb.collection(COLLECTION).doc(id);
    const existing = await ref.get();

    if (!existing.exists) return null;

    await ref.update(data);

    const updated = await ref.get();
    return {
      id: updated.id,
      ...updated.data(),
    } as FormSubmission;
  },

  /**
   * Delete a form submission
   */
  async delete(id: string): Promise<void> {
    const { adminDb } = await import('@/lib/firebase-admin');
    const submission = await this.getById(id);

    // Delete associated files from storage
    if (submission?.files && submission.files.length > 0) {
      const { formFileUploadService } = await import(
        './form-file-upload.service'
      );
      await formFileUploadService.deleteSubmissionFiles(
        id,
        submission.files
      );
    }

    await adminDb.collection(COLLECTION).doc(id).delete();
  },

  /**
   * Bulk delete form submissions
   */
  async bulkDelete(submissionIds: string[]): Promise<number> {
    const { adminDb } = await import('@/lib/firebase-admin');
    const batch = adminDb.batch();
    let deleted = 0;

    for (const id of submissionIds) {
      const submission = await this.getById(id);
      if (submission) {
        // Delete associated files
        if (submission.files && submission.files.length > 0) {
          const { formFileUploadService } = await import(
            './form-file-upload.service'
          );
          await formFileUploadService.deleteSubmissionFiles(
            id,
            submission.files
          );
        }

        batch.delete(adminDb.collection(COLLECTION).doc(id));
        deleted++;
      }

      // Firestore batch limit is 500
      if (deleted % 499 === 0) {
        await batch.commit();
      }
    }

    if (deleted % 499 !== 0) {
      await batch.commit();
    }

    return deleted;
  },

  /**
   * Check if a user has submitted a form today
   * Critical for clock-out validation (replaces Google Sheets check)
   */
  async checkUserSubmissionToday(
    formId: string,
    userId: string,
    date: Date = new Date()
  ): Promise<{ submitted: boolean; submissionId?: string }> {
    const { adminDb } = await import('@/lib/firebase-admin');

    // Work entirely in UTC to match Firestore timestamps
    // Get UTC date components from the input date
    const startOfDay = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0, 0, 0, 0
    ));

    const endOfDay = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23, 59, 59, 999
    ));

    console.log('[checkUserSubmissionToday] Query params:', {
      formId,
      userId,
      inputDate: date.toISOString(),
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString(),
      startTimestamp: startOfDay.getTime(),
      endTimestamp: endOfDay.getTime(),
      isValid: endOfDay.getTime() > startOfDay.getTime()
    });

    const snapshot = await adminDb
      .collection(COLLECTION)
      .where('formId', '==', formId)
      .where('submittedBy', '==', userId)
      .where('submittedAt', '>=', Timestamp.fromDate(startOfDay))
      .where('submittedAt', '<=', Timestamp.fromDate(endOfDay))
      .limit(1)
      .get();

    console.log('[checkUserSubmissionToday] Query result:', {
      empty: snapshot.empty,
      size: snapshot.size,
      docs: snapshot.docs.map(doc => ({
        id: doc.id,
        formId: doc.data().formId,
        submittedBy: doc.data().submittedBy,
        submittedAt: doc.data().submittedAt
      }))
    });

    if (snapshot.empty) {
      return { submitted: false };
    }

    return {
      submitted: true,
      submissionId: snapshot.docs[0].id,
    };
  },

  /**
   * Mark a submission as read
   */
  async markAsRead(id: string): Promise<void> {
    await this.update(id, { isRead: true });
  },

  /**
   * Toggle flag status on a submission
   */
  async toggleFlag(id: string): Promise<void> {
    const submission = await this.getById(id);
    if (submission) {
      await this.update(id, { isFlagged: !submission.isFlagged });
    }
  },

  /**
   * Get submission count for a specific form
   */
  async getCountByFormId(formId: string): Promise<number> {
    const { adminDb } = await import('@/lib/firebase-admin');
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where('formId', '==', formId)
      .count()
      .get();

    return snapshot.data().count;
  },

  /**
   * Get recent submissions for a form
   */
  async getRecentByFormId(
    formId: string,
    limit: number = 10
  ): Promise<FormSubmission[]> {
    const { adminDb } = await import('@/lib/firebase-admin');
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where('formId', '==', formId)
      .orderBy('submittedAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => serializeSubmission(doc));
  },
};

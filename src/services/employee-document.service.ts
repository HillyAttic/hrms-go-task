/**
 * Employee Document Service
 * Handles file upload, view, and delete operations for employee documents
 * using Firebase Storage.
 */

import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export interface DocumentInfo {
  url: string;
  path: string;
  name: string;
  size?: number;
  mimeType?: string;
}

export type DocumentField =
  | 'addressProof'
  | 'cancelledCheque'
  | 'aadhaarCard'
  | 'panCard'
  | 'resignationLetter'
  | 'marksheet10th'
  | 'marksheet12th'
  | 'degree';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/pdf',
];

const ALLOWED_EXTENSIONS = '.jpg,.jpeg,.png,.pdf';

/**
 * Validate a file before upload
 */
export function validateDocumentFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File "${file.name}" exceeds 10MB limit`;
  }
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
    return `File "${file.name}" has unsupported type. Allowed: JPG, PNG, PDF`;
  }
  return null;
}

/**
 * Upload an employee document to Firebase Storage.
 * Path pattern: employees/{employeeId}/documents/{fieldName}/{timestamp}_{sanitizedFilename}
 */
export async function uploadEmployeeDocument(
  employeeId: string,
  fieldName: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<DocumentInfo> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `employees/${employeeId}/documents/${fieldName}/${timestamp}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        employeeId,
        fieldName,
      },
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(Math.round(progress));
      },
      (error) => {
        console.error('[EmployeeDocumentService] Upload error:', error);
        reject(error);
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            url,
            path: storagePath,
            name: file.name,
            size: file.size,
            mimeType: file.type,
          });
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

/**
 * Delete an employee document from Firebase Storage by its storage path.
 */
export async function deleteEmployeeDocument(storagePath: string): Promise<void> {
  try {
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);
  } catch (error: any) {
    // Ignore if file doesn't exist
    if (error.code !== 'storage/object-not-found') {
      console.error('[EmployeeDocumentService] Delete error:', error);
      throw error;
    }
  }
}

/**
 * Delete multiple employee documents from Firebase Storage.
 */
export async function deleteMultipleEmployeeDocuments(paths: string[]): Promise<void> {
  await Promise.all(
    paths.map((path) => deleteEmployeeDocument(path).catch((err) => {
      console.error(`[EmployeeDocumentService] Failed to delete ${path}:`, err);
    }))
  );
}

/**
 * Get a download URL from a storage path.
 */
export async function getDocumentUrl(storagePath: string): Promise<string> {
  const fileRef = ref(storage, storagePath);
  return getDownloadURL(fileRef);
}

/**
 * Open a document in a new tab for viewing.
 */
export function viewDocument(url: string): void {
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return 'Unknown size';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get a display label for each document field
 */
export const DOCUMENT_LABELS: Record<DocumentField, string> = {
  addressProof: 'Address Proof',
  cancelledCheque: 'Cancelled Cheque / Passbook',
  aadhaarCard: 'Aadhaar Card',
  panCard: 'PAN Card',
  resignationLetter: 'Resignation Letter (prev company)',
  marksheet10th: '10th Marksheet',
  marksheet12th: '12th Marksheet',
  degree: 'Degree Certificate',
};

export { MAX_FILE_SIZE, ALLOWED_TYPES };

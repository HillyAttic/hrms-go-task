/**
 * Employee record types shared by client components, client services and API routes.
 * Kept free of runtime imports so server code can use it without pulling in the
 * Firebase client SDK.
 */

/** Metadata returned by a Storage upload (employee-document.service). */
export interface DocumentInfo {
  url: string;
  path: string;
  name: string;
  size?: number;
  mimeType?: string;
}

/**
 * A stored document: a bare URL typed by hand, or an uploaded file's metadata. Looser
 * than DocumentInfo because hand-typed entries carry no path or name — and this is the
 * shape the API schemas validate, so keeping them identical avoids cast gymnastics.
 */
export type DocumentValue = string | {
  url: string;
  path?: string;
  name?: string;
  size?: number;
  mimeType?: string;
};

export type EmployeeDocuments = {
  addressProof?: DocumentValue;
  cancelledCheque?: DocumentValue;
  aadhaarCard?: DocumentValue;
  panCard?: DocumentValue;
  resignationLetter?: DocumentValue;
  salarySlips?: DocumentValue[];
  marksheet10th?: DocumentValue;
  marksheet12th?: DocumentValue;
  degree?: DocumentValue;
};

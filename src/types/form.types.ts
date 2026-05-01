import { Timestamp } from 'firebase/firestore';

/**
 * Form field types supported by the form builder
 */
export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'time'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'section';

/**
 * Form template status
 */
export type FormStatus = 'draft' | 'published' | 'archived';

/**
 * Access control type for forms
 */
export type AccessControlType = 'public' | 'authenticated' | 'restricted';

/**
 * User roles in the system
 */
export type UserRole = 'admin' | 'manager' | 'employee';

/**
 * Validation rules for form fields
 */
export interface FieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customMessage?: string;
}

/**
 * Option for select, radio, and checkbox fields
 */
export type FieldOption = string | { value: string; label: string };

/**
 * File upload configuration
 */
export interface FileConfig {
  acceptedTypes?: string[];
  maxSize?: number; // in bytes
  multiple?: boolean;
}

/**
 * Individual form field definition
 */
export interface FormField {
  id: string; // UUID
  type: FormFieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  order: number;

  // Validation rules
  validation?: FieldValidation;

  // Field-specific options
  options?: FieldOption[]; // for select, radio, checkbox, multiselect
  fileConfig?: FileConfig; // for file uploads

  // Section-specific fields
  description?: string; // for section type - longer description text
  fields?: FormField[]; // nested fields within a section
  sectionId?: string; // parent section ID for nested fields

  // Legacy fields (deprecated, use fileConfig instead)
  accept?: string;
  maxFileSize?: number;
  multiple?: boolean;
}

/**
 * Form settings
 */
export interface FormSettings {
  submitButtonText: string;
  successMessage: string;
  allowMultipleSubmissions: boolean;
}

/**
 * Access control configuration for forms
 */
export interface AccessControl {
  type: AccessControlType;
  allowedRoles?: UserRole[];
  allowedUserIds?: string[];
}

/**
 * Form template (stored in Firestore collection: form_templates)
 */
export interface FormTemplate {
  id: string;
  title: string;
  description?: string;
  createdBy: string; // uid
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: FormStatus;

  // Form structure
  fields: FormField[];
  settings: FormSettings;

  // Access control
  accessControl: AccessControl;

  // Metadata
  submissionCount: number;
  lastSubmissionAt?: Timestamp;
  category?: string; // e.g., 'mis', 'hr', 'compliance'
}

/**
 * File attachment metadata
 */
export interface FileAttachment {
  fieldId: string;
  fileName: string;
  fileUrl: string;
  storagePath: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Form submission (stored in Firestore collection: form_submissions)
 */
export interface FormSubmission {
  id: string;
  formId: string;
  formTitle: string; // denormalized for queries

  // Submitter info
  submittedBy?: string; // uid (if authenticated)
  submitterEmail?: string;
  submitterName?: string;

  // Submission data
  data: Record<string, any>; // fieldId -> value mapping
  files?: FileAttachment[];

  // Metadata
  submittedAt: Timestamp | string; // Timestamp on server, ISO string on client
  ipAddress?: string;
  userAgent?: string;

  // Flags
  isRead: boolean;
  isFlagged: boolean;
}

/**
 * Form template creation input (without auto-generated fields)
 */
export type FormTemplateInput = Omit<
  FormTemplate,
  'id' | 'createdAt' | 'updatedAt' | 'submissionCount' | 'lastSubmissionAt'
>;

/**
 * Form submission creation input (without auto-generated fields)
 */
export type FormSubmissionInput = Omit<
  FormSubmission,
  'id' | 'submittedAt' | 'isRead' | 'isFlagged'
>;

/**
 * Form template filters for queries
 */
export interface FormTemplateFilters {
  status?: FormStatus;
  createdBy?: string;
  category?: string;
  search?: string;
}

/**
 * Form submission filters for queries
 */
export interface FormSubmissionFilters {
  formId?: string;
  submittedBy?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * Export format options
 */
export type ExportFormat = 'csv' | 'excel';

/**
 * File upload result
 */
export interface FileUploadResult {
  url: string;
  path: string;
  fileName: string;
  size: number;
  mimeType: string;
}

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Employee } from '@/services/employee.service';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhotoIcon, PlusIcon, XMarkIcon, TrashIcon, EyeIcon, ArrowUpTrayIcon, DocumentIcon } from '@heroicons/react/24/outline';
import {
  uploadEmployeeDocument,
  deleteEmployeeDocument,
  deleteMultipleEmployeeDocuments,
  validateDocumentFile,
  viewDocument,
  formatFileSize,
  DOCUMENT_LABELS,
  DocumentInfo,
  DocumentField,
} from '@/services/employee-document.service';

// Form schema with all new fields
const employeeFormSchema = z.object({
  // Personal Info
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().optional(),
  email: z.string().email({ message: 'Invalid email format' }),
  phone: z.string().regex(/^\d{10}$/, { message: 'Phone must be exactly 10 digits' }),
  dateOfBirth: z.string().optional(),
  department: z.string().optional(),

  // Employment
  employeeId: z.string().min(1, 'Employee ID is required').max(20),
  dateOfJoining: z.string().optional(),
  salary: z.coerce.number().optional(),
  status: z.enum(['active', 'on-leave', 'resigned']),

  // Role
  role: z.enum(['Manager', 'Admin', 'Employee'], { message: 'Please select a role' }),

  // Manager info
  managerId: z.string().optional(),
  managerName: z.string().optional(),

  // Attendance
  requireLocationTracking: z.coerce.boolean().default(true),

  // Probation
  probationDuration: z.coerce.number().optional(),
  probationEndDate: z.string().optional(),
  workAnniversary: z.string().optional(),

  // Promotion
  promotionDate: z.string().optional(),
  promotionDetails: z.string().optional(),

  // Password
  currentPassword: z.string().optional(),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

interface SalaryChangeItem {
  date: string;
  oldSalary: number;
  newSalary: number;
  reason: 'probation' | 'promotion' | 'revision';
  notes?: string;
}

type DocumentValue = string | { url: string; path?: string; name?: string; size?: number; mimeType?: string };

interface DocumentUrls {
  addressProof?: DocumentValue;
  cancelledCheque?: DocumentValue;
  aadhaarCard?: DocumentValue;
  panCard?: DocumentValue;
  resignationLetter?: DocumentValue;
  salarySlips?: DocumentValue[];
  marksheet10th?: DocumentValue;
  marksheet12th?: DocumentValue;
  degree?: DocumentValue;
}

/** Extract a downloadable URL from a document value (string or object) */
function docUrl(doc: DocumentValue | undefined | null): string {
  if (!doc) return '';
  return typeof doc === 'string' ? doc : doc.url || '';
}

/** Extract the storage path from a document value */
function docPath(doc: DocumentValue | undefined | null): string | undefined {
  if (!doc || typeof doc === 'string') return undefined;
  return doc.path;
}

/** Extract the file name from a document value */
function docName(doc: DocumentValue | undefined | null): string | undefined {
  if (!doc || typeof doc === 'string') return undefined;
  return doc.name;
}

/** Get a display label for a salary slip */
function getSalarySlipName(slip: DocumentValue, index: number): string {
  if (typeof slip === 'object' && slip.name) return slip.name;
  return `Salary Slip ${index + 1}`;
}

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  employee?: Employee | null;
  isLoading?: boolean;
  managers?: Employee[];
}

/**
 * EmployeeModal Component
 * Form modal for creating and editing employees with all HR fields
 */
export function EmployeeModal({
  isOpen,
  onClose,
  onSubmit,
  employee,
  isLoading = false,
  managers = [],
}: EmployeeModalProps) {
  const [activeTab, setActiveTab] = useState<'personal' | 'employment' | 'probation' | 'documents'>('personal');
  const [salaryChanges, setSalaryChanges] = useState<SalaryChangeItem[]>(employee?.salaryChanges || []);
  const [documents, setDocuments] = useState<DocumentUrls>(employee?.documents || {});
  const [salarySlipUrls, setSalarySlipUrls] = useState<DocumentValue[]>(employee?.documents?.salarySlips || ['']);

  // Upload progress tracking
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema) as any,
    defaultValues: {
      employeeId: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: '',
      dateOfBirth: '',
      salary: undefined,
      dateOfJoining: '',
      role: 'Employee',
      password: '',
      confirmPassword: '',
      status: 'active',
      managerId: '',
      managerName: '',
      requireLocationTracking: true,
      probationDuration: undefined,
      probationEndDate: '',
      workAnniversary: '',
      promotionDate: '',
      promotionDetails: '',
    },
  });

  // Generate initials for avatar fallback
  const getInitials = (name: string): string => {
    if (!name) return '';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const firstName = watch('firstName');
  const lastName = watch('lastName');
  const displayName = [firstName, lastName].filter(Boolean).join(' ');

  // Update form when employee prop changes (edit mode)
  useEffect(() => {
    if (employee) {
      reset({
        employeeId: employee.employeeId,
        firstName: employee.firstName || employee.name.split(' ')[0] || '',
        lastName: employee.lastName || employee.name.split(' ').slice(1).join(' ') || '',
        email: employee.email,
        phone: employee.phone,
        department: employee.department || '',
        dateOfBirth: employee.dateOfBirth || '',
        salary: employee.salary || undefined,
        dateOfJoining: employee.dateOfJoining || '',
        role: employee.role || 'Employee',
        status: employee.status,
        managerId: employee.managerId || '',
        managerName: employee.managerName || '',
        requireLocationTracking: employee.requireLocationTracking ?? true,
        probationDuration: employee.probationDuration || undefined,
        probationEndDate: employee.probationEndDate || '',
        workAnniversary: employee.workAnniversary || '',
        promotionDate: employee.promotionDate || '',
        promotionDetails: employee.promotionDetails || '',
        password: '',
        confirmPassword: '',
      });
      setSalaryChanges(employee.salaryChanges || []);
      setDocuments(employee.documents || {});
      setSalarySlipUrls(employee.documents?.salarySlips?.length ? employee.documents.salarySlips : ['']);
    } else {
      reset({
        employeeId: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        department: '',
        dateOfBirth: '',
        salary: undefined,
        dateOfJoining: '',
        role: 'Employee',
        status: 'active',
        managerId: '',
        managerName: '',
        probationDuration: undefined,
        probationEndDate: '',
        workAnniversary: '',
        promotionDate: '',
        promotionDetails: '',
        password: '',
        confirmPassword: '',
      });
      setSalaryChanges([]);
      setDocuments({});
      setSalarySlipUrls(['']);
    }
    // Reset upload states
    setUploadProgress({});
    setUploadingField(null);
    setUploadError(null);
  }, [employee, reset]);

  const handleFormSubmit = async (data: EmployeeFormData) => {
    try {
      // Validate password for new employees
      if (!employee) {
        if (!data.password || data.password.length < 6) {
          alert('Password is required and must be at least 6 characters for new employees');
          return;
        }
        if (data.password !== data.confirmPassword) {
          alert('Passwords do not match');
          return;
        }
      } else {
        if (data.password) {
          if (!data.currentPassword) {
            alert('Current password is required to change password');
            return;
          }
          if (data.password.length < 6) {
            alert('Password must be at least 6 characters');
            return;
          }
          if (data.password !== data.confirmPassword) {
            alert('Passwords do not match');
            return;
          }
        }
      }

      // Filter out empty salary slip values (both strings and objects)
      const filteredSalarySlips = salarySlipUrls.filter(slip => {
        if (typeof slip === 'string') return slip.trim() !== '';
        return slip && slip.url && slip.url.trim() !== '';
      });

      // Build submission payload
      const submissionData = {
        ...data,
        name: [data.firstName, data.lastName].filter(Boolean).join(' '),
        salaryChanges: salaryChanges.length > 0 ? salaryChanges : undefined,
        documents: {
          ...documents,
          ...(filteredSalarySlips.length > 0 ? { salarySlips: filteredSalarySlips } : {}),
        },
      };

      await onSubmit(submissionData);
      reset();
      onClose();
    } catch (error) {
      console.error('Error submitting employee:', error);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Salary change handlers
  const addSalaryChange = () => {
    setSalaryChanges([...salaryChanges, { date: '', oldSalary: 0, newSalary: 0, reason: 'revision', notes: '' }]);
  };

  const updateSalaryChange = (index: number, field: keyof SalaryChangeItem, value: any) => {
    const updated = [...salaryChanges];
    (updated[index] as any)[field] = value;
    setSalaryChanges(updated);
  };

  const removeSalaryChange = (index: number) => {
    setSalaryChanges(salaryChanges.filter((_, i) => i !== index));
  };

  // Document URL handler — also accepts uploaded DocumentInfo
  const updateDocument = (field: keyof DocumentUrls, value: string | DocumentInfo) => {
    setDocuments({ ...documents, [field]: value });
  };

  // Handle file upload for a document field
  const handleFileUpload = async (field: string, file: File) => {
    if (!employee?.id) {
      setUploadError('Please save the employee first before uploading documents.');
      return;
    }
    const errorMsg = validateDocumentFile(file);
    if (errorMsg) {
      setUploadError(errorMsg);
      return;
    }
    setUploadingField(field);
    setUploadError(null);
    setUploadProgress((prev) => ({ ...prev, [field]: 0 }));

    try {
      const docInfo = await uploadEmployeeDocument(
        employee.id,
        field,
        file,
        (progress) => setUploadProgress((prev) => ({ ...prev, [field]: progress }))
      );
      // Store as object — the parent can use docUrl() to extract URL for submission
      setDocuments((prev) => ({ ...prev, [field]: docInfo }));
      setUploadProgress((prev) => ({ ...prev, [field]: 100 }));
    } catch (err: any) {
      setUploadError(`Failed to upload ${DOCUMENT_LABELS[field as DocumentField] || field}: ${err.message}`);
    } finally {
      setUploadingField(null);
    }
  };

  // Handle file delete for a document field
  const handleDeleteDocument = async (field: string) => {
    const currentDoc = (documents as any)[field];
    const path = docPath(currentDoc);
    if (!path) {
      // If no storage path, just clear the field
      setDocuments((prev) => ({ ...prev, [field]: undefined }));
      return;
    }
    if (!window.confirm(`Delete this document? This action cannot be undone.`)) return;

    try {
      await deleteEmployeeDocument(path);
      setDocuments((prev) => ({ ...prev, [field]: undefined }));
    } catch (err: any) {
      setUploadError(`Failed to delete document: ${err.message}`);
    }
  };

  const addSalarySlipUrl = () => {
    setSalarySlipUrls([...salarySlipUrls, '']);
  };

  const updateSalarySlipUrl = (index: number, value: string | DocumentInfo) => {
    const updated = [...salarySlipUrls];
    updated[index] = value;
    setSalarySlipUrls(updated);
  };

  const removeSalarySlipUrl = (index: number) => {
    setSalarySlipUrls(salarySlipUrls.filter((_, i) => i !== index));
  };

  // Handle file upload for salary slips
  const handleSalarySlipUpload = async (index: number, file: File) => {
    if (!employee?.id) {
      setUploadError('Please save the employee first before uploading documents.');
      return;
    }
    const errorMsg = validateDocumentFile(file);
    if (errorMsg) {
      setUploadError(errorMsg);
      return;
    }
    const fieldName = `salarySlip_${index}`;
    setUploadingField(fieldName);
    setUploadError(null);
    setUploadProgress((prev) => ({ ...prev, [fieldName]: 0 }));

    try {
      const docInfo = await uploadEmployeeDocument(
        employee.id,
        'salarySlips',
        file,
        (progress) => setUploadProgress((prev) => ({ ...prev, [fieldName]: progress }))
      );
      updateSalarySlipUrl(index, docInfo);
      setUploadProgress((prev) => ({ ...prev, [fieldName]: 100 }));
    } catch (err: any) {
      setUploadError(`Failed to upload salary slip: ${err.message}`);
    } finally {
      setUploadingField(null);
    }
  };

  // Handle delete for a salary slip
  const handleDeleteSalarySlip = async (index: number) => {
    const slip = salarySlipUrls[index];
    const path = docPath(slip);
    if (path) {
      await deleteEmployeeDocument(path);
    }
    removeSalarySlipUrl(index);
  };

  // File input change handler - triggers upload
  const onFileInputChange = (field: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // For salary slips, we need the index encoded in field name
      if (field.startsWith('salarySlip_')) {
        const idx = parseInt(field.split('_')[1], 10);
        handleSalarySlipUpload(idx, file);
      } else {
        handleFileUpload(field, file);
      }
    }
    e.target.value = ''; // Allow re-selecting the same file
  };

  /** Render a document upload area with current file info, view and delete */
  const renderDocumentField = (field: DocumentField, label?: string) => {
    const displayLabel = label || DOCUMENT_LABELS[field];
    const currentValue = documents[field] as DocumentValue | undefined;
    const url = docUrl(currentValue);
    const name = docName(currentValue);
    const path = docPath(currentValue);
    const isUploading = uploadingField === field;
    const progress = uploadProgress[field] || 0;

    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
        <Label className="text-sm font-medium mb-2 block">{displayLabel}</Label>

        {/* Existing file display */}
        {url && (
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-md px-3 py-2 mb-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <DocumentIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                {name || 'Uploaded document'}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <button
                type="button"
                onClick={() => viewDocument(url)}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                title="View document"
              >
                <EyeIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteDocument(field)}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                title="Delete document"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Upload progress bar */}
        {isUploading && (
          <div className="mb-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{progress}% uploaded</p>
          </div>
        )}

        {/* Upload button */}
        <div className="flex items-center gap-2">
          <label className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer transition-colors ${
            isUploading
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50'
          }`}>
            <ArrowUpTrayIcon className="w-4 h-4" />
            {url ? 'Replace' : 'Upload'}
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              className="hidden"
              disabled={isUploading || !employee?.id}
              onChange={(e) => onFileInputChange(field, e)}
            />
          </label>
          {!employee?.id && (
            <span className="text-xs text-amber-600">Save employee first</span>
          )}
        </div>
      </div>
    );
  };

  /** Render a salary slip row with upload/view/delete */
  const renderSalarySlipItem = (slip: DocumentValue, index: number) => {
    const url = docUrl(slip);
    const name = docName(slip);
    const fieldName = `salarySlip_${index}`;
    const isUploading = uploadingField === fieldName;
    const progress = uploadProgress[fieldName] || 0;

    return (
      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Salary Slip #{index + 1}
          </span>
          {salarySlipUrls.length > 1 && (
            <button
              type="button"
              onClick={() => handleDeleteSalarySlip(index)}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              title="Remove this slip"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Show uploaded file if exists */}
        {url ? (
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-md px-3 py-2 mb-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <DocumentIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                {name || `Salary Slip ${index + 1}`}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <button
                type="button"
                onClick={() => viewDocument(url)}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                title="View"
              >
                <EyeIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={typeof slip === 'string' ? slip : ''}
              onChange={(e) => updateSalarySlipUrl(index, e.target.value)}
              placeholder={`Salary slip ${index + 1} URL (optional)`}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-dark text-gray-900 dark:text-gray-100 text-sm"
              disabled={isUploading || isLoading}
            />
          </div>
        )}

        {/* Upload progress */}
        {isUploading && (
          <div className="mb-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{progress}% uploaded</p>
          </div>
        )}

        {/* Upload button */}
        <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer transition-colors ${
          isUploading
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50'
        }`}>
          <ArrowUpTrayIcon className="w-4 h-4" />
          {url ? 'Replace' : 'Upload'}
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
            disabled={isUploading || !employee?.id}
            onChange={(e) => onFileInputChange(`salarySlip_${index}`, e)}
          />
        </label>
      </div>
    );
  };

  // Tab styling

  // Tab styling
  const tabClass = (tab: string) =>
    `px-4 py-2 text-sm font-medium rounded-md transition-colors ${
      activeTab === tab
        ? 'bg-blue-600 text-white'
        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
    }`;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {employee ? 'Edit Employee' : 'Create New Employee'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Avatar Display */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
              {employee?.photoURL ? (
                <img
                  src={employee.photoURL}
                  alt={displayName || 'Employee'}
                  className="w-full h-full object-cover"
                />
              ) : displayName ? (
                <span className="text-blue-600 text-2xl font-semibold">
                  {getInitials(displayName)}
                </span>
              ) : (
                <PhotoIcon className="w-10 h-10 text-blue-600" />
              )}
            </div>
            {displayName && (
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {displayName}
              </span>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
            <button type="button" onClick={() => setActiveTab('personal')} className={tabClass('personal')}>
              Personal Info
            </button>
            <button type="button" onClick={() => setActiveTab('employment')} className={tabClass('employment')}>
              Employment
            </button>
            <button type="button" onClick={() => setActiveTab('probation')} className={tabClass('probation')}>
              Probation & Promotion
            </button>
            <button type="button" onClick={() => setActiveTab('documents')} className={tabClass('documents')}>
              Documents
            </button>
          </div>

          {/* Tab: Personal Info */}
          {activeTab === 'personal' && (
            <div className="space-y-4">
              <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    id="firstName"
                    label="First Name"
                    {...register('firstName')}
                    placeholder="Enter first name"
                    error={errors.firstName?.message}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Input
                    id="lastName"
                    label="Last Name"
                    {...register('lastName')}
                    placeholder="Enter last name"
                    error={errors.lastName?.message}
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Input
                    id="email"
                    type="email"
                    label="Email ID"
                    {...register('email')}
                    placeholder="employee@example.com"
                    error={errors.email?.message}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Input
                    id="phone"
                    type="tel"
                    label="Phone Number"
                    {...register('phone')}
                    placeholder="9876543210"
                    error={errors.phone?.message}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    label="Date of Birth"
                    {...register('dateOfBirth')}
                    error={errors.dateOfBirth?.message}
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Input
                    id="department"
                    label="Department"
                    {...register('department')}
                    placeholder="e.g., Engineering, Sales"
                    error={errors.department?.message}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab: Employment */}
          {activeTab === 'employment' && (
            <div className="space-y-4">
              <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">Employment Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    id="employeeId"
                    label="Employee ID"
                    {...register('employeeId')}
                    placeholder="EMP001"
                    error={errors.employeeId?.message}
                    required
                    disabled={isLoading || !!employee}
                  />
                </div>
                <div>
                  <Input
                    id="dateOfJoining"
                    type="date"
                    label="Date of Joining (DOJ)"
                    {...register('dateOfJoining')}
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Input
                    id="salary"
                    type="number"
                    label="Salary (₹)"
                    {...register('salary')}
                    placeholder="Enter salary amount"
                    error={errors.salary?.message}
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Input
                    id="workAnniversary"
                    type="date"
                    label="Work Anniversary Date"
                    {...register('workAnniversary')}
                    disabled={isLoading}
                  />
                </div>

                {/* Role */}
                <div>
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    {...register('role')}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-dark text-gray-900 dark:text-gray-100"
                    disabled={isLoading}
                  >
                    <option value="Employee">Employee</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                  {errors.role && (
                    <p className="text-sm text-red-600 mt-1">{errors.role.message}</p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    {...register('status')}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-dark text-gray-900 dark:text-gray-100"
                    disabled={isLoading}
                  >
                    <option value="active">Active</option>
                    <option value="on-leave">On Leave</option>
                    <option value="resigned">Resigned</option>
                  </select>
                  {errors.status && (
                    <p className="text-sm text-red-600 mt-1">{errors.status.message}</p>
                  )}
                </div>
              </div>

              {/* Manager Assignment */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Manager Assignment</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="managerId">Manager (if applicable)</Label>
                    <select
                      id="managerId"
                      {...register('managerId')}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-dark text-gray-900 dark:text-gray-100"
                      disabled={isLoading}
                      onChange={(e) => {
                        const selectedManager = managers.find(m => m.id === e.target.value);
                        setValue('managerId', e.target.value);
                        setValue('managerName', selectedManager?.name || '');
                      }}
                    >
                      <option value="">No Manager</option>
                      {managers
                        .filter(m => m.role === 'Manager' || m.role === 'Admin')
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.employeeId})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Attendance Settings — Location Tracking Toggle */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Attendance Settings</h4>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor="requireLocationTracking" className="text-sm font-medium cursor-pointer">
                      Require GPS Location for Clock In/Out
                    </Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      When enabled, the employee must allow GPS access to clock in/out.
                      When disabled, clock in/out works without requiring location permission.
                    </p>
                  </div>
                  <div className="ml-4 flex items-center">
                    <input
                      type="checkbox"
                      id="requireLocationTracking"
                      {...register('requireLocationTracking')}
                      className="peer sr-only"
                      disabled={isLoading}
                    />
                    <label
                      htmlFor="requireLocationTracking"
                      className="relative block h-6 w-11 cursor-pointer rounded-full bg-gray-300 dark:bg-[#5A616B] transition-colors peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 peer-checked:[&>span]:translate-x-5"
                    >
                      <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white transition-transform" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Reportees Section — shown when role is Manager */}
              {watch('role') === 'Manager' && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Employees Reporting to this Manager
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Reportees are managed through the employee assignment. This is displayed for reference.
                  </p>
                  {employee?.reportees && employee.reportees.length > 0 && (
                    <ul className="space-y-1">
                      {employee.reportees.map((rep, idx) => (
                        <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                          {rep.name} ({rep.employeeId})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Password fields */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  {employee ? 'Change Password (optional)' : 'Set Password'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {employee && (
                    <div className="md:col-span-2">
                      <Input
                        id="currentPassword"
                        type="password"
                        label="Current Password"
                        {...register('currentPassword')}
                        placeholder="Enter current password to change"
                        error={errors.currentPassword?.message}
                        disabled={isLoading}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Required only if you want to change the password
                      </p>
                    </div>
                  )}
                  <div>
                    <Input
                      id="password"
                      type="password"
                      label={employee ? 'New Password (optional)' : 'Password'}
                      {...register('password')}
                      placeholder={employee ? 'Leave blank to keep current' : 'Enter password'}
                      error={errors.password?.message}
                      required={!employee}
                      disabled={isLoading}
                    />
                    {employee && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Leave blank to keep current password
                      </p>
                    )}
                  </div>
                  <div>
                    <Input
                      id="confirmPassword"
                      type="password"
                      label={employee ? 'Confirm New Password' : 'Confirm Password'}
                      {...register('confirmPassword')}
                      placeholder="Confirm password"
                      error={errors.confirmPassword?.message}
                      required={!employee}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Probation & Promotion */}
          {activeTab === 'probation' && (
            <div className="space-y-4">
              <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">Probation Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    id="probationDuration"
                    type="number"
                    label="Probation Duration (months)"
                    {...register('probationDuration')}
                    placeholder="e.g., 6"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Input
                    id="probationEndDate"
                    type="date"
                    label="Probation End Date"
                    {...register('probationEndDate')}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Promotion */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">Promotion Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <Input
                      id="promotionDate"
                      type="date"
                      label="Promotion Date"
                      {...register('promotionDate')}
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <Input
                      id="promotionDetails"
                      label="Promotion Details / New Role"
                      {...register('promotionDetails')}
                      placeholder="e.g., Promoted to Senior Developer"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              {/* Salary Changes */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">Salary Changes</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSalaryChange}
                    className="flex items-center gap-1"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Add Change
                  </Button>
                </div>

                {salaryChanges.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    No salary changes recorded. Click "Add Change" to add one.
                  </p>
                )}

                {salaryChanges.map((change, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-3 relative">
                    <button
                      type="button"
                      onClick={() => removeSalaryChange(index)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Change #{index + 1}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>Date</Label>
                        <input
                          type="date"
                          value={change.date}
                          onChange={(e) => updateSalaryChange(index, 'date', e.target.value)}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-dark text-gray-900 dark:text-gray-100 text-sm"
                        />
                      </div>
                      <div>
                        <Label>Reason</Label>
                        <select
                          value={change.reason}
                          onChange={(e) => updateSalaryChange(index, 'reason', e.target.value)}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-dark text-gray-900 dark:text-gray-100 text-sm"
                        >
                          <option value="probation">After Probation</option>
                          <option value="promotion">Promotion</option>
                          <option value="revision">Salary Revision</option>
                        </select>
                      </div>
                      <div>
                        <Label>Old Salary (₹)</Label>
                        <input
                          type="number"
                          value={change.oldSalary}
                          onChange={(e) => updateSalaryChange(index, 'oldSalary', parseFloat(e.target.value) || 0)}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-dark text-gray-900 dark:text-gray-100 text-sm"
                        />
                      </div>
                      <div>
                        <Label>New Salary (₹)</Label>
                        <input
                          type="number"
                          value={change.newSalary}
                          onChange={(e) => updateSalaryChange(index, 'newSalary', parseFloat(e.target.value) || 0)}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-dark text-gray-900 dark:text-gray-100 text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Notes (optional)</Label>
                        <input
                          type="text"
                          value={change.notes || ''}
                          onChange={(e) => updateSalaryChange(index, 'notes', e.target.value)}
                          placeholder="Reason or details about this change"
                          className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-dark text-gray-900 dark:text-gray-100 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab: Documents */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">Employee Documents</h3>
                {!employee?.id && (
                  <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-md">
                    Save the employee first to enable document uploads
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Upload documents from your computer (JPG, PNG, PDF — max 10MB each). You can also enter a URL manually if the file is hosted externally.
              </p>

              {/* Upload error */}
              {uploadError && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400 flex items-center justify-between">
                  <span>{uploadError}</span>
                  <button
                    type="button"
                    onClick={() => setUploadError(null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderDocumentField('addressProof')}
                {renderDocumentField('cancelledCheque')}
                {renderDocumentField('aadhaarCard')}
                {renderDocumentField('panCard')}
                {renderDocumentField('resignationLetter')}
                {renderDocumentField('marksheet10th')}
                {renderDocumentField('marksheet12th')}
                {renderDocumentField('degree')}
              </div>

              {/* Salary Slips (last 3 months) */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-md font-semibold text-gray-800 dark:text-gray-200">
                    Salary Slips (Last 3 months)
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSalarySlipUrl}
                    className="flex items-center gap-1"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Add Slip
                  </Button>
                </div>
                {salarySlipUrls.map((slip, index) => renderSalarySlipItem(slip, index))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isLoading} disabled={isLoading} className="text-white">
              {employee ? 'Update Employee' : 'Create Employee'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

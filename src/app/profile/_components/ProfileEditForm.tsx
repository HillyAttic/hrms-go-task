"use client";

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { EmployeeDocuments } from '@/types/employee.types';
import { bankDetailFields } from '@/lib/schemas/employee.schema';
import { DOCUMENT_FIELDS, DocumentValue } from '@/services/employee-document.service';
import { DocumentUploadField } from '@/components/employees/DocumentUploadField';

const profileFormSchema = z.object({
  // Personal
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().max(50).optional(),
  displayName: z.string().min(1, 'Name is required').max(100),
  department: z.string().optional(),
  phoneNumber: z
    .string()
    .regex(/^\d{10}$/, { message: 'Phone must be exactly 10 digits' })
    .optional()
    .or(z.literal('')),
  dateOfBirth: z.string().optional(),
  // Employment — employeeId is admin-only, so it never appears here.
  dateOfJoining: z.string().optional(),
  salary: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.coerce.number().nonnegative().optional()
  ),
  workAnniversary: z.string().optional(),
  // Probation & Promotion
  probationDuration: z.coerce.number().optional(),
  probationEndDate: z.string().optional(),
  promotionDate: z.string().optional(),
  promotionDetails: z.string().optional(),
  // Bank details
  ...bankDetailFields,
  // Password
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

/** Tab holding each field, so an invalid submit can reveal itself instead of no-op'ing. */
const TAB_FOR_FIELD: Record<string, Tab> = {
  dateOfJoining: 'employment', salary: 'employment', workAnniversary: 'employment',
  bankName: 'employment', bankAccountNumber: 'employment', bankIfsc: 'employment',
  currentPassword: 'employment', newPassword: 'employment', confirmPassword: 'employment',
  probationDuration: 'probation', probationEndDate: 'probation',
  promotionDate: 'probation', promotionDetails: 'probation',
};

type Tab = 'personal' | 'employment' | 'probation' | 'documents';

export interface ProfileInitialData {
  /** Firebase UID — the employee's own record id. Needed to upload documents. */
  uid?: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  employeeId?: string;
  department?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  dateOfJoining?: string;
  salary?: number;
  workAnniversary?: string;
  probationDuration?: number;
  probationEndDate?: string;
  promotionDate?: string;
  promotionDetails?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  documents?: EmployeeDocuments;
  photoURL?: string;
}

interface ProfileEditFormProps {
  initialData: ProfileInitialData;
  onSuccess: (updatedData: ProfileInitialData & { photoURL?: string }) => void;
  onCancel: () => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'personal', label: 'Personal Info' },
  { id: 'employment', label: 'Employment' },
  { id: 'probation', label: 'Probation & Promotion' },
  { id: 'documents', label: 'Documents' },
];

export default function ProfileEditForm({ initialData, onSuccess, onCancel }: ProfileEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('personal');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [currentPhotoURL, setCurrentPhotoURL] = useState<string | undefined>(initialData.photoURL);
  const [documents, setDocuments] = useState<EmployeeDocuments>(initialData.documents || {});
  const [documentError, setDocumentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema) as any,
    defaultValues: {
      // Records created before first/last name existed only carry displayName, so split it
      // rather than showing an empty required field that blocks the whole save.
      firstName: initialData.firstName || initialData.displayName?.split(' ')[0] || '',
      lastName: initialData.lastName || initialData.displayName?.split(' ').slice(1).join(' ') || '',
      displayName: initialData.displayName || '',
      department: initialData.department || '',
      phoneNumber: initialData.phoneNumber || '',
      dateOfBirth: initialData.dateOfBirth || '',
      dateOfJoining: initialData.dateOfJoining || '',
      salary: initialData.salary,
      workAnniversary: initialData.workAnniversary || '',
      probationDuration: initialData.probationDuration,
      probationEndDate: initialData.probationEndDate || '',
      promotionDate: initialData.promotionDate || '',
      promotionDetails: initialData.promotionDetails || '',
      bankName: initialData.bankName || '',
      bankAccountNumber: initialData.bankAccountNumber || '',
      bankIfsc: initialData.bankIfsc || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const [firstName, lastName] = watch(['firstName', 'lastName']);

  const getInitials = (name: string): string => {
    if (!name) return '';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      setPreviewURL(URL.createObjectURL(file));
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewURL) {
      URL.revokeObjectURL(previewURL);
      setPreviewURL(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /** Firebase requires a fresh credential before a password change. */
  const changePassword = async (user: NonNullable<typeof auth.currentUser>, data: ProfileFormData) => {
    if (!data.newPassword) return;
    if (!data.currentPassword) {
      throw new Error('Current password is required to set a new password');
    }
    if (data.newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters');
    }
    if (data.newPassword !== data.confirmPassword) {
      throw new Error('Passwords do not match');
    }
    if (!user.email) {
      throw new Error('Account has no email to re-authenticate with');
    }
    await reauthenticateWithCredential(
      user,
      EmailAuthProvider.credential(user.email, data.currentPassword)
    );
    await updatePassword(user, data.newPassword);
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsSubmitting(true);

      const user = auth.currentUser;
      if (!user) {
        toast.error('User not authenticated');
        return;
      }
      const token = await user.getIdToken(false);

      // 1. Photo
      let photoURL = currentPhotoURL;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('photo', selectedFile);

        const response = await fetch('/api/auth/profile', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });

        const responseData = await response.text().catch(() => '');
        if (!response.ok) {
          let errorText = responseData;
          try {
            errorText = JSON.parse(responseData).error || 'Failed to upload photo';
          } catch {
            errorText = responseData || response.statusText;
          }
          throw new Error(errorText);
        }

        photoURL = JSON.parse(responseData).data.photoURL;
        toast.success('Profile photo updated!');
      }

      // 2. Profile fields — the API allowlist drops anything admin-only.
      const displayName = [data.firstName, data.lastName].filter(Boolean).join(' ');
      const updateResponse = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...data, displayName, documents }),
      });

      const updateResponseText = await updateResponse.text().catch(() => '');
      if (!updateResponse.ok) {
        let errorText = updateResponseText;
        try {
          const parsed = JSON.parse(updateResponseText);
          errorText = parsed.error === 'Validation failed' && parsed.fields
            ? Object.values(parsed.fields).flat().join(', ')
            : parsed.error || 'Failed to update profile';
        } catch {
          errorText = updateResponseText || updateResponse.statusText;
        }
        throw new Error(errorText);
      }

      // 3. Password last, so a profile failure doesn't leave the login changed.
      await changePassword(user, data);

      toast.success('Profile updated successfully!');

      const { currentPassword, newPassword, confirmPassword, ...fields } = data;
      onSuccess({ ...fields, displayName, documents, photoURL });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvalidSubmit = (fieldErrors: Record<string, any>) => {
    const firstField = Object.keys(fieldErrors)[0];
    setActiveTab(TAB_FOR_FIELD[firstField] || 'personal');
  };

  const displayPhoto = previewURL || currentPhotoURL;
  const tabClass = (tab: Tab) =>
    `rounded-xl px-4 py-2 text-sm font-medium transition-all ${
      activeTab === tab
        ? 'bg-gradient-to-r from-[#0447FD] to-[#7F1BFF] text-white shadow-lg shadow-indigo-500/25'
        : 'border border-white/60 bg-white/50 text-slate-600 backdrop-blur hover:bg-white/80 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
    }`;

  return (
    <form onSubmit={handleSubmit(onSubmit, handleInvalidSubmit)} className="space-y-3">
      {/* Header — photo, upload control and tab switch share one row so the form
          fits the viewport instead of forcing a vertical scroll */}
      <div className="flex flex-col gap-3 border-b border-white/60 pb-3 dark:border-white/10 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative shrink-0">
            {displayPhoto ? (
              <div className="relative h-12 w-12 overflow-hidden rounded-full ring-2 ring-white shadow-[0_14px_35px_-14px_rgba(4,71,253,0.55)] dark:ring-white/10">
                <img src={displayPhoto} alt="Profile preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/25 transition-all hover:brightness-110"
                  aria-label="Remove photo"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#0447FD] to-[#7F1BFF] ring-2 ring-white dark:ring-white/10">
                <span className="text-base font-bold text-white">
                  {getInitials([firstName, lastName].filter(Boolean).join(' ') || initialData.displayName)}
                </span>
              </div>
            )}
          </div>

          <Label htmlFor="photo" className="text-sm font-medium text-slate-900 dark:text-white">Photo</Label>
          <input
            ref={fileInputRef}
            type="file"
            id="photo"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting}
            className="rounded-xl"
          >
            <PhotoIcon className="w-4 h-4 mr-1.5" />
            {displayPhoto ? 'Change Photo' : 'Upload Photo'}
          </Button>
          {selectedFile && (
            <span className="hidden min-w-0 truncate text-xs text-slate-500 dark:text-slate-400 sm:inline">
              {selectedFile.name}
            </span>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={tabClass(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Personal Info */}
      {activeTab === 'personal' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Input
              id="firstName"
              label="First Name"
              {...register('firstName')}
              placeholder="Enter first name"
              error={errors.firstName?.message}
              required
              disabled={isSubmitting}
            />
            <Input
              id="lastName"
              label="Last Name"
              {...register('lastName')}
              placeholder="Enter last name"
              error={errors.lastName?.message}
              disabled={isSubmitting}
            />
            <Input
              id="email"
              type="email"
              label="Email ID"
              value={initialData.email || ''}
              helperText="Email is your login — ask an admin to change it."
              disabled
              readOnly
            />
            <Input
              id="phoneNumber"
              type="tel"
              label="Phone Number"
              {...register('phoneNumber')}
              placeholder="9876543210"
              error={errors.phoneNumber?.message}
              disabled={isSubmitting}
            />
            <Input
              id="dateOfBirth"
              type="date"
              label="Date of Birth"
              {...register('dateOfBirth')}
              disabled={isSubmitting}
            />
            <Input
              id="department"
              label="Department"
              {...register('department')}
              placeholder="e.g., Engineering, Sales"
              error={errors.department?.message}
              disabled={isSubmitting}
            />
          </div>
        </div>
      )}

      {/* Tab: Employment */}
      {activeTab === 'employment' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Input
              id="employeeId"
              label="Employee ID"
              value={initialData.employeeId || ''}
              helperText="Assigned by your admin."
              disabled
              readOnly
            />
            <Input
              id="dateOfJoining"
              type="date"
              label="Date of Joining (DOJ)"
              {...register('dateOfJoining')}
              disabled={isSubmitting}
            />
            <Input
              id="salary"
              type="number"
              label="Salary (₹)"
              {...register('salary')}
              placeholder="Enter salary amount"
              error={errors.salary?.message}
              disabled={isSubmitting}
            />
            <Input
              id="workAnniversary"
              type="date"
              label="Work Anniversary Date"
              {...register('workAnniversary')}
              disabled={isSubmitting}
            />
          </div>

          {/* Bank Details */}
          <div className="border-t border-white/60 pt-2 dark:border-white/10">
            <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Bank Details</h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Input
                id="bankName"
                label="Bank Name"
                {...register('bankName')}
                placeholder="e.g., HDFC Bank"
                error={errors.bankName?.message}
                disabled={isSubmitting}
              />
              <Input
                id="bankAccountNumber"
                label="Account Number"
                inputMode="numeric"
                {...register('bankAccountNumber')}
                placeholder="e.g., 50100123456789"
                error={errors.bankAccountNumber?.message}
                disabled={isSubmitting}
              />
              <Input
                id="bankIfsc"
                label="IFSC Code"
                {...register('bankIfsc', { setValueAs: (v: string) => v.toUpperCase() })}
                placeholder="e.g., HDFC0001234"
                error={errors.bankIfsc?.message}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Password */}
          <div className="border-t border-white/60 pt-2 dark:border-white/10">
            <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
              Change Password (optional)
            </h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Input
                id="currentPassword"
                type="password"
                label="Current Password"
                {...register('currentPassword')}
                placeholder="Enter current password"
                helperText="Only if changing password"
                disabled={isSubmitting}
              />
              <Input
                id="newPassword"
                type="password"
                label="New Password"
                {...register('newPassword')}
                placeholder="Leave blank to keep current"
                disabled={isSubmitting}
              />
              <Input
                id="confirmPassword"
                type="password"
                label="Confirm New Password"
                {...register('confirmPassword')}
                placeholder="Confirm password"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Probation & Promotion */}
      {activeTab === 'probation' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Input
              id="probationDuration"
              type="number"
              label="Probation Duration (months)"
              {...register('probationDuration')}
              placeholder="e.g., 6"
              disabled={isSubmitting}
            />
            <Input
              id="probationEndDate"
              type="date"
              label="Probation End Date"
              {...register('probationEndDate')}
              disabled={isSubmitting}
            />
          </div>

          <div className="border-t border-white/60 pt-2 dark:border-white/10">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Promotion Details</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 mt-3">
              <Input
                id="promotionDate"
                type="date"
                label="Promotion Date"
                {...register('promotionDate')}
                disabled={isSubmitting}
              />
              <Input
                id="promotionDetails"
                label="Promotion Details / New Role"
                {...register('promotionDetails')}
                placeholder="e.g., Promoted to Senior Developer"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Documents */}
      {activeTab === 'documents' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Upload from your computer (JPG, PNG, PDF — max 10MB each).
          </p>

          {documentError && (
            <div className="flex items-center justify-between rounded-xl border border-red-200/80 bg-red-50/80 p-3 text-sm text-red-700 backdrop-blur dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-300">
              <span>{documentError}</span>
              <button type="button" onClick={() => setDocumentError(null)} className="text-red-500 hover:text-red-700">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {DOCUMENT_FIELDS.map((field) => (
              <DocumentUploadField
                key={field}
                field={field}
                employeeId={initialData.uid || auth.currentUser?.uid}
                value={documents[field] as DocumentValue | undefined}
                onChange={(value) => setDocuments((prev) => ({ ...prev, [field]: value }))}
                onError={setDocumentError}
                disabled={isSubmitting}
              />
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons — sticky so Save stays reachable regardless of viewport height */}
      <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t border-white/60 bg-white/80 py-2 backdrop-blur-xl dark:border-white/10 dark:bg-[#0B1430]/80">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="rounded-xl">
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting} disabled={isSubmitting} className="rounded-xl text-white">
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}

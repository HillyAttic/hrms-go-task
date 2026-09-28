'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { CredentialCategory, SafeCredential } from '@/types/password-manager.types';

const baseSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  username: z.string().min(1, 'Username is required'),
  plainPassword: z.string().optional(),
  serialNumber: z.string().optional(),
  gstNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  panNumber: z.string().optional(),
  membershipDin: z.string().optional(),
});

type FormData = z.infer<typeof baseSchema>;

interface CredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  credential?: SafeCredential | null;
  category: CredentialCategory;
  isLoading?: boolean;
}

const categoryLabels: Record<CredentialCategory, string> = {
  gst: 'GST',
  'income-tax': 'Income Tax',
  mca: 'MCA',
};

export default function CredentialModal({
  isOpen,
  onClose,
  onSubmit,
  credential,
  category,
  isLoading,
}: CredentialModalProps) {
  const isEdit = !!credential;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(baseSchema),
  });

  useEffect(() => {
    if (isOpen && credential) {
      reset({
        clientName: credential.clientName,
        username: credential.username,
        serialNumber: credential.serialNumber ?? '',
        gstNumber: credential.gstNumber ?? '',
        dateOfBirth: credential.dateOfBirth ?? '',
        panNumber: credential.panNumber ?? '',
        membershipDin: credential.membershipDin ?? '',
        plainPassword: '',
      });
    } else if (isOpen && !credential) {
      reset({
        clientName: '',
        username: '',
        serialNumber: '',
        gstNumber: '',
        dateOfBirth: '',
        panNumber: '',
        membershipDin: '',
        plainPassword: '',
      });
    }
  }, [isOpen, credential, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSubmit = async (data: FormData) => {
    // Remove empty password on edit (means "keep current")
    if (isEdit && !data.plainPassword) {
      const { plainPassword, ...rest } = data;
      await onSubmit(rest as FormData);
    } else {
      await onSubmit(data);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none';
  const labelClass = 'block text-sm font-medium text-muted-foreground mb-1';
  const errorClass = 'mt-1 text-xs text-destructive';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="dark:text-white">
            {isEdit ? 'Edit' : 'Add'} {categoryLabels[category]} Credential
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Serial Number - GST & MCA */}
          {(category === 'gst' || category === 'mca') && (
            <div>
              <label className={labelClass}>Serial No.</label>
              <input {...register('serialNumber')} className={inputClass} placeholder="S.no" />
            </div>
          )}

          {/* Client Name - all */}
          <div>
            <label className={labelClass}>Client Name *</label>
            <input {...register('clientName')} className={inputClass} placeholder="Client name" />
            {errors.clientName && <p className={errorClass}>{errors.clientName.message}</p>}
          </div>

          {/* GST Number */}
          {category === 'gst' && (
            <div>
              <label className={labelClass}>GST Number</label>
              <input {...register('gstNumber')} className={inputClass} placeholder="GST number" />
            </div>
          )}

          {/* Income Tax fields */}
          {category === 'income-tax' && (
            <>
              <div>
                <label className={labelClass}>Date of Birth</label>
                <input
                  {...register('dateOfBirth')}
                  className={inputClass}
                  placeholder="DD/MM/YYYY"
                />
              </div>
              <div>
                <label className={labelClass}>PAN Number</label>
                <input {...register('panNumber')} className={inputClass} placeholder="PAN number" />
              </div>
            </>
          )}

          {/* MCA - Membership/DIN */}
          {category === 'mca' && (
            <div>
              <label className={labelClass}>Membership No / DIN No</label>
              <input
                {...register('membershipDin')}
                className={inputClass}
                placeholder="Membership or DIN number"
              />
            </div>
          )}

          {/* Username - all */}
          <div>
            <label className={labelClass}>Username *</label>
            <input {...register('username')} className={inputClass} placeholder="Portal username" />
            {errors.username && <p className={errorClass}>{errors.username.message}</p>}
          </div>

          {/* Password - all */}
          <div>
            <label className={labelClass}>
              Password {isEdit ? '(leave blank to keep current)' : '*'}
            </label>
            <input
              {...register('plainPassword')}
              type="password"
              className={inputClass}
              placeholder={isEdit ? 'Leave blank to keep current' : 'Portal password'}
            />
            {errors.plainPassword && (
              <p className={errorClass}>{errors.plainPassword.message}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm rounded-lg bg-muted text-muted-foreground hover:bg-muted dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm rounded-lg bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

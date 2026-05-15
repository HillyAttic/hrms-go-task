import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Client } from '@/services/client.service';
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
import { Avatar } from '@/components/ui/avatar';
import { PhotoIcon } from '@heroicons/react/24/outline';

// Form-specific schema with required status
const clientFormSchema = z.object({
  clientName: z.string().min(1, 'Client name is required').max(100, 'Name must be less than 100 characters'),
  serialNumber: z.string().optional(),
  businessName: z.string().optional(),
  pan: z.string().optional(),
  tan: z.string().optional(),
  gstin: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zipCode: z.string().optional(),
  complianceRoc: z.boolean().optional(),
  complianceGstr1: z.boolean().optional(),
  complianceGst3b: z.boolean().optional(),
  complianceIff: z.boolean().optional(),
  complianceItr: z.boolean().optional(),
  complianceTaxAudit: z.boolean().optional(),
  complianceAccounting: z.boolean().optional(),
  complianceClientVisit: z.boolean().optional(),
  complianceBank: z.boolean().optional(),
  complianceTcs: z.boolean().optional(),
  complianceTds: z.boolean().optional(),
  complianceStatutoryAudit: z.boolean().optional(),
  status: z.enum(['active', 'inactive']),
});

type ClientFormData = z.infer<typeof clientFormSchema>;

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ClientFormData) => Promise<void>;
  client?: Client | null;
  isLoading?: boolean;
}

/**
 * ClientModal Component
 * Form modal for creating and editing clients with validation
 * Validates Requirements: 1.2, 1.4, 1.5
 */
export function ClientModal({
  isOpen,
  onClose,
  onSubmit,
  client,
  isLoading = false,
}: ClientModalProps) {
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      clientName: '',
      serialNumber: '',
      businessName: '',
      pan: '',
      tan: '',
      gstin: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
      complianceRoc: false,
      complianceGstr1: false,
      complianceGst3b: false,
      complianceIff: false,
      complianceItr: false,
      complianceTaxAudit: false,
      complianceAccounting: false,
      complianceClientVisit: false,
      complianceBank: false,
      status: 'active',
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

  const currentName = watch('clientName');

  // Update form when client prop changes (edit mode)
  useEffect(() => {
    if (client) {
      reset({
        clientName: client.clientName,
        serialNumber: client.serialNumber || '',
        businessName: client.businessName,
        pan: client.taxIdentifiers?.pan || '',
        tan: client.taxIdentifiers?.tan || '',
        gstin: client.taxIdentifiers?.gstin || '',
        email: client.contact?.email,
        phone: client.contact?.phone,
        address: client.address?.line1 || '',
        city: client.address?.city || '',
        state: client.address?.state || '',
        country: client.address?.country || '',
        zipCode: client.address?.zipCode || '',
        complianceRoc: client.compliance?.roc,
        complianceGstr1: client.compliance?.gstr1,
        complianceGst3b: client.compliance?.gst3b,
        complianceIff: client.compliance?.iff,
        complianceItr: client.compliance?.itr,
        complianceTaxAudit: client.compliance?.taxAudit,
        complianceAccounting: client.compliance?.accounting,
        complianceClientVisit: client.compliance?.clientVisit,
        complianceBank: client.compliance?.bank,
        complianceTcs: client.compliance?.tcs,
        complianceTds: client.compliance?.tds,
        complianceStatutoryAudit: client.compliance?.statutoryAudit,
        status: client.status,
      });
      setAvatarPreview(null);
    } else {
      reset({
        clientName: '',
        serialNumber: '',
        businessName: '',
        pan: '',
        tan: '',
        gstin: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        country: '',
        zipCode: '',
        complianceRoc: false,
        complianceGstr1: false,
        complianceGst3b: false,
        complianceIff: false,
        complianceItr: false,
        complianceTaxAudit: false,
        complianceAccounting: false,
        complianceClientVisit: false,
        complianceBank: false,
        complianceTcs: false,
        complianceTds: false,
        complianceStatutoryAudit: false,
        status: 'active',
      });
      setAvatarPreview(null);
    }
  }, [client, reset]);

  // Handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (data: ClientFormData) => {
    try {
      await onSubmit(data);
      reset();
      setAvatarPreview(null);
      onClose();
    } catch (error) {
      console.error('Error submitting client:', error);
    }
  };

  const handleClose = () => {
    reset();
    setAvatarPreview(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {client ? 'Edit Client' : 'Create New Client'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Avatar Upload - Removed for now */}

          {/* Client Name */}
          <div>
            <Input
              id="clientName"
              label="Client Name"
              {...register('clientName')}
              placeholder="Enter client name"
              error={errors.clientName?.message}
              required
              disabled={isLoading}
            />
          </div>

          {/* Serial Number */}
          <div>
            <Input
              id="serialNumber"
              label="S.No"
              {...register('serialNumber')}
              placeholder="Enter serial number (e.g., 001, 002)"
              error={errors.serialNumber?.message}
              disabled={isLoading}
            />
          </div>

          {/* Business Name */}
          <div>
            <Input
              id="businessName"
              label="Business Name"
              {...register('businessName')}
              placeholder="Enter business name"
              error={errors.businessName?.message}
              disabled={isLoading}
            />
          </div>

          {/* Email */}
          <div>
            <Input
              id="email"
              type="email"
              label="Email"
              {...register('email')}
              placeholder="client@example.com"
              error={errors.email?.message}
              disabled={isLoading}
            />
          </div>

          {/* Phone */}
          <div>
            <Input
              id="phone"
              type="tel"
              label="Phone"
              {...register('phone')}
              placeholder="+1 (555) 123-4567"
              error={errors.phone?.message}
              disabled={isLoading}
            />
          </div>

          {/* Tax Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Input
                id="pan"
                label="P.A.N."
                {...register('pan')}
                placeholder="ABCDE1234F"
                error={errors.pan?.message}
                disabled={isLoading}
              />
            </div>
            <div>
              <Input
                id="tan"
                label="T.A.N."
                {...register('tan')}
                placeholder="ABCD12345E"
                error={errors.tan?.message}
                disabled={isLoading}
              />
            </div>
            <div>
              <Input
                id="gstin"
                label="GSTIN"
                {...register('gstin')}
                placeholder="22AAAAA0000A1Z5"
                error={errors.gstin?.message}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <Input
              id="address"
              label="Address"
              {...register('address')}
              placeholder="Enter street address"
              error={errors.address?.message}
              disabled={isLoading}
            />
          </div>

          {/* City, State, Country, Zip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                id="city"
                label="City"
                {...register('city')}
                placeholder="Enter city"
                error={errors.city?.message}
                disabled={isLoading}
              />
            </div>
            <div>
              <Input
                id="state"
                label="State"
                {...register('state')}
                placeholder="Enter state"
                error={errors.state?.message}
                disabled={isLoading}
              />
            </div>
            <div>
              <Input
                id="country"
                label="Country"
                {...register('country')}
                placeholder="Enter country"
                error={errors.country?.message}
                disabled={isLoading}
              />
            </div>
            <div>
              <Input
                id="zipCode"
                label="Zip Code"
                {...register('zipCode')}
                placeholder="Enter zip code"
                error={errors.zipCode?.message}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Compliance */}
          <div>
            <Label>Compliance Services</Label>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3">
              {([
                { field: 'complianceRoc', label: 'ROC' },
                { field: 'complianceGstr1', label: 'GSTR1' },
                { field: 'complianceGst3b', label: 'GST3B' },
                { field: 'complianceIff', label: 'IFF' },
                { field: 'complianceItr', label: 'ITR' },
                { field: 'complianceTaxAudit', label: 'Tax Audit' },
                { field: 'complianceAccounting', label: 'Accounting' },
                { field: 'complianceClientVisit', label: 'Client Visit' },
                { field: 'complianceBank', label: 'Bank' },
                { field: 'complianceTcs', label: 'TCS' },
                { field: 'complianceTds', label: 'TDS' },
                { field: 'complianceStatutoryAudit', label: 'Statutory Audit' },
              ] as const).map(({ field, label }) => (
                <label key={field} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register(field)}
                    disabled={isLoading}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              {...register('status')}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {errors.status && (
              <p className="text-sm text-red-600 mt-1">{errors.status.message}</p>
            )}
          </div>

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
              {client ? 'Update Client' : 'Create Client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { PendingInvoice } from '@/services/pending-invoice.service';

type InvoiceFormData = {
  clientName: string;
  services: string;
  amount: string;
  description: string;
  remark: string;
};

interface CreateEditInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: Omit<PendingInvoice, 'id' | 'createdAt' | 'updatedAt' | 'archivedAt'>) => Promise<void>;
  editingInvoice?: PendingInvoice | null;
  isLoading?: boolean;
}

export function CreateEditInvoiceModal({
  isOpen,
  onClose,
  onSave,
  editingInvoice,
  isLoading,
}: CreateEditInvoiceModalProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<InvoiceFormData>();

  useEffect(() => {
    if (isOpen) {
      if (editingInvoice) {
        reset({
          clientName: editingInvoice.clientName ?? '',
          services: editingInvoice.services ?? '',
          amount: editingInvoice.amount != null ? String(editingInvoice.amount) : '',
          description: editingInvoice.description ?? '',
          remark: editingInvoice.remark ?? '',
        });
      } else {
        reset({ clientName: '', services: '', amount: '', description: '', remark: '' });
      }
    }
  }, [isOpen, editingInvoice, reset]);

  const onSubmit = async (data: InvoiceFormData) => {
    await onSave({
      clientName: data.clientName || undefined,
      services: data.services || undefined,
      amount: data.amount ? Number(data.amount) : undefined,
      description: data.description || undefined,
      remark: data.remark || undefined,
      status: 'pending',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingInvoice ? 'Edit Invoice' : 'New Invoice'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Client Name
            </label>
            <input
              type="text"
              {...register('clientName')}
              placeholder="Enter client name"
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Services
            </label>
            <input
              type="text"
              {...register('services')}
              placeholder="Enter services"
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Amount (₹)
            </label>
            <input
              type="number"
              {...register('amount', {
                min: { value: 0, message: 'Amount must be positive' },
              })}
              placeholder="Enter amount"
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.amount && (
              <p className="mt-1 text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Enter description"
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Remark
            </label>
            <input
              type="text"
              {...register('remark')}
              placeholder="Enter remark"
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" loading={isLoading} disabled={isLoading}>
              {editingInvoice ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

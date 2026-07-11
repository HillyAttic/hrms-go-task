'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { wfhRequestSchema } from '@/lib/attendance-validation';
import { WfhRequestFormData } from '@/types/attendance.types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface WfhRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: WfhRequestFormData) => Promise<void>;
  loading: boolean;
}

export function WfhRequestModal({
  open,
  onOpenChange,
  onSubmit,
  loading,
}: WfhRequestModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<WfhRequestFormData>({
    resolver: zodResolver(wfhRequestSchema),
  });

  const onSubmitForm = async (data: WfhRequestFormData) => {
    try {
      await onSubmit(data);
      reset();
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in parent component
      // Keep modal open so user can retry
      console.error('WFH form submission error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Work From Home</DialogTitle>
          <DialogDescription>
            Submit a WFH request by selecting the dates and providing a reason.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="wfh-startDate">Start Date</Label>
              <Input
                id="wfh-startDate"
                type="date"
                {...register('startDate', { valueAsDate: true })}
              />
              {errors.startDate && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.startDate.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="wfh-endDate">End Date</Label>
              <Input
                id="wfh-endDate"
                type="date"
                {...register('endDate', { valueAsDate: true })}
              />
              {errors.endDate && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.endDate.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="wfh-reason">Reason</Label>
            <Textarea
              id="wfh-reason"
              {...register('reason')}
              rows={4}
              placeholder="Please provide a reason for your WFH request"
            />
            {errors.reason && (
              <p className="text-sm text-red-600 mt-1">
                {errors.reason.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || loading} className="text-white">
              {isSubmitting || loading ? 'Submitting...' : 'Submit WFH Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

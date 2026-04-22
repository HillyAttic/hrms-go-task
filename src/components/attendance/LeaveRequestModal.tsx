'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { leaveRequestSchema } from '@/lib/attendance-validation';
import {
  LeaveRequestFormData,
  LeaveType,
  LeaveBalance,
} from '@/types/attendance.types';
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

interface LeaveRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: LeaveRequestFormData) => Promise<void>;
  leaveTypes: LeaveType[];
  leaveBalances: LeaveBalance[];
  loading: boolean;
}

export function LeaveRequestModal({
  open,
  onOpenChange,
  onSubmit,
  leaveTypes,
  leaveBalances,
  loading,
}: LeaveRequestModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestSchema),
  });

  const selectedLeaveTypeId = watch('leaveTypeId');
  const selectedBalance = leaveBalances?.find(
    (b) => b.leaveTypeId === selectedLeaveTypeId
  );

  const onSubmitForm = async (data: LeaveRequestFormData) => {
    await onSubmit(data);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Leave</DialogTitle>
          <DialogDescription>
            Submit a leave request by selecting the leave type, dates, and providing a reason.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          <div>
            <Label htmlFor="leaveTypeId">Leave Type</Label>
            <select
              id="leaveTypeId"
              {...register('leaveTypeId')}
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
            >
              <option value="">Select leave type</option>
              {leaveTypes?.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            {errors.leaveTypeId && (
              <p className="text-sm text-red-600 mt-1">
                {errors.leaveTypeId.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
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
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
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
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              {...register('reason')}
              rows={4}
              placeholder="Please provide a reason for your leave request"
            />
            {errors.reason && (
              <p className="text-sm text-red-600 mt-1">
                {errors.reason.message}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="halfDay"
              {...register('halfDay')}
              className="rounded"
            />
            <Label htmlFor="halfDay" className="cursor-pointer">
              Half day
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="text-white">
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

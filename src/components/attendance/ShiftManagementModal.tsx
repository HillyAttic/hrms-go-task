'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { shiftSchema } from '@/lib/attendance-validation';
import { ShiftFormData } from '@/types/attendance.types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ShiftManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ShiftFormData) => Promise<void>;
  loading: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export function ShiftManagementModal({
  open,
  onOpenChange,
  onSubmit,
  loading,
}: ShiftManagementModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      daysOfWeek: [],
      breakDuration: 60,
      overtimeThreshold: 0,
      color: '#3B82F6',
    },
  });

  const onSubmitForm = async (data: ShiftFormData) => {
    await onSubmit(data);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Shift</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          <div>
            <Label htmlFor="name">Shift Name</Label>
            <Input id="name" {...register('name')} placeholder="Morning Shift" />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input id="startTime" type="time" {...register('startTime')} />
              {errors.startTime && (
                <p className="text-sm text-red-600 mt-1">{errors.startTime.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input id="endTime" type="time" {...register('endTime')} />
              {errors.endTime && (
                <p className="text-sm text-red-600 mt-1">{errors.endTime.message}</p>
              )}
            </div>
          </div>

          <fieldset>
            <legend className="text-sm font-medium">Days of Week</legend>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {DAYS_OF_WEEK.map((day) => (
                <label key={day.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    value={day.value}
                    {...register('daysOfWeek', { valueAsNumber: true })}
                    className="rounded"
                  />
                  <span className="text-sm">{day.label}</span>
                </label>
              ))}
            </div>
            {errors.daysOfWeek && (
              <p className="text-sm text-red-600 mt-1">{errors.daysOfWeek.message}</p>
            )}
          </fieldset>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="breakDuration">Break Duration (min)</Label>
              <Input
                id="breakDuration"
                type="number"
                {...register('breakDuration', { valueAsNumber: true })}
              />
              {errors.breakDuration && (
                <p className="text-sm text-red-600 mt-1">{errors.breakDuration.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="overtimeThreshold">Overtime Threshold (min)</Label>
              <Input
                id="overtimeThreshold"
                type="number"
                {...register('overtimeThreshold', { valueAsNumber: true })}
              />
              {errors.overtimeThreshold && (
                <p className="text-sm text-red-600 mt-1">{errors.overtimeThreshold.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="color">Color</Label>
            <Input id="color" type="color" {...register('color')} />
            {errors.color && (
              <p className="text-sm text-red-600 mt-1">{errors.color.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="text-white">
              {loading ? 'Creating…' : 'Create Shift'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

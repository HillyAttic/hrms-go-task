'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AttendanceRecord } from '@/types/attendance.types';
import { formatHours, formatTimeShort } from '@/utils/time-calculations';
import {
  Clock,
  MapPin,
  Coffee,
  Edit,
  Trash2,
  AlertCircle,
} from 'lucide-react';

interface AttendanceRecordCardProps {
  record: AttendanceRecord;
  onEdit?: (record: AttendanceRecord) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
}

export function AttendanceRecordCard({
  record,
  onEdit,
  onDelete,
  showActions = false,
}: AttendanceRecordCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'active':
        return 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white';
      case 'incomplete':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'edited':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold">{record.employeeName}</h4>
              <Badge className={getStatusColor(record.status)}>
                {record.status}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {record.clockIn.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>

          {showActions && (
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(record)}
                  aria-label="Edit attendance record"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && record.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(record.id!)}
                  aria-label="Delete attendance record"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Time Information */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-1">
              <Clock className="h-3 w-3" />
              <span>Clock In</span>
            </div>
            <p className="font-medium">{formatTimeShort(record.clockIn)}</p>
          </div>

          <div>
            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-1">
              <Clock className="h-3 w-3" />
              <span>Clock Out</span>
            </div>
            <p className="font-medium">
              {record.clockOut ? (
                formatTimeShort(record.clockOut)
              ) : (
                <span className="flex items-center gap-1 text-yellow-600">
                  <AlertCircle className="h-3 w-3" />
                  Incomplete
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Hours Summary */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</p>
            <p className="font-semibold">{formatHours(record.totalHours)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Regular</p>
            <p className="font-semibold">{formatHours(record.regularHours)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Overtime</p>
            <p className="font-semibold text-orange-600">
              {formatHours(record.overtimeHours)}
            </p>
          </div>
        </div>

        {/* Breaks */}
        {record.breaks.length > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-2">
              <Coffee className="h-3 w-3" />
              <span>Breaks ({record.breaks.length})</span>
            </div>
            <div className="space-y-1">
              {record.breaks.map((breakRecord, index) => (
                <div
                  key={breakRecord.id || index}
                  className="text-xs text-gray-500 dark:text-gray-400 flex justify-between"
                >
                  <span>
                    {formatTimeShort(breakRecord.startTime)} -{' '}
                    {breakRecord.endTime
                      ? formatTimeShort(breakRecord.endTime)
                      : 'In Progress'}
                  </span>
                  <span>
                    {Math.floor(breakRecord.duration / 60)} min
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Location */}
        {(record.location?.clockIn || record.location?.clockOut) && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <MapPin className="h-3 w-3" />
              <span>Location verified</span>
            </div>
          </div>
        )}

        {/* Notes */}
        {(record.notes?.clockIn || record.notes?.clockOut) && (
          <div className="pt-3 border-t">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {record.notes.clockIn || record.notes.clockOut}
            </p>
          </div>
        )}

        {/* Edit Info */}
        {record.status === 'edited' && record.editedBy && (
          <div className="pt-3 border-t">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Edited by {record.editedBy}
              {record.editReason && `: ${record.editReason}`}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

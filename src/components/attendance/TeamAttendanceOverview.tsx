'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TeamMemberAttendanceStatus } from '@/types/attendance.types';
import { Clock, Coffee, Plane, AlertCircle } from 'lucide-react';

interface TeamAttendanceOverviewProps {
  teamMembers: TeamMemberAttendanceStatus[];
  onEmployeeClick: (employeeId: string) => void;
  loading?: boolean;
}

export function TeamAttendanceOverview({
  teamMembers,
  onEmployeeClick,
  loading,
}: TeamAttendanceOverviewProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'clocked-in':
        return <Clock className="h-4 w-4 text-green-600" />;
      case 'on-break':
        return <Coffee className="h-4 w-4 text-yellow-600" />;
      case 'on-leave':
        return <Plane className="h-4 w-4 text-blue-600" />;
      case 'absent':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      'clocked-in': 'bg-green-100 text-green-800',
      'clocked-out': 'bg-gray-100 text-gray-800',
      'on-break': 'bg-yellow-100 text-yellow-800',
      'on-leave': 'bg-blue-600 text-white',
      'absent': 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Team Attendance</h3>
      <div className="space-y-3">
        {teamMembers.map((member) => (
          <button
            type="button"
            key={member.employeeId}
            onClick={() => onEmployeeClick(member.employeeId)}
            className="flex w-full text-left items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:bg-gray-800 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(member.status)}
              <div>
                <p className="font-medium">{member.employeeName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getStatusBadge(member.status)}>
                    {member.status.replace('-', ' ')}
                  </Badge>
                  {member.isLate && (
                    <Badge className="bg-orange-100 text-orange-800">Late</Badge>
                  )}
                  {member.isEarlyDeparture && (
                    <Badge className="bg-orange-100 text-orange-800">Early</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              {member.clockInTime && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {member.clockInTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
              {member.currentHours > 0 && (
                <p className="text-sm font-medium">
                  {member.currentHours.toFixed(1)}h
                </p>
              )}
            </div>
          </button>
        ))}
        {teamMembers.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            No team members found
          </p>
        )}
      </div>
    </Card>
  );
}

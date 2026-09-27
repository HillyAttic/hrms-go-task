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
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      'clocked-in': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      'clocked-out': 'bg-muted text-foreground',
      'on-break': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      'on-leave': 'bg-foreground text-background',
      'absent': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    };
    return colors[status as keyof typeof colors] || 'bg-muted text-foreground';
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded"></div>
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
          <div
            key={member.employeeId}
            onClick={() => onEmployeeClick(member.employeeId)}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
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
                    <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300">Late</Badge>
                  )}
                  {member.isEarlyDeparture && (
                    <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300">Early</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              {member.clockInTime && (
                <p className="text-sm text-muted-foreground">
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
          </div>
        ))}
        {teamMembers.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No team members found
          </p>
        )}
      </div>
    </Card>
  );
}

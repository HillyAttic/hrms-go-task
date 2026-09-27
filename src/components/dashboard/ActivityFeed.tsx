import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  CheckCircleIcon,
  PlusCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface Activity {
  id: string;
  type: 'created' | 'updated' | 'completed' | 'deleted' | 'assigned';
  taskTitle: string;
  user: string;
  timestamp: Date;
}

interface ActivityFeedProps {
  activities: Activity[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'created':
        return <PlusCircleIcon className="w-5 h-5 text-blue-500" />;
      case 'updated':
        return <PencilSquareIcon className="w-5 h-5 text-orange-500" />;
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'deleted':
        return <TrashIcon className="w-5 h-5 text-red-500" />;
      case 'assigned':
        return <UserIcon className="w-5 h-5 text-purple-500" />;
    }
  };

  const getActivityText = (activity: Activity) => {
    switch (activity.type) {
      case 'created':
        return `created task "${activity.taskTitle}"`;
      case 'updated':
        return `updated task "${activity.taskTitle}"`;
      case 'completed':
        return `completed task "${activity.taskTitle}"`;
      case 'deleted':
        return `deleted task "${activity.taskTitle}"`;
      case 'assigned':
        return `was assigned to "${activity.taskTitle}"`;
    }
  };

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">{getActivityIcon(activity.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{activity.user}</span>{' '}
                    {getActivityText(activity)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{getTimeAgo(activity.timestamp)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

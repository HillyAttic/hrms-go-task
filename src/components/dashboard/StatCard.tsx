import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface StatCardProps {
  title: React.ReactNode;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
  compact?: boolean;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBgColor,
  iconColor,
  trend,
  onClick,
  compact = false
}: StatCardProps) {
  return (
    <Card
      className={`hover:shadow-lg transition-shadow duration-200 ${onClick ? 'cursor-pointer hover:border-ring' : ''}`}
      onClick={onClick}
    >
      <CardHeader className={`flex flex-row items-center justify-between ${compact ? 'pb-1 space-y-0 px-3 pt-3 sm:px-4 sm:pt-4 md:px-5 md:pt-5 md:pb-3' : 'pb-2 px-4 pt-4 sm:px-6 sm:pt-6'}`}>
        <CardTitle className={`${compact ? 'text-xs leading-tight flex-1 min-w-0 sm:text-xs md:text-sm md:font-normal' : 'text-xs sm:text-sm'} font-medium text-muted-foreground pr-2`}>{title}</CardTitle>
        <div className={`${compact ? 'p-1.5 flex-shrink-0 sm:p-2 md:p-2.5' : 'p-2'} ${iconBgColor} rounded-lg`}>
          <div className={`${iconColor} w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6`}>{icon}</div>
        </div>
      </CardHeader>
      <CardContent className={compact ? 'pt-0 px-3 pb-3 sm:px-4 sm:pb-4 md:px-5 md:pb-5' : 'px-4 pb-4 sm:px-6 sm:pb-6'}>
        <div className={`${compact ? 'text-xl sm:text-2xl md:text-4xl' : 'text-xl sm:text-2xl'} font-bold sm:font-bold md:font-normal text-foreground md:text-muted-foreground`}>
          {value}
        </div>
        {compact && subtitle && (
          <p className="text-xs text-muted-foreground mt-1 sm:mt-1.5 md:mt-2 line-clamp-2">{subtitle}</p>
        )}
        {!compact && (
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground line-clamp-1">{subtitle}</p>
            {trend && (
              <span className={`text-xs font-medium ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

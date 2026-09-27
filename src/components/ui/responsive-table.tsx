"use client";

import { cn } from "@/lib/utils";
import { useResponsive } from "@/hooks/use-responsive";
import React, { useState } from "react";

export interface ColumnDefinition<T> {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  mobileHidden?: boolean;
  tabletHidden?: boolean;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: ColumnDefinition<T>[];
  mobileLayout?: 'cards' | 'accordion' | 'horizontal-scroll';
  tabletLayout?: 'condensed' | 'full';
  onRowClick?: (row: T) => void;
  className?: string;
}

export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  mobileLayout = 'cards',
  tabletLayout = 'condensed',
  onRowClick,
  className
}: ResponsiveTableProps<T>) {
  const { device, isMobile, isTablet } = useResponsive();
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const handleSort = (column: keyof T) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortColumn, sortDirection]);

  const getVisibleColumns = () => {
    return columns.filter(column => {
      if (isMobile && column.mobileHidden) return false;
      if (isTablet && column.tabletHidden) return false;
      return true;
    });
  };

  // Mobile Card Layout
  if (isMobile && mobileLayout === 'cards') {
    return (
      <div className={cn("space-y-4", className)}>
        {sortedData.map((row, index) => (
          <div
            key={index}
            className={cn(
              "rounded-lg border border-stroke bg-card p-4 shadow-hard dark:border-stroke-dark",
              onRowClick && "cursor-pointer hover:shadow-card-2 transition-shadow"
            )}
            onClick={() => onRowClick?.(row)}
          >
            {getVisibleColumns().map((column) => (
              <div key={String(column.key)} className="mb-2 last:mb-0">
                <div className="text-sm font-medium text-dark-4 dark:text-dark-6">
                  {column.header}
                </div>
                <div className="text-dark dark:text-white">
                  {column.render ? column.render(row[column.key], row) : String(row[column.key])}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Mobile Accordion Layout
  if (isMobile && mobileLayout === 'accordion') {
    return (
      <div className={cn("space-y-2", className)}>
        {sortedData.map((row, index) => (
          <div
            key={index}
            className="rounded-lg border border-stroke bg-card dark:border-stroke-dark"
          >
            <button
              className="w-full p-4 text-left flex items-center justify-between"
              onClick={() => toggleRowExpansion(index)}
            >
              <span className="font-medium text-dark dark:text-white">
                {String(row[columns[0]?.key])}
              </span>
              <svg
                className={cn(
                  "h-5 w-5 transition-transform",
                  expandedRows.has(index) && "rotate-180"
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedRows.has(index) && (
              <div className="border-t border-stroke px-4 pb-4 dark:border-stroke-dark">
                {getVisibleColumns().slice(1).map((column) => (
                  <div key={String(column.key)} className="py-2">
                    <div className="text-sm font-medium text-dark-4 dark:text-dark-6">
                      {column.header}
                    </div>
                    <div className="text-dark dark:text-white">
                      {column.render ? column.render(row[column.key], row) : String(row[column.key])}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Horizontal Scroll Layout (Mobile/Tablet)
  if ((isMobile && mobileLayout === 'horizontal-scroll') || isTablet) {
    return (
      <div className={cn("overflow-x-auto", className)}>
        <table className="min-w-full table-auto">
          <thead>
            <tr className="border-b border-stroke dark:border-stroke-dark">
              {getVisibleColumns().map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    "px-4 py-3 text-left text-sm font-medium text-dark-4 dark:text-dark-6",
                    column.sortable && "cursor-pointer hover:text-dark dark:hover:text-white",
                    column.width && `w-${column.width}`
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.header}</span>
                    {column.sortable && sortColumn === column.key && (
                      <svg
                        className={cn(
                          "h-4 w-4 transition-transform",
                          sortDirection === 'desc' && "rotate-180"
                        )}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, index) => (
              <tr
                key={index}
                className={cn(
                  "border-b border-stroke dark:border-stroke-dark",
                  onRowClick && "cursor-pointer hover:bg-gray-1 dark:hover:bg-gray-dark/50 transition-colors"
                )}
                onClick={() => onRowClick?.(row)}
              >
                {getVisibleColumns().map((column) => (
                  <td
                    key={String(column.key)}
                    className="px-4 py-3 text-sm text-dark dark:text-white"
                  >
                    {column.render ? column.render(row[column.key], row) : String(row[column.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Desktop Full Table
  return (
    <div className={cn("overflow-hidden rounded-lg border border-stroke dark:border-stroke-dark", className)}>
      <table className="w-full table-auto">
        <thead className="bg-muted">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={cn(
                  "px-6 py-4 text-left text-sm font-medium text-dark-4 dark:text-dark-6",
                  column.sortable && "cursor-pointer hover:text-dark dark:hover:text-white",
                  column.width && `w-${column.width}`
                )}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center space-x-2">
                  <span>{column.header}</span>
                  {column.sortable && sortColumn === column.key && (
                    <svg
                      className={cn(
                        "h-4 w-4 transition-transform",
                        sortDirection === 'desc' && "rotate-180"
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-card">
          {sortedData.map((row, index) => (
            <tr
              key={index}
              className={cn(
                "border-b border-stroke dark:border-stroke-dark last:border-b-0",
                onRowClick && "cursor-pointer hover:bg-gray-1 dark:hover:bg-gray-dark/50 transition-colors"
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <td
                  key={String(column.key)}
                  className="px-6 py-4 text-sm text-dark dark:text-white"
                >
                  {column.render ? column.render(row[column.key], row) : String(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
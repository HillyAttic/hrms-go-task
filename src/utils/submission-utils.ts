import { isToday, isYesterday, isTomorrow, format, startOfDay } from 'date-fns';
import type { FormField, FormSubmission, FormFieldType } from '@/types/form.types';
import { Timestamp } from 'firebase/firestore';

/**
 * Flatten nested form fields (sections contain nested fields)
 * Sections themselves are excluded, only their nested fields are included
 * Preserves the order based on parent section order and nested field order
 */
export function flattenFormFields(fields: FormField[]): FormField[] {
  const flattened: FormField[] = [];

  // Sort parent fields by order first
  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

  sortedFields.forEach((field) => {
    if (field.type === 'section' && field.fields) {
      // Add nested fields from section, sorted by their order
      const sortedNestedFields = [...field.fields].sort((a, b) => a.order - b.order);
      flattened.push(...sortedNestedFields);
    } else if (field.type !== 'section') {
      // Add non-section fields
      flattened.push(field);
    }
  });

  return flattened;
}

/**
 * Convert submittedAt to Date, handling both Timestamp and string formats
 */
function toDate(submittedAt: Timestamp | string): Date {
  if (typeof submittedAt === 'string') {
    return new Date(submittedAt);
  }
  return submittedAt.toDate();
}

/**
 * Get day label (Today, Yesterday, Tomorrow, or formatted date)
 */
export function getDayLabel(date: Date): string {
  if (isToday(date)) {
    return `Today - ${format(date, 'MMMM d, yyyy')}`;
  }
  if (isYesterday(date)) {
    return `Yesterday - ${format(date, 'MMMM d, yyyy')}`;
  }
  if (isTomorrow(date)) {
    return `Tomorrow - ${format(date, 'MMMM d, yyyy')}`;
  }
  return format(date, 'EEEE, MMMM d, yyyy');
}

/**
 * Group submissions by day
 * Returns a Map where key is the day label and value is array of submissions
 */
export function groupSubmissionsByDay(
  submissions: FormSubmission[]
): Map<string, FormSubmission[]> {
  const grouped = new Map<string, FormSubmission[]>();

  // Group by day
  const dayGroups = new Map<string, FormSubmission[]>();

  submissions.forEach((submission) => {
    const date = toDate(submission.submittedAt);
    const dayKey = format(startOfDay(date), 'yyyy-MM-dd');

    if (!dayGroups.has(dayKey)) {
      dayGroups.set(dayKey, []);
    }
    dayGroups.get(dayKey)!.push(submission);
  });

  // Convert to labeled groups and sort by date (most recent first)
  const sortedDays = Array.from(dayGroups.entries()).sort((a, b) => {
    return new Date(b[0]).getTime() - new Date(a[0]).getTime();
  });

  sortedDays.forEach(([dayKey, subs]) => {
    const date = new Date(dayKey);
    const label = getDayLabel(date);
    grouped.set(label, subs);
  });

  return grouped;
}

/**
 * Format field value for display in spreadsheet cell
 */
export function formatCellValue(value: any, fieldType: FormFieldType): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  switch (fieldType) {
    case 'checkbox':
    case 'multiselect':
      if (Array.isArray(value)) {
        return value.length > 0 ? value.join(', ') : '-';
      }
      return String(value);

    case 'date':
      if (value instanceof Date) {
        return format(value, 'MMM d, yyyy');
      }
      if (typeof value === 'string') {
        try {
          return format(new Date(value), 'MMM d, yyyy');
        } catch {
          return String(value);
        }
      }
      return String(value);

    case 'time':
      return String(value);

    case 'file':
      return '[File]';

    case 'number':
      return typeof value === 'number' ? value.toString() : String(value);

    default:
      return String(value);
  }
}

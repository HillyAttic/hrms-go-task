import * as XLSX from 'xlsx';
import type {
  FormSubmission,
  FormTemplate,
  FormField,
  ExportFormat,
} from '@/types/form.types';
import { Timestamp } from 'firebase/firestore';

/**
 * Convert submittedAt to Date, handling both Timestamp and string formats
 */
function toDate(submittedAt: Timestamp | string): Date {
  if (typeof submittedAt === 'string') {
    return new Date(submittedAt);
  }
  return submittedAt.toDate();
}

export const formExportService = {
  /**
   * Export form submissions to CSV
   */
  async exportToCSV(
    submissions: FormSubmission[],
    template: FormTemplate
  ): Promise<string> {
    const headers = this.generateHeaders(template.fields);
    const rows = submissions.map((submission) =>
      this.generateRow(submission, template.fields)
    );

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    return csvContent;
  },

  /**
   * Export form submissions to Excel
   */
  async exportToExcel(
    submissions: FormSubmission[],
    template: FormTemplate
  ): Promise<ArrayBuffer> {
    const headers = this.generateHeaders(template.fields);
    const rows = submissions.map((submission) =>
      this.generateRow(submission, template.fields, false)
    );

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Create submissions sheet
    const submissionsData = [headers, ...rows];
    const submissionsSheet = XLSX.utils.aoa_to_sheet(submissionsData);

    // Auto-size columns
    const columnWidths = headers.map((header, i) => {
      const maxLength = Math.max(
        header.length,
        ...rows.map((row) => String(row[i] || '').length)
      );
      return { wch: Math.min(maxLength + 2, 50) };
    });
    submissionsSheet['!cols'] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, submissionsSheet, 'Submissions');

    // Create summary sheet
    const summaryData = this.generateSummary(submissions, template);
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    return excelBuffer;
  },

  /**
   * Flatten nested form fields (sections contain nested fields)
   */
  flattenFields(fields: FormField[]): FormField[] {
    const flattened: FormField[] = [];
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
  },

  /**
   * Generate CSV/Excel headers from form fields
   */
  generateHeaders(fields: FormField[]): string[] {
    const baseHeaders = [
      'Submitter Email',
      'Submitter Name',
      'Submitted At',
    ];

    // Flatten fields to handle sections
    const flattenedFields = this.flattenFields(fields);
    const fieldHeaders = flattenedFields.map((field) => field.label);

    return [...baseHeaders, ...fieldHeaders, 'Files'];
  },

  /**
   * Generate a row of data for a submission
   */
  generateRow(
    submission: FormSubmission,
    fields: FormField[],
    escapeForCSV: boolean = true
  ): string[] {
    const baseData = [
      submission.submitterEmail || '',
      submission.submitterName || '',
      typeof submission.submittedAt === 'string'
        ? new Date(submission.submittedAt).toLocaleString()
        : submission.submittedAt.toDate().toLocaleString(),
    ];

    // Flatten fields to handle sections
    const flattenedFields = this.flattenFields(fields);
    const fieldData = flattenedFields.map((field) => {
      const value = submission.data[field.id];
      return this.formatFieldValue(value, field, escapeForCSV);
    });

    const filesData = submission.files
      ? submission.files.map((f) => f.fileName).join('; ')
      : '';

    const row = [...baseData, ...fieldData, filesData];

    return escapeForCSV ? row.map((cell) => this.escapeCSV(cell)) : row;
  },

  /**
   * Format field value for export
   */
  formatFieldValue(
    value: any,
    field: FormField,
    escapeForCSV: boolean
  ): string {
    if (value === null || value === undefined) return '';

    switch (field.type) {
      case 'checkbox':
      case 'multiselect':
        if (Array.isArray(value)) {
          return value.join('; ');
        }
        return String(value);

      case 'date':
        if (value instanceof Date) {
          return value.toLocaleDateString();
        }
        if (typeof value === 'string') {
          return new Date(value).toLocaleDateString();
        }
        return String(value);

      case 'time':
        return String(value);

      case 'file':
        return '[File]';

      default:
        return String(value);
    }
  },

  /**
   * Escape CSV special characters
   */
  escapeCSV(value: string): string {
    const stringValue = String(value);

    // If value contains comma, newline, or quotes, wrap in quotes and escape quotes
    if (
      stringValue.includes(',') ||
      stringValue.includes('\n') ||
      stringValue.includes('"')
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  },

  /**
   * Generate summary statistics
   */
  generateSummary(
    submissions: FormSubmission[],
    template: FormTemplate
  ): string[][] {
    const summary: string[][] = [
      ['Form Summary', ''],
      ['Form Title', template.title],
      ['Total Submissions', String(submissions.length)],
      ['', ''],
      ['Submission Details', ''],
    ];

    if (submissions.length > 0) {
      const dates = submissions.map((s) => toDate(s.submittedAt));
      const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
      const latest = new Date(Math.max(...dates.map((d) => d.getTime())));

      summary.push(
        ['First Submission', earliest.toLocaleString()],
        ['Latest Submission', latest.toLocaleString()]
      );

      // Count submissions by user
      const userCounts: Record<string, number> = {};
      submissions.forEach((s) => {
        const user = s.submitterName || s.submitterEmail || 'Anonymous';
        userCounts[user] = (userCounts[user] || 0) + 1;
      });

      summary.push(['', ''], ['Submissions by User', '']);
      Object.entries(userCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([user, count]) => {
          summary.push([user, String(count)]);
        });
    }

    return summary;
  },

  /**
   * Generate filename for export
   */
  generateFilename(formTitle: string, format: ExportFormat): string {
    const sanitizedTitle = formTitle.replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = new Date().toISOString().split('T')[0];
    const extension = format === 'csv' ? 'csv' : 'xlsx';

    return `${sanitizedTitle}_${timestamp}.${extension}`;
  },

  /**
   * Create download blob for browser
   */
  createDownloadBlob(data: string | ArrayBuffer, format: ExportFormat): Blob {
    const mimeType =
      format === 'csv'
        ? 'text/csv;charset=utf-8;'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    return new Blob([data], { type: mimeType });
  },

  /**
   * Trigger browser download
   */
  downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};

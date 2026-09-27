'use client';

import { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { parseCSV, readFileAsText } from '@/utils/csv-parser';
import type { CredentialCategory, CreateCredentialPayload } from '@/types/password-manager.types';

// CSV column → payload field mapping per category
const CSV_MAPPINGS: Record<CredentialCategory, Record<string, keyof CreateCredentialPayload>> = {
  gst: {
    'S.no': 'serialNumber',
    'Client Name': 'clientName',
    'GST Number': 'gstNumber',
    'User Name': 'username',
    Password: 'plainPassword',
  },
  'income-tax': {
    'Client Name': 'clientName',
    'Date of Birth': 'dateOfBirth',
    'PAN No': 'panNumber',
    'User Name': 'username',
    Password: 'plainPassword',
  },
  mca: {
    'S.no': 'serialNumber',
    'Client Name': 'clientName',
    'Membership No/DIN No': 'membershipDin',
    'User Name': 'username',
    Password: 'plainPassword',
  },
};

const REQUIRED_FIELDS: Record<CredentialCategory, string[]> = {
  gst: ['Client Name', 'User Name', 'Password'],
  'income-tax': ['Client Name', 'User Name', 'Password'],
  mca: ['Client Name', 'User Name', 'Password'],
};

const CATEGORY_LABELS: Record<CredentialCategory, string> = {
  gst: 'GST',
  'income-tax': 'Income Tax',
  mca: 'MCA',
};

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: CredentialCategory;
  onImportComplete: () => void;
  /** API endpoint to POST records to. Defaults to admin endpoint. */
  importEndpoint?: string;
}

type ParsedRow = Record<string, string>;

export default function BulkImportModal({
  isOpen,
  onClose,
  category,
  onImportComplete,
  importEndpoint = '/api/password-manager/credentials/bulk-import',
}: BulkImportModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'result'>('upload');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{ created: number; errors: number } | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setStep('upload');
    setParsedRows([]);
    setParseErrors([]);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await readFileAsText(file);
      const { data, errors } = parseCSV<ParsedRow>(text);

      const errMsgs: string[] = [];
      if (errors.length > 0) {
        errors.forEach((err) => errMsgs.push(`Row ${err.row}: ${err.error}`));
      }

      // Validate required fields
      const required = REQUIRED_FIELDS[category];
      data.forEach((row, idx) => {
        required.forEach((field) => {
          if (!row[field] || row[field].trim() === '') {
            errMsgs.push(`Row ${idx + 2}: Missing required field "${field}"`);
          }
        });
      });

      setParseErrors(errMsgs);
      setParsedRows(data);
      setStep('preview');
    } catch (err) {
      toast.error('Failed to read file');
    }
  };

  const mapRow = (row: ParsedRow): CreateCredentialPayload => {
    const mapping = CSV_MAPPINGS[category];
    const payload: Partial<CreateCredentialPayload> = { category };

    Object.entries(mapping).forEach(([csvCol, payloadField]) => {
      const value = row[csvCol]?.trim();
      if (value) {
        (payload as Record<string, unknown>)[payloadField] = value;
      }
    });

    return payload as CreateCredentialPayload;
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter((row) => {
      const required = REQUIRED_FIELDS[category];
      return required.every((f) => row[f] && row[f].trim() !== '');
    });

    if (validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }

    setStep('importing');

    try {
      const { authenticatedFetch } = await import('@/lib/api-client');
      const records = validRows.map(mapRow);

      const response = await authenticatedFetch(importEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });

      if (response.ok) {
        const result = await response.json();
        setImportResult({ created: result.created, errors: result.errors?.length ?? 0 });
        setStep('result');
        onImportComplete();
      } else {
        toast.error('Import failed');
        setStep('preview');
      }
    } catch (err) {
      toast.error('Import failed');
      setStep('preview');
    }
  };

  const mapping = CSV_MAPPINGS[category];
  const previewColumns = Object.keys(mapping).filter((col) => col !== 'Password');
  const label = CATEGORY_LABELS[category];

  // Template CSV header
  const templateHeader = Object.keys(CSV_MAPPINGS[category]).join(',');
  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(templateHeader + '\n')}`;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Bulk Import {label} Credentials</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV file with columns:{' '}
              <span className="font-mono text-xs bg-muted px-1 rounded">
                {Object.keys(mapping).join(', ')}
              </span>
            </p>
            <a
              href={templateHref}
              download={`${category}-template.csv`}
              className="inline-flex text-xs text-blue-600 hover:underline"
            >
              Download template CSV
            </a>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <div className="text-muted-foreground mb-2">
                  <svg
                    className="mx-auto h-10 w-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">
                  Click to select CSV file
                </p>
              </label>
            </div>
            <DialogFooter>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm rounded-lg bg-muted text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </DialogFooter>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Found <strong>{parsedRows.length}</strong> rows
                {parseErrors.length > 0 && (
                  <span className="ml-2 text-yellow-600">
                    ({parseErrors.length} warning{parseErrors.length > 1 ? 's' : ''})
                  </span>
                )}
              </p>
            </div>

            {parseErrors.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 max-h-24 overflow-y-auto">
                {parseErrors.slice(0, 5).map((err, i) => (
                  <p key={i} className="text-xs text-yellow-700 dark:text-yellow-400">
                    {err}
                  </p>
                ))}
                {parseErrors.length > 5 && (
                  <p className="text-xs text-yellow-600">...and {parseErrors.length - 5} more</p>
                )}
              </div>
            )}

            <div className="overflow-x-auto max-h-64 border border-border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-muted-foreground">#</th>
                    {previewColumns.map((col) => (
                      <th
                        key={col}
                        className="px-3 py-2 text-left text-muted-foreground"
                      >
                        {col}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-left text-muted-foreground">
                      Password
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsedRows.slice(0, 10).map((row, i) => (
                    <tr key={i} className="hover:bg-muted/50">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      {previewColumns.map((col) => (
                        <td
                          key={col}
                          className="px-3 py-2 text-foreground max-w-[150px] truncate"
                        >
                          {row[col] || '-'}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-muted-foreground">
                        {row['Password'] ? '●●●●●●' : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  ...and {parsedRows.length - 10} more rows
                </p>
              )}
            </div>

            <DialogFooter>
              <button
                onClick={() => {
                  setStep('upload');
                  setParsedRows([]);
                  setParseErrors([]);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="px-4 py-2 text-sm rounded-lg bg-muted text-muted-foreground hover:bg-muted"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={parsedRows.length === 0}
                className="px-4 py-2 text-sm rounded-lg bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
              >
                Import {parsedRows.length} Records
              </button>
            </DialogFooter>
          </div>
        )}

        {step === 'importing' && (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-muted-foreground">Importing records...</p>
          </div>
        )}

        {step === 'result' && importResult && (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
              <p className="text-green-800 dark:text-green-400 font-medium">
                Import Complete
              </p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                {importResult.created} record{importResult.created !== 1 ? 's' : ''} imported
                successfully.
                {importResult.errors > 0 && (
                  <span className="text-yellow-600 dark:text-yellow-400 ml-1">
                    {importResult.errors} error{importResult.errors > 1 ? 's' : ''}.
                  </span>
                )}
              </p>
            </div>
            <DialogFooter>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm rounded-lg bg-foreground text-background hover:bg-foreground/90"
              >
                Done
              </button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

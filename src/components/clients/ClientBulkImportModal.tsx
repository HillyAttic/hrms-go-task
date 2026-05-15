import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CloudArrowUpIcon, DocumentArrowDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { parseCSV, parseYN, readFileAsText, validateCSVData } from '@/utils/csv-parser';
import { Client, ClientImportRow, clientService } from '@/services/client.service';

interface ClientBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export function ClientBulkImportModal({
  isOpen,
  onClose,
  onImportComplete,
}: ClientBulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewData, setPreviewData] = useState<ClientImportRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.name.endsWith('.csv')) {
      setErrors(['Please select a CSV file']);
      return;
    }

    setFile(selectedFile);
    setErrors([]);
    setImportResult(null);

    try {
      // Read and parse CSV
      const content = await readFileAsText(selectedFile);
      const { data, errors: parseErrors } = parseCSV<ClientImportRow>(content);

      if (parseErrors.length > 0) {
        setErrors(parseErrors.map(e => `Row ${e.row}: ${e.error}`));
      }

      // Validate required fields
      const validationErrors = validateCSVData(data, ['Client Name']);
      if (validationErrors.length > 0) {
        setErrors(validationErrors.map(e => `Row ${e.row}, Field '${e.field}': ${e.error}`));
      }

      // Show preview (first 5 rows)
      setPreviewData(data.slice(0, 5));
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Failed to parse CSV file']);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setErrors([]);

    try {
      // Read and parse CSV
      const content = await readFileAsText(file);
      const { data } = parseCSV<ClientImportRow>(content);

      // Convert to Client objects
      const clients: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>[] = data.map(row => ({
        clientName: row['Client Name'],
        serialNumber: row['S.No'] || undefined,
        businessName: row['Business Name'] || undefined,
        taxIdentifiers: (row['P.A.N.'] || row['T.A.N.'] || row.GSTIN) ? {
          pan: row['P.A.N.'] || undefined,
          tan: row['T.A.N.'] || undefined,
          gstin: row.GSTIN || undefined,
        } : undefined,
        contact: (row.Email || row.Phone) ? {
          email: row.Email || undefined,
          phone: row.Phone || undefined,
        } : undefined,
        address: (row.Address || row.City || row.State || row.Country || row['Zip Code']) ? {
          line1: row.Address || undefined,
          city: row.City || undefined,
          state: row.State || undefined,
          country: row.Country || undefined,
          zipCode: row['Zip Code'] || undefined,
        } : undefined,
        compliance: (row.ROC !== undefined || row.GSTR1 !== undefined || row.GST3B !== undefined || row.IFF !== undefined || row.ITR !== undefined || row['Tax Audit'] !== undefined || row.Accounting !== undefined || row['Client Visit'] !== undefined || row.Bank !== undefined || row.TCS !== undefined || row.TDS !== undefined || row['Statutory Audit'] !== undefined) ? {
          roc: parseYN(row.ROC ?? 'N'),
          gstr1: parseYN(row.GSTR1 ?? 'N'),
          gst3b: parseYN(row.GST3B ?? 'N'),
          iff: parseYN(row.IFF ?? 'N'),
          itr: parseYN(row.ITR ?? 'N'),
          taxAudit: parseYN(row['Tax Audit'] ?? 'N'),
          accounting: parseYN(row.Accounting ?? 'N'),
          clientVisit: parseYN(row['Client Visit'] ?? 'N'),
          bank: parseYN(row.Bank ?? 'N'),
          tcs: parseYN(row.TCS ?? 'N'),
          tds: parseYN(row.TDS ?? 'N'),
          statutoryAudit: parseYN(row['Statutory Audit'] ?? 'N'),
        } : undefined,
        status: 'active',
      }));

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Bulk import
      const result = await clientService.bulkImport(clients);

      clearInterval(progressInterval);
      setUploadProgress(100);
      setImportResult(result);

      if (result.failed === 0) {
        setTimeout(() => {
          onImportComplete();
          handleClose();
        }, 2000);
      }
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Failed to import clients']);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreviewData([]);
    setErrors([]);
    setImportResult(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const downloadTemplate = () => {
    const headers = [
      'S.No',
      'Client Name',
      'Business Name',
      'P.A.N.',
      'T.A.N.',
      'GSTIN',
      'Email',
      'Phone',
      'Address',
      'City',
      'State',
      'Country',
      'Zip Code',
      'ROC',
      'GSTR1',
      'GST3B',
      'IFF',
      'ITR',
      'Tax Audit',
      'Accounting',
      'Client Visit',
      'Bank',
      'TCS',
      'TDS',
      'Statutory Audit',
    ];
    const exampleRow = [
      '001',
      'ABC Pvt Ltd',
      'ABC Corporation',
      'ABCDE1234F',
      'ABCD12345E',
      '22AAAAA0000A1Z5',
      'abc@example.com',
      '+919876543210',
      'Mumbai Office',
      'Mumbai',
      'Maharashtra',
      'India',
      '400001',
      'Y',
      'Y',
      'N',
      'N',
      'Y',
      'N',
      'Y',
      'N',
      'N',
      'N',
      'N',
      'N',
    ];
    const csvContent = headers.join(',') + '\n' + exampleRow.join(',') + '\n';
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'client_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudArrowUpIcon className="w-6 h-6" />
            Bulk Import Clients
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <DocumentArrowDownIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Download CSV Template
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                  Use our template to ensure your data is formatted correctly. Only Client Name is required. Compliance fields (ROC, GSTR1, GST3B, IFF, ITR, Tax Audit, Accounting, Client Visit, Bank, TCS, TDS, Statutory Audit) accept Y or N values.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/40"
                >
                  <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select CSV File
            </label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 disabled:opacity-50"
              />
            </div>
            {file && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">
                Validation Errors
              </h4>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 max-h-40 overflow-y-auto">
                {errors.slice(0, 10).map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
                {errors.length > 10 && (
                  <li className="font-medium">... and {errors.length - 10} more errors</li>
                )}
              </ul>
            </div>
          )}

          {/* Preview */}
          {previewData.length > 0 && errors.length === 0 && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Preview (First 5 rows)
              </h4>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Client Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Business</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Email</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">GSTIN</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">ROC</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">GSTR1</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">GST3B</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">IFF</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">ITR</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Tax Audit</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Accounting</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Client Visit</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Bank</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {previewData.map((row, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 whitespace-nowrap">{row['Client Name']}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row['Business Name']}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.Email}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.GSTIN}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.ROC}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.GSTR1}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.GST3B}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.IFF}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.ITR}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row['Tax Audit']}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.Accounting}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row['Client Visit']}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.Bank}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Importing clients...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className={`border rounded-lg p-4 ${
              importResult.failed === 0
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            }`}>
              <h4 className={`font-medium mb-2 ${
                importResult.failed === 0
                  ? 'text-green-900 dark:text-green-100'
                  : 'text-yellow-900 dark:text-yellow-100'
              }`}>
                Import Complete
              </h4>
              <div className="text-sm space-y-1">
                <p className="text-green-700 dark:text-green-300">
                  ✓ Successfully imported: {importResult.success} clients
                </p>
                {importResult.failed > 0 && (
                  <>
                    <p className="text-red-700 dark:text-red-300">
                      ✗ Failed: {importResult.failed} clients
                    </p>
                    {importResult.errors.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer font-medium">View errors</summary>
                        <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                          {importResult.errors.map((error, index) => (
                            <li key={index} className="text-xs">
                              Row {error.row}: {error.error}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            {importResult ? 'Close' : 'Cancel'}
          </Button>
          {!importResult && (
            <Button
              onClick={handleImport}
              disabled={!file || errors.length > 0 || isUploading}
              loading={isUploading}
            >
              <CloudArrowUpIcon className="w-4 h-4 mr-2" />
              Import Clients
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  ArrowUpTrayIcon, 
  DocumentArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { parseCSV } from '@/utils/csv-parser';

interface EmployeeBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (employees: any[]) => Promise<void>;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; error: string; data: any }[];
}

/**
 * EmployeeBulkImportModal Component
 * Modal for bulk importing employees from CSV file
 */
export function EmployeeBulkImportModal({
  isOpen,
  onClose,
  onImport,
}: EmployeeBulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImportResult(null);
      
      // Parse and preview the CSV
      try {
        const text = await selectedFile.text();
        const parsed = parseCSV(text);
        setPreviewData(parsed.data.slice(0, 5)); // Show first 5 rows as preview
      } catch (error) {
        console.error('Error parsing CSV:', error);
        alert('Error parsing CSV file. Please check the format.');
      }
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      const rows = parsed.data;

      const employees = rows.map((row: any) => {
        let phone = row['Phone']?.trim() || '';
        
        // Ensure phone is in E.164 format (starts with +)
        if (phone && !phone.startsWith('+')) {
          // If it's a 10-digit number, assume it's Indian (+91)
          if (/^\d{10}$/.test(phone)) {
            phone = `+91${phone}`;
          } else if (/^\d+$/.test(phone)) {
            // For other digit-only numbers, add + prefix
            phone = `+${phone}`;
          }
        }
        
        return {
          employeeId: row['Employee ID']?.trim() || '',
          name: row['Name']?.trim() || '',
          email: row['Email']?.trim() || '',
          phone: phone,
          role: row['Role']?.trim() || 'Employee',
          password: row['Password']?.trim() || '',
          status: (row['Status']?.trim().toLowerCase() || 'active') as 'active' | 'on-leave',
        };
      });

      // Check for duplicate Employee IDs within the CSV
      const employeeIds = new Set<string>();
      const duplicateIds = new Set<string>();
      
      employees.forEach((emp) => {
        if (emp.employeeId && employeeIds.has(emp.employeeId)) {
          duplicateIds.add(emp.employeeId);
        }
        if (emp.employeeId) {
          employeeIds.add(emp.employeeId);
        }
      });

      // Validate employees
      const validEmployees = [];
      const errors = [];

      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        const rowNum = i + 2; // +2 because of header row and 0-based index

        // Check for duplicate within CSV
        if (duplicateIds.has(emp.employeeId)) {
          errors.push({ row: rowNum, error: `Duplicate Employee ID '${emp.employeeId}' found in CSV`, data: emp });
          continue;
        }

        // Validation
        if (!emp.employeeId) {
          errors.push({ row: rowNum, error: 'Employee ID is required', data: emp });
          continue;
        }
        if (!emp.name) {
          errors.push({ row: rowNum, error: 'Name is required', data: emp });
          continue;
        }
        if (!emp.email) {
          errors.push({ row: rowNum, error: 'Email is required', data: emp });
          continue;
        }
        // Validate email format
        const emailErrors: string[] = [];
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emp.email)) {
          emailErrors.push(`Invalid email format (${emp.email})`);
        }
        if (emailErrors.length > 0) {
          errors.push({ row: rowNum, error: emailErrors.join('; '), data: emp });
          continue;
        }
        // Phone is optional - skip validation if empty
        if (!emp.password) {
          errors.push({ row: rowNum, error: 'Password is required', data: emp });
          continue;
        }
        if (!['Manager', 'Admin', 'Employee'].includes(emp.role)) {
          errors.push({ row: rowNum, error: 'Role must be Manager, Admin, or Employee', data: emp });
          continue;
        }

        validEmployees.push(emp);
      }

      // Import valid employees with delay to avoid rate limiting
      let successCount = 0;
      const importErrors = [...errors];

      for (let i = 0; i < validEmployees.length; i++) {
        try {
          setImportProgress({ current: i + 1, total: validEmployees.length });
          console.log(`Importing employee ${i + 1}/${validEmployees.length}:`, validEmployees[i]);
          await onImport([validEmployees[i]]);
          successCount++;
          
          // Add delay between requests to avoid Firebase rate limiting
          // Wait 1 second between each employee creation (reduced from 2s)
          if (i < validEmployees.length - 1) {
            console.log('Waiting 1 second before next import...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          const rowNum = employees.indexOf(validEmployees[i]) + 2;
          let errorMessage = 'Unknown error';
          
          console.error('Import error for employee:', validEmployees[i], error);
          
          if (error instanceof Error) {
            errorMessage = error.message;
            
            // Parse specific error types for better user feedback
            if (errorMessage.includes('Email already exists') || 
                (errorMessage.includes('already exists') && errorMessage.toLowerCase().includes('email'))) {
              errorMessage = `Email '${validEmployees[i].email}' is already registered`;
            } else if (errorMessage.includes('Employee ID already exists') || 
                       (errorMessage.includes('already exists') && errorMessage.toLowerCase().includes('employee'))) {
              errorMessage = `Employee ID '${validEmployees[i].employeeId}' already exists in the system`;
            } else if (errorMessage === 'Conflict' || errorMessage.includes('409')) {
              // Generic conflict - try to determine what conflicted
              errorMessage = `Employee '${validEmployees[i].employeeId}' or email '${validEmployees[i].email}' already exists`;
            } else if (errorMessage.includes('too-many-requests') || errorMessage.includes('429')) {
              errorMessage = 'Rate limit exceeded. Please wait a few minutes and try again.';
            }
          }
          
          importErrors.push({
            row: rowNum,
            error: errorMessage,
            data: validEmployees[i],
          });
          
          // If rate limited, stop importing
          if (errorMessage.includes('Rate limit')) {
            alert('Firebase rate limit reached. Please wait a few minutes before importing more employees.');
            break;
          }
        }
      }

      setImportResult({
        success: successCount,
        failed: importErrors.length,
        errors: importErrors,
      });
      setImportProgress(null);

      // If all successful, close modal after a delay
      if (importErrors.length === 0) {
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else if (successCount === 0 && importErrors.length > 0) {
        // Prominent alert when ALL rows failed - so user doesn't miss that nothing was imported
        alert(
          `⚠️ No employees were imported!\n\n` +
          `All ${importErrors.length} row(s) failed validation.\n\n` +
          `First few errors:\n` +
          importErrors.slice(0, 5).map(e => `  Row ${e.row}: ${e.error}`).join('\n') +
          (importErrors.length > 5 ? `\n  ...and ${importErrors.length - 5} more` : '')
        );
      }
    } catch (error) {
      console.error('Error importing employees:', error);
      alert('Error importing employees. Please try again.');
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreviewData([]);
    setImportResult(null);
    setImportProgress(null);
    onClose();
  };

  const downloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/employee_import_template.csv';
    link.download = 'employee_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Employees</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template Button */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <DocumentArrowDownIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900 mb-1">
                  Download Template
                </h4>
                <p className="text-xs text-blue-700 mb-2">
                  Download the CSV template with the correct format and example data.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  className="text-blue-600 border-blue-300 hover:bg-blue-100"
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
              Upload CSV File
            </label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                disabled={importing}
              />
            </div>
            {file && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Selected: {file.name}
              </p>
            )}
          </div>

          {/* Preview Data */}
          {previewData.length > 0 && !importResult && !importing && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Preview (First 5 rows)
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-2 py-1 text-left">Employee ID</th>
                      <th className="px-2 py-1 text-left">Name</th>
                      <th className="px-2 py-1 text-left">Email</th>
                      <th className="px-2 py-1 text-left">Role</th>
                      <th className="px-2 py-1 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {previewData.map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-1">{row['Employee ID']}</td>
                        <td className="px-2 py-1">{row['Name']}</td>
                        <td className="px-2 py-1">{row['Email']}</td>
                        <td className="px-2 py-1">{row['Role']}</td>
                        <td className="px-2 py-1">{row['Status']}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Progress */}
          {importing && importProgress && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    Importing employee {importProgress.current} of {importProgress.total}...
                  </p>
                  <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="space-y-3">
              {/* Success Summary */}
              {importResult.success > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">
                      Successfully imported {importResult.success} employee(s)
                    </span>
                  </div>
                </div>
              )}

              {/* Error Summary */}
              {importResult.failed > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <XCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-red-900 block mb-2">
                        Failed to import {importResult.failed} employee(s)
                      </span>
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {importResult.errors.map((err, idx) => (
                          <div key={idx} className="text-xs text-red-800 bg-red-100 rounded p-2">
                            <span className="font-medium">Row {err.row}:</span> {err.error}
                            <br />
                            <span className="text-red-600">
                              {err.data.employeeId} - {err.data.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          {!importResult && (
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <p className="font-medium text-gray-900 dark:text-white">CSV Format Requirements:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li>Required columns: Employee ID, Name, Email, Role, Password, Status</li>
                    <li>Optional columns: Phone (if provided, must be in E.164 format e.g., +919876543210)</li>
                    <li>Role must be: Manager, Admin, or Employee</li>
                    <li>Status must be: active or on-leave</li>
                    <li>Password will be hashed automatically</li>
                    <li><strong>All Employee IDs must be unique</strong> (duplicates will be rejected)</li>
                    <li><strong>Emails must be unique</strong> (existing emails will be rejected)</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={importing}
          >
            {importResult ? 'Close' : 'Cancel'}
          </Button>
          {!importResult && (
            <Button
              type="button"
              onClick={handleImport}
              disabled={!file || importing}
              className="text-white"
            >
              {importing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Importing...
                </>
              ) : (
                <>
                  <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
                  Import Employees
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

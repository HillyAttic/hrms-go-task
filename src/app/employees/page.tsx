'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Employee } from '@/services/employee.service';
import { useEmployees } from '@/hooks/use-employees';
import { useBulkSelection } from '@/hooks/use-bulk-selection';
import { EmployeeCard } from '@/components/employees/EmployeeCard';
import { EmployeeModal } from '@/components/employees/EmployeeModal';
import { EmployeeStatsCard } from '@/components/employees/EmployeeStatsCard';
import { EmployeeFilter, EmployeeFilterState } from '@/components/employees/EmployeeFilter';
import { EmployeeBulkImportModal } from '@/components/employees/EmployeeBulkImportModal';
import { BulkActionToolbar } from '@/components/ui/BulkActionToolbar';
import { BulkDeleteDialog } from '@/components/ui/BulkDeleteDialog';
import { Button } from '@/components/ui/button';
import { NoResultsEmptyState, NoDataEmptyState } from '@/components/ui/empty-state';
import { CardGridSkeleton, StatsGridSkeleton } from '@/components/ui/loading-skeletons';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ManagerGuard } from '@/components/Auth/PermissionGuard';
import { PlusIcon, ArrowUpTrayIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { z } from 'zod';

// Form schema for employee data
const employeeFormSchema = z.object({
  // Personal Info
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email format'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
  dateOfBirth: z.string().optional(),
  department: z.string().optional(),

  // Employment
  employeeId: z.string().min(1, 'Employee ID is required').max(20),
  dateOfJoining: z.string().optional(),
  salary: z.coerce.number().optional(),
  status: z.enum(['active', 'on-leave', 'resigned']),

  // Role
  role: z.enum(['Manager', 'Admin', 'Employee']),

  // Manager
  managerId: z.string().optional(),
  managerName: z.string().optional(),

  // Probation & Promotion
  probationDuration: z.coerce.number().optional(),
  probationEndDate: z.string().optional(),
  workAnniversary: z.string().optional(),
  promotionDate: z.string().optional(),
  promotionDetails: z.string().optional(),

  // Password
  currentPassword: z.string().optional(),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),

  // Extra payload (not validated in schema but passed through)
  name: z.string().optional(),
  salaryChanges: z.any().optional(),
  documents: z.any().optional(),
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

/**
 * Employees Page Component
 * Main page for employee management with CRUD operations, filtering, and statistics
 * Validates Requirements: 5.1, 5.2, 10.1, 10.2, 10.3, 10.4
 */
export default function EmployeesPage() {
  const {
    employees,
    loading,
    error,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    deactivateEmployee,
    refreshEmployees,
    searchEmployees,
    filterEmployees,
  } = useEmployees();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filters, setFilters] = useState<EmployeeFilterState>({
    status: 'all',
    search: '',
  });
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list'); // 'grid' or 'list' view mode

  // Filter employees based on current filters
  const filteredEmployees = useMemo(() => {
    let filtered = employees.filter(employee => {
      // Status filter
      if (filters.status !== 'all' && employee.status !== filters.status) {
        return false;
      }

      // Search filter (name, email, role, employee ID)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          employee.name.toLowerCase().includes(searchLower) ||
          employee.email.toLowerCase().includes(searchLower) ||
          employee.role.toLowerCase().includes(searchLower) ||
          employee.employeeId.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) {
          return false;
        }
      }

      return true;
    });

    // Sort by Employee ID in descending order (EMP032, EMP031, EMP030, etc.)
    filtered.sort((a, b) => {
      // Extract numeric part from employee ID (e.g., "EMP032" -> 32)
      const getNumericPart = (empId: string) => {
        const match = empId.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      };

      const numA = getNumericPart(a.employeeId);
      const numB = getNumericPart(b.employeeId);

      // Sort in descending order (highest number first)
      return numB - numA;
    });

    return filtered;
  }, [employees, filters]);

  // Bulk selection state - Requirement 10.1
  const {
    selectedIds,
    selectedCount,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
  } = useBulkSelection(filteredEmployees);

  // Update hook filters when local filters change
  useEffect(() => {
    searchEmployees(filters.search);
    filterEmployees({
      status: filters.status === 'all' ? undefined : filters.status,
    });
  }, [filters, searchEmployees, filterEmployees]);

  const handleCreateEmployee = () => {
    setEditingEmployee(null);
    setIsModalOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const handleDeleteEmployee = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      try {
        await deleteEmployee(id);
      } catch (error) {
        console.error('Error deleting employee:', error);
        alert('Failed to delete employee. Please try again.');
      }
    }
  };

  const handleDeactivateEmployee = async (id: string) => {
    if (window.confirm('Are you sure you want to deactivate this employee?')) {
      try {
        await deactivateEmployee(id);
      } catch (error) {
        console.error('Error deactivating employee:', error);
        alert('Failed to deactivate employee. Please try again.');
      }
    }
  };

  const handleSubmitEmployee = async (data: EmployeeFormData) => {
    setIsSubmitting(true);
    try {
      // Build the name from firstName + lastName
      const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ');

      if (editingEmployee) {
        // Update existing employee
        const employeeData: any = {
          firstName: data.firstName,
          lastName: data.lastName || '',
          name: fullName,
          email: data.email,
          phone: data.phone,
          department: data.department || '',
          role: data.role,
          status: data.status,
          dateOfBirth: data.dateOfBirth || '',
          salary: data.salary || undefined,
          dateOfJoining: data.dateOfJoining || '',
          managerId: data.managerId || '',
          managerName: data.managerName || '',
          probationDuration: data.probationDuration || undefined,
          probationEndDate: data.probationEndDate || '',
          workAnniversary: data.workAnniversary || '',
          promotionDate: data.promotionDate || '',
          promotionDetails: data.promotionDetails || '',
          salaryChanges: (data as any).salaryChanges || undefined,
          documents: (data as any).documents || undefined,
        };
        await updateEmployee(
          editingEmployee.id!,
          employeeData,
          data.password || undefined,
          data.currentPassword || undefined
        );
        alert('Employee updated successfully!');
      } else {
        // Create new employee
        const employeeData: any = {
          employeeId: data.employeeId,
          firstName: data.firstName,
          lastName: data.lastName || '',
          name: fullName,
          email: data.email,
          phone: data.phone,
          department: data.department || '',
          role: data.role,
          status: data.status,
          dateOfBirth: data.dateOfBirth || '',
          salary: data.salary || undefined,
          dateOfJoining: data.dateOfJoining || '',
          managerId: data.managerId || '',
          managerName: data.managerName || '',
          probationDuration: data.probationDuration || undefined,
          probationEndDate: data.probationEndDate || '',
          workAnniversary: data.workAnniversary || '',
          promotionDate: data.promotionDate || '',
          promotionDetails: data.promotionDetails || '',
          salaryChanges: (data as any).salaryChanges || undefined,
          documents: (data as any).documents || undefined,
        };
        await createEmployee(employeeData, data.password || '');
        alert('Employee created successfully!');
      }

      setIsModalOpen(false);
      setEditingEmployee(null);
    } catch (error) {
      console.error('Error submitting employee:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save employee';
      alert(errorMessage);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFilterChange = (newFilters: EmployeeFilterState) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      status: 'all',
      search: '',
    });
  };

  /**
   * Handle bulk delete
   * Validates Requirements: 10.1, 10.2
   */
  const handleBulkDelete = () => {
    setIsBulkDeleteDialogOpen(true);
  };

  /**
   * Confirm bulk delete
   * Deletes all selected employees using bulk delete API
   */
  const handleConfirmBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      const employeeIds = Array.from(selectedIds);
      
      console.log('Bulk deleting employees:', employeeIds);
      
      // Call bulk delete API
      const response = await fetch('/api/employees/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employeeIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete employees');
      }

      const result = await response.json();
      console.log('Bulk delete result:', result);

      // Show results
      if (result.results.failed.length > 0) {
        alert(
          `Deleted ${result.results.success.length} employees.\n` +
          `Failed to delete ${result.results.failed.length} employees.\n\n` +
          `Failed IDs: ${result.results.failed.map((f: any) => f.id).join(', ')}`
        );
      } else {
        alert(`Successfully deleted ${result.results.success.length} employees.`);
      }

      // Refresh the employee list
      await refreshEmployees();
      clearSelection();
      setIsBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting employees:', error);
      alert('Failed to delete employees. Please try again.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  /**
   * Handle delete all employees
   */
  const handleDeleteAllEmployees = async () => {
    if (!window.confirm(
      `⚠️ WARNING: This will delete ALL ${employees.length} employees from the system!\n\n` +
      `This action CANNOT be undone.\n\n` +
      `Are you absolutely sure you want to continue?`
    )) {
      return;
    }

    // Second confirmation
    if (!window.confirm(
      `This is your FINAL warning!\n\n` +
      `Deleting ${employees.length} employees...\n\n` +
      `Click OK to proceed with deletion.`
    )) {
      return;
    }

    setIsBulkDeleting(true);
    try {
      const allEmployeeIds = employees.map(emp => emp.id!);
      
      console.log('Deleting all employees:', allEmployeeIds.length);
      
      // Call bulk delete API
      const response = await fetch('/api/employees/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employeeIds: allEmployeeIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete employees');
      }

      const result = await response.json();
      console.log('Bulk delete all result:', result);

      // Show results
      alert(
        `Deletion complete!\n\n` +
        `Successfully deleted: ${result.results.success.length}\n` +
        `Failed: ${result.results.failed.length}`
      );

      // Refresh the employee list
      await refreshEmployees();
    } catch (error) {
      console.error('Error deleting all employees:', error);
      alert('Failed to delete all employees. Please try again.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  /**
   * Handle bulk import
   * Imports employees from CSV file
   */
  const handleBulkImport = async (employees: any[]) => {
    for (const emp of employees) {
      const employeeData = {
        employeeId: emp.employeeId,
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        role: emp.role,
        status: emp.status,
      };
      await createEmployee(employeeData, emp.password);
    }
  };

  if (error) {
    return (
      <ErrorBoundary>
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error loading employees: {error.message}</p>
            <Button onClick={refreshEmployees} className="mt-2">
              Try Again
            </Button>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ManagerGuard
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-full">
            <ShieldExclamationIcon className="w-16 h-16 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Access Restricted</h2>
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
            You don't have permission to access this page. Only managers and administrators can view employee management.
          </p>
          <Button onClick={() => window.history.back()} variant="outline">
            Go Back
          </Button>
        </div>
      }
    >
      <ErrorBoundary>
        <div className="space-y-6">
        {/* Page Title and Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage employee records and information
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              onClick={handleDeleteAllEmployees}
              disabled={isBulkDeleting || employees.length === 0}
              variant="outline"
              className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
            >
              {isBulkDeleting ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete All
                </>
              )}
            </Button>
            <Button 
              onClick={() => setIsBulkImportModalOpen(true)} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowUpTrayIcon className="w-4 h-4" />
              Bulk Import
            </Button>
            <Button onClick={handleCreateEmployee} className="flex items-center gap-2 text-white">
              <PlusIcon className="w-4 h-4" />
              Add New Employee
            </Button>
          </div>
        </div>

        {/* Employee Statistics */}
        {loading ? (
          <StatsGridSkeleton count={3} />
        ) : (
          <EmployeeStatsCard employees={employees} />
        )}

        {/* Filters */}
        <EmployeeFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />

        {/* Results Summary and View Toggle */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredEmployees.length} of {employees.length} employees
          </p>
          
          {/* View Toggle Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
              aria-label="Grid view"
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
              aria-label="List view"
            >
              List
            </button>
          </div>
        </div>

        {/* Employee Grid/List View */}
        {loading ? (
          <CardGridSkeleton count={6} />
        ) : filteredEmployees.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEmployees.map((employee) => (
                <EmployeeCard
                  key={employee.id}
                  employee={employee}
                  onEdit={handleEditEmployee}
                  onDelete={handleDeleteEmployee}
                  onDeactivate={handleDeactivateEmployee}
                  selected={isSelected(employee.id!)}
                  onSelect={toggleSelection}
                />
              ))}
            </div>
          ) : (
            /* List View */
            <div className="bg-white dark:bg-gray-dark rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                <div className="col-span-1">Select</div>
                <div className="col-span-1">ID</div>
                <div className="col-span-3">Name</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-2">Role</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1">Actions</div>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEmployees.map((employee) => (
                  <div 
                    key={employee.id} 
                    className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 md:px-6 py-4 text-sm ${isSelected(employee.id!) ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-white dark:bg-gray-dark'}`}
                  >
                    {/* Mobile View */}
                    <div className="md:hidden space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected(employee.id!)}
                            onChange={(e) => toggleSelection(employee.id!, e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary mt-1"
                          />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{employee.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{employee.employeeId}</div>
                          </div>
                        </div>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${employee.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : employee.status === 'on-leave' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {employee.status.replace('-', ' ')}
                        </span>
                      </div>
                      <div className="pl-7 space-y-1">
                        <div className="text-gray-700 dark:text-gray-300 truncate">{employee.email}</div>
                        <div className="text-gray-600 dark:text-gray-400 text-xs">{employee.role}</div>
                      </div>
                      <div className="pl-7 flex gap-3">
                        <button 
                          onClick={() => handleEditEmployee(employee)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                          aria-label="Edit employee"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteEmployee(employee.id!)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                          aria-label="Delete employee"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Desktop View */}
                    <div className="hidden md:contents">
                      <div className="col-span-1 flex items-center">
                        <input
                          type="checkbox"
                          checked={isSelected(employee.id!)}
                          onChange={(e) => toggleSelection(employee.id!, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
                        />
                      </div>
                      <div className="col-span-1 font-medium text-gray-900 dark:text-white flex items-center">{employee.employeeId}</div>
                      <div className="col-span-3 flex items-center">
                        <div className="font-medium text-gray-900 dark:text-white truncate">{employee.name}</div>
                      </div>
                      <div className="col-span-3 text-gray-700 dark:text-gray-300 truncate flex items-center">{employee.email}</div>
                      <div className="col-span-2 text-gray-700 dark:text-gray-300 flex items-center">{employee.role}</div>
                      <div className="col-span-1 flex items-center">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${employee.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : employee.status === 'on-leave' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {employee.status.replace('-', ' ')}
                        </span>
                      </div>
                      <div className="col-span-1 flex items-center gap-2">
                        <button 
                          onClick={() => handleEditEmployee(employee)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 whitespace-nowrap"
                          aria-label="Edit employee"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteEmployee(employee.id!)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 whitespace-nowrap"
                          aria-label="Delete employee"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          filters.search || filters.status !== 'all' ? (
            <NoResultsEmptyState 
              onClearFilters={() => setFilters({ search: '', status: 'all' })}
            />
          ) : (
            <NoDataEmptyState 
              entityName="Employees" 
              onAdd={handleCreateEmployee}
            />
          )
        )}

        {/* Bulk Action Toolbar - Requirements 10.1, 10.4 */}
        {selectedCount > 0 && (
          <BulkActionToolbar
            selectedCount={selectedCount}
            totalCount={filteredEmployees.length}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onBulkDelete={handleBulkDelete}
          />
        )}

        {/* Bulk Delete Confirmation Dialog - Requirement 10.2 */}
        <BulkDeleteDialog
          open={isBulkDeleteDialogOpen}
          onOpenChange={setIsBulkDeleteDialogOpen}
          itemCount={selectedCount}
          itemType="employee"
          onConfirm={handleConfirmBulkDelete}
          loading={isBulkDeleting}
        />

        {/* Employee Modal */}
        <EmployeeModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingEmployee(null);
          }}
          onSubmit={handleSubmitEmployee}
          employee={editingEmployee}
          isLoading={isSubmitting}
        />

        {/* Bulk Import Modal */}
        <EmployeeBulkImportModal
          isOpen={isBulkImportModalOpen}
          onClose={() => setIsBulkImportModalOpen(false)}
          onImport={handleBulkImport}
        />
      </div>
    </ErrorBoundary>
  </ManagerGuard>
  );
}
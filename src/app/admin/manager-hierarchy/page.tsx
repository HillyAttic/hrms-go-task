'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ManagerHierarchy, EmployeeInfo } from '@/types/manager-hierarchy.types';
import { toast } from 'react-toastify';
import { useModal } from '@/contexts/modal-context';

export default function ManagerHierarchyPage() {
  const [hierarchies, setHierarchies] = useState<ManagerHierarchy[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedManager, setSelectedManager] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const { openModal, closeModal } = useModal();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Import authenticated fetch helper
      const { authenticatedFetch } = await import('@/lib/api-client');
      
      // Fetch hierarchies
      const hierarchiesRes = await authenticatedFetch('/api/manager-hierarchy');
      if (hierarchiesRes.ok) {
        const data = await hierarchiesRes.json();
        setHierarchies(data);
      }

      // Fetch all users
      const usersRes = await authenticatedFetch('/api/admin/users');
      if (usersRes.ok) {
        const users = await usersRes.json();
        setManagers(users.filter((u: any) => u.role === 'manager'));
        setEmployees(users.filter((u: any) => u.role === 'employee'));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedManager || selectedEmployees.length === 0) {
      toast.error('Please select a manager and at least one employee');
      return;
    }

    try {
      const manager = managers.find(m => m.uid === selectedManager);
      if (!manager) return;

      // Import authenticated fetch helper
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch('/api/manager-hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          managerId: manager.uid,
          managerName: manager.displayName,
          managerEmail: manager.email,
          employeeIds: selectedEmployees,
        }),
      });

      if (response.ok) {
        toast.success('Manager hierarchy saved successfully');
        setShowModal(false);
        closeModal();
        setSelectedManager('');
        setSelectedEmployees([]);
        fetchData();
      } else {
        toast.error('Failed to save manager hierarchy');
      }
    } catch (error) {
      console.error('Error saving hierarchy:', error);
      toast.error('Failed to save manager hierarchy');
    }
  };

  const handleEdit = (hierarchy: ManagerHierarchy) => {
    setSelectedManager(hierarchy.managerId);
    setSelectedEmployees(hierarchy.employeeIds);
    setShowModal(true);
    openModal();
  };

  const handleDelete = async (managerId: string) => {
    if (!confirm('Are you sure you want to delete this manager hierarchy?')) return;

    try {
      const hierarchy = hierarchies.find(h => h.managerId === managerId);
      if (!hierarchy?.id) return;

      // Import authenticated fetch helper
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch(`/api/manager-hierarchy/${managerId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Manager hierarchy deleted');
        fetchData();
      } else {
        toast.error('Failed to delete manager hierarchy');
      }
    } catch (error) {
      console.error('Error deleting hierarchy:', error);
      toast.error('Failed to delete manager hierarchy');
    }
  };

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manager Hierarchy</h1>
          <p className="text-muted-foreground">Assign employees to managers for task management</p>
        </div>
        <button
          onClick={() => {
            setSelectedManager('');
            setSelectedEmployees([]);
            setShowModal(true);
            openModal();
          }}
          className="px-4 py-2 bg-foreground text-background rounded-lg hover:bg-foreground/90"
        >
          Add Manager Hierarchy
        </button>
      </div>

      {/* Hierarchies List */}
      <div className="bg-card rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto"></div>
          </div>
        ) : hierarchies.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No manager hierarchies found. Click "Add Manager Hierarchy" to create one.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {hierarchies.map((hierarchy) => (
              <div key={hierarchy.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{hierarchy.managerName}</h3>
                    <p className="text-sm text-muted-foreground">{hierarchy.managerEmail}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(hierarchy)}
                      className="px-3 py-1 bg-foreground text-background text-sm rounded hover:bg-foreground/90"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(hierarchy.managerId)}
                      className="px-3 py-1 bg-destructive text-white text-sm rounded hover:bg-destructive/90"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Assigned Employees ({hierarchy.employees.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {hierarchy.employees.map((emp) => (
                      <div
                        key={emp.id}
                        className="px-3 py-2 bg-muted rounded text-sm"
                      >
                        <div className="font-medium text-foreground">{emp.name}</div>
                        <div className="text-xs text-muted-foreground">{emp.email}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <h3 className="text-xl font-bold mb-4 text-foreground">
              {selectedManager ? 'Edit' : 'Add'} Manager Hierarchy
            </h3>

            {/* Manager Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Select Manager
              </label>
              <select
                value={selectedManager}
                onChange={(e) => setSelectedManager(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg"
              >
                <option value="">-- Select Manager --</option>
                {managers.map((manager) => (
                  <option key={manager.uid} value={manager.uid}>
                    {manager.displayName} ({manager.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Employee Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Select Employees ({selectedEmployees.length} selected)
              </label>
              <div className="border border-border rounded-lg max-h-64 overflow-y-auto">
                {employees.map((employee) => (
                  <label
                    key={employee.uid}
                    className="flex items-center px-4 py-2 hover:bg-muted/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmployees.includes(employee.uid)}
                      onChange={() => toggleEmployee(employee.uid)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-foreground">{employee.displayName}</div>
                      <div className="text-sm text-muted-foreground">{employee.email}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-foreground text-background rounded-lg hover:bg-foreground/90"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  closeModal();
                  setSelectedManager('');
                  setSelectedEmployees([]);
                }}
                className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useAuthEnhanced } from '@/hooks/use-auth-enhanced';
import { UserManagementService } from '@/services/user-management.service';
import { UserRole } from '@/types/auth.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FormData {
  email: string;
  displayName: string;
  role: UserRole;
  department?: string;
  password: string;
  confirmPassword: string;
}

export function UserManagementForm() {
  const { user, canManageUsers, loading: authLoading } = useAuthEnhanced();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    displayName: '',
    role: 'employee',
    department: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!canManageUsers()) {
    return (
      <div className="rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-border dark:bg-card">
        <h2 className="mb-4 text-title-md2 font-semibold text-black dark:text-white">
          User Management
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          You don't have permission to manage users. Only administrators can create new users.
        </p>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNativeSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (formData.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setLoading(true);

    try {
      const userManagementService = UserManagementService.getInstance();
      
      await userManagementService.createUser(
        {
          email: formData.email,
          displayName: formData.displayName,
          role: formData.role as UserRole,
          department: formData.department,
          password: formData.password,
        },
        // Use current user's UID as the creator
        user?.uid || 'unknown'
      );

      setMessage({ type: 'success', text: 'User created successfully!' });
      
      // Reset form
      setFormData({
        email: '',
        displayName: '',
        role: 'employee',
        department: '',
        password: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to create user' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-border dark:bg-card">
      <h2 className="mb-4 text-title-md2 font-semibold text-black dark:text-white">
        User Management
      </h2>
      
      {message && (
        <div className={`mb-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <Label htmlFor="email">Email *</Label>
          <Input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="user@example.com"
          />
        </div>

        <div className="mb-4">
          <Label htmlFor="displayName">Display Name *</Label>
          <Input
            type="text"
            id="displayName"
            name="displayName"
            value={formData.displayName}
            onChange={handleChange}
            required
            placeholder="John Doe"
          />
        </div>

        <div className="mb-4">
          <Label htmlFor="role">Role *</Label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleNativeSelectChange}
            className="w-full rounded-lg border border-stroke bg-transparent px-5.5 py-3 outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary"
          >
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="employee">Employee</option>
          </select>
        </div>

        <div className="mb-4">
          <Label htmlFor="department">Department</Label>
          <Input
            type="text"
            id="department"
            name="department"
            value={formData.department || ''}
            onChange={handleChange}
            placeholder="IT, Sales, etc."
          />
        </div>

        <div className="mb-4">
          <Label htmlFor="password">Password *</Label>
          <Input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="Enter password"
          />
        </div>

        <div className="mb-6">
          <Label htmlFor="confirmPassword">Confirm Password *</Label>
          <Input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            placeholder="Confirm password"
          />
        </div>

        <Button 
          type="submit" 
          className="w-full"
          disabled={loading}
        >
          {loading ? 'Creating User...' : 'Create User'}
        </Button>
      </form>
    </div>
  );
}
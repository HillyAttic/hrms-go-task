import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { teamSchema, TeamFormData } from '@/lib/validation';
import { z } from 'zod';
import { Team } from '@/services/team.service';
import { Employee, employeeService } from '@/services/employee.service';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Select from '@/components/ui/select';
import { Avatar } from '@/components/ui/avatar';
import { XMarkIcon } from '@heroicons/react/24/outline';

// Form-specific type that ensures memberIds is always an array
type TeamFormFields = {
  name: string;
  description?: string;
  leaderId?: string;
  memberIds: string[];
  status: 'active' | 'inactive' | 'archived';
};

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TeamFormData) => Promise<void>;
  team?: Team | null;
  isLoading?: boolean;
}

/**
 * TeamModal Component
 * Form modal for creating and editing teams with validation
 * Validates Requirements: 4.2
 */
export function TeamModal({
  isOpen,
  onClose,
  onSubmit,
  team,
  isLoading = false,
}: TeamModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: '',
      description: '',
      leaderId: '',
      memberIds: [],
      status: 'active' as const,
    },
  });

  const leaderId = watch('leaderId');

  // Generate initials for avatar fallback
  const getInitials = (name: string): string => {
    if (!name) return '';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Load employees for leader and member selection
  useEffect(() => {
    const loadEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const activeEmployees = await employeeService.getAll({ status: 'active' });
        setEmployees(activeEmployees);
      } catch (error: any) {
        console.error('Error loading employees:', error);
        console.error('Error details:', {
          message: error?.message,
          code: error?.code,
          name: error?.name,
          stack: error?.stack,
          rawError: error
        });
        
        // Set empty array to prevent further errors
        setEmployees([]);
      } finally {
        setLoadingEmployees(false);
      }
    };

    if (isOpen) {
      loadEmployees();
    }
  }, [isOpen]);

  // Update form when team prop changes (edit mode)
  useEffect(() => {
    if (team) {
      reset({
        name: team.name,
        description: team.description,
        leaderId: team.leaderId || '',
        memberIds: team.members.map(m => m.id),
        status: team.status,
      });

      // Set selected members for display
      const teamMembers = employees.filter(emp => 
        team.members.some(member => member.id === emp.id)
      );
      setSelectedMembers(teamMembers);
    } else {
      reset({
        name: '',
        description: '',
        leaderId: '',
        memberIds: [],
        status: 'active',
      });
      setSelectedMembers([]);
    }
  }, [team, reset, employees]);

  // Handle member selection
  const handleMemberSelect = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;

    const isAlreadySelected = selectedMembers.some(member => member.id === employeeId);
    
    if (!isAlreadySelected) {
      const newSelectedMembers = [...selectedMembers, employee];
      setSelectedMembers(newSelectedMembers);
      setValue('memberIds', newSelectedMembers.map(m => m.id!));
    }
  };

  // Handle member removal
  const handleMemberRemove = (employeeId: string) => {
    const newSelectedMembers = selectedMembers.filter(member => member.id !== employeeId);
    setSelectedMembers(newSelectedMembers);
    setValue('memberIds', newSelectedMembers.map(m => m.id!));
  };

  // Get available employees for member selection (excluding already selected and leader)
  const getAvailableEmployees = () => {
    return employees.filter(emp => 
      !selectedMembers.some(member => member.id === emp.id) &&
      emp.id !== leaderId
    );
  };

  // Get leader name for display
  const getLeaderName = () => {
    const leader = employees.find(emp => emp.id === leaderId);
    return leader ? leader.name : '';
  };

  const handleFormSubmit = async (data: any) => {
    try {
      await onSubmit(data as TeamFormData);
      reset();
      setSelectedMembers([]);
      onClose();
    } catch (error: any) {
      console.error('Error submitting team:', error);
      console.error('Submission error details:', {
        message: error?.message,
        code: error?.code,
        name: error?.name,
        stack: error?.stack,
        rawError: error
      });
    }
  };

  const handleClose = () => {
    reset();
    setSelectedMembers([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent size="md" className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {team ? 'Edit Team' : 'Create New Team'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Team Name */}
          <div>
            <Input
              id="name"
              label="Team Name"
              {...register('name')}
              placeholder="Enter team name"
              error={errors.name?.message}
              required
              disabled={isLoading}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Enter team description"
              rows={3}
              disabled={isLoading}
              className="mt-1"
            />
            {errors.description && (
              <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Team Leader Selection */}
          <div>
            <Label htmlFor="leaderId">Team Leader</Label>
            <Select
              id="leaderId"
              {...register('leaderId')}
              disabled={isLoading || loadingEmployees}
              className="mt-1"
            >
              <option value="">Select a team leader</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} - {employee.role}
                </option>
              ))}
            </Select>
            {errors.leaderId && (
              <p className="text-sm text-destructive mt-1">{errors.leaderId.message}</p>
            )}
            {loadingEmployees && (
              <p className="text-sm text-muted-foreground mt-1">Loading employees...</p>
            )}
            {!loadingEmployees && employees.length === 0 && (
              <div className="mt-2 p-3 rounded-md border-2 border-border bg-warning/10">
                <p className="text-sm text-foreground mb-2">
                  No employees found. You need to create employees first before assigning team leaders.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      setLoadingEmployees(true);
                      const response = await fetch('/api/employees/seed', { method: 'POST' });
                      if (response.ok) {
                        // Reload employees after seeding
                        const activeEmployees = await employeeService.getAll({ status: 'active' });
                        setEmployees(activeEmployees);
                      }
                    } catch (error: any) {
                      console.error('Error seeding employees:', error);
                      console.error('Seeding error details:', {
                        message: error?.message,
                        code: error?.code,
                        name: error?.name,
                        stack: error?.stack,
                        rawError: error
                      });
                    } finally {
                      setLoadingEmployees(false);
                    }
                  }}
                  disabled={loadingEmployees}
                >
                  🌱 Seed Sample Employees
                </Button>
              </div>
            )}
          </div>

          {/* Team Members Multi-Select */}
          <div>
            <Label htmlFor="members">Team Members</Label>

            {/* Selected Members Display */}
            {selectedMembers.length > 0 && (
              <div className="mt-2 mb-3 p-3 bg-muted rounded-md border-2 border-border">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Selected Members ({selectedMembers.length})</p>
                <div className="flex flex-wrap gap-2">
                  {selectedMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 bg-card border-2 border-border rounded-md px-2.5 py-1.5"
                    >
                      <Avatar
                        alt={member.name}
                        fallback={getInitials(member.name)}
                        size="sm"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{member.name}</span>
                        <span className="text-xs text-muted-foreground">{member.role}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleMemberRemove(member.id!)}
                        className="text-destructive hover:bg-destructive/10 rounded p-1 ml-1 transition-colors"
                        disabled={isLoading}
                        aria-label={`Remove ${member.name}`}
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Member Selection Dropdown */}
            <Select
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                if (e.target.value) {
                  handleMemberSelect(e.target.value);
                  e.target.value = ''; // Reset selection
                }
              }}
              disabled={isLoading || loadingEmployees}
              className="mt-1"
            >
              <option value="">Add team member...</option>
              {getAvailableEmployees().map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} - {employee.role}
                </option>
              ))}
            </Select>

            <p className="text-xs text-muted-foreground mt-1">
              Select employees to add to the team. The team leader will be automatically included.
            </p>

            {errors.memberIds && (
              <p className="text-sm text-destructive mt-1">{errors.memberIds.message}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              {...register('status')}
              disabled={isLoading}
              className="mt-1"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </Select>
            {errors.status && (
              <p className="text-sm text-destructive mt-1">{errors.status.message}</p>
            )}
          </div>

          {/* Team Summary */}
          {(leaderId || selectedMembers.length > 0) && (
            <div className="bg-muted rounded-md p-4 border-2 border-border">
              <h4 className="font-display text-sm font-semibold text-foreground mb-2">Team Summary</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                {leaderId && (
                  <div>
                    <span className="font-medium text-foreground">Leader:</span> {getLeaderName()}
                  </div>
                )}
                <div>
                  <span className="font-medium text-foreground">Members:</span> {selectedMembers.length} selected
                  {leaderId && ' (+ 1 leader)'}
                </div>
                <div>
                  <span className="font-medium text-foreground">Total Team Size:</span> {selectedMembers.length + (leaderId ? 1 : 0)}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isLoading} disabled={isLoading}>
              {team ? 'Update Team' : 'Create Team'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import React, { useEffect, useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Project } from '@/services/project.service';
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
import { authenticatedFetch } from '@/lib/api-client';
import {
  PlusIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

// ── Zod Schema ─────────────────────────────────────────────────────────────

const projectFormSchema = z.object({
  projectName: z.string().min(1, 'Project name is required').max(200),
  clientId: z.string().min(1, 'Client is required'),
  teamMembers: z.array(z.object({
    uid: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email().optional(),
    role: z.string().optional(),
  })).min(1, 'At least one team member is required'),
  clientSpocName: z.string().min(1, 'Client SPOC name is required'),
  clientSpocEmail: z.string().email().optional().or(z.literal('')),
  clientSpocPhone: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  status: z.enum(['wip', 'completed', 'pending_approval']),
  projectValue: z.number().min(0, 'Value cannot be negative'),
  invoiceRaised: z.boolean(),
  invoiceAmount: z.number().min(0).optional(),
  invoiceNumber: z.string().optional(),
  invoiceRaisedAt: z.string().optional(),
  progressPercentage: z.number().min(0).max(100),
  milestones: z.array(z.object({
    id: z.string(),
    title: z.string().min(1, 'Milestone title is required'),
    completed: z.boolean(),
  })),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

// ── Types for external data ────────────────────────────────────────────────

interface ClientOption {
  id: string;
  clientName: string;
}

interface UserOption {
  uid: string;
  displayName: string;
  email?: string;
}

// ── Component ──────────────────────────────────────────────────────────────

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  project?: Project | null;
  isLoading?: boolean;
}

export function ProjectModal({
  isOpen,
  onClose,
  onSubmit,
  project,
  isLoading = false,
}: ProjectModalProps) {
  // ── External data ──────────────────────────────────────────────────────
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [loadingExternal, setLoadingExternal] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    control,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      projectName: '',
      clientId: '',
      teamMembers: [],
      clientSpocName: '',
      clientSpocEmail: '',
      clientSpocPhone: '',
      startDate: '',
      endDate: '',
      status: 'wip',
      projectValue: 0,
      invoiceRaised: false,
      invoiceAmount: undefined,
      invoiceNumber: '',
      invoiceRaisedAt: '',
      progressPercentage: 0,
      milestones: [],
    },
  });

  const { fields: teamMembers, append: appendMember, remove: removeMember } = useFieldArray({
    control,
    name: 'teamMembers',
  });

  const { fields: milestones, append: appendMilestone, remove: removeMilestone } = useFieldArray({
    control,
    name: 'milestones',
  });

  const watchedTeamMembers = watch('teamMembers');
  const watchedInvoiceRaised = watch('invoiceRaised');
  const watchedMilestones = watch('milestones');
  const watchedProgress = watch('progressPercentage');

  // ── Load clients and users on modal open ───────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoadingExternal(true);
      try {
        const [clientsRes, usersRes] = await Promise.all([
          authenticatedFetch('/api/clients?limit=1000'),
          authenticatedFetch('/api/users/names'),
        ]);

        if (clientsRes.ok) {
          const clientsData = await clientsRes.json();
          setClients(
            (clientsData.data || []).map((c: any) => ({
              id: c.id,
              clientName: c.clientName,
            }))
          );
        }

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          // Determine response shape and normalise to array
          let normalised: UserOption[] = [];

          if (Array.isArray(usersData)) {
            // Bare array — [{ uid, displayName, email }]
            normalised = usersData;
          } else if (usersData && typeof usersData === 'object') {
            if (Array.isArray(usersData.data)) {
              // Wrapped { data: [{ uid, displayName, email }] }
              normalised = usersData.data;
            } else {
              // Plain object map { uid: displayName, ... }
              normalised = Object.entries(usersData).map(([uid, name]) => ({
                uid,
                displayName: String(name),
              }));
            }
          }

          setUsers(normalised);
        }
      } catch (err) {
        console.error('Error loading modal data:', err);
      } finally {
        setLoadingExternal(false);
      }
    };

    loadData();
  }, [isOpen]);

  // ── Populate form when editing ─────────────────────────────────────────
  useEffect(() => {
    if (project) {
      const toDate = (val: any): Date =>
        val?.toDate ? val.toDate() : val instanceof Date ? val : new Date(val);

      const startDate = project.startDate
        ? toDate(project.startDate).toISOString().split('T')[0]
        : '';
      const endDate = project.endDate
        ? toDate(project.endDate).toISOString().split('T')[0]
        : '';
      const invoiceRaisedAt = project.invoice?.raisedAt
        ? toDate(project.invoice.raisedAt).toISOString().split('T')[0]
        : '';

      reset({
        projectName: project.projectName || '',
        clientId: project.client?.id || '',
        teamMembers: project.teamMembers || [],
        clientSpocName: project.clientSpoc?.name || '',
        clientSpocEmail: project.clientSpoc?.email || '',
        clientSpocPhone: project.clientSpoc?.phone || '',
        startDate,
        endDate,
        status: project.status || 'wip',
        projectValue: project.projectValue || 0,
        invoiceRaised: project.invoice?.raised || false,
        invoiceAmount: project.invoice?.amount,
        invoiceNumber: project.invoice?.invoiceNumber || '',
        invoiceRaisedAt,
        progressPercentage: project.progress?.percentage || 0,
        milestones: project.progress?.milestones || [],
      });
    } else {
      reset({
        projectName: '',
        clientId: '',
        teamMembers: [],
        clientSpocName: '',
        clientSpocEmail: '',
        clientSpocPhone: '',
        startDate: '',
        endDate: '',
        status: 'wip',
        projectValue: 0,
        invoiceRaised: false,
        invoiceAmount: undefined,
        invoiceNumber: '',
        invoiceRaisedAt: '',
        progressPercentage: 0,
        milestones: [],
      });
    }
  }, [project, reset]);

  // ── Filtered users for multi-select ────────────────────────────────────
  const filteredUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];
    if (!memberSearch.trim()) return users;
    const q = memberSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
    );
  }, [users, memberSearch]);

  const selectedUids = useMemo(
    () => new Set(watchedTeamMembers?.map((m) => m.uid) || []),
    [watchedTeamMembers]
  );

  // ── Milestone helpers ──────────────────────────────────────────────────
  const addMilestone = () => {
    appendMilestone({
      id: `ms-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: '',
      completed: false,
    });
  };

  const toggleMilestoneComplete = (index: number) => {
    const current = watchedMilestones[index];
    if (current) {
      setValue(`milestones.${index}.completed`, !current.completed);
    }
  };

  // ── Auto-calculate progress from milestones ───────────────────────────
  useEffect(() => {
    if (!watchedMilestones || watchedMilestones.length === 0) return;
    const completed = watchedMilestones.filter((m) => m.completed).length;
    const autoProgress = Math.round((completed / watchedMilestones.length) * 100);
    setValue('progressPercentage', autoProgress);
  }, [watchedMilestones, setValue]);

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleFormSubmit = async (data: ProjectFormData) => {
    try {
      await onSubmit(data);
      reset();
      onClose();
    } catch (error) {
      console.error('Error submitting project:', error);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Get selected client name for display
  const selectedClientName =
    clients.find((c) => c.id === watch('clientId'))?.clientName || '';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {project ? 'Edit Project' : 'Create New Project'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* ── Basic Info ───────────────────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b pb-2">
              Basic Information
            </h3>
            <div className="space-y-4">
              <Input
                id="projectName"
                label="Project Name"
                {...register('projectName')}
                placeholder="Enter project name"
                error={errors.projectName?.message}
                required
                disabled={isLoading}
              />

              <div>
                <Label htmlFor="clientId">Client</Label>
                <select
                  id="clientId"
                  {...register('clientId')}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-dark disabled:opacity-50"
                  disabled={isLoading || loadingExternal}
                >
                  <option value="">Select a client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.clientName}
                    </option>
                  ))}
                </select>
                {errors.clientId && (
                  <p className="text-sm text-red-600 mt-1">{errors.clientId.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...register('startDate')}
                    error={errors.startDate?.message}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date (optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    {...register('endDate')}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    {...register('status')}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-dark disabled:opacity-50"
                    disabled={isLoading}
                  >
                    <option value="wip">WIP</option>
                    <option value="completed">Completed</option>
                    <option value="pending_approval">Pending Approval</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="projectValue">Project Value (₹)</Label>
                  <Input
                    id="projectValue"
                    type="number"
                    {...register('projectValue', { valueAsNumber: true })}
                    placeholder="0"
                    error={errors.projectValue?.message}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ── Team Members ─────────────────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b pb-2">
              Team Members
            </h3>

            {/* Selected chips */}
            {watchedTeamMembers && watchedTeamMembers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {watchedTeamMembers.map((member, idx) => (
                  <span
                    key={member.uid}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-medium"
                  >
                    {member.name}
                    <button
                      type="button"
                      onClick={() => removeMember(idx)}
                      className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {errors.teamMembers && (
              <p className="text-sm text-red-600 mb-2">{errors.teamMembers.message}</p>
            )}

            {/* Search + list */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-md">
              <div className="relative p-2 border-b border-gray-200 dark:border-gray-700">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search team members..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-dark focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="max-h-40 overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <p className="p-3 text-sm text-gray-500 text-center">
                    {loadingExternal ? 'Loading...' : 'No users found'}
                  </p>
                ) : (
                  (Array.isArray(filteredUsers) ? filteredUsers : []).map((user) => {
                    const isSelected = selectedUids.has(user.uid);
                    return (
                      <label
                        key={user.uid}
                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                          isSelected ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              const idx = watchedTeamMembers?.findIndex(
                                (m) => m.uid === user.uid
                              );
                              if (idx !== undefined && idx >= 0) removeMember(idx);
                            } else {
                              appendMember({
                                uid: user.uid,
                                name: user.displayName,
                                email: user.email,
                                role: '',
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="text-sm">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {user.displayName}
                          </span>
                          {user.email && (
                            <span className="text-gray-500 ml-2">{user.email}</span>
                          )}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          {/* ── Client SPOC ──────────────────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b pb-2">
              Client SPOC (Single Point of Contact)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                id="clientSpocName"
                label="Name"
                {...register('clientSpocName')}
                placeholder="SPOC name"
                error={errors.clientSpocName?.message}
                required
                disabled={isLoading}
              />
              <Input
                id="clientSpocEmail"
                type="email"
                label="Email"
                {...register('clientSpocEmail')}
                placeholder="spoc@example.com"
                error={errors.clientSpocEmail?.message}
                disabled={isLoading}
              />
              <Input
                id="clientSpocPhone"
                label="Phone"
                {...register('clientSpocPhone')}
                placeholder="+91 98765 43210"
                error={errors.clientSpocPhone?.message}
                disabled={isLoading}
              />
            </div>
          </section>

          {/* ── Invoice ─────────────────────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b pb-2">
              Invoice
            </h3>

            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                {...register('invoiceRaised')}
                disabled={isLoading}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Invoice Raised
              </span>
            </label>

            {watchedInvoiceRaised && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-6 border-l-2 border-blue-200 dark:border-blue-800">
                <Input
                  id="invoiceAmount"
                  type="number"
                  label="Invoice Amount (₹)"
                  {...register('invoiceAmount', { valueAsNumber: true })}
                  placeholder="0"
                  disabled={isLoading}
                />
                <Input
                  id="invoiceNumber"
                  label="Invoice Number"
                  {...register('invoiceNumber')}
                  placeholder="INV-001"
                  disabled={isLoading}
                />
                <Input
                  id="invoiceRaisedAt"
                  type="date"
                  label="Date Raised"
                  {...register('invoiceRaisedAt')}
                  disabled={isLoading}
                />
              </div>
            )}
          </section>

          {/* ── Progress ────────────────────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b pb-2">
              Progress
            </h3>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="progressPercentage">
                  Progress ({watchedProgress}%)
                </Label>
              </div>
              <input
                id="progressPercentage"
                type="range"
                min={0}
                max={100}
                step={5}
                {...register('progressPercentage', { valueAsNumber: true })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                disabled={isLoading}
              />
              {watchedMilestones && watchedMilestones.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Auto-calculated from milestones ({watchedMilestones.filter((m) => m.completed).length}/{watchedMilestones.length} completed)
                </p>
              )}
            </div>

            {/* Milestones */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Milestones</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMilestone}
                  disabled={isLoading}
                >
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>

              {milestones.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No milestones added yet.</p>
              ) : (
                <div className="space-y-2">
                  {milestones.map((milestone, index) => (
                    <div
                      key={milestone.id}
                      className="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-md"
                    >
                      <button
                        type="button"
                        onClick={() => toggleMilestoneComplete(index)}
                        className="flex-shrink-0"
                      >
                        {watchedMilestones?.[index]?.completed ? (
                          <CheckCircleSolid className="w-5 h-5 text-green-500" />
                        ) : (
                          <span className="w-5 h-5 rounded-full border-2 border-gray-400 inline-block" />
                        )}
                      </button>
                      <input
                        type="text"
                        {...register(`milestones.${index}.title` as const)}
                        placeholder="Milestone title"
                        className={`flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-dark focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          watchedMilestones?.[index]?.completed ? 'line-through text-gray-400' : ''
                        }`}
                        disabled={isLoading}
                      />
                      <input
                        type="hidden"
                        {...register(`milestones.${index}.id` as const)}
                      />
                      <input
                        type="hidden"
                        {...register(`milestones.${index}.completed` as const)}
                      />
                      <button
                        type="button"
                        onClick={() => removeMilestone(index)}
                        className="flex-shrink-0 text-red-500 hover:text-red-700 p-1"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ── Footer ──────────────────────────────────────────────── */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" loading={isLoading} disabled={isLoading} className="text-white">
              {project ? 'Update Project' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

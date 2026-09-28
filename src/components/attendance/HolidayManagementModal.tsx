'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar, Plus, Trash2, Loader2 } from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Holiday {
  id: string;
  date: string;
  name: string;
  description?: string;
  createdAt: Date;
  scope?: 'global' | 'manager';
  createdBy?: string;
}

interface HolidayManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  managerId?: string;
  isManager?: boolean;
  isAdmin?: boolean;
  assignedEmployeeIds?: string[];
}

export function HolidayManagementModal({ isOpen, onClose, managerId, isManager, isAdmin, assignedEmployeeIds }: HolidayManagementModalProps) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [holidayDescription, setHolidayDescription] = useState('');

  const parseHolidayDate = (data: any): string => {
    if (data.date && typeof data.date.toDate === 'function') {
      const dateObj = data.date.toDate();
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } else if (typeof data.date === 'string') {
      return data.date;
    } else if (data.date && typeof data.date.seconds !== 'undefined') {
      const dateObj = new Date(data.date.seconds * 1000);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return '';
  };

  // Fetch holidays
  const fetchHolidays = async () => {
    setLoading(true);
    try {
      // Fetch global holidays (no scope field or scope === 'global')
      const globalQuery = query(collection(db, 'holidays'), orderBy('date', 'asc'));
      const globalSnapshot = await getDocs(globalQuery);

      const allDocs = globalSnapshot.docs;

      const holidayList: Holiday[] = allDocs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            date: parseHolidayDate(data),
            name: data.name,
            description: data.description,
            createdAt: data.createdAt?.toDate() || new Date(),
            scope: data.scope || 'global',
            createdBy: data.createdBy || undefined,
          };
        })
        .filter(holiday => {
          // Admins see all holidays
          if (isAdmin) return true;
          // Managers see global holidays + their own manager-scoped holidays
          if (isManager && !isAdmin) {
            if (!holiday.scope || holiday.scope === 'global') return true;
            if (holiday.scope === 'manager' && holiday.createdBy === managerId) return true;
            return false;
          }
          return true;
        });

      setHolidays(holidayList);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      alert('Failed to load holidays');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHolidays();
      // Reset form
      setHolidayDate('');
      setHolidayName('');
      setHolidayDescription('');
    }
  }, [isOpen]);

  // Add holiday
  const handleAddHoliday = async () => {
    if (!holidayDate || !holidayName.trim()) {
      alert('Please enter both date and holiday name');
      return;
    }

    setSaving(true);
    try {
      // Convert string date to Timestamp for proper Firestore querying
      const dateObj = new Date(holidayDate + 'T00:00:00');

      const holidayData: any = {
        date: Timestamp.fromDate(dateObj),
        name: holidayName.trim(),
        description: holidayDescription.trim() || '',
        createdAt: Timestamp.now(),
      };

      // Manager-scoped holidays apply only to their assigned employees
      if (isManager && !isAdmin && managerId) {
        holidayData.scope = 'manager';
        holidayData.createdBy = managerId;
        holidayData.employeeIds = assignedEmployeeIds || [];
      }

      await addDoc(collection(db, 'holidays'), holidayData);

      // Reset form
      setHolidayDate('');
      setHolidayName('');
      setHolidayDescription('');
      
      // Refresh list
      await fetchHolidays();
      
      alert('Holiday added successfully!');
    } catch (error) {
      console.error('Error adding holiday:', error);
      alert('Failed to add holiday');
    } finally {
      setSaving(false);
    }
  };

  // Delete holiday
  const handleDeleteHoliday = async (holidayId: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'holidays', holidayId));
      await fetchHolidays();
      alert('Holiday deleted successfully!');
    } catch (error) {
      console.error('Error deleting holiday:', error);
      alert('Failed to delete holiday');
    }
  };

  // Format date for display (dateValue is now always a YYYY-MM-DD string)
  const formatDate = (dateValue: string) => {
    const date = new Date(dateValue + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Manage Holidays
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Add Holiday Form */}
          <div className="rounded-lg border-2 border-border bg-muted/40 p-4">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Add New Holiday</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="holidayDate">Date *</Label>
                <input
                  id="holidayDate"
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="mt-1 w-full rounded-md border-2 border-border bg-card px-3 py-2 text-foreground focus:outline-none"
                />
              </div>

              <div>
                <Label htmlFor="holidayName">Holiday Name *</Label>
                <input
                  id="holidayName"
                  type="text"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  placeholder="e.g., Independence Day"
                  className="mt-1 w-full rounded-md border-2 border-border bg-card px-3 py-2 text-foreground focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="holidayDescription">Description (Optional)</Label>
                <input
                  id="holidayDescription"
                  type="text"
                  value={holidayDescription}
                  onChange={(e) => setHolidayDescription(e.target.value)}
                  placeholder="e.g., National Holiday"
                  className="mt-1 w-full rounded-md border-2 border-border bg-card px-3 py-2 text-foreground focus:outline-none"
                />
              </div>
            </div>

            <Button
              onClick={handleAddHoliday}
              disabled={saving || !holidayDate || !holidayName.trim()}
              className="mt-4"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Holiday
                </>
              )}
            </Button>
          </div>

          {/* Holidays List */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Existing Holidays ({holidays.length})
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : holidays.length === 0 ? (
              <div className="rounded-lg border-2 border-border py-8 text-center text-muted-foreground">
                No holidays added yet
              </div>
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {holidays.map((holiday) => (
                  <div
                    key={holiday.id}
                    className="flex items-center justify-between rounded-lg border-2 border-border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex h-16 w-16 flex-col items-center justify-center rounded-lg border-2 border-border bg-accent text-accent-foreground">
                          <div className="text-xs font-medium">
                            {new Date(holiday.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                          </div>
                          <div className="font-display text-2xl font-bold">
                            {new Date(holiday.date + 'T00:00:00').getDate()}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">
                            {holiday.name}
                            {isManager && !isAdmin && (
                              <span className="ml-2 rounded border border-border px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                                {holiday.scope === 'manager' ? 'Team' : 'Global'}
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-muted-foreground">{formatDate(holiday.date)}</p>
                          {holiday.description && (
                            <p className="mt-1 text-xs text-muted-foreground">{holiday.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Managers can only delete their own holidays, admins can delete any */}
                    {(isAdmin || (isManager && holiday.scope === 'manager' && holiday.createdBy === managerId)) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteHoliday(holiday.id)}
                        aria-label={`Delete ${holiday.name}`}
                        className="h-9 w-9 text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Add New Holiday</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="holidayDate">Date *</Label>
                <input
                  id="holidayDate"
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
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
                  className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
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
                  className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <Button
              onClick={handleAddHoliday}
              disabled={saving || !holidayDate || !holidayName.trim()}
              className="mt-4 bg-foreground hover:bg-foreground/90 text-background"
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
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Existing Holidays ({holidays.length})
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : holidays.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg">
                No holidays added yet
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {holidays.map((holiday) => (
                  <div
                    key={holiday.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:bg-gray-800 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 bg-blue-100 rounded-lg flex flex-col items-center justify-center">
                          <div className="text-xs text-blue-600 font-medium">
                            {new Date(holiday.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                          </div>
                          <div className="text-2xl font-bold text-blue-700">
                            {new Date(holiday.date + 'T00:00:00').getDate()}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {holiday.name}
                            {isManager && !isAdmin && (
                              <span className={`ml-2 text-xs font-normal px-1.5 py-0.5 rounded ${
                                holiday.scope === 'manager'
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                                  : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                              }`}>
                                {holiday.scope === 'manager' ? 'Team' : 'Global'}
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(holiday.date)}</p>
                          {holiday.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{holiday.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Managers can only delete their own holidays, admins can delete any */}
                    {(isAdmin || (isManager && holiday.scope === 'manager' && holiday.createdBy === managerId)) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteHoliday(holiday.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
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

'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { clientService, Client } from '@/services/client.service';
import { useModal } from '@/contexts/modal-context';

interface ClientListModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  clientIds: string[];
  isTeamMemberMapping?: boolean;
  teamMemberName?: string;
}

/**
 * ClientListModal Component
 * Displays a list of clients assigned to a task
 */
export function ClientListModal({
  isOpen,
  onClose,
  taskTitle,
  clientIds,
  isTeamMemberMapping = false,
  teamMemberName,
}: ClientListModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const { openModal, closeModal } = useModal();

  // Manage modal context state
  useEffect(() => {
    if (isOpen) {
      openModal();
    } else {
      closeModal();
    }
  }, [isOpen, openModal, closeModal]);

  useEffect(() => {
    const loadClients = async () => {
      if (!isOpen || clientIds.length === 0) return;

      setLoading(true);
      try {
        // Fetch all clients and filter by IDs
        const allClients = await clientService.getAll({ status: 'active', limit: 1000 });
        const assignedClients = allClients.filter(client => 
          client.id && clientIds.includes(client.id)
        );
        setClients(assignedClients);
      } catch (error) {
        console.error('Error loading clients:', error);
      } finally {
        setLoading(false);
      }
    };

    loadClients();
  }, [isOpen, clientIds]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-4 sm:py-8">
        <div 
          className="fixed inset-0 transition-opacity bg-muted bg-opacity-75" 
          onClick={onClose}
        ></div>

        <div className="inline-block w-full max-w-4xl overflow-hidden text-left align-middle transition-all transform bg-card rounded-lg shadow-xl relative z-10 max-h-[85vh] flex flex-col">
          {/* Header - Fixed */}
          <div className="px-6 py-4 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <UserGroupIcon className="w-6 h-6 text-foreground" />
                  Assigned Clients
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {taskTitle}
                  {isTeamMemberMapping && teamMemberName && (
                    <span className="ml-2 text-foreground">• Assigned to: {teamMemberName}</span>
                  )}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground transition-colors"
                aria-label="Close modal"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="px-6 py-4 overflow-y-auto slim-scrollbar flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground"></div>
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-12">
                <UserGroupIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No clients assigned to this task</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className="p-3 border-2 border-border rounded-lg hover:border-ring transition-colors bg-card"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-foreground font-semibold text-sm">
                            {client.clientName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-foreground truncate">
                          {client.clientName}
                        </h4>
                        {client.businessName && (
                          <p className="text-xs text-muted-foreground truncate">
                            {client.businessName}
                          </p>
                        )}
                        {client.contact?.email && (
                          <p className="text-xs text-muted-foreground dark:text-muted-foreground truncate mt-0.5">
                            {client.contact.email}
                          </p>
                        )}
                        {client.contact?.phone && (
                          <p className="text-xs text-muted-foreground dark:text-muted-foreground truncate">
                            {client.contact.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer - Fixed */}
          <div className="px-6 py-3 border-t border-border bg-muted flex-shrink-0">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Total: <span className="font-semibold text-foreground">{clients.length}</span> client{clients.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted dark:hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Client } from '@/services/client.service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PencilSquareIcon, TrashIcon, EnvelopeIcon, PhoneIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

interface ClientCardProps {
  client: Client;
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
}

/**
 * ClientCard Component
 * Displays client information in a card format with avatar, contact details, and action buttons
 * Validates Requirements: 1.8, 1.9
 */
export function ClientCard({ client, onEdit, onDelete }: ClientCardProps) {
  // Generate initials from client name for avatar fallback
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="group hover:shadow-hard transition-all duration-200">
      <CardContent className="p-6">

        
        <div className="flex items-start justify-between mb-4">
          {/* Avatar and Name */}
          <div className="flex items-start gap-4 flex-1">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-300 font-semibold text-lg">
                {getInitials(client.clientName)}
              </span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-foreground truncate">
                  {client.clientName}
                </h3>
                <Badge
                  variant={client.status === 'active' ? 'success' : 'default'}
                >
                  {client.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(client)}
              className="text-blue-600 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30"
              aria-label={`Edit ${client.clientName}`}
            >
              <PencilSquareIcon className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(client.id!)}
              className="text-red-600 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
              aria-label={`Delete ${client.clientName}`}
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-2">
          {/* Email */}
          {client.contact?.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <EnvelopeIcon className="w-4 h-4 flex-shrink-0" />
              <a
                href={`mailto:${client.contact.email}`}
                className="hover:text-blue-600 truncate"
              >
                {client.contact.email}
              </a>
            </div>
          )}

          {/* Phone */}
          {client.contact?.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <PhoneIcon className="w-4 h-4 flex-shrink-0" />
              <a
                href={`tel:${client.contact.phone}`}
                className="hover:text-blue-600"
              >
                {client.contact.phone}
              </a>
            </div>
          )}

          {/* Business Name */}
          {client.businessName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BuildingOfficeIcon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{client.businessName}</span>
            </div>
          )}
        </div>

        {/* Footer with creation date */}
        {client.createdAt && (
          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
            Added {new Date(client.createdAt).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

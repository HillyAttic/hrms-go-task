import { Employee } from '@/services/employee.service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PencilSquareIcon,
  TrashIcon,
  EnvelopeIcon,
  PhoneIcon,
  UserMinusIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  CurrencyRupeeIcon,
} from '@heroicons/react/24/outline';

interface EmployeeCardProps {
  employee: Employee;
  onEdit: (employee: Employee) => void;
  onDelete: (id: string) => void;
  onDeactivate: (id: string) => void;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

/**
 * EmployeeCard Component
 * Displays employee information in a card format with photo, contact details, and action buttons
 */
export function EmployeeCard({ employee, onEdit, onDelete, onDeactivate, selected = false, onSelect }: EmployeeCardProps) {
  // Generate initials from employee name for avatar fallback
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get badge variant based on status
  const getStatusBadgeVariant = (status: Employee['status']) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'on-leave':
        return 'warning';
      case 'resigned':
        return 'secondary';
      default:
        return 'default';
    }
  };

  // Format status for display
  const formatStatus = (status: Employee['status']) => {
    switch (status) {
      case 'on-leave':
        return 'On Leave';
      case 'resigned':
        return 'Resigned';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return null;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <Card className={`group hover:shadow-lg transition-all duration-200 ${selected ? 'ring-2 ring-ring' : ''}`}>
      <CardContent className="p-6">
        {/* Selection Checkbox */}
        {onSelect && (
          <div className="absolute top-4 left-4 z-10">
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect(employee.id!, e.target.checked)}
              className="w-5 h-5 rounded border-border text-ring focus:ring-ring cursor-pointer"
              aria-label={`Select ${employee.name}`}
            />
          </div>
        )}

        <div className={`flex items-start justify-between mb-4 ${onSelect ? 'ml-8' : ''}`}>
          {/* Name and Role */}
          <div className="flex items-start gap-4 flex-1">
            {/* Avatar with photo or initials */}
            <div className="w-12 h-12 rounded-full bg-info/15 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {employee.photoURL ? (
                <img
                  src={employee.photoURL}
                  alt={employee.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-info font-semibold text-lg">
                  {getInitials(employee.name)}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-foreground truncate">
                  {employee.name}
                </h3>
                <Badge variant={getStatusBadgeVariant(employee.status)}>
                  {formatStatus(employee.status)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{employee.role}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(employee)}
              className="text-foreground hover:bg-muted"
              aria-label={`Edit ${employee.name}`}
            >
              <PencilSquareIcon className="w-4 h-4" />
            </Button>

            {employee.status === 'active' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDeactivate(employee.id!)}
                className="text-warning hover:bg-warning/10"
                aria-label={`Deactivate ${employee.name}`}
              >
                <UserMinusIcon className="w-4 h-4" />
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(employee.id!)}
              className="text-destructive hover:bg-destructive/10"
              aria-label={`Delete ${employee.name}`}
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Contact & Employment Information */}
        <div className="space-y-2">
          {/* Employee ID */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">ID:</span>
            <span>{employee.employeeId}</span>
          </div>

          {/* Email */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <EnvelopeIcon className="w-4 h-4 flex-shrink-0" />
            <a
              href={`mailto:${employee.email}`}
              className="hover:text-foreground truncate"
            >
              {employee.email}
            </a>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PhoneIcon className="w-4 h-4 flex-shrink-0" />
            <a
              href={`tel:${employee.phone}`}
              className="hover:text-foreground"
            >
              {employee.phone}
            </a>
          </div>

          {/* Department */}
          {employee.department && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BuildingOfficeIcon className="w-4 h-4 flex-shrink-0" />
              <span>{employee.department}</span>
            </div>
          )}

          {/* DOJ */}
          {employee.dateOfJoining && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDaysIcon className="w-4 h-4 flex-shrink-0" />
              <span>Joined: {new Date(employee.dateOfJoining).toLocaleDateString('en-IN')}</span>
            </div>
          )}

          {/* Salary */}
          {employee.salary && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CurrencyRupeeIcon className="w-4 h-4 flex-shrink-0" />
              <span>{formatCurrency(employee.salary)}</span>
            </div>
          )}

          {/* Manager */}
          {employee.managerName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground">
              <span className="text-xs">Reports to: {employee.managerName}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

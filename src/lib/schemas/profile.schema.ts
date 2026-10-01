import { z } from 'zod';
import { bankDetailFields, documentsSchema } from './employee.schema';

/**
 * What a user may change on their own record via PUT /api/auth/profile.
 *
 * Anything absent here is admin-only — notably salary, role, status, managerId,
 * employeeId and email. All of those live on this same document and feed payroll and
 * access control, so a self-service request must never be able to set them. zod strips
 * unknown keys, so a client that posts one is ignored rather than trusted.
 */
export const profileUpdateSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(100),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().max(50).optional(),
  department: z.string().optional(),
  phoneNumber: z
    .string()
    .regex(/^\d{10}$/, { message: 'Phone must be exactly 10 digits' })
    .optional()
    .or(z.literal('')),
  dateOfBirth: z.string().optional(),
  dateOfJoining: z.string().optional(),
  workAnniversary: z.string().optional(),
  probationDuration: z.coerce.number().optional(),
  probationEndDate: z.string().optional(),
  promotionDate: z.string().optional(),
  promotionDetails: z.string().optional(),
  ...bankDetailFields,
  documents: documentsSchema.optional(),
});

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

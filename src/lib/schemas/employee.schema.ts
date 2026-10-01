import { z } from 'zod';

/** A document value: either a bare URL or the metadata of a Storage upload. */
export const documentValueSchema = z.union([
  z.string(),
  z.object({
    url: z.string(),
    path: z.string().optional(),
    name: z.string().optional(),
    size: z.number().optional(),
    mimeType: z.string().optional(),
  }),
]);

export const documentsSchema = z.object({
  addressProof: documentValueSchema.optional(),
  cancelledCheque: documentValueSchema.optional(),
  aadhaarCard: documentValueSchema.optional(),
  panCard: documentValueSchema.optional(),
  resignationLetter: documentValueSchema.optional(),
  salarySlips: z.array(documentValueSchema).optional(),
  marksheet10th: documentValueSchema.optional(),
  marksheet12th: documentValueSchema.optional(),
  degree: documentValueSchema.optional(),
});

/**
 * Bank details, shared by the admin employee routes and the self-service profile route.
 * Empty string means "cleared", so it has to pass the regex alternation.
 */
export const bankDetailFields = {
  bankName: z.string().max(100).optional(),
  bankAccountNumber: z
    .string()
    .regex(/^\d{6,20}$/, { message: 'Account number must be 6-20 digits' })
    .optional()
    .or(z.literal('')),
  bankIfsc: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: 'Invalid IFSC code (e.g. HDFC0001234)' })
    .optional()
    .or(z.literal('')),
};

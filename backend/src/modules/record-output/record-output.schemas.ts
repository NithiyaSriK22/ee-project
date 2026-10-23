import { z } from 'zod';

export const exportQuerySchema = z.object({
  excludeSensitive: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
});

export const manualPushSchema = z.object({
  patientId: z.string().trim().min(1),
  hospitalRegistrationNumber: z.string().trim().optional(),
  identityState: z.enum(['CONFIRMED', 'PROVISIONAL']).default('CONFIRMED'),
});

export const generatePatientCopyLinkSchema = z.object({
  patientId: z.string().trim().min(1),
  patientConsentVerified: z.boolean().refine((val) => val === true, {
    message: 'Explicit patient consent is required to generate a patient copy link.',
  }),
  baseUrl: z.string().url().optional(),
});

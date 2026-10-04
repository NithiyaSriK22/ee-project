import { z } from 'zod';
import { SupportedLanguages } from '../../types/auth.types.js';

export const updatePatientProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(255).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format')
    .optional(),
  age: z
    .number()
    .int()
    .min(0, 'Age must be at least 0')
    .max(130, 'Age must be realistic (max 130)')
    .optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  contactNumber: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{7,20}$/, 'Please enter a valid phone number')
    .optional(),
  preferredLanguage: z.enum(SupportedLanguages).optional(),

  // Visit-specific companion/emergency fields
  isCompanionAssisted: z.boolean().optional(),
  companionName: z.string().trim().max(255).optional(),
  companionRelationship: z.string().trim().max(100).optional(),
  emergencyContact: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{7,20}$/, 'Please enter a valid emergency contact phone number')
    .optional(),
});

export const updateConsentSchema = z.object({
  granted: z.boolean(),
  grantedVia: z.enum(['patient', 'companion', 'staff_assisted']).default('patient'),
  version: z.string().default('1.0'),
});

import { z } from 'zod';
import { SupportedLanguages } from '../../types/auth.types.js';

export const startKioskSessionSchema = z
  .object({
    // Returning patient lookup
    hospitalRegistrationNumber: z.string().trim().max(100).optional(),

    // New patient registration fields
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
      .regex(/^[0-9+\-\s()]{7,20}$/, 'Please enter a valid phone number (7-20 digits)')
      .optional(),
    preferredLanguage: z.enum(SupportedLanguages).default('en'),
    
    // Companion assistance details
    isCompanionAssisted: z.boolean().default(false),
    companionName: z.string().trim().max(255).optional(),
    companionRelationship: z.string().trim().max(100).optional(),
    emergencyContact: z
      .string()
      .trim()
      .regex(/^[0-9+\-\s()]{7,20}$/, 'Please enter a valid emergency contact phone number')
      .optional(),

    // Initial consents if granted upfront
    consentGranted: z.boolean().default(true),
    consentGrantedVia: z.enum(['patient', 'companion', 'staff_assisted']).default('patient'),
  })
  .refine(
    (data) => {
      // Must provide either existing registration number OR registration fields
      if (data.hospitalRegistrationNumber) return true;
      return Boolean(data.fullName && (data.age !== undefined || data.dateOfBirth) && data.gender && data.contactNumber);
    },
    {
      message:
        'Please provide either an existing hospital registration number OR full patient registration details (Name, Age/DOB, Gender, Contact Number)',
      path: ['hospitalRegistrationNumber'],
    }
  );

import { z } from 'zod';
import { DocumentTypes } from './documents.types.js';

export const uploadDocumentSchema = z.object({
  documentType: z
    .enum([
      DocumentTypes.PRESCRIPTION,
      DocumentTypes.LAB_REPORT,
      DocumentTypes.DISCHARGE_SUMMARY,
      DocumentTypes.OTHER,
    ])
    .default(DocumentTypes.PRESCRIPTION),
});

export const createFormularyVersionSchema = z.object({
  versionCode: z.string().trim().min(3, 'Version code is required').max(100),
  description: z.string().trim().max(1000).optional(),
  sourceName: z.string().trim().min(2, 'Source name is required').max(255),
});

export const addFormularyDrugSchema = z.object({
  genericName: z.string().trim().min(2, 'Generic name is required').max(255),
  canonicalName: z.string().trim().min(2, 'Canonical name is required').max(255),
  brandNames: z.array(z.string().trim()).optional().default([]),
  dosageForms: z.array(z.string().trim()).optional().default([]),
  commonMisreadings: z.array(z.string().trim()).optional().default([]),
  scheduleType: z.string().trim().max(50).optional(),
});

export const importFormularyDrugsSchema = z.object({
  drugs: z.array(addFormularyDrugSchema).min(1, 'At least one drug is required for import'),
});

import { z } from 'zod';
import { DocumentTypes } from './documents.types.js';

export const uploadDocumentSchema = z.object({
  documentType: z
    .enum([
      DocumentTypes.PRESCRIPTION,
      DocumentTypes.CLINICAL_NOTES,
      DocumentTypes.LAB_REPORT,
      DocumentTypes.ULTRASOUND,
      DocumentTypes.XRAY_CT_MRI,
      DocumentTypes.DISCHARGE_SUMMARY,
      DocumentTypes.RADIOLOGY_REPORT,
      DocumentTypes.OTHER,
    ])
    .default(DocumentTypes.PRESCRIPTION),
  scanDate: z.string().optional().nullable(),
  scanType: z.string().max(100).optional().nullable(),
  doctorNotes: z.string().max(2000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  metadata: z.any().optional().nullable(),
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

import { z } from 'zod';
import { SummarySections } from './summary.types.js';

const summarySectionValues = Object.values(SummarySections) as [string, ...string[]];

export const modelStructuredStatementSchema = z.object({
  text: z.string().min(1, 'Statement text cannot be empty'),
  source_item_ids: z.array(z.string().min(1)).min(1, 'Every statement must cite at least one source item ID'),
});

export const modelStructuredSectionSchema = z.object({
  section: z.enum(summarySectionValues),
  statements: z.array(modelStructuredStatementSchema),
});

export const modelStructuredOutputSchema = z.object({
  sections: z.array(modelStructuredSectionSchema).min(1, 'Summary must contain at least one section'),
});

// API Request Schemas
export const regenerateSummarySchema = z.object({
  body: z.object({
    reason: z.string().max(255).optional(),
    forceFallback: z.boolean().optional(),
  }).optional(),
  params: z.object({
    visitId: z.string().min(1, 'Visit ID is required'),
  }),
});

export const createPromptTemplateSchema = z.object({
  body: z.object({
    version: z.string().min(1).max(50).regex(/^[a-zA-Z0-9.-]+$/, 'Version must be alphanumeric with dots/hyphens'),
    systemPrompt: z.string().min(20, 'System prompt must be at least 20 characters'),
    outputSchemaVersion: z.string().default('1.0'),
  }),
});

export const promptIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Prompt ID is required'),
  }),
});

export const visitIdParamSchema = z.object({
  params: z.object({
    visitId: z.string().min(1, 'Visit ID is required'),
  }),
});

export const summaryIdParamSchema = z.object({
  params: z.object({
    summaryId: z.string().min(1, 'Summary ID is required'),
  }),
});

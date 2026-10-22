"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summaryIdParamSchema = exports.visitIdParamSchema = exports.promptIdParamSchema = exports.createPromptTemplateSchema = exports.regenerateSummarySchema = exports.modelStructuredOutputSchema = exports.modelStructuredSectionSchema = exports.modelStructuredStatementSchema = void 0;
const zod_1 = require("zod");
const summary_types_js_1 = require("./summary.types.js");
const summarySectionValues = Object.values(summary_types_js_1.SummarySections);
exports.modelStructuredStatementSchema = zod_1.z.object({
    text: zod_1.z.string().min(1, 'Statement text cannot be empty'),
    source_item_ids: zod_1.z.array(zod_1.z.string().min(1)).min(1, 'Every statement must cite at least one source item ID'),
});
exports.modelStructuredSectionSchema = zod_1.z.object({
    section: zod_1.z.enum(summarySectionValues),
    statements: zod_1.z.array(exports.modelStructuredStatementSchema),
});
exports.modelStructuredOutputSchema = zod_1.z.object({
    sections: zod_1.z.array(exports.modelStructuredSectionSchema).min(1, 'Summary must contain at least one section'),
});
// API Request Schemas
exports.regenerateSummarySchema = zod_1.z.object({
    body: zod_1.z.object({
        reason: zod_1.z.string().max(255).optional(),
        forceFallback: zod_1.z.boolean().optional(),
    }).optional(),
    params: zod_1.z.object({
        visitId: zod_1.z.string().min(1, 'Visit ID is required'),
    }),
});
exports.createPromptTemplateSchema = zod_1.z.object({
    body: zod_1.z.object({
        version: zod_1.z.string().min(1).max(50).regex(/^[a-zA-Z0-9.-]+$/, 'Version must be alphanumeric with dots/hyphens'),
        systemPrompt: zod_1.z.string().min(20, 'System prompt must be at least 20 characters'),
        outputSchemaVersion: zod_1.z.string().default('1.0'),
    }),
});
exports.promptIdParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Prompt ID is required'),
    }),
});
exports.visitIdParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        visitId: zod_1.z.string().min(1, 'Visit ID is required'),
    }),
});
exports.summaryIdParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        summaryId: zod_1.z.string().min(1, 'Summary ID is required'),
    }),
});

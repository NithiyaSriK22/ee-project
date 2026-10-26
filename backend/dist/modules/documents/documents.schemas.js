"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importFormularyDrugsSchema = exports.addFormularyDrugSchema = exports.createFormularyVersionSchema = exports.uploadDocumentSchema = void 0;
const zod_1 = require("zod");
const documents_types_js_1 = require("./documents.types.js");
exports.uploadDocumentSchema = zod_1.z.object({
    documentType: zod_1.z
        .enum([
        documents_types_js_1.DocumentTypes.PRESCRIPTION,
        documents_types_js_1.DocumentTypes.CLINICAL_NOTES,
        documents_types_js_1.DocumentTypes.LAB_REPORT,
        documents_types_js_1.DocumentTypes.ULTRASOUND,
        documents_types_js_1.DocumentTypes.XRAY_CT_MRI,
        documents_types_js_1.DocumentTypes.DISCHARGE_SUMMARY,
        documents_types_js_1.DocumentTypes.RADIOLOGY_REPORT,
        documents_types_js_1.DocumentTypes.OTHER,
    ])
        .default(documents_types_js_1.DocumentTypes.PRESCRIPTION),
    scanDate: zod_1.z.string().optional().nullable(),
    scanType: zod_1.z.string().max(100).optional().nullable(),
    doctorNotes: zod_1.z.string().max(2000).optional().nullable(),
    notes: zod_1.z.string().max(2000).optional().nullable(),
    metadata: zod_1.z.any().optional().nullable(),
});
exports.createFormularyVersionSchema = zod_1.z.object({
    versionCode: zod_1.z.string().trim().min(3, 'Version code is required').max(100),
    description: zod_1.z.string().trim().max(1000).optional(),
    sourceName: zod_1.z.string().trim().min(2, 'Source name is required').max(255),
});
exports.addFormularyDrugSchema = zod_1.z.object({
    genericName: zod_1.z.string().trim().min(2, 'Generic name is required').max(255),
    canonicalName: zod_1.z.string().trim().min(2, 'Canonical name is required').max(255),
    brandNames: zod_1.z.array(zod_1.z.string().trim()).optional().default([]),
    dosageForms: zod_1.z.array(zod_1.z.string().trim()).optional().default([]),
    commonMisreadings: zod_1.z.array(zod_1.z.string().trim()).optional().default([]),
    scheduleType: zod_1.z.string().trim().max(50).optional(),
});
exports.importFormularyDrugsSchema = zod_1.z.object({
    drugs: zod_1.z.array(exports.addFormularyDrugSchema).min(1, 'At least one drug is required for import'),
});

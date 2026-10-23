"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePatientCopyLinkSchema = exports.manualPushSchema = exports.exportQuerySchema = void 0;
const zod_1 = require("zod");
exports.exportQuerySchema = zod_1.z.object({
    excludeSensitive: zod_1.z
        .enum(['true', 'false'])
        .optional()
        .transform((val) => val === 'true'),
});
exports.manualPushSchema = zod_1.z.object({
    patientId: zod_1.z.string().trim().min(1),
    hospitalRegistrationNumber: zod_1.z.string().trim().optional(),
    identityState: zod_1.z.enum(['CONFIRMED', 'PROVISIONAL']).default('CONFIRMED'),
});
exports.generatePatientCopyLinkSchema = zod_1.z.object({
    patientId: zod_1.z.string().trim().min(1),
    patientConsentVerified: zod_1.z.boolean().refine((val) => val === true, {
        message: 'Explicit patient consent is required to generate a patient copy link.',
    }),
    baseUrl: zod_1.z.string().url().optional(),
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateConsentSchema = exports.updatePatientProfileSchema = void 0;
const zod_1 = require("zod");
const auth_types_js_1 = require("../../types/auth.types.js");
exports.updatePatientProfileSchema = zod_1.z.object({
    fullName: zod_1.z.string().trim().min(2, 'Full name must be at least 2 characters').max(255).optional(),
    dateOfBirth: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format')
        .optional(),
    age: zod_1.z
        .number()
        .int()
        .min(0, 'Age must be at least 0')
        .max(130, 'Age must be realistic (max 130)')
        .optional(),
    gender: zod_1.z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
    contactNumber: zod_1.z
        .string()
        .trim()
        .regex(/^[0-9+\-\s()]{7,20}$/, 'Please enter a valid phone number')
        .optional(),
    preferredLanguage: zod_1.z.enum(auth_types_js_1.SupportedLanguages).optional(),
    // Visit-specific companion/emergency fields
    isCompanionAssisted: zod_1.z.boolean().optional(),
    companionName: zod_1.z.string().trim().max(255).optional(),
    companionRelationship: zod_1.z.string().trim().max(100).optional(),
    emergencyContact: zod_1.z
        .string()
        .trim()
        .regex(/^[0-9+\-\s()]{7,20}$/, 'Please enter a valid emergency contact phone number')
        .optional(),
});
exports.updateConsentSchema = zod_1.z.object({
    granted: zod_1.z.boolean(),
    grantedVia: zod_1.z.enum(['patient', 'companion', 'staff_assisted']).default('patient'),
    version: zod_1.z.string().default('1.0'),
});

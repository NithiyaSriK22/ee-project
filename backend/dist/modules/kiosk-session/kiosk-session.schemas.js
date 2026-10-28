"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startKioskSessionSchema = void 0;
const zod_1 = require("zod");
const auth_types_js_1 = require("../../types/auth.types.js");
exports.startKioskSessionSchema = zod_1.z
    .object({
    // Returning patient lookup
    hospitalRegistrationNumber: zod_1.z.string().trim().max(100).optional(),
    // New patient registration fields
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
        .regex(/^[0-9+\-\s()]{7,20}$/, 'Please enter a valid phone number (7-20 digits)')
        .optional(),
    preferredLanguage: zod_1.z.enum(auth_types_js_1.SupportedLanguages).default('en'),
    // Companion assistance details
    isCompanionAssisted: zod_1.z.boolean().default(false),
    companionName: zod_1.z.string().trim().max(255).optional(),
    companionRelationship: zod_1.z.string().trim().max(100).optional(),
    emergencyContact: zod_1.z
        .string()
        .trim()
        .regex(/^[0-9+\-\s()]{7,20}$/, 'Please enter a valid emergency contact phone number')
        .optional(),
    // Initial consents if granted upfront
    consentGranted: zod_1.z.boolean().default(true),
    consentGrantedVia: zod_1.z.enum(['patient', 'companion', 'staff_assisted']).default('patient'),
    // Presenting problem and department
    presentingComplaint: zod_1.z.string().trim().max(1000).optional(),
    department: zod_1.z.string().trim().max(100).optional(),
})
    .refine((data) => {
    // Must provide either existing registration number OR registration fields
    if (data.hospitalRegistrationNumber)
        return true;
    return Boolean(data.fullName && (data.age !== undefined || data.dateOfBirth) && data.gender && data.contactNumber);
}, {
    message: 'Please provide either an existing hospital registration number OR full patient registration details (Name, Age/DOB, Gender, Contact Number)',
    path: ['hospitalRegistrationNumber'],
});

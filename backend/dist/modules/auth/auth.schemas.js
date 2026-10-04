"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendVerificationSchema = exports.verifyEmailSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.changePasswordSchema = exports.refreshTokenSchema = exports.loginStaffSchema = exports.registerStaffSchema = void 0;
const zod_1 = require("zod");
const auth_types_js_1 = require("../../types/auth.types.js");
exports.registerStaffSchema = zod_1.z
    .object({
    email: zod_1.z
        .string()
        .trim()
        .toLowerCase()
        .email('Please provide a valid email address'),
    password: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .max(100, 'Password cannot exceed 100 characters')
        .regex(/[A-Za-z]/, 'Password must contain at least one letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: zod_1.z.string(),
    fullName: zod_1.z.string().trim().min(2, 'Full name must be at least 2 characters'),
    role: zod_1.z.enum([
        auth_types_js_1.UserRoles.STAFF_ATTENDANT,
        auth_types_js_1.UserRoles.DOCTOR,
        auth_types_js_1.UserRoles.ADMIN,
        auth_types_js_1.UserRoles.SUPER_ADMIN,
    ]),
    hospitalDepartment: zod_1.z.string().trim().max(100).optional(),
})
    .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});
exports.loginStaffSchema = zod_1.z.object({
    email: zod_1.z.string().trim().toLowerCase().email('Please provide a valid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
exports.changePasswordSchema = zod_1.z
    .object({
    currentPassword: zod_1.z.string().min(1, 'Current password is required'),
    newPassword: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .max(100, 'Password cannot exceed 100 characters')
        .regex(/[A-Za-z]/, 'Password must contain at least one letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmNewPassword: zod_1.z.string(),
})
    .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match',
    path: ['confirmNewPassword'],
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().trim().toLowerCase().email('Please provide a valid email address'),
});
exports.resetPasswordSchema = zod_1.z
    .object({
    token: zod_1.z.string().min(1, 'Reset token is required'),
    newPassword: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .max(100, 'Password cannot exceed 100 characters')
        .regex(/[A-Za-z]/, 'Password must contain at least one letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmNewPassword: zod_1.z.string(),
})
    .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match',
    path: ['confirmNewPassword'],
});
exports.verifyEmailSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Verification token is required'),
});
exports.resendVerificationSchema = zod_1.z.object({
    email: zod_1.z.string().trim().toLowerCase().email('Please provide a valid email address'),
});

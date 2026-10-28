import { z } from 'zod';
import { UserRoles } from '../../types/auth.types.js';

export const registerStaffSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(100, 'Password cannot exceed 100 characters')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
    role: z
      .enum([
        UserRoles.STAFF_ATTENDANT,
        UserRoles.DOCTOR,
        UserRoles.ADMIN,
        UserRoles.SUPER_ADMIN,
      ] as [string, ...string[]])
      .optional()
      .default(UserRoles.DOCTOR),
    medicalRegistrationNumber: z
      .string()
      .trim()
      .min(2, 'Medical registration number must be at least 2 characters')
      .max(100, 'Medical registration number cannot exceed 100 characters')
      .optional(),
    specialization: z.string().trim().max(100).optional(),
    hospitalDepartment: z.string().trim().max(100).optional(),
    clinicName: z.string().trim().max(255).optional(),
    hospitalName: z.string().trim().max(255).optional(),
    qualification: z.string().trim().max(100).optional(),
    experienceYears: z.coerce.number().int().min(0, 'Experience must be a non-negative integer').optional(),
    designation: z.string().trim().max(100).optional(),
    phoneNumber: z.string().trim().max(50).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const suggestEmailSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
});

export const loginStaffSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(100, 'Password cannot exceed 100 characters')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match',
    path: ['confirmNewPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(100, 'Password cannot exceed 100 characters')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match',
    path: ['confirmNewPassword'],
  });

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const auth_repository_js_1 = require("./auth.repository.js");
const prisma_js_1 = require("../../database/prisma.js");
const token_util_js_1 = require("../../utils/token.util.js");
const app_error_js_1 = require("../../errors/app-error.js");
const logger_js_1 = require("../../config/logger.js");
const auth_types_js_1 = require("../../types/auth.types.js");
const email_generator_util_js_1 = require("../../utils/email-generator.util.js");
class AuthService {
    static async registerStaff(data) {
        const existing = await auth_repository_js_1.AuthRepository.findUserByEmail(data.email);
        if (existing) {
            throw new app_error_js_1.ConflictError('A staff account with this email address already exists');
        }
        const passwordHash = await token_util_js_1.TokenUtil.hashPassword(data.password);
        const role = data.role || 'DOCTOR';
        const department = data.hospitalDepartment || data.specialization || 'General Medicine';
        const clinic = data.clinicName || data.hospitalName || 'MEDBRIEF Clinical Care';
        const user = await auth_repository_js_1.AuthRepository.createStaffUser({
            email: data.email,
            passwordHash,
            fullName: data.fullName,
            role,
            hospitalDepartment: department,
            medicalRegistrationNumber: data.medicalRegistrationNumber,
            clinicName: clinic,
            qualification: data.qualification,
            experienceYears: data.experienceYears,
            designation: data.designation,
            phoneNumber: data.phoneNumber,
            status: 'ACTIVE',
        });
        logger_js_1.logger.info('Staff user account created', {
            actorRole: role,
            department,
            email: data.email,
        });
        return {
            id: user.id,
            email: user.email,
            fullName: user.full_name || user.fullName,
            role: user.role,
            status: user.status,
            accountStatus: user.status,
            hospitalDepartment: user.hospital_department || user.hospitalDepartment,
            specialization: user.hospital_department || user.hospitalDepartment,
            medicalRegistrationNumber: user.medical_registration_number || user.medicalRegistrationNumber,
            clinicName: user.clinic_name || user.clinicName,
            hospitalName: user.clinic_name || user.clinicName,
            qualification: user.qualification,
            experienceYears: user.experience_years ?? user.experienceYears ?? 0,
            designation: user.designation,
            phoneNumber: user.phone_number || user.phoneNumber,
            createdAt: user.created_at || user.createdAt,
            updatedAt: user.updated_at || user.updatedAt,
        };
    }
    static async suggestEmail(fullName) {
        const email = await email_generator_util_js_1.EmailGeneratorUtil.generateUniqueShortEmail(fullName);
        return { email };
    }
    static async loginStaff(credentials) {
        const user = await auth_repository_js_1.AuthRepository.findUserByEmail(credentials.email);
        if (!user) {
            logger_js_1.logger.warn('Staff login failed: invalid credentials');
            throw new app_error_js_1.UnauthorizedError('Invalid email or password');
        }
        let isMatch = false;
        try {
            isMatch = await token_util_js_1.TokenUtil.comparePassword(credentials.password, user.password_hash);
        }
        catch {
            isMatch = false;
        }
        if (!isMatch) {
            logger_js_1.logger.warn('Staff login failed: invalid credentials');
            throw new app_error_js_1.UnauthorizedError('Invalid email or password');
        }
        if (user.status === auth_types_js_1.StaffUserStatus.DISABLED || user.status === auth_types_js_1.StaffUserStatus.SUSPENDED) {
            logger_js_1.logger.warn('Staff login blocked: account inactive', { status: user.status });
            throw new app_error_js_1.ForbiddenError(`Account is ${user.status.toLowerCase()}. Please contact system administrator.`);
        }
        await auth_repository_js_1.AuthRepository.updateLastLogin(user.id);
        // Issue short-lived access token + long-lived refresh token
        const accessToken = token_util_js_1.TokenUtil.generateStaffAccessToken({
            sub: user.id,
            email: user.email,
            role: user.role,
            fullName: user.full_name,
            department: user.hospital_department,
        });
        const refreshTokenData = token_util_js_1.TokenUtil.generateStaffRefreshToken();
        await auth_repository_js_1.AuthRepository.createRefreshToken({
            staffUserId: user.id,
            tokenHash: refreshTokenData.hash,
            expiresAt: refreshTokenData.expiresAt,
        });
        logger_js_1.logger.info('Staff login successful', {
            actorRole: user.role,
            department: user.hospital_department,
        });
        return {
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                status: user.status,
                accountStatus: user.status,
                hospitalDepartment: user.hospital_department,
                specialization: user.hospital_department,
                medicalRegistrationNumber: user.medical_registration_number || null,
                clinicName: user.clinic_name || null,
                hospitalName: user.clinic_name || null,
                qualification: user.qualification || null,
                experienceYears: user.experience_years ?? 0,
                designation: user.designation || null,
                phoneNumber: user.phone_number || null,
                emailVerifiedAt: user.email_verified_at,
            },
            tokens: {
                accessToken,
                refreshToken: refreshTokenData.token,
                tokenType: 'Bearer',
            },
        };
    }
    static async logout(refreshToken) {
        if (refreshToken) {
            const tokenHash = token_util_js_1.TokenUtil.hashToken(refreshToken);
            await auth_repository_js_1.AuthRepository.revokeRefreshToken(tokenHash);
        }
        logger_js_1.logger.info('Staff logout completed');
        return { success: true, message: 'Successfully logged out' };
    }
    static async refreshAccessToken(rawRefreshToken) {
        const tokenHash = token_util_js_1.TokenUtil.hashToken(rawRefreshToken);
        const storedToken = await auth_repository_js_1.AuthRepository.findRefreshTokenByHash(tokenHash);
        if (!storedToken || storedToken.revoked_at || new Date() > storedToken.expires_at) {
            logger_js_1.logger.warn('Token refresh rejected: invalid or expired refresh token');
            throw new app_error_js_1.UnauthorizedError('Invalid or expired refresh token');
        }
        const user = storedToken.staff_user;
        if (user.status !== auth_types_js_1.StaffUserStatus.ACTIVE) {
            throw new app_error_js_1.ForbiddenError('Staff account is no longer active');
        }
        // Revoke old refresh token (token rotation)
        await auth_repository_js_1.AuthRepository.revokeRefreshToken(tokenHash);
        // Issue fresh pair
        const accessToken = token_util_js_1.TokenUtil.generateStaffAccessToken({
            sub: user.id,
            email: user.email,
            role: user.role,
            fullName: user.full_name,
            department: user.hospital_department,
        });
        const newRefreshTokenData = token_util_js_1.TokenUtil.generateStaffRefreshToken();
        await auth_repository_js_1.AuthRepository.createRefreshToken({
            staffUserId: user.id,
            tokenHash: newRefreshTokenData.hash,
            expiresAt: newRefreshTokenData.expiresAt,
        });
        logger_js_1.logger.info('Staff session token refreshed', { actorRole: user.role });
        return {
            accessToken,
            refreshToken: newRefreshTokenData.token,
            tokenType: 'Bearer',
        };
    }
    static async getProfile(userId) {
        const user = await auth_repository_js_1.AuthRepository.findUserById(userId);
        if (!user) {
            throw new app_error_js_1.NotFoundError('User profile not found');
        }
        return {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            role: user.role,
            status: user.status,
            accountStatus: user.status,
            hospitalDepartment: user.hospital_department,
            specialization: user.hospital_department,
            medicalRegistrationNumber: user.medical_registration_number || null,
            clinicName: user.clinic_name || null,
            hospitalName: user.clinic_name || null,
            qualification: user.qualification || null,
            experienceYears: user.experience_years ?? 0,
            designation: user.designation || null,
            phoneNumber: user.phone_number || null,
            emailVerifiedAt: user.email_verified_at,
            createdAt: user.created_at,
        };
    }
    static async changePassword(userId, passwords) {
        const user = await auth_repository_js_1.AuthRepository.findUserById(userId);
        if (!user) {
            throw new app_error_js_1.NotFoundError('User not found');
        }
        const isMatch = await token_util_js_1.TokenUtil.comparePassword(passwords.currentPassword, user.password_hash);
        if (!isMatch) {
            throw new app_error_js_1.ValidationError('Current password is incorrect');
        }
        const newHash = await token_util_js_1.TokenUtil.hashPassword(passwords.newPassword);
        await auth_repository_js_1.AuthRepository.updatePassword(userId, newHash);
        await auth_repository_js_1.AuthRepository.revokeAllUserRefreshTokens(userId);
        logger_js_1.logger.info('Staff password changed successfully');
        return { success: true, message: 'Password updated successfully. Please log in with your new password.' };
    }
    static async forgotPassword(email) {
        const user = await auth_repository_js_1.AuthRepository.findUserByEmail(email);
        if (user && user.status === auth_types_js_1.StaffUserStatus.ACTIVE) {
            const rawToken = token_util_js_1.TokenUtil.generateRandomToken(32);
            const tokenHash = token_util_js_1.TokenUtil.hashToken(rawToken);
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
            await auth_repository_js_1.AuthRepository.createPasswordResetToken({
                staffUserId: user.id,
                tokenHash,
                expiresAt,
            });
            logger_js_1.logger.info('Password reset token generated for staff member');
            // In Module 2, email sending integration is architected and tokens generated; logged without sensitive credentials
        }
        // Generic response to prevent account enumeration
        return {
            success: true,
            message: 'If an account exists with this email, password reset instructions have been dispatched.',
        };
    }
    static async resetPassword(data) {
        const tokenHash = token_util_js_1.TokenUtil.hashToken(data.token);
        const resetRecord = await auth_repository_js_1.AuthRepository.findPasswordResetTokenByHash(tokenHash);
        if (!resetRecord || resetRecord.used_at || new Date() > resetRecord.expires_at) {
            throw new app_error_js_1.ValidationError('Password reset link is invalid or has expired');
        }
        const newHash = await token_util_js_1.TokenUtil.hashPassword(data.newPassword);
        await auth_repository_js_1.AuthRepository.updatePassword(resetRecord.staff_user_id, newHash);
        await auth_repository_js_1.AuthRepository.markPasswordResetTokenUsed(resetRecord.id);
        await auth_repository_js_1.AuthRepository.revokeAllUserRefreshTokens(resetRecord.staff_user_id);
        logger_js_1.logger.info('Staff password reset completed');
        return {
            success: true,
            message: 'Password has been reset successfully. You may now log in.',
        };
    }
    static async verifyEmail(token) {
        const tokenHash = token_util_js_1.TokenUtil.hashToken(token);
        const record = await auth_repository_js_1.AuthRepository.findEmailVerificationTokenByHash(tokenHash);
        if (!record || record.used_at || new Date() > record.expires_at) {
            throw new app_error_js_1.ValidationError('Email verification token is invalid or has expired');
        }
        await auth_repository_js_1.AuthRepository.markEmailVerified(record.staff_user_id, record.id);
        logger_js_1.logger.info('Staff email verified successfully');
        return {
            success: true,
            message: 'Email address has been successfully verified.',
        };
    }
    static async resendVerification(email) {
        const user = await auth_repository_js_1.AuthRepository.findUserByEmail(email);
        if (user && !user.email_verified_at) {
            const rawToken = token_util_js_1.TokenUtil.generateRandomToken(32);
            const tokenHash = token_util_js_1.TokenUtil.hashToken(rawToken);
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            await auth_repository_js_1.AuthRepository.createEmailVerificationToken({
                staffUserId: user.id,
                tokenHash,
                expiresAt,
            });
            logger_js_1.logger.info('Email verification token generated');
        }
        // Zero account enumeration response
        return {
            success: true,
            message: 'If the account exists and is unverified, a new verification link has been sent.',
        };
    }
    static async updateProfile(userId, data) {
        const updateData = {};
        if (data.fullName)
            updateData.full_name = data.fullName;
        if (data.hospitalDepartment || data.specialization)
            updateData.hospital_department = data.hospitalDepartment || data.specialization;
        if (data.medicalRegistrationNumber)
            updateData.medical_registration_number = data.medicalRegistrationNumber;
        if (data.clinicName || data.hospitalName)
            updateData.clinic_name = data.clinicName || data.hospitalName;
        if (data.qualification !== undefined)
            updateData.qualification = data.qualification;
        if (data.experienceYears !== undefined)
            updateData.experience_years = data.experienceYears;
        if (data.designation !== undefined)
            updateData.designation = data.designation;
        if (data.phoneNumber !== undefined)
            updateData.phone_number = data.phoneNumber;
        const updated = await prisma_js_1.prisma.staffUser.update({
            where: { id: userId },
            data: updateData,
        });
        return {
            id: updated.id,
            email: updated.email,
            fullName: updated.full_name,
            role: updated.role,
            status: updated.status,
            accountStatus: updated.status,
            hospitalDepartment: updated.hospital_department,
            specialization: updated.hospital_department,
            medicalRegistrationNumber: updated.medical_registration_number,
            clinicName: updated.clinic_name,
            hospitalName: updated.clinic_name,
            qualification: updated.qualification,
            experienceYears: updated.experience_years,
            designation: updated.designation,
            phoneNumber: updated.phone_number,
            emailVerifiedAt: updated.email_verified_at,
            updatedAt: updated.updated_at,
        };
    }
    static async listDoctors() {
        const doctors = await prisma_js_1.prisma.staffUser.findMany({
            where: { role: 'DOCTOR' },
            select: {
                id: true,
                email: true,
                full_name: true,
                role: true,
                status: true,
                hospital_department: true,
                medical_registration_number: true,
                clinic_name: true,
                qualification: true,
                experience_years: true,
                designation: true,
                phone_number: true,
                created_at: true,
                updated_at: true,
            },
            orderBy: { created_at: 'asc' },
        });
        return doctors.map((d) => ({
            id: d.id,
            email: d.email,
            fullName: d.full_name,
            role: d.role,
            status: d.status,
            accountStatus: d.status,
            hospitalDepartment: d.hospital_department,
            specialization: d.hospital_department,
            medicalRegistrationNumber: d.medical_registration_number,
            clinicName: d.clinic_name,
            hospitalName: d.clinic_name,
            qualification: d.qualification,
            experienceYears: d.experience_years,
            designation: d.designation,
            phoneNumber: d.phone_number,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
        }));
    }
}
exports.AuthService = AuthService;

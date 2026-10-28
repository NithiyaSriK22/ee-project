"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRepository = void 0;
exports.checkDatabaseAvailability = checkDatabaseAvailability;
const prisma_js_1 = require("../../database/prisma.js");
const dev_fallback_store_js_1 = require("./dev-fallback-store.js");
const logger_js_1 = require("../../config/logger.js");
const app_error_js_1 = require("../../errors/app-error.js");
async function checkDatabaseAvailability() {
    return (0, prisma_js_1.checkDatabaseHealth)();
}
const TEST_DOCTOR_ALIASES = {
    'doctor1@medbrief.test': 'arun@medbrief.test',
    'doctor2@medbrief.test': 'priya@medbrief.test',
    'doctor3@medbrief.test': 'meena@medbrief.test',
    'doctor4@medbrief.test': 'karthik@medbrief.test',
    'doctor5@medbrief.test': 'divya@medbrief.test',
};
class AuthRepository {
    static async findUserByEmail(email) {
        const normalized = email.toLowerCase().trim();
        const targetEmail = TEST_DOCTOR_ALIASES[normalized] || normalized;
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const user = await prisma_js_1.prisma.staffUser.findUnique({
                    where: { email: targetEmail },
                });
                if (user)
                    return user;
            }
            catch (error) {
                logger_js_1.logger.warn('Database error in findUserByEmail', { email: targetEmail });
            }
        }
        return dev_fallback_store_js_1.devFallbackAuthStore.findUserByEmail(targetEmail);
    }
    static async findUserById(id) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const available = await checkDatabaseAvailability();
        if (available && isUuid) {
            try {
                const user = await prisma_js_1.prisma.staffUser.findUnique({
                    where: { id },
                });
                if (user)
                    return user;
            }
            catch (error) {
                logger_js_1.logger.warn('Database error in findUserById', { id });
            }
        }
        return dev_fallback_store_js_1.devFallbackAuthStore.findUserById(id);
    }
    static async createStaffUser(data) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                return await prisma_js_1.prisma.staffUser.create({
                    data: {
                        email: data.email.toLowerCase(),
                        password_hash: data.passwordHash,
                        full_name: data.fullName,
                        role: data.role,
                        hospital_department: data.hospitalDepartment,
                        medical_registration_number: data.medicalRegistrationNumber,
                        clinic_name: data.clinicName,
                        qualification: data.qualification,
                        experience_years: data.experienceYears ?? 0,
                        designation: data.designation,
                        phone_number: data.phoneNumber,
                        status: data.status || 'ACTIVE',
                    },
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
                        email_verified_at: true,
                        created_at: true,
                        updated_at: true,
                    },
                });
            }
            catch (error) {
                if (error?.code === 'P2002') {
                    throw new app_error_js_1.ConflictError('A staff account with this email address already exists');
                }
                logger_js_1.logger.warn('Database error in createStaffUser, falling back to dev store', { error: error?.message });
            }
        }
        const fallbackUser = dev_fallback_store_js_1.devFallbackAuthStore.createStaffUser({
            email: data.email,
            passwordHash: data.passwordHash,
            fullName: data.fullName,
            role: data.role,
            hospitalDepartment: data.hospitalDepartment,
            status: data.status,
        });
        return {
            id: fallbackUser.id,
            email: fallbackUser.email,
            full_name: fallbackUser.full_name,
            role: fallbackUser.role,
            status: fallbackUser.status,
            hospital_department: fallbackUser.hospital_department,
            medical_registration_number: data.medicalRegistrationNumber || null,
            clinic_name: data.clinicName || null,
            qualification: data.qualification || null,
            experience_years: data.experienceYears ?? 0,
            designation: data.designation || null,
            phone_number: data.phoneNumber || null,
            email_verified_at: fallbackUser.email_verified_at,
            created_at: fallbackUser.created_at,
            updated_at: fallbackUser.updated_at,
        };
    }
    static async updateLastLogin(id) {
        try {
            return await prisma_js_1.prisma.staffUser.update({
                where: { id },
                data: { last_login_at: new Date() },
            });
        }
        catch (error) {
            return dev_fallback_store_js_1.devFallbackAuthStore.updateLastLogin(id);
        }
    }
    static async updatePassword(id, newPasswordHash) {
        try {
            return await prisma_js_1.prisma.staffUser.update({
                where: { id },
                data: { password_hash: newPasswordHash },
            });
        }
        catch (error) {
            const user = dev_fallback_store_js_1.devFallbackAuthStore.findUserById(id);
            if (user)
                user.password_hash = newPasswordHash;
            return user;
        }
    }
    static async createRefreshToken(data) {
        try {
            return await prisma_js_1.prisma.refreshToken.create({
                data: {
                    staff_user_id: data.staffUserId,
                    token_hash: data.tokenHash,
                    expires_at: data.expiresAt,
                },
            });
        }
        catch (error) {
            return dev_fallback_store_js_1.devFallbackAuthStore.createRefreshToken(data);
        }
    }
    static async findRefreshTokenByHash(tokenHash) {
        try {
            return await prisma_js_1.prisma.refreshToken.findUnique({
                where: { token_hash: tokenHash },
                include: {
                    staff_user: true,
                },
            });
        }
        catch (error) {
            return dev_fallback_store_js_1.devFallbackAuthStore.findRefreshTokenByHash(tokenHash);
        }
    }
    static async revokeRefreshToken(tokenHash) {
        try {
            return await prisma_js_1.prisma.refreshToken.updateMany({
                where: { token_hash: tokenHash },
                data: { revoked_at: new Date() },
            });
        }
        catch (error) {
            dev_fallback_store_js_1.devFallbackAuthStore.revokeRefreshToken(tokenHash);
            return { count: 1 };
        }
    }
    static async revokeAllUserRefreshTokens(staffUserId) {
        try {
            return await prisma_js_1.prisma.refreshToken.updateMany({
                where: {
                    staff_user_id: staffUserId,
                    revoked_at: null,
                },
                data: { revoked_at: new Date() },
            });
        }
        catch (error) {
            dev_fallback_store_js_1.devFallbackAuthStore.revokeAllUserRefreshTokens(staffUserId);
            return { count: 1 };
        }
    }
    static async createPasswordResetToken(data) {
        try {
            return await prisma_js_1.prisma.passwordResetToken.create({
                data: {
                    staff_user_id: data.staffUserId,
                    token_hash: data.tokenHash,
                    expires_at: data.expiresAt,
                },
            });
        }
        catch (error) {
            return { id: `reset-${Date.now()}`, ...data };
        }
    }
    static async findPasswordResetTokenByHash(tokenHash) {
        try {
            return await prisma_js_1.prisma.passwordResetToken.findUnique({
                where: { token_hash: tokenHash },
                include: {
                    staff_user: true,
                },
            });
        }
        catch (error) {
            return null;
        }
    }
    static async markPasswordResetTokenUsed(id) {
        try {
            return await prisma_js_1.prisma.passwordResetToken.update({
                where: { id },
                data: { used_at: new Date() },
            });
        }
        catch (error) {
            return null;
        }
    }
    static async createEmailVerificationToken(data) {
        try {
            return await prisma_js_1.prisma.emailVerificationToken.create({
                data: {
                    staff_user_id: data.staffUserId,
                    token_hash: data.tokenHash,
                    expires_at: data.expiresAt,
                },
            });
        }
        catch (error) {
            return { id: `verify-${Date.now()}`, ...data };
        }
    }
    static async findEmailVerificationTokenByHash(tokenHash) {
        try {
            return await prisma_js_1.prisma.emailVerificationToken.findUnique({
                where: { token_hash: tokenHash },
                include: {
                    staff_user: true,
                },
            });
        }
        catch (error) {
            return null;
        }
    }
    static async markEmailVerified(staffUserId, tokenId) {
        try {
            return await prisma_js_1.prisma.$transaction([
                prisma_js_1.prisma.staffUser.update({
                    where: { id: staffUserId },
                    data: { email_verified_at: new Date() },
                }),
                prisma_js_1.prisma.emailVerificationToken.update({
                    where: { id: tokenId },
                    data: { used_at: new Date() },
                }),
            ]);
        }
        catch (error) {
            const user = dev_fallback_store_js_1.devFallbackAuthStore.findUserById(staffUserId);
            if (user)
                user.email_verified_at = new Date();
            return [user, { id: tokenId, used_at: new Date() }];
        }
    }
}
exports.AuthRepository = AuthRepository;

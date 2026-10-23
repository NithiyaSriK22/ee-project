"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRepository = void 0;
exports.checkDatabaseAvailability = checkDatabaseAvailability;
const prisma_js_1 = require("../../database/prisma.js");
const dev_fallback_store_js_1 = require("./dev-fallback-store.js");
const logger_js_1 = require("../../config/logger.js");
let isDbReachable = null;
let lastDbCheck = 0;
async function checkDatabaseAvailability() {
    const now = Date.now();
    if (isDbReachable !== null && now - lastDbCheck < 15000) {
        return isDbReachable;
    }
    try {
        const checkPromise = prisma_js_1.prisma.$queryRaw `SELECT 1`;
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB check timeout')), 250));
        await Promise.race([checkPromise, timeoutPromise]);
        isDbReachable = true;
    }
    catch {
        isDbReachable = false;
    }
    lastDbCheck = now;
    return isDbReachable;
}
class AuthRepository {
    static async findUserByEmail(email) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const user = await prisma_js_1.prisma.staffUser.findUnique({
                    where: { email: email.toLowerCase() },
                });
                if (user)
                    return user;
            }
            catch (error) {
                logger_js_1.logger.warn('Database error in findUserByEmail', { email });
            }
        }
        return dev_fallback_store_js_1.devFallbackAuthStore.findUserByEmail(email);
    }
    static async findUserById(id) {
        const available = await checkDatabaseAvailability();
        if (available) {
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
        try {
            return await prisma_js_1.prisma.staffUser.create({
                data: {
                    email: data.email.toLowerCase(),
                    password_hash: data.passwordHash,
                    full_name: data.fullName,
                    role: data.role,
                    hospital_department: data.hospitalDepartment,
                    status: data.status || 'ACTIVE',
                },
                select: {
                    id: true,
                    email: true,
                    full_name: true,
                    role: true,
                    status: true,
                    hospital_department: true,
                    email_verified_at: true,
                    created_at: true,
                    updated_at: true,
                },
            });
        }
        catch (error) {
            logger_js_1.logger.warn('Database unreachable in createStaffUser, using offline dev fallback store');
            return dev_fallback_store_js_1.devFallbackAuthStore.createStaffUser(data);
        }
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

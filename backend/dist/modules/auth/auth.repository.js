"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRepository = void 0;
const prisma_js_1 = require("../../database/prisma.js");
class AuthRepository {
    static async findUserByEmail(email) {
        return prisma_js_1.prisma.staffUser.findUnique({
            where: { email: email.toLowerCase() },
        });
    }
    static async findUserById(id) {
        return prisma_js_1.prisma.staffUser.findUnique({
            where: { id },
        });
    }
    static async createStaffUser(data) {
        return prisma_js_1.prisma.staffUser.create({
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
    static async updateLastLogin(id) {
        return prisma_js_1.prisma.staffUser.update({
            where: { id },
            data: { last_login_at: new Date() },
        });
    }
    static async updatePassword(id, newPasswordHash) {
        return prisma_js_1.prisma.staffUser.update({
            where: { id },
            data: { password_hash: newPasswordHash },
        });
    }
    static async createRefreshToken(data) {
        return prisma_js_1.prisma.refreshToken.create({
            data: {
                staff_user_id: data.staffUserId,
                token_hash: data.tokenHash,
                expires_at: data.expiresAt,
            },
        });
    }
    static async findRefreshTokenByHash(tokenHash) {
        return prisma_js_1.prisma.refreshToken.findUnique({
            where: { token_hash: tokenHash },
            include: {
                staff_user: true,
            },
        });
    }
    static async revokeRefreshToken(tokenHash) {
        return prisma_js_1.prisma.refreshToken.updateMany({
            where: { token_hash: tokenHash },
            data: { revoked_at: new Date() },
        });
    }
    static async revokeAllUserRefreshTokens(staffUserId) {
        return prisma_js_1.prisma.refreshToken.updateMany({
            where: {
                staff_user_id: staffUserId,
                revoked_at: null,
            },
            data: { revoked_at: new Date() },
        });
    }
    static async createPasswordResetToken(data) {
        return prisma_js_1.prisma.passwordResetToken.create({
            data: {
                staff_user_id: data.staffUserId,
                token_hash: data.tokenHash,
                expires_at: data.expiresAt,
            },
        });
    }
    static async findPasswordResetTokenByHash(tokenHash) {
        return prisma_js_1.prisma.passwordResetToken.findUnique({
            where: { token_hash: tokenHash },
            include: {
                staff_user: true,
            },
        });
    }
    static async markPasswordResetTokenUsed(id) {
        return prisma_js_1.prisma.passwordResetToken.update({
            where: { id },
            data: { used_at: new Date() },
        });
    }
    static async createEmailVerificationToken(data) {
        return prisma_js_1.prisma.emailVerificationToken.create({
            data: {
                staff_user_id: data.staffUserId,
                token_hash: data.tokenHash,
                expires_at: data.expiresAt,
            },
        });
    }
    static async findEmailVerificationTokenByHash(tokenHash) {
        return prisma_js_1.prisma.emailVerificationToken.findUnique({
            where: { token_hash: tokenHash },
            include: {
                staff_user: true,
            },
        });
    }
    static async markEmailVerified(staffUserId, tokenId) {
        return prisma_js_1.prisma.$transaction([
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
}
exports.AuthRepository = AuthRepository;

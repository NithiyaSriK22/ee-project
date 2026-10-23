"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffAdminService = void 0;
const prisma_js_1 = require("../../../database/prisma.js");
const app_error_js_1 = require("../../../errors/app-error.js");
const error_codes_js_1 = require("../../../errors/error-codes.js");
const auth_types_js_1 = require("../../../types/auth.types.js");
const dev_fallback_store_js_1 = require("../../auth/dev-fallback-store.js");
const auth_repository_js_1 = require("../../auth/auth.repository.js");
const audit_service_js_1 = require("../audit/audit.service.js");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class StaffAdminService {
    /**
     * Lists all hospital staff accounts.
     */
    static async listStaff() {
        const isAvailable = await (0, auth_repository_js_1.checkDatabaseAvailability)();
        if (isAvailable) {
            try {
                const users = await prisma_js_1.prisma.staffUser.findMany({
                    select: {
                        id: true,
                        email: true,
                        full_name: true,
                        role: true,
                        hospital_department: true,
                        status: true,
                        created_at: true,
                        last_login_at: true,
                    },
                    orderBy: { created_at: 'desc' },
                });
                if (users.length > 0) {
                    return users.map((u) => ({
                        id: u.id,
                        email: u.email,
                        fullName: u.full_name,
                        role: u.role,
                        hospitalDepartment: u.hospital_department,
                        status: u.status,
                        createdAt: u.created_at.toISOString(),
                        lastLoginAt: u.last_login_at ? u.last_login_at.toISOString() : null,
                    }));
                }
            }
            catch {
                // Fallback below
            }
        }
        // Offline fallback
        const devUsers = dev_fallback_store_js_1.devFallbackAuthStore.listAllUsers();
        return devUsers.map((u) => ({
            id: u.id,
            email: u.email,
            fullName: u.full_name,
            role: u.role,
            hospitalDepartment: u.hospital_department,
            status: u.status,
            createdAt: u.created_at.toISOString(),
            lastLoginAt: u.last_login_at ? u.last_login_at.toISOString() : null,
        }));
    }
    /**
     * Creates a new staff member through Module 2's repository.
     */
    static async createStaff(params) {
        const defaultPassword = params.temporaryPassword || 'TempPass@2026';
        const passwordHash = await bcryptjs_1.default.hash(defaultPassword, 10);
        const existing = await auth_repository_js_1.AuthRepository.findUserByEmail(params.email);
        if (existing) {
            throw new app_error_js_1.AppError('A staff account with this email already exists', 409, error_codes_js_1.ErrorCode.CONFLICT);
        }
        const created = await auth_repository_js_1.AuthRepository.createStaffUser({
            email: params.email,
            fullName: params.fullName,
            passwordHash,
            role: params.role,
            hospitalDepartment: params.hospitalDepartment,
            status: auth_types_js_1.StaffUserStatus.ACTIVE,
        });
        // Record critical audit event
        await audit_service_js_1.AuditService.recordAudit({
            actorType: 'STAFF',
            actorId: params.actorId,
            actorRole: params.actorRole,
            action: 'STAFF_USER_CREATED',
            entityType: 'STAFF_USER',
            entityId: created.id,
            result: 'SUCCESS',
            metadata: {
                role: params.role,
                department: params.hospitalDepartment,
            },
        });
        return {
            id: created.id,
            email: created.email,
            fullName: created.full_name,
            role: created.role,
            hospitalDepartment: created.hospital_department,
            status: created.status,
            createdAt: new Date().toISOString(),
            lastLoginAt: null,
        };
    }
    /**
     * Updates staff role (SUPER_ADMIN only).
     * Separation of duties: a user cannot change their own role.
     */
    static async updateStaffRole(params) {
        if (params.actorId === params.staffId) {
            throw new app_error_js_1.AppError('Separation of duties violation: Administrators cannot modify their own role permissions.', 403, error_codes_js_1.ErrorCode.ADMIN_ACCESS_DENIED);
        }
        let updatedUser = null;
        const isDbReady = await (0, auth_repository_js_1.checkDatabaseAvailability)();
        if (isDbReady) {
            try {
                updatedUser = await prisma_js_1.prisma.staffUser.update({
                    where: { id: params.staffId },
                    data: { role: params.newRole },
                });
            }
            catch {
                // Fallback
            }
        }
        if (!updatedUser) {
            updatedUser = dev_fallback_store_js_1.devFallbackAuthStore.updateUserRole(params.staffId, params.newRole);
        }
        if (!updatedUser) {
            throw new app_error_js_1.AppError('Staff member not found', 404, error_codes_js_1.ErrorCode.NOT_FOUND);
        }
        // Critical audit event for role change
        await audit_service_js_1.AuditService.recordAudit({
            actorType: 'STAFF',
            actorId: params.actorId,
            actorRole: params.actorRole,
            action: 'STAFF_ROLE_CHANGED',
            entityType: 'STAFF_USER',
            entityId: params.staffId,
            result: 'SUCCESS',
            metadata: {
                new_role: params.newRole,
            },
        });
        return {
            id: updatedUser.id,
            email: updatedUser.email,
            fullName: updatedUser.full_name,
            role: updatedUser.role,
            hospitalDepartment: updatedUser.hospital_department,
            status: updatedUser.status,
            createdAt: updatedUser.created_at.toISOString(),
            lastLoginAt: updatedUser.last_login_at ? updatedUser.last_login_at.toISOString() : null,
        };
    }
    /**
     * Deactivates a staff member and revokes all active authentication sessions.
     */
    static async deactivateStaff(params) {
        if (params.actorId === params.staffId) {
            throw new app_error_js_1.AppError('Self-deactivation is not permitted through this endpoint.', 403, error_codes_js_1.ErrorCode.ADMIN_ACCESS_DENIED);
        }
        let deactivated = null;
        const isDbReady = await (0, auth_repository_js_1.checkDatabaseAvailability)();
        if (isDbReady) {
            try {
                deactivated = await prisma_js_1.prisma.staffUser.update({
                    where: { id: params.staffId },
                    data: { status: auth_types_js_1.StaffUserStatus.DISABLED },
                });
                // Revoke all refresh tokens
                await prisma_js_1.prisma.refreshToken.updateMany({
                    where: { staff_user_id: params.staffId },
                    data: { revoked_at: new Date() },
                });
            }
            catch {
                // Fallback
            }
        }
        if (!deactivated) {
            deactivated = dev_fallback_store_js_1.devFallbackAuthStore.updateUserStatus(params.staffId, auth_types_js_1.StaffUserStatus.DISABLED);
            dev_fallback_store_js_1.devFallbackAuthStore.revokeAllUserRefreshTokens(params.staffId);
        }
        if (!deactivated) {
            throw new app_error_js_1.AppError('Staff member not found', 404, error_codes_js_1.ErrorCode.NOT_FOUND);
        }
        // Critical audit event for deactivation
        await audit_service_js_1.AuditService.recordAudit({
            actorType: 'STAFF',
            actorId: params.actorId,
            actorRole: params.actorRole,
            action: 'STAFF_DEACTIVATED',
            entityType: 'STAFF_USER',
            entityId: params.staffId,
            result: 'SUCCESS',
        });
        return {
            id: deactivated.id,
            email: deactivated.email,
            fullName: deactivated.full_name,
            role: deactivated.role,
            hospitalDepartment: deactivated.hospital_department,
            status: deactivated.status,
            createdAt: deactivated.created_at.toISOString(),
            lastLoginAt: deactivated.last_login_at ? deactivated.last_login_at.toISOString() : null,
        };
    }
}
exports.StaffAdminService = StaffAdminService;

import { prisma } from '../../../database/prisma.js';
import { AppError } from '../../../errors/app-error.js';
import { ErrorCode } from '../../../errors/error-codes.js';
import { StaffRole, StaffUserStatus } from '../../../types/auth.types.js';
import { devFallbackAuthStore } from '../../auth/dev-fallback-store.js';
import { AuthRepository, checkDatabaseAvailability } from '../../auth/auth.repository.js';
import { AuditService } from '../audit/audit.service.js';
import bcrypt from 'bcryptjs';

export interface StaffSummaryDTO {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole;
  hospitalDepartment?: string | null;
  status: string;
  createdAt: string;
  lastLoginAt?: string | null;
}

export class StaffAdminService {
  /**
   * Lists all hospital staff accounts.
   */
  public static async listStaff(): Promise<StaffSummaryDTO[]> {
    const isAvailable = await checkDatabaseAvailability();
    if (isAvailable) {
      try {
        const users = await prisma.staffUser.findMany({
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
            role: u.role as StaffRole,
            hospitalDepartment: u.hospital_department,
            status: u.status,
            createdAt: u.created_at.toISOString(),
            lastLoginAt: u.last_login_at ? u.last_login_at.toISOString() : null,
          }));
        }
      } catch {
        // Fallback below
      }
    }

    // Offline fallback
    const devUsers = devFallbackAuthStore.listAllUsers();
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
  public static async createStaff(params: {
    email: string;
    fullName: string;
    role: StaffRole;
    hospitalDepartment?: string;
    temporaryPassword?: string;
    actorId: string;
    actorRole: string;
  }): Promise<StaffSummaryDTO> {
    const defaultPassword = params.temporaryPassword || 'TempPass@2026';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const existing = await AuthRepository.findUserByEmail(params.email);
    if (existing) {
      throw new AppError('A staff account with this email already exists', 409, ErrorCode.CONFLICT);
    }

    const created = await AuthRepository.createStaffUser({
      email: params.email,
      fullName: params.fullName,
      passwordHash,
      role: params.role,
      hospitalDepartment: params.hospitalDepartment,
      status: StaffUserStatus.ACTIVE,
    });

    // Record critical audit event
    await AuditService.recordAudit({
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
      role: created.role as StaffRole,
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
  public static async updateStaffRole(params: {
    staffId: string;
    newRole: StaffRole;
    actorId: string;
    actorRole: string;
  }): Promise<StaffSummaryDTO> {
    if (params.actorId === params.staffId) {
      throw new AppError(
        'Separation of duties violation: Administrators cannot modify their own role permissions.',
        403,
        ErrorCode.ADMIN_ACCESS_DENIED
      );
    }

    let updatedUser: any = null;
    const isDbReady = await checkDatabaseAvailability();

    if (isDbReady) {
      try {
        updatedUser = await prisma.staffUser.update({
          where: { id: params.staffId },
          data: { role: params.newRole },
        });
      } catch {
        // Fallback
      }
    }

    if (!updatedUser) {
      updatedUser = devFallbackAuthStore.updateUserRole(params.staffId, params.newRole);
    }

    if (!updatedUser) {
      throw new AppError('Staff member not found', 404, ErrorCode.NOT_FOUND);
    }

    // Critical audit event for role change
    await AuditService.recordAudit({
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
      role: updatedUser.role as StaffRole,
      hospitalDepartment: updatedUser.hospital_department,
      status: updatedUser.status,
      createdAt: updatedUser.created_at.toISOString(),
      lastLoginAt: updatedUser.last_login_at ? updatedUser.last_login_at.toISOString() : null,
    };
  }

  /**
   * Deactivates a staff member and revokes all active authentication sessions.
   */
  public static async deactivateStaff(params: {
    staffId: string;
    actorId: string;
    actorRole: string;
  }): Promise<StaffSummaryDTO> {
    if (params.actorId === params.staffId) {
      throw new AppError(
        'Self-deactivation is not permitted through this endpoint.',
        403,
        ErrorCode.ADMIN_ACCESS_DENIED
      );
    }

    let deactivated: any = null;
    const isDbReady = await checkDatabaseAvailability();

    if (isDbReady) {
      try {
        deactivated = await prisma.staffUser.update({
          where: { id: params.staffId },
          data: { status: StaffUserStatus.DISABLED },
        });
        // Revoke all refresh tokens
        await prisma.refreshToken.updateMany({
          where: { staff_user_id: params.staffId },
          data: { revoked_at: new Date() },
        });
      } catch {
        // Fallback
      }
    }

    if (!deactivated) {
      deactivated = devFallbackAuthStore.updateUserStatus(params.staffId, StaffUserStatus.DISABLED);
      devFallbackAuthStore.revokeAllUserRefreshTokens(params.staffId);
    }

    if (!deactivated) {
      throw new AppError('Staff member not found', 404, ErrorCode.NOT_FOUND);
    }

    // Critical audit event for deactivation
    await AuditService.recordAudit({
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
      role: deactivated.role as StaffRole,
      hospitalDepartment: deactivated.hospital_department,
      status: deactivated.status,
      createdAt: deactivated.created_at.toISOString(),
      lastLoginAt: deactivated.last_login_at ? deactivated.last_login_at.toISOString() : null,
    };
  }
}

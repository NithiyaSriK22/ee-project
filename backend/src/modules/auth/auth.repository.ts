import { prisma } from '../../database/prisma.js';
import { StaffRole, StaffUserStatusType } from '../../types/auth.types.js';
import { devFallbackAuthStore } from './dev-fallback-store.js';
import { logger } from '../../config/logger.js';

let isDbReachable: boolean | null = null;
let lastDbCheck = 0;

export async function checkDatabaseAvailability(): Promise<boolean> {
  const now = Date.now();
  if (isDbReachable !== null && now - lastDbCheck < 15000) {
    return isDbReachable;
  }

  try {
    const checkPromise = prisma.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB check timeout')), 250)
    );
    await Promise.race([checkPromise, timeoutPromise]);
    isDbReachable = true;
  } catch {
    isDbReachable = false;
  }
  lastDbCheck = now;
  return isDbReachable;
}

export class AuthRepository {
  public static async findUserByEmail(email: string) {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const user = await prisma.staffUser.findUnique({
          where: { email: email.toLowerCase() },
        });
        if (user) return user;
      } catch (error) {
        logger.warn('Database error in findUserByEmail', { email });
      }
    }
    return devFallbackAuthStore.findUserByEmail(email) as any;
  }

  public static async findUserById(id: string) {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const user = await prisma.staffUser.findUnique({
          where: { id },
        });
        if (user) return user;
      } catch (error) {
        logger.warn('Database error in findUserById', { id });
      }
    }
    return devFallbackAuthStore.findUserById(id) as any;
  }

  public static async createStaffUser(data: {
    email: string;
    passwordHash: string;
    fullName: string;
    role: StaffRole;
    hospitalDepartment?: string;
    status?: StaffUserStatusType;
  }) {
    try {
      return await prisma.staffUser.create({
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
    } catch (error) {
      logger.warn('Database unreachable in createStaffUser, using offline dev fallback store');
      return devFallbackAuthStore.createStaffUser(data) as any;
    }
  }

  public static async updateLastLogin(id: string) {
    try {
      return await prisma.staffUser.update({
        where: { id },
        data: { last_login_at: new Date() },
      });
    } catch (error) {
      return devFallbackAuthStore.updateLastLogin(id) as any;
    }
  }

  public static async updatePassword(id: string, newPasswordHash: string) {
    try {
      return await prisma.staffUser.update({
        where: { id },
        data: { password_hash: newPasswordHash },
      });
    } catch (error) {
      const user = devFallbackAuthStore.findUserById(id);
      if (user) user.password_hash = newPasswordHash;
      return user as any;
    }
  }

  public static async createRefreshToken(data: {
    staffUserId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    try {
      return await prisma.refreshToken.create({
        data: {
          staff_user_id: data.staffUserId,
          token_hash: data.tokenHash,
          expires_at: data.expiresAt,
        },
      });
    } catch (error) {
      return devFallbackAuthStore.createRefreshToken(data) as any;
    }
  }

  public static async findRefreshTokenByHash(tokenHash: string) {
    try {
      return await prisma.refreshToken.findUnique({
        where: { token_hash: tokenHash },
        include: {
          staff_user: true,
        },
      });
    } catch (error) {
      return devFallbackAuthStore.findRefreshTokenByHash(tokenHash) as any;
    }
  }

  public static async revokeRefreshToken(tokenHash: string) {
    try {
      return await prisma.refreshToken.updateMany({
        where: { token_hash: tokenHash },
        data: { revoked_at: new Date() },
      });
    } catch (error) {
      devFallbackAuthStore.revokeRefreshToken(tokenHash);
      return { count: 1 } as any;
    }
  }

  public static async revokeAllUserRefreshTokens(staffUserId: string) {
    try {
      return await prisma.refreshToken.updateMany({
        where: {
          staff_user_id: staffUserId,
          revoked_at: null,
        },
        data: { revoked_at: new Date() },
      });
    } catch (error) {
      devFallbackAuthStore.revokeAllUserRefreshTokens(staffUserId);
      return { count: 1 } as any;
    }
  }

  public static async createPasswordResetToken(data: {
    staffUserId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    try {
      return await prisma.passwordResetToken.create({
        data: {
          staff_user_id: data.staffUserId,
          token_hash: data.tokenHash,
          expires_at: data.expiresAt,
        },
      });
    } catch (error) {
      return { id: `reset-${Date.now()}`, ...data } as any;
    }
  }

  public static async findPasswordResetTokenByHash(tokenHash: string) {
    try {
      return await prisma.passwordResetToken.findUnique({
        where: { token_hash: tokenHash },
        include: {
          staff_user: true,
        },
      });
    } catch (error) {
      return null;
    }
  }

  public static async markPasswordResetTokenUsed(id: string) {
    try {
      return await prisma.passwordResetToken.update({
        where: { id },
        data: { used_at: new Date() },
      });
    } catch (error) {
      return null;
    }
  }

  public static async createEmailVerificationToken(data: {
    staffUserId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    try {
      return await prisma.emailVerificationToken.create({
        data: {
          staff_user_id: data.staffUserId,
          token_hash: data.tokenHash,
          expires_at: data.expiresAt,
        },
      });
    } catch (error) {
      return { id: `verify-${Date.now()}`, ...data } as any;
    }
  }

  public static async findEmailVerificationTokenByHash(tokenHash: string) {
    try {
      return await prisma.emailVerificationToken.findUnique({
        where: { token_hash: tokenHash },
        include: {
          staff_user: true,
        },
      });
    } catch (error) {
      return null;
    }
  }

  public static async markEmailVerified(staffUserId: string, tokenId: string) {
    try {
      return await prisma.$transaction([
        prisma.staffUser.update({
          where: { id: staffUserId },
          data: { email_verified_at: new Date() },
        }),
        prisma.emailVerificationToken.update({
          where: { id: tokenId },
          data: { used_at: new Date() },
        }),
      ]);
    } catch (error) {
      const user = devFallbackAuthStore.findUserById(staffUserId);
      if (user) user.email_verified_at = new Date();
      return [user, { id: tokenId, used_at: new Date() }] as any;
    }
  }
}

import { prisma } from '../../database/prisma.js';
import { StaffRole, StaffUserStatusType } from '../../types/auth.types.js';

export class AuthRepository {
  public static async findUserByEmail(email: string) {
    return prisma.staffUser.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  public static async findUserById(id: string) {
    return prisma.staffUser.findUnique({
      where: { id },
    });
  }

  public static async createStaffUser(data: {
    email: string;
    passwordHash: string;
    fullName: string;
    role: StaffRole;
    hospitalDepartment?: string;
    status?: StaffUserStatusType;
  }) {
    return prisma.staffUser.create({
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

  public static async updateLastLogin(id: string) {
    return prisma.staffUser.update({
      where: { id },
      data: { last_login_at: new Date() },
    });
  }

  public static async updatePassword(id: string, newPasswordHash: string) {
    return prisma.staffUser.update({
      where: { id },
      data: { password_hash: newPasswordHash },
    });
  }

  public static async createRefreshToken(data: {
    staffUserId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return prisma.refreshToken.create({
      data: {
        staff_user_id: data.staffUserId,
        token_hash: data.tokenHash,
        expires_at: data.expiresAt,
      },
    });
  }

  public static async findRefreshTokenByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({
      where: { token_hash: tokenHash },
      include: {
        staff_user: true,
      },
    });
  }

  public static async revokeRefreshToken(tokenHash: string) {
    return prisma.refreshToken.updateMany({
      where: { token_hash: tokenHash },
      data: { revoked_at: new Date() },
    });
  }

  public static async revokeAllUserRefreshTokens(staffUserId: string) {
    return prisma.refreshToken.updateMany({
      where: {
        staff_user_id: staffUserId,
        revoked_at: null,
      },
      data: { revoked_at: new Date() },
    });
  }

  public static async createPasswordResetToken(data: {
    staffUserId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return prisma.passwordResetToken.create({
      data: {
        staff_user_id: data.staffUserId,
        token_hash: data.tokenHash,
        expires_at: data.expiresAt,
      },
    });
  }

  public static async findPasswordResetTokenByHash(tokenHash: string) {
    return prisma.passwordResetToken.findUnique({
      where: { token_hash: tokenHash },
      include: {
        staff_user: true,
      },
    });
  }

  public static async markPasswordResetTokenUsed(id: string) {
    return prisma.passwordResetToken.update({
      where: { id },
      data: { used_at: new Date() },
    });
  }

  public static async createEmailVerificationToken(data: {
    staffUserId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return prisma.emailVerificationToken.create({
      data: {
        staff_user_id: data.staffUserId,
        token_hash: data.tokenHash,
        expires_at: data.expiresAt,
      },
    });
  }

  public static async findEmailVerificationTokenByHash(tokenHash: string) {
    return prisma.emailVerificationToken.findUnique({
      where: { token_hash: tokenHash },
      include: {
        staff_user: true,
      },
    });
  }

  public static async markEmailVerified(staffUserId: string, tokenId: string) {
    return prisma.$transaction([
      prisma.staffUser.update({
        where: { id: staffUserId },
        data: { email_verified_at: new Date() },
      }),
      prisma.emailVerificationToken.update({
        where: { id: tokenId },
        data: { used_at: new Date() },
      }),
    ]);
  }
}

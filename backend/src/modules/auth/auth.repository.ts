import { prisma, checkDatabaseHealth } from '../../database/prisma.js';
import { StaffRole, StaffUserStatusType } from '../../types/auth.types.js';
import { devFallbackAuthStore } from './dev-fallback-store.js';
import { logger } from '../../config/logger.js';
import { ConflictError } from '../../errors/app-error.js';

export async function checkDatabaseAvailability(): Promise<boolean> {
  return checkDatabaseHealth();
}

const TEST_DOCTOR_ALIASES: Record<string, string> = {
  'doctor1@medbrief.test': 'arun@medbrief.test',
  'doctor2@medbrief.test': 'priya@medbrief.test',
  'doctor3@medbrief.test': 'meena@medbrief.test',
  'doctor4@medbrief.test': 'karthik@medbrief.test',
  'doctor5@medbrief.test': 'divya@medbrief.test',
  'doctor6@medbrief.test': 'kavya@medbrief.test',
};

export class AuthRepository {
  public static async findUserByEmail(email: string) {
    const normalized = email.toLowerCase().trim();
    const targetEmail = TEST_DOCTOR_ALIASES[normalized] || normalized;
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const user = await prisma.staffUser.findUnique({
          where: { email: targetEmail },
        });
        if (user) return user;
      } catch (error) {
        logger.warn('Database error in findUserByEmail', { email: targetEmail });
      }
    }
    return devFallbackAuthStore.findUserByEmail(targetEmail) as any;
  }

  public static async findUserById(id: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const available = await checkDatabaseAvailability();
    if (available && isUuid) {
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
    medicalRegistrationNumber?: string;
    clinicName?: string;
    qualification?: string;
    experienceYears?: number;
    designation?: string;
    phoneNumber?: string;
    status?: StaffUserStatusType;
  }) {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        return await prisma.staffUser.create({
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
      } catch (error: any) {
        if (error?.code === 'P2002') {
          throw new ConflictError('A staff account with this email address already exists');
        }
        logger.warn('Database error in createStaffUser, falling back to dev store', { error: error?.message });
      }
    }

    const fallbackUser = devFallbackAuthStore.createStaffUser({
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
    } as any;
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

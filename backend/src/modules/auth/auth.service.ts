import { AuthRepository } from './auth.repository.js';
import { prisma } from '../../database/prisma.js';
import { TokenUtil } from '../../utils/token.util.js';
import {
  UnauthorizedError,
  ConflictError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../../errors/app-error.js';
import { logger } from '../../config/logger.js';
import { StaffRole, StaffUserStatus } from '../../types/auth.types.js';
import { EmailGeneratorUtil } from '../../utils/email-generator.util.js';

export class AuthService {
  public static async registerStaff(data: {
    email: string;
    password: string;
    fullName: string;
    role?: StaffRole;
    hospitalDepartment?: string;
    specialization?: string;
    medicalRegistrationNumber?: string;
    clinicName?: string;
    hospitalName?: string;
    qualification?: string;
    experienceYears?: number;
    designation?: string;
    phoneNumber?: string;
  }) {
    const existing = await AuthRepository.findUserByEmail(data.email);
    if (existing) {
      throw new ConflictError('A staff account with this email address already exists');
    }

    const passwordHash = await TokenUtil.hashPassword(data.password);
    const role: StaffRole = data.role || 'DOCTOR';
    const department = data.hospitalDepartment || data.specialization || 'General Medicine';
    const clinic = data.clinicName || data.hospitalName || 'MEDBRIEF Clinical Care';

    const user = await AuthRepository.createStaffUser({
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

    logger.info('Staff user account created', {
      actorRole: role,
      department,
      email: data.email,
    });

    return {
      id: user.id,
      email: user.email,
      fullName: (user as any).full_name || (user as any).fullName,
      role: user.role,
      status: user.status,
      accountStatus: user.status,
      hospitalDepartment: (user as any).hospital_department || (user as any).hospitalDepartment,
      specialization: (user as any).hospital_department || (user as any).hospitalDepartment,
      medicalRegistrationNumber: (user as any).medical_registration_number || (user as any).medicalRegistrationNumber,
      clinicName: (user as any).clinic_name || (user as any).clinicName,
      hospitalName: (user as any).clinic_name || (user as any).clinicName,
      qualification: (user as any).qualification,
      experienceYears: (user as any).experience_years ?? (user as any).experienceYears ?? 0,
      designation: (user as any).designation,
      phoneNumber: (user as any).phone_number || (user as any).phoneNumber,
      createdAt: (user as any).created_at || (user as any).createdAt,
      updatedAt: (user as any).updated_at || (user as any).updatedAt,
    };
  }

  public static async suggestEmail(fullName: string) {
    const email = await EmailGeneratorUtil.generateUniqueShortEmail(fullName);
    return { email };
  }

  public static async loginStaff(credentials: { email: string; password: string }) {
    const user = await AuthRepository.findUserByEmail(credentials.email);
    if (!user) {
      logger.warn('Staff login failed: invalid credentials');
      throw new UnauthorizedError('Invalid email or password');
    }

    let isMatch = false;
    try {
      isMatch = await TokenUtil.comparePassword(credentials.password, user.password_hash);
    } catch {
      isMatch = false;
    }

    if (!isMatch) {
      logger.warn('Staff login failed: invalid credentials');
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status === StaffUserStatus.DISABLED || user.status === StaffUserStatus.SUSPENDED) {
      logger.warn('Staff login blocked: account inactive', { status: user.status });
      throw new ForbiddenError(`Account is ${user.status.toLowerCase()}. Please contact system administrator.`);
    }

    await AuthRepository.updateLastLogin(user.id);

    // Issue short-lived access token + long-lived refresh token
    const accessToken = TokenUtil.generateStaffAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role as StaffRole,
      fullName: user.full_name,
      department: user.hospital_department,
    });

    const refreshTokenData = TokenUtil.generateStaffRefreshToken();
    await AuthRepository.createRefreshToken({
      staffUserId: user.id,
      tokenHash: refreshTokenData.hash,
      expiresAt: refreshTokenData.expiresAt,
    });

    logger.info('Staff login successful', {
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
        medicalRegistrationNumber: (user as any).medical_registration_number || null,
        clinicName: (user as any).clinic_name || null,
        hospitalName: (user as any).clinic_name || null,
        qualification: (user as any).qualification || null,
        experienceYears: (user as any).experience_years ?? 0,
        designation: (user as any).designation || null,
        phoneNumber: (user as any).phone_number || null,
        emailVerifiedAt: user.email_verified_at,
      },
      tokens: {
        accessToken,
        refreshToken: refreshTokenData.token,
        tokenType: 'Bearer',
      },
    };
  }

  public static async logout(refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = TokenUtil.hashToken(refreshToken);
      await AuthRepository.revokeRefreshToken(tokenHash);
    }
    logger.info('Staff logout completed');
    return { success: true, message: 'Successfully logged out' };
  }

  public static async refreshAccessToken(rawRefreshToken: string) {
    const tokenHash = TokenUtil.hashToken(rawRefreshToken);
    const storedToken = await AuthRepository.findRefreshTokenByHash(tokenHash);

    if (!storedToken || storedToken.revoked_at || new Date() > storedToken.expires_at) {
      logger.warn('Token refresh rejected: invalid or expired refresh token');
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = storedToken.staff_user;
    if (user.status !== StaffUserStatus.ACTIVE) {
      throw new ForbiddenError('Staff account is no longer active');
    }

    // Revoke old refresh token (token rotation)
    await AuthRepository.revokeRefreshToken(tokenHash);

    // Issue fresh pair
    const accessToken = TokenUtil.generateStaffAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role as StaffRole,
      fullName: user.full_name,
      department: user.hospital_department,
    });

    const newRefreshTokenData = TokenUtil.generateStaffRefreshToken();
    await AuthRepository.createRefreshToken({
      staffUserId: user.id,
      tokenHash: newRefreshTokenData.hash,
      expiresAt: newRefreshTokenData.expiresAt,
    });

    logger.info('Staff session token refreshed', { actorRole: user.role });

    return {
      accessToken,
      refreshToken: newRefreshTokenData.token,
      tokenType: 'Bearer',
    };
  }

  public static async getProfile(userId: string) {
    const user = await AuthRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError('User profile not found');
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
      medicalRegistrationNumber: (user as any).medical_registration_number || null,
      clinicName: (user as any).clinic_name || null,
      hospitalName: (user as any).clinic_name || null,
      qualification: (user as any).qualification || null,
      experienceYears: (user as any).experience_years ?? 0,
      designation: (user as any).designation || null,
      phoneNumber: (user as any).phone_number || null,
      emailVerifiedAt: user.email_verified_at,
      createdAt: user.created_at,
    };
  }

  public static async changePassword(
    userId: string,
    passwords: { currentPassword: string; newPassword: string }
  ) {
    const user = await AuthRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isMatch = await TokenUtil.comparePassword(passwords.currentPassword, user.password_hash);
    if (!isMatch) {
      throw new ValidationError('Current password is incorrect');
    }

    const newHash = await TokenUtil.hashPassword(passwords.newPassword);
    await AuthRepository.updatePassword(userId, newHash);
    await AuthRepository.revokeAllUserRefreshTokens(userId);

    logger.info('Staff password changed successfully');
    return { success: true, message: 'Password updated successfully. Please log in with your new password.' };
  }

  public static async forgotPassword(email: string) {
    const user = await AuthRepository.findUserByEmail(email);
    if (user && user.status === StaffUserStatus.ACTIVE) {
      const rawToken = TokenUtil.generateRandomToken(32);
      const tokenHash = TokenUtil.hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await AuthRepository.createPasswordResetToken({
        staffUserId: user.id,
        tokenHash,
        expiresAt,
      });

      logger.info('Password reset token generated for staff member');
      // In Module 2, email sending integration is architected and tokens generated; logged without sensitive credentials
    }

    // Generic response to prevent account enumeration
    return {
      success: true,
      message: 'If an account exists with this email, password reset instructions have been dispatched.',
    };
  }

  public static async resetPassword(data: { token: string; newPassword: string }) {
    const tokenHash = TokenUtil.hashToken(data.token);
    const resetRecord = await AuthRepository.findPasswordResetTokenByHash(tokenHash);

    if (!resetRecord || resetRecord.used_at || new Date() > resetRecord.expires_at) {
      throw new ValidationError('Password reset link is invalid or has expired');
    }

    const newHash = await TokenUtil.hashPassword(data.newPassword);
    await AuthRepository.updatePassword(resetRecord.staff_user_id, newHash);
    await AuthRepository.markPasswordResetTokenUsed(resetRecord.id);
    await AuthRepository.revokeAllUserRefreshTokens(resetRecord.staff_user_id);

    logger.info('Staff password reset completed');
    return {
      success: true,
      message: 'Password has been reset successfully. You may now log in.',
    };
  }

  public static async verifyEmail(token: string) {
    const tokenHash = TokenUtil.hashToken(token);
    const record = await AuthRepository.findEmailVerificationTokenByHash(tokenHash);

    if (!record || record.used_at || new Date() > record.expires_at) {
      throw new ValidationError('Email verification token is invalid or has expired');
    }

    await AuthRepository.markEmailVerified(record.staff_user_id, record.id);
    logger.info('Staff email verified successfully');

    return {
      success: true,
      message: 'Email address has been successfully verified.',
    };
  }

  public static async resendVerification(email: string) {
    const user = await AuthRepository.findUserByEmail(email);
    if (user && !user.email_verified_at) {
      const rawToken = TokenUtil.generateRandomToken(32);
      const tokenHash = TokenUtil.hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await AuthRepository.createEmailVerificationToken({
        staffUserId: user.id,
        tokenHash,
        expiresAt,
      });
      logger.info('Email verification token generated');
    }

    // Zero account enumeration response
    return {
      success: true,
      message: 'If the account exists and is unverified, a new verification link has been sent.',
    };
  }

  public static async updateProfile(userId: string, data: {
    fullName?: string;
    hospitalDepartment?: string;
    specialization?: string;
    medicalRegistrationNumber?: string;
    clinicName?: string;
    hospitalName?: string;
    qualification?: string;
    experienceYears?: number;
    designation?: string;
    phoneNumber?: string;
  }) {
    const updateData: any = {};
    if (data.fullName) updateData.full_name = data.fullName;
    if (data.hospitalDepartment || data.specialization) updateData.hospital_department = data.hospitalDepartment || data.specialization;
    if (data.medicalRegistrationNumber) updateData.medical_registration_number = data.medicalRegistrationNumber;
    if (data.clinicName || data.hospitalName) updateData.clinic_name = data.clinicName || data.hospitalName;
    if (data.qualification !== undefined) updateData.qualification = data.qualification;
    if (data.experienceYears !== undefined) updateData.experience_years = data.experienceYears;
    if (data.designation !== undefined) updateData.designation = data.designation;
    if (data.phoneNumber !== undefined) updateData.phone_number = data.phoneNumber;

    const updated = await prisma.staffUser.update({
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

  public static async listDoctors() {
    const doctors = await prisma.staffUser.findMany({
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

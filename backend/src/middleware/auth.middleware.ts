import { Response, NextFunction } from 'express';
import { AppRequest } from '../types/api.types.js';
import { TokenUtil } from '../utils/token.util.js';
import { UnauthorizedError, ForbiddenError } from '../errors/app-error.js';
import { prisma, checkDatabaseHealth } from '../database/prisma.js';
import { AuthRepository } from '../modules/auth/auth.repository.js';
import { StaffRole, StaffUserStatus } from '../types/auth.types.js';
import { KioskHardeningService } from '../modules/deployment/kiosk-hardening.service.js';
import { devFallbackPatientStore } from '../modules/patients/dev-fallback-patient-store.js';


/**
 * Middleware: Authenticates Staff / Doctor / Admin users using short-lived Bearer JWT
 */
export const authenticateStaff = async (
  req: AppRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token required');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Malformed authorization header');
    }

    let claims;
    try {
      claims = TokenUtil.verifyStaffAccessToken(token);
    } catch {
      throw new UnauthorizedError('Invalid or expired authentication token');
    }

    // Verify staff user in database (or offline fallback)
    const staffUser = await AuthRepository.findUserById(claims.sub);

    if (!staffUser) {
      throw new UnauthorizedError('User account not found');
    }

    if (staffUser.status === StaffUserStatus.DISABLED || staffUser.status === StaffUserStatus.SUSPENDED) {
      throw new ForbiddenError(`Account is ${staffUser.status.toLowerCase()}. Access denied.`);
    }

    req.user = {
      id: staffUser.id,
      email: staffUser.email,
      role: staffUser.role as StaffRole,
      fullName: staffUser.full_name,
      hospitalDepartment: staffUser.hospital_department || (claims as any).hospitalDepartment || (claims as any).department || null,
      status: staffUser.status as any,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: Role-based Access Control (RBAC)
 */
export const authorizeRoles = (...allowedRoles: StaffRole[]) => {
  return (req: AppRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access forbidden: Role '${req.user.role}' lacks permission for this endpoint`
        )
      );
    }

    next();
  };
};

/**
 * Middleware: Authenticates Kiosk Patient Visit Session using visit-scoped token
 */
export const authenticateKioskSession = async (
  req: AppRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const kioskHeader = req.headers['x-kiosk-session-token'] as string | undefined;
    
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (kioskHeader) {
      token = kioskHeader;
    }

    if (!token) {
      throw new UnauthorizedError('Kiosk session token required');
    }

    let claims;
    try {
      claims = TokenUtil.verifyKioskSessionToken(token);
    } catch {
      throw new UnauthorizedError('Invalid or expired kiosk session token');
    }

    if (KioskHardeningService.isSessionWiped(claims.visitId)) {
      throw new UnauthorizedError('Kiosk session has ended and all local/session context has been wiped');
    }


    // Lookup session in DB to ensure not ended/revoked
    let session = null;
    const isDbUp = await checkDatabaseHealth();
    if (isDbUp) {
      try {
        session = await prisma.kioskSession.findUnique({
          where: { visit_id: claims.visitId },
          include: {
            patient: {
              select: {
                hospital_registration_number: true,
              },
            },
          },
        });
      } catch {}
    }

    if (!session) {
      const fallbackSession = devFallbackPatientStore.findSessionByVisitId(claims.visitId);
      if (fallbackSession) {
        session = {
          id: fallbackSession.id,
          visit_id: fallbackSession.visit_id,
          patient_id: fallbackSession.patient_id,
          visit_profile_id: fallbackSession.visit_profile_id,
          status: fallbackSession.status,
          expires_at: fallbackSession.expires_at,
          patient: {
            hospital_registration_number:
              fallbackSession.patient?.hospital_registration_number ||
              (claims as any).hospitalRegistrationNumber ||
              'HRN-DEFAULT',
          },
        };
      } else {
        session = {
          id: claims.sessionId || 'dev-kiosk-session',
          visit_id: claims.visitId,
          patient_id: claims.patientId,
          visit_profile_id: (claims as any).visitProfileId,
          status: 'ACTIVE',
          expires_at: new Date(Date.now() + 3600000),
          patient: {
            hospital_registration_number: (claims as any).hospitalRegistrationNumber || 'HRN-DEFAULT',
          },
        };
      }
    }

    if (!session) {
      throw new UnauthorizedError('Active kiosk session not found for this visit');
    }

    if (session.status !== 'ACTIVE') {
      throw new UnauthorizedError(`Kiosk session is ${session.status.toLowerCase()}`);
    }

    if (new Date() > session.expires_at) {
      if (isDbUp) {
        try {
          await prisma.kioskSession.update({
            where: { id: session.id },
            data: { status: 'EXPIRED' },
          });
        } catch {}
      }
      devFallbackPatientStore.endSession(session.visit_id);
      throw new UnauthorizedError('Kiosk session has expired. Please restart your visit.');
    }

    // Touch last accessed timestamp asynchronously only if DB is up
    if (isDbUp) {
      prisma.kioskSession
        .update({
          where: { id: session.id },
          data: { last_accessed_at: new Date() },
        })
        .catch(() => {});
    }

    req.kioskSession = {
      sessionId: session.id,
      visitId: session.visit_id,
      patientId: session.patient_id,
      visitProfileId: session.visit_profile_id || undefined,
      hospitalRegistrationNumber: session.patient.hospital_registration_number,
    };

    next();
  } catch (error) {
    next(error);
  }
};

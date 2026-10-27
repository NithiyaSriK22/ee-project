"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateKioskSession = exports.authorizeRoles = exports.authenticateStaff = void 0;
const token_util_js_1 = require("../utils/token.util.js");
const app_error_js_1 = require("../errors/app-error.js");
const prisma_js_1 = require("../database/prisma.js");
const auth_repository_js_1 = require("../modules/auth/auth.repository.js");
const auth_types_js_1 = require("../types/auth.types.js");
const kiosk_hardening_service_js_1 = require("../modules/deployment/kiosk-hardening.service.js");
const dev_fallback_patient_store_js_1 = require("../modules/patients/dev-fallback-patient-store.js");
/**
 * Middleware: Authenticates Staff / Doctor / Admin users using short-lived Bearer JWT
 */
const authenticateStaff = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new app_error_js_1.UnauthorizedError('Authentication token required');
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            throw new app_error_js_1.UnauthorizedError('Malformed authorization header');
        }
        let claims;
        try {
            claims = token_util_js_1.TokenUtil.verifyStaffAccessToken(token);
        }
        catch {
            throw new app_error_js_1.UnauthorizedError('Invalid or expired authentication token');
        }
        // Verify staff user in database (or offline fallback)
        const staffUser = await auth_repository_js_1.AuthRepository.findUserById(claims.sub);
        if (!staffUser) {
            throw new app_error_js_1.UnauthorizedError('User account not found');
        }
        if (staffUser.status === auth_types_js_1.StaffUserStatus.DISABLED || staffUser.status === auth_types_js_1.StaffUserStatus.SUSPENDED) {
            throw new app_error_js_1.ForbiddenError(`Account is ${staffUser.status.toLowerCase()}. Access denied.`);
        }
        req.user = {
            id: staffUser.id,
            email: staffUser.email,
            role: staffUser.role,
            fullName: staffUser.full_name,
            hospitalDepartment: staffUser.hospital_department || claims.hospitalDepartment || claims.department || null,
            status: staffUser.status,
        };
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.authenticateStaff = authenticateStaff;
/**
 * Middleware: Role-based Access Control (RBAC)
 */
const authorizeRoles = (...allowedRoles) => {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new app_error_js_1.UnauthorizedError('Authentication required'));
        }
        if (!allowedRoles.includes(req.user.role)) {
            return next(new app_error_js_1.ForbiddenError(`Access forbidden: Role '${req.user.role}' lacks permission for this endpoint`));
        }
        next();
    };
};
exports.authorizeRoles = authorizeRoles;
/**
 * Middleware: Authenticates Kiosk Patient Visit Session using visit-scoped token
 */
const authenticateKioskSession = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const kioskHeader = req.headers['x-kiosk-session-token'];
        let token;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
        else if (kioskHeader) {
            token = kioskHeader;
        }
        if (!token) {
            throw new app_error_js_1.UnauthorizedError('Kiosk session token required');
        }
        let claims;
        try {
            claims = token_util_js_1.TokenUtil.verifyKioskSessionToken(token);
        }
        catch {
            throw new app_error_js_1.UnauthorizedError('Invalid or expired kiosk session token');
        }
        if (kiosk_hardening_service_js_1.KioskHardeningService.isSessionWiped(claims.visitId)) {
            throw new app_error_js_1.UnauthorizedError('Kiosk session has ended and all local/session context has been wiped');
        }
        // Lookup session in DB to ensure not ended/revoked
        let session = null;
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                session = await prisma_js_1.prisma.kioskSession.findUnique({
                    where: { visit_id: claims.visitId },
                    include: {
                        patient: {
                            select: {
                                hospital_registration_number: true,
                            },
                        },
                    },
                });
            }
            catch { }
        }
        if (!session) {
            const fallbackSession = dev_fallback_patient_store_js_1.devFallbackPatientStore.findSessionByVisitId(claims.visitId);
            if (fallbackSession) {
                session = {
                    id: fallbackSession.id,
                    visit_id: fallbackSession.visit_id,
                    patient_id: fallbackSession.patient_id,
                    visit_profile_id: fallbackSession.visit_profile_id,
                    status: fallbackSession.status,
                    expires_at: fallbackSession.expires_at,
                    patient: {
                        hospital_registration_number: fallbackSession.patient?.hospital_registration_number ||
                            claims.hospitalRegistrationNumber ||
                            'HRN-DEFAULT',
                    },
                };
            }
            else {
                session = {
                    id: claims.sessionId || 'dev-kiosk-session',
                    visit_id: claims.visitId,
                    patient_id: claims.patientId,
                    visit_profile_id: claims.visitProfileId,
                    status: 'ACTIVE',
                    expires_at: new Date(Date.now() + 3600000),
                    patient: {
                        hospital_registration_number: claims.hospitalRegistrationNumber || 'HRN-DEFAULT',
                    },
                };
            }
        }
        if (!session) {
            throw new app_error_js_1.UnauthorizedError('Active kiosk session not found for this visit');
        }
        if (session.status !== 'ACTIVE') {
            throw new app_error_js_1.UnauthorizedError(`Kiosk session is ${session.status.toLowerCase()}`);
        }
        if (new Date() > session.expires_at) {
            if (isDbUp) {
                try {
                    await prisma_js_1.prisma.kioskSession.update({
                        where: { id: session.id },
                        data: { status: 'EXPIRED' },
                    });
                }
                catch { }
            }
            dev_fallback_patient_store_js_1.devFallbackPatientStore.endSession(session.visit_id);
            throw new app_error_js_1.UnauthorizedError('Kiosk session has expired. Please restart your visit.');
        }
        // Touch last accessed timestamp asynchronously only if DB is up
        if (isDbUp) {
            prisma_js_1.prisma.kioskSession
                .update({
                where: { id: session.id },
                data: { last_accessed_at: new Date() },
            })
                .catch(() => { });
        }
        req.kioskSession = {
            sessionId: session.id,
            visitId: session.visit_id,
            patientId: session.patient_id,
            visitProfileId: session.visit_profile_id || undefined,
            hospitalRegistrationNumber: session.patient.hospital_registration_number,
        };
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.authenticateKioskSession = authenticateKioskSession;

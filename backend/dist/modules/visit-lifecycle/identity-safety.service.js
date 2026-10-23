"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentitySafetyService = void 0;
const app_error_js_1 = require("../../errors/app-error.js");
const logger_js_1 = require("../../config/logger.js");
const dev_fallback_admin_store_js_1 = require("../admin/dev-fallback-admin-store.js");
class IdentitySafetyService {
    // Device failure tracking for enumeration protection & lockout
    static failedAttempts = new Map();
    // In-memory patient master directory (synced with dev fallback)
    static patientDirectory = new Map([
        [
            'pat_demo_001',
            {
                id: 'pat_demo_001',
                hospital_registration_number: 'MK-2026-100201',
                full_name: 'Aarav Sharma',
                date_of_birth: new Date('1985-06-15'),
                age: 41,
                gender: 'MALE',
                contact_number: '+919876543210',
                preferred_language: 'hi',
                identity_state: 'CONFIRMED',
                status: 'ACTIVE',
                created_at: new Date('2026-01-10'),
                updated_at: new Date('2026-01-10'),
            },
        ],
        [
            'pat_demo_002',
            {
                id: 'pat_demo_002',
                hospital_registration_number: 'MK-2026-100202',
                full_name: 'Priya Sundaram',
                date_of_birth: new Date('1992-11-20'),
                age: 34,
                gender: 'FEMALE',
                contact_number: '+919876543211',
                preferred_language: 'ta',
                identity_state: 'CONFIRMED',
                status: 'ACTIVE',
                created_at: new Date('2026-01-12'),
                updated_at: new Date('2026-01-12'),
            },
        ],
    ]);
    // Merge history ledger (reversible)
    static mergeHistory = [];
    // Active kiosk session lock: patientId -> { deviceCode, visitId, startedAt }
    static activeKioskSessions = new Map();
    // --- Two-Factor Kiosk Lookup (Anti-Enumeration & Wrong-Patient Prevention) ---
    static verifyReturningPatient(params) {
        const deviceKey = params.deviceCode || 'default_kiosk';
        const now = new Date();
        // 1. Check device lockout
        const attemptInfo = this.failedAttempts.get(deviceKey);
        if (attemptInfo?.lockedUntil && attemptInfo.lockedUntil > now) {
            const waitMinutes = Math.ceil((attemptInfo.lockedUntil.getTime() - now.getTime()) / 60000);
            throw new app_error_js_1.UnauthorizedError(`Multiple failed identification attempts detected. Kiosk is locked out for ${waitMinutes} more minute(s). Please proceed to the registration desk.`);
        }
        const regNum = params.hospitalRegistrationNumber.trim().toUpperCase();
        const patient = Array.from(this.patientDirectory.values()).find((p) => p.hospital_registration_number.toUpperCase() === regNum && p.status === 'ACTIVE');
        // Generic error if patient not found (Zero enumeration)
        if (!patient) {
            this.recordFailedAttempt(deviceKey);
            throw new app_error_js_1.NotFoundError('Patient identification could not be verified. Please verify your details or proceed to the desk.');
        }
        // 2. Validate second factor strictly
        let secondFactorPassed = false;
        if (params.secondFactor.dateOfBirth && patient.date_of_birth) {
            const patientDobStr = patient.date_of_birth.toISOString().split('T')[0];
            if (params.secondFactor.dateOfBirth.trim() === patientDobStr) {
                secondFactorPassed = true;
            }
        }
        else if (params.secondFactor.age !== undefined && patient.age !== undefined && patient.age !== null) {
            const ageMatches = Math.abs(params.secondFactor.age - patient.age) <= 1; // Allow 1-year margin for birthday delta
            let nameMatches = true;
            if (params.secondFactor.partialName) {
                const pNorm = patient.full_name.trim().toLowerCase();
                const inputNorm = params.secondFactor.partialName.trim().toLowerCase();
                nameMatches = pNorm.startsWith(inputNorm) || pNorm.includes(inputNorm);
            }
            if (ageMatches && nameMatches) {
                secondFactorPassed = true;
            }
        }
        if (!secondFactorPassed) {
            this.recordFailedAttempt(deviceKey);
            throw new app_error_js_1.NotFoundError('Patient identification could not be verified. Please verify your details or proceed to the desk.');
        }
        // Success: Reset failed attempts for this device
        this.failedAttempts.delete(deviceKey);
        // Minimal privacy-preserving confirmation: e.g. "A**** S*****"
        const nameParts = patient.full_name.trim().split(/\s+/);
        const maskedParts = nameParts.map((part) => part.length > 2 ? `${part.substring(0, 1)}${'*'.repeat(Math.min(part.length - 1, 4))}` : `${part.charAt(0)}*`);
        const minimalConfirmation = maskedParts.join(' ');
        return {
            verified: true,
            patientId: patient.id,
            minimalNameConfirmation: minimalConfirmation,
            identityState: patient.identity_state,
        };
    }
    static recordFailedAttempt(deviceKey) {
        const info = this.failedAttempts.get(deviceKey) || { count: 0 };
        info.count++;
        if (info.count >= 3) {
            // 10-minute lockout on 3 consecutive failures
            info.lockedUntil = new Date(Date.now() + 10 * 60 * 1000);
            logger_js_1.logger.warn('[KIOSK_DEVICE_LOCKOUT_TRIGGERED]', { deviceKey, lockedUntil: info.lockedUntil });
        }
        this.failedAttempts.set(deviceKey, info);
    }
    // --- Duplicate Detection (Warns Staff, Never Auto-Merges) ---
    static detectPotentialDuplicates(newPatientData) {
        const matches = [];
        const normName = newPatientData.fullName.trim().toLowerCase();
        const cleanContact = newPatientData.contactNumber.replace(/\D/g, '');
        for (const existing of this.patientDirectory.values()) {
            if (existing.status !== 'ACTIVE')
                continue;
            const existingCleanContact = existing.contact_number.replace(/\D/g, '');
            const existingNormName = existing.full_name.trim().toLowerCase();
            // Check 1: Exact contact phone match
            if (cleanContact.length >= 10 && cleanContact === existingCleanContact) {
                matches.push({
                    patientId: existing.id,
                    hospitalRegistrationNumber: existing.hospital_registration_number,
                    fullName: existing.full_name,
                    matchReason: 'Exact contact phone match with existing patient record',
                });
                continue;
            }
            // Check 2: Name similarity + Date of Birth / Age match
            const isNameClose = normName === existingNormName ||
                (normName.length > 5 && existingNormName.includes(normName)) ||
                (existingNormName.length > 5 && normName.includes(existingNormName));
            let isAgeOrDobClose = false;
            if (newPatientData.dateOfBirth && existing.date_of_birth) {
                const dobStr = existing.date_of_birth.toISOString().split('T')[0];
                isAgeOrDobClose = newPatientData.dateOfBirth === dobStr;
            }
            else if (newPatientData.age !== undefined && existing.age !== undefined && existing.age !== null) {
                isAgeOrDobClose = Math.abs(newPatientData.age - existing.age) === 0;
            }
            if (isNameClose && isAgeOrDobClose) {
                matches.push({
                    patientId: existing.id,
                    hospitalRegistrationNumber: existing.hospital_registration_number,
                    fullName: existing.full_name,
                    matchReason: 'Name similarity and matching birth date / age with existing record',
                });
            }
        }
        return {
            hasPotentialDuplicate: matches.length > 0,
            matches,
        };
    }
    // --- Registration & Provisional State ---
    static registerPatient(data) {
        const currentYear = new Date().getFullYear();
        const randomSuffix = Math.floor(100000 + Math.random() * 900000);
        // Kiosk self-registered get a PROV prefix until reconciled
        const regNum = data.source === 'KIOSK' ? `PROV-${currentYear}-${randomSuffix}` : `MK-${currentYear}-${randomSuffix}`;
        const identityState = data.source === 'KIOSK' ? 'PROVISIONAL' : 'CONFIRMED';
        const id = `pat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const record = {
            id,
            hospital_registration_number: regNum,
            full_name: data.fullName.trim(),
            date_of_birth: data.dateOfBirth || null,
            age: data.age || null,
            gender: data.gender,
            contact_number: data.contactNumber.trim(),
            preferred_language: data.preferredLanguage || 'en',
            identity_state: identityState,
            status: 'ACTIVE',
            created_at: new Date(),
            updated_at: new Date(),
        };
        this.patientDirectory.set(id, record);
        return record;
    }
    static reconcileProvisionalPatient(patientId, officialHospitalRegistrationNumber, actorId) {
        const patient = this.patientDirectory.get(patientId);
        if (!patient)
            throw new app_error_js_1.NotFoundError(`Patient '${patientId}' not found`);
        const prevNumber = patient.hospital_registration_number;
        patient.hospital_registration_number = officialHospitalRegistrationNumber.trim().toUpperCase();
        patient.identity_state = 'CONFIRMED';
        patient.updated_at = new Date();
        dev_fallback_admin_store_js_1.devFallbackAdminStore.appendAuditLog({
            actorType: 'STAFF',
            actorId,
            actorRole: 'STAFF_ATTENDANT',
            action: 'PATIENT_IDENTITY_RECONCILED',
            entityType: 'PATIENT',
            entityId: patientId,
            result: 'SUCCESS',
            metadata: { previousNumber: prevNumber, confirmedNumber: patient.hospital_registration_number },
        });
        return patient;
    }
    // --- Reversible Patient Merge (Audited, Re-points references, never deletes) ---
    static mergePatients(sourcePatientId, targetPatientId, reason, actorId) {
        if (sourcePatientId === targetPatientId) {
            throw new app_error_js_1.ValidationError('Source patient and target patient cannot be the same');
        }
        const source = this.patientDirectory.get(sourcePatientId);
        const target = this.patientDirectory.get(targetPatientId);
        if (!source || source.status !== 'ACTIVE')
            throw new app_error_js_1.NotFoundError('Source patient record is invalid or not active');
        if (!target || target.status !== 'ACTIVE')
            throw new app_error_js_1.NotFoundError('Target patient record is invalid or not active');
        // Create merge history snapshot
        const mergeId = `mrg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const mergeRecord = {
            id: mergeId,
            sourcePatientId,
            targetPatientId,
            mergedBy: actorId,
            reason,
            mergedAt: new Date(),
            status: 'ACTIVE',
            snapshot: {
                sourcePatient: { ...source },
                transferredVisitIds: [], // Populated by VisitService during reference re-pointing
            },
        };
        // Mark source as MERGED (never delete history!)
        source.status = 'MERGED';
        source.merged_into_id = targetPatientId;
        source.updated_at = new Date();
        this.mergeHistory.push(mergeRecord);
        dev_fallback_admin_store_js_1.devFallbackAdminStore.appendAuditLog({
            actorType: 'STAFF',
            actorId,
            actorRole: 'ADMIN',
            action: 'PATIENT_RECORDS_MERGED',
            entityType: 'PATIENT',
            entityId: targetPatientId,
            result: 'SUCCESS',
            metadata: { sourcePatientId, targetPatientId, reason, mergeId },
        });
        return mergeRecord;
    }
    static reverseMerge(mergeId, reversalReason, actorId) {
        const mergeRecord = this.mergeHistory.find((m) => m.id === mergeId && m.status === 'ACTIVE');
        if (!mergeRecord) {
            throw new app_error_js_1.NotFoundError(`Active merge record '${mergeId}' not found or already reversed`);
        }
        const source = this.patientDirectory.get(mergeRecord.sourcePatientId);
        if (source) {
            source.status = 'ACTIVE';
            source.merged_into_id = null;
            source.updated_at = new Date();
        }
        mergeRecord.status = 'REVERSED';
        mergeRecord.reversedAt = new Date();
        mergeRecord.reversedBy = actorId;
        mergeRecord.reversalReason = reversalReason;
        dev_fallback_admin_store_js_1.devFallbackAdminStore.appendAuditLog({
            actorType: 'STAFF',
            actorId,
            actorRole: 'ADMIN',
            action: 'PATIENT_MERGE_REVERSED',
            entityType: 'PATIENT',
            entityId: mergeRecord.targetPatientId,
            result: 'SUCCESS',
            metadata: { mergeId, sourcePatientId: mergeRecord.sourcePatientId, reversalReason },
        });
        return mergeRecord;
    }
    // --- Two-Kiosk Concurrent Session Conflict Protection ---
    static acquireKioskLock(patientId, deviceCode, visitId) {
        const existing = this.activeKioskSessions.get(patientId);
        if (existing && existing.deviceCode !== deviceCode) {
            throw new app_error_js_1.ConflictError(`An intake session is already in progress for this patient at terminal ${existing.deviceCode}. Please complete your intake at terminal ${existing.deviceCode} or see the desk.`);
        }
        this.activeKioskSessions.set(patientId, { deviceCode, visitId, startedAt: new Date() });
    }
    static releaseKioskLock(patientId) {
        this.activeKioskSessions.delete(patientId);
    }
    static getPatientById(patientId) {
        return this.patientDirectory.get(patientId) || null;
    }
    // Testing helper to reset directory & lockouts
    static resetState() {
        this.failedAttempts.clear();
        this.activeKioskSessions.clear();
    }
}
exports.IdentitySafetyService = IdentitySafetyService;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisitService = void 0;
const master_data_service_js_1 = require("./master-data.service.js");
const token_service_js_1 = require("./token.service.js");
const event_bus_js_1 = require("./event-bus.js");
const identity_safety_service_js_1 = require("./identity-safety.service.js");
const visit_orchestrator_service_js_1 = require("./visit-orchestrator.service.js");
const visit_state_machine_js_1 = require("./visit-state-machine.js");
const app_error_js_1 = require("../../errors/app-error.js");
const logger_js_1 = require("../../config/logger.js");
const dev_fallback_admin_store_js_1 = require("../admin/dev-fallback-admin-store.js");
class VisitService {
    // In-memory visit index for quick retrieval: visitId -> VisitRecord
    static activeVisits = new Map();
    // --- Start Kiosk Visit Journey ---
    static async startKioskVisit(data) {
        // 1. Resolve Department
        let department = null;
        if (data.departmentId) {
            department = master_data_service_js_1.MasterDataService.getDepartmentById(data.departmentId);
        }
        else if (data.departmentCode) {
            department = master_data_service_js_1.MasterDataService.getDepartmentByCode(data.departmentCode);
        }
        else {
            // Default department (General Medicine)
            department = master_data_service_js_1.MasterDataService.getDepartmentByCode('GENMED');
        }
        if (!department) {
            throw new app_error_js_1.NotFoundError('Selected hospital department not found or is currently inactive');
        }
        // 2. Enforce OPD Intake Hours
        const scheduleCheck = master_data_service_js_1.MasterDataService.isIntakeOpenForDepartment(department.id);
        if (!scheduleCheck.isOpen) {
            throw new app_error_js_1.ServiceUnavailableError(scheduleCheck.message ||
                'Outpatient registration is currently closed for this department. Please proceed to the help desk.');
        }
        // 3. Resolve Patient Identity with Wrong-Patient Safeguards
        let patientRecord;
        let duplicateWarning = null;
        if (data.hospitalRegistrationNumber) {
            // Returning Patient: Strict 2nd-factor verification (Anti-enumeration)
            if (!data.secondFactor) {
                throw new app_error_js_1.ValidationError('A second verification factor (Date of Birth or Age) is required for identification');
            }
            const verifiedResult = identity_safety_service_js_1.IdentitySafetyService.verifyReturningPatient({
                hospitalRegistrationNumber: data.hospitalRegistrationNumber,
                secondFactor: data.secondFactor,
                deviceCode: data.kioskDeviceId,
            });
            // Retrieve full record from directory after factor passed
            const found = identity_safety_service_js_1.IdentitySafetyService.patientDirectory?.get(verifiedResult.patientId);
            if (!found) {
                throw new app_error_js_1.NotFoundError('Patient identification could not be verified.');
            }
            patientRecord = found;
        }
        else if (data.newPatient) {
            // New Patient Registration
            const duplicateCheck = identity_safety_service_js_1.IdentitySafetyService.detectPotentialDuplicates({
                fullName: data.newPatient.fullName,
                dateOfBirth: data.newPatient.dateOfBirth,
                age: data.newPatient.age,
                contactNumber: data.newPatient.contactNumber,
            });
            if (duplicateCheck.hasPotentialDuplicate && duplicateCheck.matches.length > 0 && duplicateCheck.matches[0]) {
                duplicateWarning = `Notice: Potential match found with existing registration ${duplicateCheck.matches[0].hospitalRegistrationNumber}. Kiosk intake will proceed as provisional.`;
                logger_js_1.logger.warn('[POTENTIAL_PATIENT_DUPLICATE_FLAGGED]', {
                    inputName: data.newPatient.fullName,
                    matchedId: duplicateCheck.matches[0].patientId,
                });
            }
            let dobDate;
            if (data.newPatient.dateOfBirth) {
                dobDate = new Date(data.newPatient.dateOfBirth);
            }
            patientRecord = identity_safety_service_js_1.IdentitySafetyService.registerPatient({
                fullName: data.newPatient.fullName,
                gender: data.newPatient.gender,
                contactNumber: data.newPatient.contactNumber,
                dateOfBirth: dobDate,
                age: data.newPatient.age,
                preferredLanguage: data.newPatient.preferredLanguage,
                source: 'KIOSK',
            });
        }
        else {
            throw new app_error_js_1.ValidationError('Either hospital registration number or new patient registration details are required');
        }
        // 4. One active visit per patient per department per day (Resume existing)
        const today = new Date();
        const existingActiveVisit = Array.from(this.activeVisits.values()).find((v) => v.patient_id === patientRecord.id &&
            v.department_id === department.id &&
            !visit_state_machine_js_1.VisitStateMachine.isTerminal(v.status) &&
            v.opened_at.toDateString() === today.toDateString());
        if (existingActiveVisit) {
            // Acquire / verify kiosk lock
            if (data.kioskDeviceId) {
                identity_safety_service_js_1.IdentitySafetyService.acquireKioskLock(patientRecord.id, data.kioskDeviceId, existingActiveVisit.id);
            }
            const tokenSlip = token_service_js_1.TokenService.generateTokenSlip(existingActiveVisit, department, patientRecord.full_name);
            logger_js_1.logger.info('[EXISTING_VISIT_RESUMED]', {
                visitId: existingActiveVisit.id,
                patientId: patientRecord.id,
                status: existingActiveVisit.status,
            });
            return {
                visit: existingActiveVisit,
                tokenSlip,
                isResumed: true,
            };
        }
        // 5. Generate Atomic Token and Instantiate New Visit
        const tokenNumber = token_service_js_1.TokenService.generateDailyToken(department.code, today);
        const visitId = `vis_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12-hour session expiry
        // Two-kiosk conflict lock
        if (data.kioskDeviceId) {
            identity_safety_service_js_1.IdentitySafetyService.acquireKioskLock(patientRecord.id, data.kioskDeviceId, visitId);
        }
        const newVisit = {
            id: visitId,
            patient_id: patientRecord.id,
            department_id: department.id,
            assigned_doctor_id: null,
            token_number: tokenNumber,
            kiosk_device_id: data.kioskDeviceId || null,
            source: 'KIOSK',
            status: 'CHECKED_IN',
            identity_state: patientRecord.identity_state,
            opened_at: new Date(),
            closed_at: null,
            expires_at: expiresAt,
            created_at: new Date(),
            updated_at: new Date(),
        };
        this.activeVisits.set(visitId, newVisit);
        visit_orchestrator_service_js_1.VisitOrchestratorService.registerVisit(newVisit);
        // 6. Generate Token Slip
        const tokenSlip = token_service_js_1.TokenService.generateTokenSlip(newVisit, department, patientRecord.full_name);
        // 7. Publish Canonical Events
        const createdEvent = event_bus_js_1.CanonicalEventBus.createEvent('VISIT_CREATED', visitId, patientRecord.id, {
            visitId,
            patientId: patientRecord.id,
            departmentId: department.id,
            tokenNumber,
            identityState: newVisit.identity_state,
        });
        await event_bus_js_1.CanonicalEventBus.publish(createdEvent);
        const checkedInEvent = event_bus_js_1.CanonicalEventBus.createEvent('VISIT_CHECKED_IN', visitId, patientRecord.id, {
            visitId,
            patientId: patientRecord.id,
        });
        await event_bus_js_1.CanonicalEventBus.publish(checkedInEvent);
        return {
            visit: newVisit,
            tokenSlip,
            isResumed: false,
            duplicateWarning,
        };
    }
    // --- Desk Check-In (Staff Assisted) ---
    static async checkInDeskVisit(data) {
        const department = master_data_service_js_1.MasterDataService.getDepartmentById(data.departmentId);
        if (!department)
            throw new app_error_js_1.NotFoundError('Department not found');
        const patient = identity_safety_service_js_1.IdentitySafetyService.patientDirectory?.get(data.patientId);
        if (!patient)
            throw new app_error_js_1.NotFoundError('Patient not found');
        const today = new Date();
        const tokenNumber = token_service_js_1.TokenService.generateDailyToken(department.code, today);
        const visitId = `vis_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const newVisit = {
            id: visitId,
            patient_id: data.patientId,
            department_id: data.departmentId,
            assigned_doctor_id: data.assignedDoctorId || null,
            token_number: tokenNumber,
            kiosk_device_id: null,
            source: 'STAFF_DESK',
            status: 'CHECKED_IN',
            identity_state: 'CONFIRMED', // Desk verified
            opened_at: new Date(),
            closed_at: null,
            expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000),
            created_at: new Date(),
            updated_at: new Date(),
        };
        this.activeVisits.set(visitId, newVisit);
        visit_orchestrator_service_js_1.VisitOrchestratorService.registerVisit(newVisit);
        const tokenSlip = token_service_js_1.TokenService.generateTokenSlip(newVisit, department, patient.full_name);
        const createdEvent = event_bus_js_1.CanonicalEventBus.createEvent('VISIT_CREATED', visitId, data.patientId, {
            visitId,
            tokenNumber,
        });
        await event_bus_js_1.CanonicalEventBus.publish(createdEvent);
        return { visit: newVisit, tokenSlip };
    }
    // --- Desk Queue View (Identity & Status Only, Strictly Zero Clinical Content) ---
    static getDeskVisitsQueue(filters) {
        const now = new Date();
        const results = [];
        for (const v of this.activeVisits.values()) {
            if (filters?.departmentId && v.department_id !== filters.departmentId)
                continue;
            if (filters?.status && v.status !== filters.status)
                continue;
            if (filters?.identityState && v.identity_state !== filters.identityState)
                continue;
            const patient = identity_safety_service_js_1.IdentitySafetyService.patientDirectory?.get(v.patient_id) || {
                full_name: 'Patient',
                hospital_registration_number: 'UNKNOWN',
            };
            const dept = master_data_service_js_1.MasterDataService.getDepartmentById(v.department_id);
            const waitingMinutes = Math.floor((now.getTime() - new Date(v.opened_at).getTime()) / 60000);
            results.push({
                visitId: v.id,
                patientId: v.patient_id,
                patientName: patient.full_name,
                hospitalRegistrationNumber: patient.hospital_registration_number,
                departmentCode: dept?.code || 'GEN',
                tokenNumber: v.token_number,
                status: v.status,
                identityState: v.identity_state,
                source: v.source,
                openedAt: v.opened_at.toISOString(),
                waitingMinutes,
                isQuarantined: v.is_quarantined || false,
            });
        }
        return results.sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime());
    }
    // --- Reconcile Provisional Patient ---
    static async reconcilePatient(patientId, officialHospitalRegistrationNumber, actorId) {
        const updatedPatient = identity_safety_service_js_1.IdentitySafetyService.reconcileProvisionalPatient(patientId, officialHospitalRegistrationNumber, actorId);
        // Update all active visits for this patient to CONFIRMED
        for (const v of this.activeVisits.values()) {
            if (v.patient_id === patientId) {
                v.identity_state = 'CONFIRMED';
                v.updated_at = new Date();
            }
        }
        return updatedPatient;
    }
    // --- Merge Patients (Re-points Visit references, Audited, Reversible) ---
    static async mergePatients(sourcePatientId, targetPatientId, reason, actorId) {
        const mergeRecord = identity_safety_service_js_1.IdentitySafetyService.mergePatients(sourcePatientId, targetPatientId, reason, actorId);
        // Re-point all visits from source patient to target patient
        const transferredVisits = [];
        for (const v of this.activeVisits.values()) {
            if (v.patient_id === sourcePatientId) {
                v.patient_id = targetPatientId;
                v.updated_at = new Date();
                transferredVisits.push(v.id);
            }
        }
        mergeRecord.snapshot.transferredVisitIds = transferredVisits;
        return mergeRecord;
    }
    // --- Wrong-Patient Quarantine Process ---
    static async quarantineWrongPatientVisit(visitId, reason, actorId) {
        const visit = this.activeVisits.get(visitId);
        if (!visit)
            throw new app_error_js_1.NotFoundError(`Visit '${visitId}' not found`);
        visit.status = 'CANCELLED';
        visit.is_quarantined = true;
        visit.quarantine_reason = reason;
        visit.closed_at = new Date();
        visit.updated_at = new Date();
        // Query audit log to find all doctors / staff who viewed or modified this visit
        const auditLogs = dev_fallback_admin_store_js_1.devFallbackAdminStore.getAuditLogs({ visitRef: visitId });
        const viewingDoctorIds = new Set();
        for (const log of auditLogs.logs) {
            if (log.actorRole === 'DOCTOR' && log.actorId) {
                viewingDoctorIds.add(log.actorId);
            }
        }
        // Critical Audit Log
        dev_fallback_admin_store_js_1.devFallbackAdminStore.appendAuditLog({
            actorType: 'STAFF',
            actorId,
            actorRole: 'STAFF_ATTENDANT',
            action: 'VISIT_QUARANTINED',
            entityType: 'VISIT',
            entityId: visitId,
            visitRef: visitId,
            result: 'SUCCESS',
            reasonCode: 'WRONG_PATIENT_SAFETY_QUARANTINE',
            reasonText: reason,
            metadata: {
                notifiedDoctorsCount: viewingDoctorIds.size,
                notifiedDoctorIds: Array.from(viewingDoctorIds),
            },
        });
        logger_js_1.logger.warn('[WRONG_PATIENT_VISIT_QUARANTINED]', {
            visitId,
            reason,
            notifiedDoctorsCount: viewingDoctorIds.size,
        });
        return {
            visitId,
            quarantined: true,
            viewingDoctorsNotifiedCount: viewingDoctorIds.size,
            auditLogReferences: auditLogs.logs.map((l) => l.id),
        };
    }
    static getVisitById(visitId) {
        return this.activeVisits.get(visitId) || null;
    }
    // Testing helper to reset state
    static resetState() {
        this.activeVisits.clear();
    }
}
exports.VisitService = VisitService;

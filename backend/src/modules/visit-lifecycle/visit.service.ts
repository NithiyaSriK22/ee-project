import {
  VisitRecord,
  VisitStatus,
  VisitIdentityState,
  TokenSlip,
  Department,
} from './visit.types.js';
import { MasterDataService } from './master-data.service.js';
import { TokenService } from './token.service.js';
import { CanonicalEventBus } from './event-bus.js';
import { IdentitySafetyService, PatientRecordInMemory } from './identity-safety.service.js';
import { VisitOrchestratorService } from './visit-orchestrator.service.js';
import { VisitStateMachine } from './visit-state-machine.js';
import { NotFoundError, ValidationError, ServiceUnavailableError } from '../../errors/app-error.js';
import { logger } from '../../config/logger.js';
import { devFallbackAdminStore } from '../admin/dev-fallback-admin-store.js';

export class VisitService {
  // In-memory visit index for quick retrieval: visitId -> VisitRecord
  private static activeVisits = new Map<string, VisitRecord>();

  // --- Start Kiosk Visit Journey ---
  public static async startKioskVisit(data: {
    departmentId?: string;
    departmentCode?: string;
    kioskDeviceId?: string;
    hospitalRegistrationNumber?: string;
    secondFactor?: {
      dateOfBirth?: string;
      age?: number;
      partialName?: string;
    };
    newPatient?: {
      fullName: string;
      gender: string;
      contactNumber: string;
      dateOfBirth?: string;
      age?: number;
      preferredLanguage?: string;
    };
  }): Promise<{
    visit: VisitRecord;
    tokenSlip: TokenSlip;
    isResumed: boolean;
    duplicateWarning?: string | null;
  }> {
    // 1. Resolve Department
    let department: Department | null = null;
    if (data.departmentId) {
      department = MasterDataService.getDepartmentById(data.departmentId);
    } else if (data.departmentCode) {
      department = MasterDataService.getDepartmentByCode(data.departmentCode);
    } else {
      // Default department (General Medicine)
      department = MasterDataService.getDepartmentByCode('GENMED');
    }

    if (!department) {
      throw new NotFoundError('Selected hospital department not found or is currently inactive');
    }

    // 2. Enforce OPD Intake Hours
    const scheduleCheck = MasterDataService.isIntakeOpenForDepartment(department.id);
    if (!scheduleCheck.isOpen) {
      throw new ServiceUnavailableError(
        scheduleCheck.message ||
          'Outpatient registration is currently closed for this department. Please proceed to the help desk.'
      );
    }

    // 3. Resolve Patient Identity with Wrong-Patient Safeguards
    let patientRecord: PatientRecordInMemory;
    let duplicateWarning: string | null = null;

    if (data.hospitalRegistrationNumber) {
      // Returning Patient: Strict 2nd-factor verification (Anti-enumeration)
      if (!data.secondFactor) {
        throw new ValidationError('A second verification factor (Date of Birth or Age) is required for identification');
      }

      const verifiedResult = IdentitySafetyService.verifyReturningPatient({
        hospitalRegistrationNumber: data.hospitalRegistrationNumber,
        secondFactor: data.secondFactor,
        deviceCode: data.kioskDeviceId,
      });

      // Retrieve full record from directory after factor passed
      const found = (IdentitySafetyService as any).patientDirectory?.get(verifiedResult.patientId);
      if (!found) {
        throw new NotFoundError('Patient identification could not be verified.');
      }
      patientRecord = found;
    } else if (data.newPatient) {
      // New Patient Registration
      const duplicateCheck = IdentitySafetyService.detectPotentialDuplicates({
        fullName: data.newPatient.fullName,
        dateOfBirth: data.newPatient.dateOfBirth,
        age: data.newPatient.age,
        contactNumber: data.newPatient.contactNumber,
      });

      if (duplicateCheck.hasPotentialDuplicate && duplicateCheck.matches.length > 0 && duplicateCheck.matches[0]) {
        duplicateWarning = `Notice: Potential match found with existing registration ${duplicateCheck.matches[0].hospitalRegistrationNumber}. Kiosk intake will proceed as provisional.`;
        logger.warn('[POTENTIAL_PATIENT_DUPLICATE_FLAGGED]', {
          inputName: data.newPatient.fullName,
          matchedId: duplicateCheck.matches[0].patientId,
        });
      }

      let dobDate: Date | undefined;
      if (data.newPatient.dateOfBirth) {
        dobDate = new Date(data.newPatient.dateOfBirth);
      }

      patientRecord = IdentitySafetyService.registerPatient({
        fullName: data.newPatient.fullName,
        gender: data.newPatient.gender,
        contactNumber: data.newPatient.contactNumber,
        dateOfBirth: dobDate,
        age: data.newPatient.age,
        preferredLanguage: data.newPatient.preferredLanguage,
        source: 'KIOSK',
      });
    } else {
      throw new ValidationError('Either hospital registration number or new patient registration details are required');
    }

    // 4. One active visit per patient per department per day (Resume existing)
    const today = new Date();
    const existingActiveVisit = Array.from(this.activeVisits.values()).find(
      (v) =>
        v.patient_id === patientRecord.id &&
        v.department_id === department.id &&
        !VisitStateMachine.isTerminal(v.status) &&
        v.opened_at.toDateString() === today.toDateString()
    );

    if (existingActiveVisit) {
      // Acquire / verify kiosk lock
      if (data.kioskDeviceId) {
        IdentitySafetyService.acquireKioskLock(patientRecord.id, data.kioskDeviceId, existingActiveVisit.id);
      }

      const tokenSlip = TokenService.generateTokenSlip(
        existingActiveVisit,
        department,
        patientRecord.full_name
      );

      logger.info('[EXISTING_VISIT_RESUMED]', {
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
    const tokenNumber = TokenService.generateDailyToken(department.code, today);
    const visitId = `vis_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12-hour session expiry

    // Two-kiosk conflict lock
    if (data.kioskDeviceId) {
      IdentitySafetyService.acquireKioskLock(patientRecord.id, data.kioskDeviceId, visitId);
    }

    const newVisit: VisitRecord = {
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
    VisitOrchestratorService.registerVisit(newVisit);

    // 6. Generate Token Slip
    const tokenSlip = TokenService.generateTokenSlip(newVisit, department, patientRecord.full_name);

    // 7. Publish Canonical Events
    const createdEvent = CanonicalEventBus.createEvent('VISIT_CREATED', visitId, patientRecord.id, {
      visitId,
      patientId: patientRecord.id,
      departmentId: department.id,
      tokenNumber,
      identityState: newVisit.identity_state,
    });
    await CanonicalEventBus.publish(createdEvent);

    const checkedInEvent = CanonicalEventBus.createEvent('VISIT_CHECKED_IN', visitId, patientRecord.id, {
      visitId,
      patientId: patientRecord.id,
    });
    await CanonicalEventBus.publish(checkedInEvent);

    return {
      visit: newVisit,
      tokenSlip,
      isResumed: false,
      duplicateWarning,
    };
  }

  // --- Desk Check-In (Staff Assisted) ---
  public static async checkInDeskVisit(data: {
    patientId: string;
    departmentId: string;
    assignedDoctorId?: string;
    staffId: string;
  }): Promise<{ visit: VisitRecord; tokenSlip: TokenSlip }> {
    const department = MasterDataService.getDepartmentById(data.departmentId);
    if (!department) throw new NotFoundError('Department not found');

    const patient = (IdentitySafetyService as any).patientDirectory?.get(data.patientId);
    if (!patient) throw new NotFoundError('Patient not found');

    const today = new Date();
    const tokenNumber = TokenService.generateDailyToken(department.code, today);
    const visitId = `vis_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const newVisit: VisitRecord = {
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
    VisitOrchestratorService.registerVisit(newVisit);

    const tokenSlip = TokenService.generateTokenSlip(newVisit, department, patient.full_name);

    const createdEvent = CanonicalEventBus.createEvent('VISIT_CREATED', visitId, data.patientId, {
      visitId,
      tokenNumber,
    });
    await CanonicalEventBus.publish(createdEvent);

    return { visit: newVisit, tokenSlip };
  }

  // --- Desk Queue View (Identity & Status Only, Strictly Zero Clinical Content) ---
  public static getDeskVisitsQueue(filters?: {
    departmentId?: string;
    status?: VisitStatus;
    identityState?: VisitIdentityState;
  }): Array<{
    visitId: string;
    patientId: string;
    patientName: string;
    hospitalRegistrationNumber: string;
    departmentCode: string;
    tokenNumber: string;
    status: VisitStatus;
    identityState: VisitIdentityState;
    source: string;
    openedAt: string;
    waitingMinutes: number;
    isQuarantined?: boolean;
  }> {
    const now = new Date();
    const results: any[] = [];

    for (const v of this.activeVisits.values()) {
      if (filters?.departmentId && v.department_id !== filters.departmentId) continue;
      if (filters?.status && v.status !== filters.status) continue;
      if (filters?.identityState && v.identity_state !== filters.identityState) continue;

      const patient = (IdentitySafetyService as any).patientDirectory?.get(v.patient_id) || {
        full_name: 'Patient',
        hospital_registration_number: 'UNKNOWN',
      };
      const dept = MasterDataService.getDepartmentById(v.department_id);
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
  public static async reconcilePatient(
    patientId: string,
    officialHospitalRegistrationNumber: string,
    actorId: string
  ): Promise<any> {
    const updatedPatient = IdentitySafetyService.reconcileProvisionalPatient(
      patientId,
      officialHospitalRegistrationNumber,
      actorId
    );

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
  public static async mergePatients(
    sourcePatientId: string,
    targetPatientId: string,
    reason: string,
    actorId: string
  ): Promise<any> {
    const mergeRecord = IdentitySafetyService.mergePatients(sourcePatientId, targetPatientId, reason, actorId);

    // Re-point all visits from source patient to target patient
    const transferredVisits: string[] = [];
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
  public static async quarantineWrongPatientVisit(
    visitId: string,
    reason: string,
    actorId: string
  ): Promise<{
    visitId: string;
    quarantined: boolean;
    viewingDoctorsNotifiedCount: number;
    auditLogReferences: string[];
  }> {
    const visit = this.activeVisits.get(visitId);
    if (!visit) throw new NotFoundError(`Visit '${visitId}' not found`);

    visit.status = 'CANCELLED';
    visit.is_quarantined = true;
    visit.quarantine_reason = reason;
    visit.closed_at = new Date();
    visit.updated_at = new Date();

    // Query audit log to find all doctors / staff who viewed or modified this visit
    const auditLogs = devFallbackAdminStore.getAuditLogs({ visitRef: visitId });
    const viewingDoctorIds = new Set<string>();

    for (const log of auditLogs.logs) {
      if (log.actorRole === 'DOCTOR' && log.actorId) {
        viewingDoctorIds.add(log.actorId);
      }
    }

    // Critical Audit Log
    devFallbackAdminStore.appendAuditLog({
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

    logger.warn('[WRONG_PATIENT_VISIT_QUARANTINED]', {
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

  public static getVisitById(visitId: string): VisitRecord | null {
    return this.activeVisits.get(visitId) || null;
  }

  // Testing helper to reset state
  public static resetState(): void {
    this.activeVisits.clear();
  }
}

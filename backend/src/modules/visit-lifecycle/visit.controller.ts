import { Request, Response, NextFunction } from 'express';
import { VisitService } from './visit.service.js';
import { MasterDataService } from './master-data.service.js';
import { CanonicalEventBus } from './event-bus.js';
import { IdentitySafetyService } from './identity-safety.service.js';
import { ResponseUtil } from '../../utils/response.util.js';
import { AppRequest } from '../../types/api.types.js';

export class VisitController {
  // --- Kiosk Visit Start & Resume ---
  public static async startKioskVisit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await VisitService.startKioskVisit(req.body);
      ResponseUtil.success(
        res,
        result,
        result.isResumed ? 'Existing active visit session resumed' : 'New outpatient visit initialized and token issued',
        result.isResumed ? 200 : 201
      );
    } catch (err) {
      next(err);
    }
  }

  // --- Desk Check-In ---
  public static async checkInDeskVisit(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId, departmentId, assignedDoctorId } = req.body;
      const staffId = req.user ? req.user.id : 'desk-clerk-01';

      const result = await VisitService.checkInDeskVisit({
        patientId,
        departmentId,
        assignedDoctorId,
        staffId,
      });

      ResponseUtil.success(res, result, 'Patient checked in at department desk and token issued', 201);
    } catch (err) {
      next(err);
    }
  }

  // --- Desk Queue List (Identity & Status Only, Zero Clinical Content) ---
  public static getDeskQueue(req: Request, res: Response, next: NextFunction): void {
    try {
      const { departmentId, status, identityState } = req.query;
      const queue = VisitService.getDeskVisitsQueue({
        departmentId: departmentId as string,
        status: status as any,
        identityState: identityState as any,
      });

      ResponseUtil.success(res, queue, 'Department outpatient desk queue retrieved');
    } catch (err) {
      next(err);
    }
  }

  // --- Reconcile Provisional Patient ---
  public static async reconcilePatient(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { officialHospitalRegistrationNumber } = req.body;
      const actorId = req.user ? req.user.id : 'desk-clerk-01';

      const reconciled = await VisitService.reconcilePatient(id, officialHospitalRegistrationNumber, actorId);
      ResponseUtil.success(res, reconciled, 'Patient identity successfully reconciled with hospital master registration number');
    } catch (err) {
      next(err);
    }
  }

  // --- Merge Patients (Re-points references, Audited, Reversible) ---
  public static async mergePatients(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sourcePatientId, targetPatientId, reason } = req.body;
      const actorId = req.user ? req.user.id : 'admin-supervisor';

      const mergeRecord = await VisitService.mergePatients(sourcePatientId, targetPatientId, reason, actorId);
      ResponseUtil.success(res, mergeRecord, 'Patient records merged and visit references re-pointed successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  // --- Reverse Merge ---
  public static async reverseMerge(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const mergeId = req.params.mergeId as string;
      const { reversalReason } = req.body;
      const actorId = req.user ? req.user.id : 'admin-supervisor';

      const reversed = IdentitySafetyService.reverseMerge(mergeId, reversalReason, actorId);
      ResponseUtil.success(res, reversed, 'Patient merge successfully reversed');
    } catch (err) {
      next(err);
    }
  }

  // --- Wrong-Patient Quarantine ---
  public static async quarantineVisit(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { reason } = req.body;
      const actorId = req.user ? req.user.id : 'desk-supervisor';

      const result = await VisitService.quarantineWrongPatientVisit(id, reason, actorId);
      ResponseUtil.success(res, result, 'Visit quarantined, status cancelled, and viewing doctors notified', 200);
    } catch (err) {
      next(err);
    }
  }

  // --- Master Data Endpoints ---
  public static getDepartments(_req: Request, res: Response): void {
    const list = MasterDataService.listDepartments();
    ResponseUtil.success(res, list, 'Departments list retrieved');
  }

  public static createDepartment(req: AppRequest, res: Response, next: NextFunction): void {
    try {
      const actorId = req.user ? req.user.id : 'admin-user';
      const created = MasterDataService.createDepartment(req.body, actorId);
      ResponseUtil.success(res, created, 'Department created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  public static softDeleteDepartment(req: AppRequest, res: Response, next: NextFunction): void {
    try {
      const id = req.params.id as string;
      const actorId = req.user ? req.user.id : 'admin-user';
      const deleted = MasterDataService.softDeleteDepartment(id, actorId);
      ResponseUtil.success(res, deleted, 'Department soft-deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  public static getLocations(req: Request, res: Response): void {
    const { departmentId } = req.query;
    const list = MasterDataService.listLocations(departmentId as string);
    ResponseUtil.success(res, list, 'OPD Locations retrieved');
  }

  public static async getDoctors(req: Request, res: Response): Promise<void> {
    const { departmentId } = req.query;
    const list = await MasterDataService.listDoctorsAsync(departmentId as string);
    ResponseUtil.success(res, list, 'Doctor profiles retrieved');
  }

  public static getKiosks(_req: Request, res: Response): void {
    const list = MasterDataService.listKiosks();
    ResponseUtil.success(res, list, 'Kiosk hardware directory retrieved');
  }

  public static getSchedules(req: Request, res: Response): void {
    const { departmentId } = req.query;
    const list = MasterDataService.listSchedules(departmentId as string);
    ResponseUtil.success(res, list, 'OPD Schedules retrieved');
  }

  // --- Canonical Event Dead-Letter Queue & Replay ---
  public static getDeadLetterQueue(_req: Request, res: Response): void {
    const dlq = CanonicalEventBus.getDeadLetterQueue();
    ResponseUtil.success(res, dlq, 'Canonical event dead-letter queue retrieved');
  }

  public static async replayDeadLetter(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { outboxId } = req.body;
      const actorId = req.user ? req.user.id : 'admin-ops';

      const replayed = await CanonicalEventBus.replayDeadLetterEvent(outboxId, actorId);
      if (replayed) {
        ResponseUtil.success(res, { outboxId, replayed: true }, 'Event replayed successfully from dead-letter queue');
      } else {
        ResponseUtil.error(res, 404, 'NOT_FOUND', `DLQ message '${outboxId}' not found`);
      }
    } catch (err) {
      next(err);
    }
  }
}

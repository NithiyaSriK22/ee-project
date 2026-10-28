"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisitController = void 0;
const visit_service_js_1 = require("./visit.service.js");
const master_data_service_js_1 = require("./master-data.service.js");
const event_bus_js_1 = require("./event-bus.js");
const identity_safety_service_js_1 = require("./identity-safety.service.js");
const response_util_js_1 = require("../../utils/response.util.js");
class VisitController {
    // --- Kiosk Visit Start & Resume ---
    static async startKioskVisit(req, res, next) {
        try {
            const result = await visit_service_js_1.VisitService.startKioskVisit(req.body);
            response_util_js_1.ResponseUtil.success(res, result, result.isResumed ? 'Existing active visit session resumed' : 'New outpatient visit initialized and token issued', result.isResumed ? 200 : 201);
        }
        catch (err) {
            next(err);
        }
    }
    // --- Desk Check-In ---
    static async checkInDeskVisit(req, res, next) {
        try {
            const { patientId, departmentId, assignedDoctorId } = req.body;
            const staffId = req.user ? req.user.id : 'desk-clerk-01';
            const result = await visit_service_js_1.VisitService.checkInDeskVisit({
                patientId,
                departmentId,
                assignedDoctorId,
                staffId,
            });
            response_util_js_1.ResponseUtil.success(res, result, 'Patient checked in at department desk and token issued', 201);
        }
        catch (err) {
            next(err);
        }
    }
    // --- Desk Queue List (Identity & Status Only, Zero Clinical Content) ---
    static getDeskQueue(req, res, next) {
        try {
            const { departmentId, status, identityState } = req.query;
            const queue = visit_service_js_1.VisitService.getDeskVisitsQueue({
                departmentId: departmentId,
                status: status,
                identityState: identityState,
            });
            response_util_js_1.ResponseUtil.success(res, queue, 'Department outpatient desk queue retrieved');
        }
        catch (err) {
            next(err);
        }
    }
    // --- Reconcile Provisional Patient ---
    static async reconcilePatient(req, res, next) {
        try {
            const id = req.params.id;
            const { officialHospitalRegistrationNumber } = req.body;
            const actorId = req.user ? req.user.id : 'desk-clerk-01';
            const reconciled = await visit_service_js_1.VisitService.reconcilePatient(id, officialHospitalRegistrationNumber, actorId);
            response_util_js_1.ResponseUtil.success(res, reconciled, 'Patient identity successfully reconciled with hospital master registration number');
        }
        catch (err) {
            next(err);
        }
    }
    // --- Merge Patients (Re-points references, Audited, Reversible) ---
    static async mergePatients(req, res, next) {
        try {
            const { sourcePatientId, targetPatientId, reason } = req.body;
            const actorId = req.user ? req.user.id : 'admin-supervisor';
            const mergeRecord = await visit_service_js_1.VisitService.mergePatients(sourcePatientId, targetPatientId, reason, actorId);
            response_util_js_1.ResponseUtil.success(res, mergeRecord, 'Patient records merged and visit references re-pointed successfully', 200);
        }
        catch (err) {
            next(err);
        }
    }
    // --- Reverse Merge ---
    static async reverseMerge(req, res, next) {
        try {
            const mergeId = req.params.mergeId;
            const { reversalReason } = req.body;
            const actorId = req.user ? req.user.id : 'admin-supervisor';
            const reversed = identity_safety_service_js_1.IdentitySafetyService.reverseMerge(mergeId, reversalReason, actorId);
            response_util_js_1.ResponseUtil.success(res, reversed, 'Patient merge successfully reversed');
        }
        catch (err) {
            next(err);
        }
    }
    // --- Wrong-Patient Quarantine ---
    static async quarantineVisit(req, res, next) {
        try {
            const id = req.params.id;
            const { reason } = req.body;
            const actorId = req.user ? req.user.id : 'desk-supervisor';
            const result = await visit_service_js_1.VisitService.quarantineWrongPatientVisit(id, reason, actorId);
            response_util_js_1.ResponseUtil.success(res, result, 'Visit quarantined, status cancelled, and viewing doctors notified', 200);
        }
        catch (err) {
            next(err);
        }
    }
    // --- Master Data Endpoints ---
    static getDepartments(_req, res) {
        const list = master_data_service_js_1.MasterDataService.listDepartments();
        response_util_js_1.ResponseUtil.success(res, list, 'Departments list retrieved');
    }
    static createDepartment(req, res, next) {
        try {
            const actorId = req.user ? req.user.id : 'admin-user';
            const created = master_data_service_js_1.MasterDataService.createDepartment(req.body, actorId);
            response_util_js_1.ResponseUtil.success(res, created, 'Department created successfully', 201);
        }
        catch (err) {
            next(err);
        }
    }
    static softDeleteDepartment(req, res, next) {
        try {
            const id = req.params.id;
            const actorId = req.user ? req.user.id : 'admin-user';
            const deleted = master_data_service_js_1.MasterDataService.softDeleteDepartment(id, actorId);
            response_util_js_1.ResponseUtil.success(res, deleted, 'Department soft-deleted successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static getLocations(req, res) {
        const { departmentId } = req.query;
        const list = master_data_service_js_1.MasterDataService.listLocations(departmentId);
        response_util_js_1.ResponseUtil.success(res, list, 'OPD Locations retrieved');
    }
    static async getDoctors(req, res) {
        const { departmentId } = req.query;
        const list = await master_data_service_js_1.MasterDataService.listDoctorsAsync(departmentId);
        response_util_js_1.ResponseUtil.success(res, list, 'Doctor profiles retrieved');
    }
    static getKiosks(_req, res) {
        const list = master_data_service_js_1.MasterDataService.listKiosks();
        response_util_js_1.ResponseUtil.success(res, list, 'Kiosk hardware directory retrieved');
    }
    static getSchedules(req, res) {
        const { departmentId } = req.query;
        const list = master_data_service_js_1.MasterDataService.listSchedules(departmentId);
        response_util_js_1.ResponseUtil.success(res, list, 'OPD Schedules retrieved');
    }
    // --- Canonical Event Dead-Letter Queue & Replay ---
    static getDeadLetterQueue(_req, res) {
        const dlq = event_bus_js_1.CanonicalEventBus.getDeadLetterQueue();
        response_util_js_1.ResponseUtil.success(res, dlq, 'Canonical event dead-letter queue retrieved');
    }
    static async replayDeadLetter(req, res, next) {
        try {
            const { outboxId } = req.body;
            const actorId = req.user ? req.user.id : 'admin-ops';
            const replayed = await event_bus_js_1.CanonicalEventBus.replayDeadLetterEvent(outboxId, actorId);
            if (replayed) {
                response_util_js_1.ResponseUtil.success(res, { outboxId, replayed: true }, 'Event replayed successfully from dead-letter queue');
            }
            else {
                response_util_js_1.ResponseUtil.error(res, 404, 'NOT_FOUND', `DLQ message '${outboxId}' not found`);
            }
        }
        catch (err) {
            next(err);
        }
    }
}
exports.VisitController = VisitController;

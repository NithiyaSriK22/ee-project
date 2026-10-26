"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientsController = void 0;
const patients_service_js_1 = require("./patients.service.js");
const response_util_js_1 = require("../../utils/response.util.js");
const app_error_js_1 = require("../../errors/app-error.js");
class PatientsController {
    static async getKioskProfile(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const profile = await patients_service_js_1.PatientsService.getKioskProfile(req.kioskSession.patientId, req.kioskSession.visitId);
            response_util_js_1.ResponseUtil.success(res, profile, 'Profile retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    }
    static async updateKioskProfile(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const updated = await patients_service_js_1.PatientsService.updateKioskProfile(req.kioskSession.patientId, req.kioskSession.visitId, req.body);
            response_util_js_1.ResponseUtil.success(res, updated, 'Profile updated successfully');
        }
        catch (error) {
            next(error);
        }
    }
    static async getProfileCompletion(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const completion = await patients_service_js_1.PatientsService.getProfileCompletion(req.kioskSession.patientId, req.kioskSession.visitId);
            response_util_js_1.ResponseUtil.success(res, completion, 'Profile completion status retrieved');
        }
        catch (error) {
            next(error);
        }
    }
    static async getConsents(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const consents = await patients_service_js_1.PatientsService.getConsents(req.kioskSession.patientId, req.kioskSession.visitId);
            response_util_js_1.ResponseUtil.success(res, consents, 'Consents retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    }
    static async updateConsent(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const { type } = req.params;
            if (!type) {
                throw new app_error_js_1.ValidationError('Consent type parameter is required');
            }
            const result = await patients_service_js_1.PatientsService.updateConsent(req.kioskSession.patientId, req.kioskSession.visitId, type, req.body);
            response_util_js_1.ResponseUtil.success(res, result, 'Consent updated successfully');
        }
        catch (error) {
            next(error);
        }
    }
    static async getPatientForStaff(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                throw new app_error_js_1.ValidationError('Patient ID parameter is required');
            }
            const patient = await patients_service_js_1.PatientsService.getPatientForStaff(id);
            response_util_js_1.ResponseUtil.success(res, patient, 'Patient retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    }
    static async listPatients(req, res, next) {
        try {
            const search = req.query.search ? String(req.query.search) : undefined;
            const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
            const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;
            const result = await patients_service_js_1.PatientsService.listPatients({ search, limit, offset });
            response_util_js_1.ResponseUtil.success(res, result, 'Patients retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    }
}
exports.PatientsController = PatientsController;

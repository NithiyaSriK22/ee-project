"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormularyAdminController = void 0;
const formulary_service_js_1 = require("./formulary.service.js");
const response_util_js_1 = require("../../../utils/response.util.js");
const app_error_js_1 = require("../../../errors/app-error.js");
class FormularyAdminController {
    static async listVersions(_req, res, next) {
        try {
            const versions = await formulary_service_js_1.FormularyService.listVersions();
            response_util_js_1.ResponseUtil.success(res, versions, 'Formulary versions retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    }
    static async getVersionById(req, res, next) {
        try {
            const { id } = req.params;
            if (!id)
                throw new app_error_js_1.ValidationError('Version ID is required');
            const version = await formulary_service_js_1.FormularyService.getVersionById(id);
            response_util_js_1.ResponseUtil.success(res, version, 'Formulary version retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    }
    static async createVersion(req, res, next) {
        try {
            const created = await formulary_service_js_1.FormularyService.createVersion(req.body, req.user?.id);
            response_util_js_1.ResponseUtil.created(res, created, 'Formulary version created successfully (DRAFT)');
        }
        catch (error) {
            next(error);
        }
    }
    static async activateVersion(req, res, next) {
        try {
            const { id } = req.params;
            if (!id)
                throw new app_error_js_1.ValidationError('Version ID is required');
            const activated = await formulary_service_js_1.FormularyService.activateVersion(id, req.user?.id);
            response_util_js_1.ResponseUtil.success(res, activated, 'Formulary version activated for live validation');
        }
        catch (error) {
            next(error);
        }
    }
    static async addDrug(req, res, next) {
        try {
            const { id } = req.params;
            if (!id)
                throw new app_error_js_1.ValidationError('Version ID is required');
            const drug = await formulary_service_js_1.FormularyService.addDrug(id, req.body);
            response_util_js_1.ResponseUtil.created(res, drug, 'Drug added to formulary version');
        }
        catch (error) {
            next(error);
        }
    }
    static async importDrugs(req, res, next) {
        try {
            const { id } = req.params;
            if (!id)
                throw new app_error_js_1.ValidationError('Version ID is required');
            const result = await formulary_service_js_1.FormularyService.importDrugs(id, req.body.drugs);
            response_util_js_1.ResponseUtil.success(res, result, 'Formulary drugs imported successfully');
        }
        catch (error) {
            next(error);
        }
    }
}
exports.FormularyAdminController = FormularyAdminController;

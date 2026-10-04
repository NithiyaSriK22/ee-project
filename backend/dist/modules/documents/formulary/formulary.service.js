"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormularyService = void 0;
const formulary_repository_js_1 = require("./formulary.repository.js");
const app_error_js_1 = require("../../../errors/app-error.js");
const logger_js_1 = require("../../../config/logger.js");
class FormularyService {
    static async listVersions() {
        return formulary_repository_js_1.FormularyRepository.listVersions();
    }
    static async getVersionById(id) {
        const version = await formulary_repository_js_1.FormularyRepository.findVersionById(id);
        if (!version) {
            throw new app_error_js_1.NotFoundError(`Formulary version not found: ${id}`);
        }
        return version;
    }
    static async createVersion(data, createdBy) {
        const created = await formulary_repository_js_1.FormularyRepository.createVersion({
            ...data,
            createdBy,
        });
        logger_js_1.logger.info('New Formulary Version created (DRAFT)', {
            versionId: created.id,
            versionCode: created.version_code,
        });
        return created;
    }
    static async activateVersion(id, reviewedBy) {
        const existing = await formulary_repository_js_1.FormularyRepository.findVersionById(id);
        if (!existing) {
            throw new app_error_js_1.NotFoundError(`Formulary version not found: ${id}`);
        }
        if (existing.drugs.length === 0) {
            throw new app_error_js_1.ValidationError('Cannot activate an empty formulary version. Please add or import drugs first.');
        }
        const activated = await formulary_repository_js_1.FormularyRepository.activateVersion(id, reviewedBy);
        logger_js_1.logger.info('Formulary Version ACTIVATED for live clinical validation', {
            versionId: activated.id,
            versionCode: activated.version_code,
        });
        return activated;
    }
    static async addDrug(versionId, drug) {
        const version = await formulary_repository_js_1.FormularyRepository.findVersionById(versionId);
        if (!version) {
            throw new app_error_js_1.NotFoundError(`Formulary version not found: ${versionId}`);
        }
        return formulary_repository_js_1.FormularyRepository.addDrug(versionId, drug);
    }
    static async importDrugs(versionId, drugs) {
        const version = await formulary_repository_js_1.FormularyRepository.findVersionById(versionId);
        if (!version) {
            throw new app_error_js_1.NotFoundError(`Formulary version not found: ${versionId}`);
        }
        if (!Array.isArray(drugs) || drugs.length === 0) {
            throw new app_error_js_1.ValidationError('Import payload must contain an array of drugs.');
        }
        const imported = await formulary_repository_js_1.FormularyRepository.importDrugsBatch(versionId, drugs);
        logger_js_1.logger.info('Formulary drugs imported in batch', {
            versionId,
            importedCount: imported.length,
        });
        return {
            success: true,
            importedCount: imported.length,
            versionCode: version.version_code,
        };
    }
}
exports.FormularyService = FormularyService;

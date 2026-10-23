"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguagesService = void 0;
const prisma_js_1 = require("../../../database/prisma.js");
const dev_fallback_language_store_js_1 = require("../dev-fallback-language-store.js");
const doctor_review_repository_js_1 = require("../../doctor-review/doctor-review.repository.js");
const language_types_js_1 = require("../language.types.js");
const translations_service_js_1 = require("../translations/translations.service.js");
const logger_js_1 = require("../../../config/logger.js");
class LanguagesService {
    /**
     * Returns list of languages that are currently ready and enabled for patients at the kiosk.
     * Gated: language appears on kiosk ONLY when its UI strings and active template translations are fully APPROVED.
     */
    static async getKioskLanguages() {
        const all = await this.listAllLanguages();
        const enabled = all.filter((l) => l.enabled && l.uiStatus === language_types_js_1.UiStatuses.READY);
        const readyLanguages = [];
        for (const lang of enabled) {
            // Check translation coverage gate for default template 1.0.0
            const coverage = await translations_service_js_1.TranslationsService.getCoverageReport(lang.code, '1.0.0');
            if (coverage.isKioskReady) {
                readyLanguages.push(lang);
            }
            else {
                logger_js_1.logger.info('Language excluded from kiosk due to incomplete approved coverage', {
                    language: lang.code,
                    coveragePercentage: coverage.coveragePercentage,
                });
            }
        }
        return readyLanguages;
    }
    /**
     * Admin view: lists all supported languages regardless of kiosk readiness.
     */
    static async listAllLanguages() {
        const isDb = await (0, doctor_review_repository_js_1.checkDatabaseAvailability)();
        if (isDb) {
            try {
                const rows = await prisma_js_1.prisma.supportedLanguage.findMany({
                    orderBy: { code: 'asc' },
                });
                if (rows.length > 0) {
                    return rows.map((r) => ({
                        id: r.id,
                        code: r.code,
                        displayName: r.display_name,
                        textDirection: r.text_direction || 'ltr',
                        uiStatus: r.ui_status,
                        voiceInputStatus: r.voice_input_status,
                        voiceOutputStatus: r.voice_output_status,
                        enabled: r.enabled,
                        createdAt: r.created_at.toISOString(),
                        updatedAt: r.updated_at.toISOString(),
                    }));
                }
            }
            catch (err) {
                logger_js_1.logger.warn('Error querying supportedLanguage from DB, falling back to in-mem store', { error: String(err) });
            }
        }
        return Array.from(dev_fallback_language_store_js_1.devFallbackLanguageStore.languages.values());
    }
    /**
     * Admin update: configure language status, voice capabilities, or enable/disable.
     */
    static async updateLanguage(code, updates) {
        const isDb = await (0, doctor_review_repository_js_1.checkDatabaseAvailability)();
        if (isDb) {
            try {
                const updated = await prisma_js_1.prisma.supportedLanguage.update({
                    where: { code },
                    data: {
                        display_name: updates.displayName,
                        ui_status: updates.uiStatus,
                        voice_input_status: updates.voiceInputStatus,
                        voice_output_status: updates.voiceOutputStatus,
                        enabled: updates.enabled,
                    },
                });
                return {
                    id: updated.id,
                    code: updated.code,
                    displayName: updated.display_name,
                    textDirection: updated.text_direction || 'ltr',
                    uiStatus: updated.ui_status,
                    voiceInputStatus: updated.voice_input_status,
                    voiceOutputStatus: updated.voice_output_status,
                    enabled: updated.enabled,
                    createdAt: updated.created_at.toISOString(),
                    updatedAt: updated.updated_at.toISOString(),
                };
            }
            catch (err) {
                logger_js_1.logger.warn('Error updating supportedLanguage in DB, falling back to in-mem store', { error: String(err) });
            }
        }
        const existing = dev_fallback_language_store_js_1.devFallbackLanguageStore.languages.get(code);
        if (!existing)
            return null;
        const modified = {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        dev_fallback_language_store_js_1.devFallbackLanguageStore.languages.set(code, modified);
        return modified;
    }
}
exports.LanguagesService = LanguagesService;

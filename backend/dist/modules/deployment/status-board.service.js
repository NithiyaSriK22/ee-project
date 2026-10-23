"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusBoardService = void 0;
const feature_flags_service_js_1 = require("./feature-flags.service.js");
const dev_fallback_admin_store_js_1 = require("../admin/dev-fallback-admin-store.js");
const env_config_js_1 = require("../../config/env.config.js");
const prisma_js_1 = require("../../database/prisma.js");
class StatusBoardService {
    /**
     * Generates a lightweight, resilient public/internal status summary.
     * Free of PHI, internal IP addresses, database credentials, or provider keys.
     */
    static async getStatusSummary() {
        const pauseState = feature_flags_service_js_1.FeatureFlagsService.getGlobalIntakePauseState();
        const kioskIntakeEnabled = feature_flags_service_js_1.FeatureFlagsService.isFlagEnabled('KIOSK_INTAKE_ENABLED');
        const aiSummarizationEnabled = feature_flags_service_js_1.FeatureFlagsService.isFlagEnabled('AI_SUMMARIZATION_ENABLED');
        const ocrEnabled = feature_flags_service_js_1.FeatureFlagsService.isFlagEnabled('OCR_ENABLED');
        const voiceEnabled = feature_flags_service_js_1.FeatureFlagsService.isFlagEnabled('VOICE_ENABLED');
        const auditChainValid = dev_fallback_admin_store_js_1.devFallbackAdminStore.verifyAuditChain().valid;
        const isDbConnected = await (0, prisma_js_1.checkDatabaseHealth)();
        // Determine overall status
        let overallStatus = 'OPERATIONAL';
        if (pauseState.isPaused || !kioskIntakeEnabled || !isDbConnected) {
            overallStatus = 'DEGRADED';
        }
        else if (!aiSummarizationEnabled || !ocrEnabled || !voiceEnabled) {
            overallStatus = 'DEGRADED';
        }
        const intakeActive = kioskIntakeEnabled && !pauseState.isPaused;
        return {
            overallStatus,
            platformVersion: env_config_js_1.env.RELEASE_VERSION,
            environment: env_config_js_1.env.NODE_ENV,
            intakeActive,
            checkedAt: new Date().toISOString(),
            services: {
                database: isDbConnected ? 'OPERATIONAL' : 'DEGRADED',
                alertPipeline: 'OPERATIONAL',
                llmSummarization: aiSummarizationEnabled ? 'OPERATIONAL' : 'FALLBACK_MODE',
                ocrService: ocrEnabled ? 'OPERATIONAL' : 'FALLBACK_MODE',
                speechServices: voiceEnabled ? 'OPERATIONAL' : 'TOUCH_FALLBACK',
                auditChain: auditChainValid ? 'VERIFIED' : 'TAMPER_ALERT',
            },
            patientGuidance: intakeActive
                ? 'THUNAI terminals are operational. Please use any available terminal for assisted OPD registration.'
                : 'Kiosk self-registration is currently paused. Please proceed directly to the outpatient reception counter for paper-assisted registration.',
            staffGuidance: !isDbConnected
                ? 'Database server is offline or unreachable at localhost:5432. System is operating in resilient in-memory fallback mode. Existing doctor review and triage queues remain operational.'
                : intakeActive
                    ? 'System running normally. Doctor review and triage alert queues are active.'
                    : 'Degraded intake mode active. Paper-based registration in progress. Existing visits remain accessible for review and confirmation.',
            emergencyBanner: 'EMERGENCY ADVISORY: If you or your companion are experiencing acute chest pain, severe difficulty breathing, sudden weakness, or active hemorrhage, please notify hospital staff or press the RED emergency button on any terminal immediately.',
        };
    }
}
exports.StatusBoardService = StatusBoardService;

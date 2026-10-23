"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoModeService = void 0;
const production_guard_service_js_1 = require("../guards/production-guard.service.js");
const feature_flags_service_js_1 = require("../../deployment/feature-flags.service.js");
const logger_js_1 = require("../../../config/logger.js");
class DemoModeService {
    static BANNER_TEXT = 'DEMONSTRATION — synthetic data';
    static state = {
        isDemoMode: true, // Active in local/staging dev mode
        banner: DemoModeService.BANNER_TEXT,
        activeScenario: null,
        lastResetAt: new Date().toISOString(),
    };
    /**
     * Retrieves current demo mode state.
     */
    static getState() {
        const flagEnabled = feature_flags_service_js_1.FeatureFlagsService.isFlagEnabled('DEMO_MODE_ENABLED');
        return {
            ...this.state,
            isDemoMode: this.state.isDemoMode || flagEnabled,
        };
    }
    /**
     * Sets the active scenario being demonstrated.
     */
    static setActiveScenario(scenarioId) {
        production_guard_service_js_1.ProductionGuardService.assertDemoModePermitted();
        this.state.activeScenario = scenarioId;
        logger_js_1.logger.info(`[DEMO_MODE_SCENARIO_SET] Active scenario: ${scenarioId}`);
    }
    /**
     * Express middleware to attach DEMO header and response banner metadata to every request.
     */
    static demoBannerMiddleware() {
        return (_req, res, next) => {
            res.setHeader('X-Medikiosk-Environment', 'DEMO');
            res.setHeader('X-Medikiosk-Demo-Banner', DemoModeService.BANNER_TEXT);
            next();
        };
    }
}
exports.DemoModeService = DemoModeService;

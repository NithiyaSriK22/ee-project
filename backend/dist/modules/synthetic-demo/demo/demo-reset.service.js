"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoResetService = void 0;
const production_guard_service_js_1 = require("../guards/production-guard.service.js");
const fault_injection_service_js_1 = require("../simulation/fault-injection.service.js");
const demo_mode_service_js_1 = require("./demo-mode.service.js");
const visit_service_js_1 = require("../../visit-lifecycle/visit.service.js");
const identity_safety_service_js_1 = require("../../visit-lifecycle/identity-safety.service.js");
const dev_fallback_doctor_review_store_js_1 = require("../../doctor-review/dev-fallback-doctor-review-store.js");
const hospital_system_push_service_js_1 = require("../../record-output/services/hospital-system-push.service.js");
const logger_js_1 = require("../../../config/logger.js");
class DemoResetService {
    /**
     * Resets all demo data back to clean baseline state.
     * Strictly blocked in production.
     */
    static async resetDemoSandbox() {
        production_guard_service_js_1.ProductionGuardService.assertDemoModePermitted();
        const cleared = [];
        // 1. Reset Fault Injection Rules
        fault_injection_service_js_1.FaultInjectionService.resetAll();
        cleared.push('Fault Injection Rules');
        // 2. Clear In-Memory Active Visits
        visit_service_js_1.VisitService.resetState();
        cleared.push('Active Kiosk Visits');
        // 3. Clear Kiosk Lockouts & Identity Locks
        identity_safety_service_js_1.IdentitySafetyService.resetState();
        cleared.push('Identity Safety Directory & Lockouts');
        // 4. Reset Doctor Review Store
        dev_fallback_doctor_review_store_js_1.devFallbackDoctorReviewStore.resetState();
        cleared.push('Doctor Review Store & Confirmed Records');
        // 5. Clear Hospital Failure Queue
        hospital_system_push_service_js_1.HospitalSystemPushService.clearFailureQueue();
        cleared.push('Hospital Hand-Off Failure Queue');
        // 6. Reset Active Demo Scenario
        demo_mode_service_js_1.DemoModeService.setActiveScenario(null);
        cleared.push('Active Demo Scenario State');
        const resetAt = new Date().toISOString();
        logger_js_1.logger.info('[DEMO_SANDBOX_RESET_SUCCESSFUL]', { resetAt, cleared });
        return {
            success: true,
            resetAt,
            clearedComponents: cleared,
            banner: demo_mode_service_js_1.DemoModeService.BANNER_TEXT,
        };
    }
}
exports.DemoResetService = DemoResetService;

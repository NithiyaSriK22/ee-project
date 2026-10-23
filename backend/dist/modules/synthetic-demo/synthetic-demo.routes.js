"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syntheticDemoRoutes = void 0;
const express_1 = require("express");
const synthetic_demo_controller_js_1 = require("./synthetic-demo.controller.js");
const auth_middleware_js_1 = require("../../middleware/auth.middleware.js");
const auth_types_js_1 = require("../../types/auth.types.js");
const router = (0, express_1.Router)();
exports.syntheticDemoRoutes = router;
// ==========================================
// 1. PUBLIC DEMO & DISCLOSURE ENDPOINTS
// ==========================================
// Current demo mode status and banner
router.get('/status', synthetic_demo_controller_js_1.SyntheticDemoController.getDemoStatus);
// Honest "About this Demo" disclosure registry (Real vs Mocked vs Canned)
router.get('/about', synthetic_demo_controller_js_1.SyntheticDemoController.getAboutDemoRegistry);
// List all 12 named scenarios
router.get('/scenarios', synthetic_demo_controller_js_1.SyntheticDemoController.getScenarios);
// ==========================================
// 2. SCENARIO EXECUTION & RESET (STAFF / ADMIN)
// ==========================================
// Run a specific named scenario
router.post('/scenarios/:scenarioId/run', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.DOCTOR, auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), synthetic_demo_controller_js_1.SyntheticDemoController.runScenario);
// Run all 12 scenarios (Smoke run)
router.post('/scenarios/run-all', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), synthetic_demo_controller_js_1.SyntheticDemoController.runAllScenarios);
// Reset demo sandbox to clean slate
router.post('/reset', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), synthetic_demo_controller_js_1.SyntheticDemoController.resetDemoSandbox);
// Virtual Kiosk Fleet Simulator
router.post('/simulation/kiosk-fleet', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), synthetic_demo_controller_js_1.SyntheticDemoController.simulateFleet);
// ==========================================
// 3. SYNTHETIC GENERATORS
// ==========================================
router.post('/synthetic/generate-patient', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.DOCTOR, auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), synthetic_demo_controller_js_1.SyntheticDemoController.generatePatient);
router.post('/synthetic/generate-document', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.DOCTOR, auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), synthetic_demo_controller_js_1.SyntheticDemoController.generateDocument);
// ==========================================
// 4. FAULT INJECTION & RESILIENCE
// ==========================================
router.get('/fault-injection', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), synthetic_demo_controller_js_1.SyntheticDemoController.getFaultInjectionRules);
router.post('/fault-injection', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), synthetic_demo_controller_js_1.SyntheticDemoController.setFaultInjectionRule);
// ==========================================
// 5. CROSS-MODULE CONSISTENCY AUDIT
// ==========================================
router.get('/audit/consistency', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), synthetic_demo_controller_js_1.SyntheticDemoController.runConsistencyAudit);
router.get('/audit/consistency/markdown', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), synthetic_demo_controller_js_1.SyntheticDemoController.getConsistencyAuditMarkdown);

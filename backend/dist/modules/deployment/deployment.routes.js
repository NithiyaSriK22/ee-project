"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deploymentRoutes = void 0;
const express_1 = require("express");
const deployment_controller_js_1 = require("./deployment.controller.js");
const auth_middleware_js_1 = require("../../middleware/auth.middleware.js");
const auth_types_js_1 = require("../../types/auth.types.js");
const router = (0, express_1.Router)();
// --- Public / Resilient Status & Downtime Endpoints ---
router.get('/status', deployment_controller_js_1.DeploymentController.getStatusBoard);
router.get('/alert-pipeline/health', deployment_controller_js_1.DeploymentController.getAlertPipelineHealth);
// --- Feature Flags & Kill Switches ---
router.get('/flags', deployment_controller_js_1.DeploymentController.getFlags);
router.patch('/flags/:key', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.DOCTOR), deployment_controller_js_1.DeploymentController.updateFlag);
// --- Global Intake Pause ---
router.get('/intake-pause', deployment_controller_js_1.DeploymentController.getIntakePauseStatus);
router.post('/intake-pause', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.DOCTOR), deployment_controller_js_1.DeploymentController.setIntakePause);
// --- Clinical Safety Release Gates ---
router.get('/release-gates', deployment_controller_js_1.DeploymentController.getReleaseGates);
router.post('/release-gates/override', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN), deployment_controller_js_1.DeploymentController.overrideReleaseGates);
// --- Disaster Recovery & Restore Drills ---
router.get('/restore-drills', deployment_controller_js_1.DeploymentController.getRestoreDrills);
router.post('/restore-drills', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN), deployment_controller_js_1.DeploymentController.recordRestoreDrill);
// --- Kiosk Fleet Hardening & Enrollment ---
router.get('/kiosks', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN), deployment_controller_js_1.DeploymentController.getEnrolledKiosks);
router.post('/kiosks/enroll', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN), deployment_controller_js_1.DeploymentController.enrollKiosk);
router.post('/kiosks/:code/revoke', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN), deployment_controller_js_1.DeploymentController.revokeKiosk);
// Session Wipe Trigger (can be invoked by kiosk on end/timeout/abandon/reboot)
router.post('/kiosks/session/wipe', deployment_controller_js_1.DeploymentController.wipeKioskSession);
exports.deploymentRoutes = router;

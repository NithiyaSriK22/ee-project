"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = void 0;
const express_1 = require("express");
const health_controller_js_1 = require("./health.controller.js");
const router = (0, express_1.Router)();
// /api/v1/health
router.get('/', health_controller_js_1.HealthController.getHealth);
// /api/v1/health/live
router.get('/live', health_controller_js_1.HealthController.getLiveness);
// /api/v1/health/ready
router.get('/ready', health_controller_js_1.HealthController.getReadiness);
exports.healthRoutes = router;

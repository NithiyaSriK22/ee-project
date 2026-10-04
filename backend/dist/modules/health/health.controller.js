"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const health_service_js_1 = require("./health.service.js");
const response_util_js_1 = require("../../utils/response.util.js");
class HealthController {
    static async getHealth(_req, res, next) {
        try {
            const health = await health_service_js_1.HealthService.getDetailedHealth();
            const statusCode = health.status === 'healthy' ? 200 : 200; // 200 for health endpoint info, status reported in payload
            response_util_js_1.ResponseUtil.success(res, health, 'System health check completed', statusCode);
        }
        catch (error) {
            next(error);
        }
    }
    static getLiveness(_req, res) {
        const liveness = health_service_js_1.HealthService.getLiveness();
        response_util_js_1.ResponseUtil.success(res, liveness, 'Service is alive');
    }
    static async getReadiness(_req, res, next) {
        try {
            const readiness = await health_service_js_1.HealthService.getReadiness();
            const statusCode = readiness.ready ? 200 : 503;
            response_util_js_1.ResponseUtil.success(res, readiness, readiness.ready ? 'Service is ready' : 'Service is not ready to accept traffic', statusCode);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.HealthController = HealthController;

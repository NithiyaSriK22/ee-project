"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const health_service_js_1 = require("./health.service.js");
const response_util_js_1 = require("../../utils/response.util.js");
const prisma_js_1 = require("../../database/prisma.js");
class HealthController {
    static async getHealth(_req, res, next) {
        try {
            const health = await health_service_js_1.HealthService.getDetailedHealth();
            const statusCode = 200; // 200 for health endpoint info, status reported in payload
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
    static async getDatabaseHealth(_req, res, next) {
        try {
            const isConnected = await (0, prisma_js_1.checkDatabaseHealth)(true);
            const statusCode = isConnected ? 200 : 503;
            response_util_js_1.ResponseUtil.success(res, {
                database: isConnected ? 'connected' : 'disconnected',
                connected: isConnected,
                service: 'postgresql',
                port: 5432,
            }, isConnected ? 'PostgreSQL database connection is operational' : 'PostgreSQL database connection is unavailable', statusCode);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.HealthController = HealthController;

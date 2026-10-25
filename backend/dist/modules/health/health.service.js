"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthService = void 0;
const prisma_js_1 = require("../../database/prisma.js");
const env_config_js_1 = require("../../config/env.config.js");
class HealthService {
    static async getDetailedHealth(forceRefresh = true) {
        const isDbConnected = await (0, prisma_js_1.checkDatabaseHealth)(forceRefresh);
        const memory = process.memoryUsage();
        return {
            status: isDbConnected ? 'healthy' : 'degraded',
            service: 'thunai-backend',
            version: '1.0.0',
            environment: env_config_js_1.env.NODE_ENV,
            uptimeSeconds: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
            database: isDbConnected ? 'connected' : 'disconnected',
            memory: {
                rssMb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
                heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
            },
        };
    }
    static getLiveness() {
        return {
            status: 'alive',
            uptime: Math.floor(process.uptime()),
        };
    }
    static async getReadiness(forceRefresh = true) {
        const isDbConnected = await (0, prisma_js_1.checkDatabaseHealth)(forceRefresh);
        return {
            ready: isDbConnected,
            database: isDbConnected ? 'connected' : 'disconnected',
        };
    }
}
exports.HealthService = HealthService;

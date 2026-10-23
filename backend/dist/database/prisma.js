"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectDatabase = exports.checkDatabaseHealth = exports.prisma = void 0;
const client_1 = require("@prisma/client");
const logger_js_1 = require("../config/logger.js");
class DatabaseClient {
    static instance = null;
    static getInstance() {
        if (!DatabaseClient.instance) {
            DatabaseClient.instance = new client_1.PrismaClient({
                log: [
                    { emit: 'event', level: 'error' },
                    { emit: 'event', level: 'warn' },
                ],
            });
            // Bind prisma internal errors to structured logger
            DatabaseClient.instance.$on('error', (e) => {
                logger_js_1.logger.error('Prisma Error occurred', { error: String(e) });
            });
            DatabaseClient.instance.$on('warn', (e) => {
                logger_js_1.logger.warn('Prisma Warning', { warning: String(e) });
            });
        }
        return DatabaseClient.instance;
    }
    static cachedStatus = null;
    static async testConnection() {
        const now = Date.now();
        if (DatabaseClient.cachedStatus && now - DatabaseClient.cachedStatus.checkedAt < 5000) {
            return DatabaseClient.cachedStatus.result;
        }
        try {
            const client = DatabaseClient.getInstance();
            const checkPromise = client.$queryRaw `SELECT 1`;
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('PostgreSQL connection check timed out (server unreachable at localhost:5432)')), 500));
            await Promise.race([checkPromise, timeoutPromise]);
            DatabaseClient.cachedStatus = { result: true, checkedAt: now };
            return true;
        }
        catch (error) {
            logger_js_1.logger.warn('Database connectivity check: PostgreSQL server unreachable', {
                error: error instanceof Error ? error.message : String(error),
            });
            DatabaseClient.cachedStatus = { result: false, checkedAt: now };
            return false;
        }
    }
    static async disconnect() {
        if (DatabaseClient.instance) {
            await DatabaseClient.instance.$disconnect();
            DatabaseClient.instance = null;
            logger_js_1.logger.info('Database connection closed cleanly.');
        }
    }
}
exports.prisma = DatabaseClient.getInstance();
exports.checkDatabaseHealth = DatabaseClient.testConnection;
exports.disconnectDatabase = DatabaseClient.disconnect;

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
    static async testConnection() {
        try {
            const client = DatabaseClient.getInstance();
            await client.$queryRaw `SELECT 1`;
            return true;
        }
        catch (error) {
            logger_js_1.logger.warn('Database connection check failed (is PostgreSQL running?)', {
                error: error instanceof Error ? error.message : String(error),
            });
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

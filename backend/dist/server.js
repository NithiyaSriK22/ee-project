"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_js_1 = require("./app.js");
const env_config_js_1 = require("./config/env.config.js");
const logger_js_1 = require("./config/logger.js");
const prisma_js_1 = require("./database/prisma.js");
const app = (0, app_js_1.createApp)();
const server = app.listen(env_config_js_1.env.PORT, () => {
    logger_js_1.logger.info(`🏥 THUNAI Backend API running successfully`, {
        port: env_config_js_1.env.PORT,
        environment: env_config_js_1.env.NODE_ENV,
        apiPrefix: '/api/v1',
        kioskOrigin: env_config_js_1.env.KIOSK_FRONTEND_URL,
        doctorOrigin: env_config_js_1.env.DOCTOR_PORTAL_FRONTEND_URL,
    });
});
// Graceful Shutdown Handler (SIGINT & SIGTERM)
const handleShutdown = (signal) => {
    logger_js_1.logger.info(`Received ${signal}. Initiating graceful shutdown...`);
    server.close(async (err) => {
        if (err) {
            logger_js_1.logger.error('Error while closing HTTP server', { error: err.message });
            process.exit(1);
        }
        logger_js_1.logger.info('HTTP server closed. Disconnecting database...');
        try {
            await (0, prisma_js_1.disconnectDatabase)();
            logger_js_1.logger.info('Graceful shutdown completed successfully.');
            process.exit(0);
        }
        catch (dbErr) {
            logger_js_1.logger.error('Error during database disconnect', {
                error: dbErr instanceof Error ? dbErr.message : String(dbErr),
            });
            process.exit(1);
        }
    });
    // Force shutdown after 10 seconds if connections hang
    setTimeout(() => {
        logger_js_1.logger.error('Graceful shutdown timeout exceeded. Forcing exit.');
        process.exit(1);
    }, 10000).unref();
};
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
    logger_js_1.logger.error('Unhandled Rejection detected', {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
    });
});
process.on('uncaughtException', (error) => {
    logger_js_1.logger.error('Uncaught Exception detected', {
        error: error.message,
        stack: error.stack,
    });
    handleShutdown('uncaughtException');
});

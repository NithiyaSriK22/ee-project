import { createApp } from './app.js';
import { env } from './config/env.config.js';
import { logger } from './config/logger.js';
import { disconnectDatabase } from './database/prisma.js';
import { Server } from 'http';

const app = createApp();

const server: Server = app.listen(env.PORT, () => {
  logger.info(`🏥 MediKiosk Backend API running successfully`, {
    port: env.PORT,
    environment: env.NODE_ENV,
    apiPrefix: '/api/v1',
    kioskOrigin: env.KIOSK_FRONTEND_URL,
    doctorOrigin: env.DOCTOR_PORTAL_FRONTEND_URL,
  });
});

// Graceful Shutdown Handler (SIGINT & SIGTERM)
const handleShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Initiating graceful shutdown...`);

  server.close(async (err) => {
    if (err) {
      logger.error('Error while closing HTTP server', { error: err.message });
      process.exit(1);
    }

    logger.info('HTTP server closed. Disconnecting database...');
    try {
      await disconnectDatabase();
      logger.info('Graceful shutdown completed successfully.');
      process.exit(0);
    } catch (dbErr) {
      logger.error('Error during database disconnect', {
        error: dbErr instanceof Error ? dbErr.message : String(dbErr),
      });
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds if connections hang
  setTimeout(() => {
    logger.error('Graceful shutdown timeout exceeded. Forcing exit.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection detected', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception detected', {
    error: error.message,
    stack: error.stack,
  });
  handleShutdown('uncaughtException');
});

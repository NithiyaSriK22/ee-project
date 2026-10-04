import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger.js';

class DatabaseClient {
  private static instance: PrismaClient | null = null;

  public static getInstance(): PrismaClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new PrismaClient({
        log: [
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ],
      });

      // Bind prisma internal errors to structured logger
      DatabaseClient.instance.$on('error' as never, (e: unknown) => {
        logger.error('Prisma Error occurred', { error: String(e) });
      });

      DatabaseClient.instance.$on('warn' as never, (e: unknown) => {
        logger.warn('Prisma Warning', { warning: String(e) });
      });
    }

    return DatabaseClient.instance;
  }

  public static async testConnection(): Promise<boolean> {
    try {
      const client = DatabaseClient.getInstance();
      await client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.warn('Database connection check failed (is PostgreSQL running?)', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  public static async disconnect(): Promise<void> {
    if (DatabaseClient.instance) {
      await DatabaseClient.instance.$disconnect();
      DatabaseClient.instance = null;
      logger.info('Database connection closed cleanly.');
    }
  }
}

export const prisma = DatabaseClient.getInstance();
export const checkDatabaseHealth = DatabaseClient.testConnection;
export const disconnectDatabase = DatabaseClient.disconnect;

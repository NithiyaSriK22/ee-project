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

  private static cachedStatus: { result: boolean; checkedAt: number } | null = null;

  public static async testConnection(): Promise<boolean> {
    const now = Date.now();
    if (DatabaseClient.cachedStatus && now - DatabaseClient.cachedStatus.checkedAt < 5000) {
      return DatabaseClient.cachedStatus.result;
    }

    try {
      const client = DatabaseClient.getInstance();
      const checkPromise = client.$queryRaw`SELECT 1`;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error('PostgreSQL connection check timed out (server unreachable at localhost:5432)')
            ),
          500
        )
      );

      await Promise.race([checkPromise, timeoutPromise]);
      DatabaseClient.cachedStatus = { result: true, checkedAt: now };
      return true;
    } catch (error) {
      logger.warn('Database connectivity check: PostgreSQL server unreachable', {
        error: error instanceof Error ? error.message : String(error),
      });
      DatabaseClient.cachedStatus = { result: false, checkedAt: now };
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

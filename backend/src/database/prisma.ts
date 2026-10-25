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

  public static async testConnection(forceRefresh = false): Promise<boolean> {
    const now = Date.now();
    // Cache positive connection status for up to 3 seconds to avoid connection thrashing.
    // Negative/failed status is never cached for more than 1 second to ensure rapid recovery detection.
    if (!forceRefresh && DatabaseClient.cachedStatus) {
      const ttl = DatabaseClient.cachedStatus.result ? 3000 : 1000;
      if (now - DatabaseClient.cachedStatus.checkedAt < ttl) {
        return DatabaseClient.cachedStatus.result;
      }
    }

    try {
      const client = DatabaseClient.getInstance();
      const checkPromise = client.$queryRaw`SELECT 1`;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error('PostgreSQL query timed out after 3000ms (database may be under heavy load or locked)')
            ),
          3000
        )
      );

      await Promise.race([checkPromise, timeoutPromise]);
      DatabaseClient.cachedStatus = { result: true, checkedAt: now };
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isTimeout = errorMsg.includes('timed out');
      logger.warn(
        isTimeout
          ? 'Database connectivity check: PostgreSQL query timed out'
          : 'Database connectivity check: PostgreSQL server unreachable',
        { error: errorMsg, isTimeout }
      );
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

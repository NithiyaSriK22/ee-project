import { AppError } from '../../../errors/app-error.js';
import { ErrorCode } from '../../../errors/error-codes.js';
import { logger } from '../../../config/logger.js';
import { env } from '../../../config/env.config.js';

export class ProductionGuardService {
  /**
   * Asserts that synthetic generation/demo execution is permitted in the current environment.
   * Throws ErrorCode.SYNTHETIC_DATA_BLOCKED_IN_PRODUCTION if run in production.
   */
  public static assertSyntheticPermitted(): void {
    if (env.NODE_ENV === 'production') {
      logger.error('[PRODUCTION_GUARD_VIOLATION] Attempted to invoke synthetic generator in production environment!');
      throw new AppError(
        'Synthetic data seeding and demo execution are strictly prohibited in production environments.',
        403,
        ErrorCode.SYNTHETIC_DATA_BLOCKED_IN_PRODUCTION
      );
    }
  }

  /**
   * Asserts that demo mode is permitted.
   */
  public static assertDemoModePermitted(): void {
    if (env.NODE_ENV === 'production') {
      logger.error('[PRODUCTION_GUARD_VIOLATION] Demo mode activation blocked in production environment!');
      throw new AppError(
        'Demo mode is strictly prohibited in production environments.',
        403,
        ErrorCode.DEMO_MODE_BLOCKED_IN_PRODUCTION
      );
    }
  }

  /**
   * Checks whether a record is synthetic.
   */
  public static isSyntheticRecord(record: {
    isSynthetic?: boolean;
    hospitalRegistrationNumber?: string | null;
    id?: string;
  }): boolean {
    if (record.isSynthetic === true) return true;
    if (record.hospitalRegistrationNumber?.startsWith('SYN-')) return true;
    if (record.id?.includes('syn_') || record.id?.includes('SYNTH-')) return true;
    return false;
  }

  /**
   * Filters out synthetic records from production analytics cohorts.
   */
  public static sanitizeAnalyticsCohort<T extends { isSynthetic?: boolean; hospitalRegistrationNumber?: string | null }>(
    items: T[]
  ): T[] {
    return items.filter((item) => !this.isSyntheticRecord(item));
  }
}

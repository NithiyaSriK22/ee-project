import { ProductionGuardService } from '../guards/production-guard.service.js';
import { FaultInjectionService } from '../simulation/fault-injection.service.js';
import { DemoModeService } from './demo-mode.service.js';
import { VisitService } from '../../visit-lifecycle/visit.service.js';
import { IdentitySafetyService } from '../../visit-lifecycle/identity-safety.service.js';
import { devFallbackDoctorReviewStore } from '../../doctor-review/dev-fallback-doctor-review-store.js';
import { HospitalSystemPushService } from '../../record-output/services/hospital-system-push.service.js';
import { logger } from '../../../config/logger.js';

export class DemoResetService {
  /**
   * Resets all demo data back to clean baseline state.
   * Strictly blocked in production.
   */
  public static async resetDemoSandbox(): Promise<{
    success: boolean;
    resetAt: string;
    clearedComponents: string[];
    banner: string;
  }> {
    ProductionGuardService.assertDemoModePermitted();

    const cleared: string[] = [];

    // 1. Reset Fault Injection Rules
    FaultInjectionService.resetAll();
    cleared.push('Fault Injection Rules');

    // 2. Clear In-Memory Active Visits
    VisitService.resetState();
    cleared.push('Active Kiosk Visits');

    // 3. Clear Kiosk Lockouts & Identity Locks
    IdentitySafetyService.resetState();
    cleared.push('Identity Safety Directory & Lockouts');

    // 4. Reset Doctor Review Store
    devFallbackDoctorReviewStore.resetState();
    cleared.push('Doctor Review Store & Confirmed Records');

    // 5. Clear Hospital Failure Queue
    HospitalSystemPushService.clearFailureQueue();
    cleared.push('Hospital Hand-Off Failure Queue');

    // 6. Reset Active Demo Scenario
    DemoModeService.setActiveScenario(null);
    cleared.push('Active Demo Scenario State');

    const resetAt = new Date().toISOString();
    logger.info('[DEMO_SANDBOX_RESET_SUCCESSFUL]', { resetAt, cleared });

    return {
      success: true,
      resetAt,
      clearedComponents: cleared,
      banner: DemoModeService.BANNER_TEXT,
    };
  }
}

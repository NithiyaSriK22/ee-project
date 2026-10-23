import { Request, Response, NextFunction } from 'express';
import { DemoModeState, ScenarioId } from '../synthetic-demo.types.js';
import { ProductionGuardService } from '../guards/production-guard.service.js';
import { FeatureFlagsService } from '../../deployment/feature-flags.service.js';
import { logger } from '../../../config/logger.js';

export class DemoModeService {
  public static readonly BANNER_TEXT = 'DEMONSTRATION — synthetic data';

  private static state: DemoModeState = {
    isDemoMode: true, // Active in local/staging dev mode
    banner: DemoModeService.BANNER_TEXT,
    activeScenario: null,
    lastResetAt: new Date().toISOString(),
  };

  /**
   * Retrieves current demo mode state.
   */
  public static getState(): DemoModeState {
    const flagEnabled = FeatureFlagsService.isFlagEnabled('DEMO_MODE_ENABLED');
    return {
      ...this.state,
      isDemoMode: this.state.isDemoMode || flagEnabled,
    };
  }

  /**
   * Sets the active scenario being demonstrated.
   */
  public static setActiveScenario(scenarioId: ScenarioId | null): void {
    ProductionGuardService.assertDemoModePermitted();
    this.state.activeScenario = scenarioId;
    logger.info(`[DEMO_MODE_SCENARIO_SET] Active scenario: ${scenarioId}`);
  }

  /**
   * Express middleware to attach DEMO header and response banner metadata to every request.
   */
  public static demoBannerMiddleware() {
    return (_req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Medikiosk-Environment', 'DEMO');
      res.setHeader('X-Medikiosk-Demo-Banner', DemoModeService.BANNER_TEXT);
      next();
    };
  }
}

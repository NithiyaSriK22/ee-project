import { StatusBoardSummary } from './deployment.types.js';
import { FeatureFlagsService } from './feature-flags.service.js';
import { devFallbackAdminStore } from '../admin/dev-fallback-admin-store.js';
import { env } from '../../config/env.config.js';
import { checkDatabaseHealth } from '../../database/prisma.js';

export class StatusBoardService {
  /**
   * Generates a lightweight, resilient public/internal status summary.
   * Free of PHI, internal IP addresses, database credentials, or provider keys.
   */
  public static async getStatusSummary(): Promise<StatusBoardSummary> {
    const pauseState = FeatureFlagsService.getGlobalIntakePauseState();
    const kioskIntakeEnabled = FeatureFlagsService.isFlagEnabled('KIOSK_INTAKE_ENABLED');
    const aiSummarizationEnabled = FeatureFlagsService.isFlagEnabled('AI_SUMMARIZATION_ENABLED');
    const ocrEnabled = FeatureFlagsService.isFlagEnabled('OCR_ENABLED');
    const voiceEnabled = FeatureFlagsService.isFlagEnabled('VOICE_ENABLED');

    const auditChainValid = devFallbackAdminStore.verifyAuditChain().valid;
    const isDbConnected = await checkDatabaseHealth();

    // Determine overall status
    let overallStatus: 'OPERATIONAL' | 'DEGRADED' | 'MAINTENANCE_DOWNTIME' = 'OPERATIONAL';

    if (pauseState.isPaused || !kioskIntakeEnabled || !isDbConnected) {
      overallStatus = 'DEGRADED';
    } else if (!aiSummarizationEnabled || !ocrEnabled || !voiceEnabled) {
      overallStatus = 'DEGRADED';
    }

    const intakeActive = kioskIntakeEnabled && !pauseState.isPaused;

    return {
      overallStatus,
      platformVersion: env.RELEASE_VERSION,
      environment: env.NODE_ENV,
      intakeActive,
      checkedAt: new Date().toISOString(),
      services: {
        database: isDbConnected ? 'OPERATIONAL' : 'DEGRADED',
        alertPipeline: 'OPERATIONAL',
        llmSummarization: aiSummarizationEnabled ? 'OPERATIONAL' : 'FALLBACK_MODE',
        ocrService: ocrEnabled ? 'OPERATIONAL' : 'FALLBACK_MODE',
        speechServices: voiceEnabled ? 'OPERATIONAL' : 'TOUCH_FALLBACK',
        auditChain: auditChainValid ? 'VERIFIED' : 'TAMPER_ALERT',
      },
      patientGuidance: intakeActive
        ? 'THUNAI terminals are operational. Please use any available terminal for assisted OPD registration.'
        : 'Kiosk self-registration is currently paused. Please proceed directly to the outpatient reception counter for paper-assisted registration.',
      staffGuidance: !isDbConnected
        ? 'Database server is offline or unreachable at localhost:5432. System is operating in resilient in-memory fallback mode. Existing doctor review and triage queues remain operational.'
        : intakeActive
        ? 'System running normally. Doctor review and triage alert queues are active.'
        : 'Degraded intake mode active. Paper-based registration in progress. Existing visits remain accessible for review and confirmation.',
      emergencyBanner:
        'EMERGENCY ADVISORY: If you or your companion are experiencing acute chest pain, severe difficulty breathing, sudden weakness, or active hemorrhage, please notify hospital staff or press the RED emergency button on any terminal immediately.',
    };
  }
}

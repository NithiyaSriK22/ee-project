import { RedFlagsRepository } from './redflags.repository.js';
import { FactExtractor } from './engine/fact-extractor.js';
import { RuleEvaluator } from './engine/rule-evaluator.js';
import { RuleTestRunner } from './engine/rule-test-runner.js';
import { AlertLifecycle } from './alerts/alert-lifecycle.js';
import { EscalationService } from './alerts/escalation-service.js';
import { SSEBroadcaster } from './alerts/sse-broadcaster.js';
import { InterviewService } from '../interview/interview.service.js';
import { DocumentsService } from '../documents/documents.service.js';
import { logger } from '../../config/logger.js';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  AppError,
} from '../../errors/app-error.js';
import { ErrorCode } from '../../errors/error-codes.js';
import {
  RedFlagAlertDTO,
  RedFlagRuleDTO,
  SeverityTiers,
  TriggerTypes,
  AlertStatuses,
  RuleStatuses,
  ControlledResolutionType,
  ControlledDismissalReason,
  SeverityTier,
} from './redflags.types.js';

export class RedFlagsService {
  // ============================================================================
  // INCREMENTAL EVALUATION (Module 3 & Module 4 hooks)
  // ============================================================================

  /**
   * Deterministically evaluates active red-flag rules against visit facts.
   * Incremental: Called after critical answers, document validation, or interview completion.
   * Safety Guarantee: Never silent on failure; raises STAFF_CHECK alert if evaluation crashes.
   */
  public static async evaluateVisit(visitId: string, kioskDeviceId?: string | null): Promise<RedFlagAlertDTO[]> {
    const raisedAlerts: RedFlagAlertDTO[] = [];

    try {
      // 1. Fetch raw interview answers (Module 3)
      let rawAnswers: any[] = [];
      try {
        const interviewData = await InterviewService.getCompletedAnswers(visitId);
        rawAnswers = interviewData.answers || [];
      } catch (err: any) {
        // If interview not started or not completed yet, fetch partial answers if possible
        logger.info('Interview answers not yet available for visit in evaluation', { visitId });
      }

      // 2. Fetch validated document fields (Module 4)
      let rawFields: any[] = [];
      try {
        const docs = await DocumentsService.getValidatedDocumentFieldsForVisit(visitId);
        for (const doc of docs) {
          for (const f of doc.validatedFields) {
            rawFields.push({
              id: f.id,
              documentId: doc.documentId,
              fieldType: f.fieldType,
              isCritical: f.isCritical,
              result: f.result,
              matchedReferenceValue: f.matchedReferenceValue,
              ocrConfidence: f.ocrConfidence,
            });
          }
        }
      } catch (err) {
        logger.info('No documents yet available for visit in evaluation', { visitId });
      }

      // 3. Extract normalized facts map (3-state logic)
      const normalizedMap = FactExtractor.extractNormalizedFacts(visitId, rawAnswers, rawFields);

      // 4. Fetch only ACTIVE rules
      const activeRules = await RedFlagsRepository.getActiveRules();
      if (activeRules.length === 0) {
        return [];
      }

      // 5. Evaluate all active rules
      const evalInputs = activeRules.map((r) => ({
        id: r.id,
        ruleCode: r.ruleCode,
        version: r.version,
        name: r.name,
        description: r.description,
        severityTier: r.severityTier,
        conditionTree: r.conditionTree,
        raiseOnIndeterminate: r.raiseOnIndeterminate,
        recommendedStaffAction: r.recommendedStaffAction,
      }));

      const results = RuleEvaluator.evaluateAll(evalInputs, normalizedMap);

      // 6. Resolve kiosk location
      const kioskLocation = await RedFlagsRepository.getKioskLocation(kioskDeviceId);

      // 7. Process alerts
      for (const res of results) {
        if (!res.shouldRaiseAlert || !res.alertSeverityTier || !res.triggerType) {
          continue;
        }

        // Deduplication check: check if an open alert already exists for this rule and visit
        const existingOpenAlert = await RedFlagsRepository.findOpenAlertForVisitAndRule(visitId, res.ruleId);

        if (existingOpenAlert) {
          // Deduplicate by adding newly confirmed evidence rather than spamming
          const updated = await RedFlagsRepository.addEvidenceToAlert(existingOpenAlert.id, res.evidenceItems);
          if (updated) {
            raisedAlerts.push(updated);
            SSEBroadcaster.broadcastAlert('alert:updated', updated);
            logger.info('Red-flag alert deduplicated with new evidence', {
              alertId: existingOpenAlert.id,
              visitId,
              ruleCode: res.ruleCode,
            });
          }
        } else {
          // Create new alert
          const newAlert = await RedFlagsRepository.createAlert({
            visitId,
            kioskDeviceId,
            kioskLocation,
            ruleId: res.ruleId,
            ruleCode: res.ruleCode,
            ruleVersion: res.ruleVersion,
            severityTier: res.alertSeverityTier,
            triggerType: res.triggerType,
            ruleDescription: res.triggerType === 'INDETERMINATE'
              ? `Uncertain Critical Question / Document Field: ${res.unknownCriticalFacts.join(', ')}`
              : activeRules.find((r) => r.id === res.ruleId)?.description,
            recommendedStaffAction: res.recommendedStaffAction,
            evidences: res.evidenceItems,
          });

          raisedAlerts.push(newAlert);
          SSEBroadcaster.broadcastAlert('alert:raised', newAlert);

          logger.info('Red-flag alert raised by deterministic rule engine', {
            alertId: newAlert.id,
            visitId,
            ruleCode: res.ruleCode,
            tier: newAlert.severityTier,
            triggerType: newAlert.triggerType,
          });
        }
      }

      return raisedAlerts;
    } catch (err: any) {
      // SECTION 36 REQUIREMENT: Fail loud, never silent!
      logger.error('CRITICAL: Red-flag evaluation encountered an unexpected error', {
        visitId,
        error: String(err),
      });

      // Automatically create a STAFF_CHECK fallback alert so human clinical staff assesses directly
      const kioskLocation = await RedFlagsRepository.getKioskLocation(kioskDeviceId);
      try {
        const fallbackAlert = await RedFlagsRepository.createAlert({
          visitId,
          kioskDeviceId,
          kioskLocation,
          severityTier: SeverityTiers.STAFF_CHECK,
          triggerType: TriggerTypes.INDETERMINATE,
          ruleDescription: 'Automatic clinical screening system error. Direct staff assessment required.',
          recommendedStaffAction: 'Please visit kiosk immediately and assess patient directly.',
          evidences: [
            {
              sourceType: 'EVALUATION_ERROR',
              sourceId: `err-${Date.now()}`,
              factKey: 'system_evaluation_error',
              factValueSnippet: 'Evaluation failure fallback',
            },
          ],
        });
        SSEBroadcaster.broadcastAlert('alert:raised', fallbackAlert);
      } catch {
        // Log failure if fallback alert could not be persisted
      }

      throw new AppError(
        'Red-flag rule evaluation failed. Staff alert automatically generated.',
        500,
        ErrorCode.EVALUATION_ERROR
      );
    }
  }

  // ============================================================================
  // KIOSK HELP REQUEST (Always-visible button)
  // ============================================================================

  public static async raiseManualHelpRequest(
    visitId: string,
    kioskDeviceId?: string | null,
    reason?: string
  ): Promise<RedFlagAlertDTO> {
    const kioskLocation = await RedFlagsRepository.getKioskLocation(kioskDeviceId);

    // Deduplication: check if open manual alert exists
    const existing = await RedFlagsRepository.findOpenAlertForVisit(visitId);
    if (existing && existing.severityTier === SeverityTiers.MANUAL) {
      logger.info('Manual help request deduplicated for visit', { visitId });
      return existing;
    }

    const alert = await RedFlagsRepository.createAlert({
      visitId,
      kioskDeviceId,
      kioskLocation,
      severityTier: SeverityTiers.MANUAL,
      triggerType: TriggerTypes.MANUAL,
      ruleDescription: reason ? `Patient requested help: ${reason}` : 'Patient or companion pressed the "I Need Help" button at kiosk.',
      recommendedStaffAction: 'Attend to kiosk immediately to assist the patient.',
      evidences: [
        {
          sourceType: 'MANUAL_REQUEST',
          sourceId: `help-req-${Date.now()}`,
          factKey: 'kiosk_help_button_pressed',
          factValueSnippet: reason || 'I need help button activated',
        },
      ],
    });

    SSEBroadcaster.broadcastAlert('alert:raised', alert);

    logger.info('Manual help alert raised from kiosk', {
      alertId: alert.id,
      visitId,
      kioskLocation,
    });

    return alert;
  }

  /**
   * MODULE 3B: Neutral Sensitive Disclosure Floor Alert
   * Triggers a dedicated SENSITIVE_DISCLOSURE alert category with pure neutral text ("Please assist the patient at kiosk X").
   * Zero sensitive clinical details in the alert text, notifications, or on the kiosk screen.
   */
  public static async raiseSensitiveDisclosureAlert(
    visitId: string,
    kioskDeviceId?: string | null,
    kioskLocation?: string
  ): Promise<{
    alert: RedFlagAlertDTO;
    supportiveMessage: string;
    helplineDetails: string;
  }> {
    const location = kioskLocation || (await RedFlagsRepository.getKioskLocation(kioskDeviceId)) || 'Device Kiosk';

    // Neutral text per Section 8: "Please assist the patient at kiosk X"
    const neutralDescription = `Please assist the patient at ${location}.`;

    const alert = await RedFlagsRepository.createAlert({
      visitId,
      kioskDeviceId,
      kioskLocation: location,
      severityTier: SeverityTiers.SENSITIVE_DISCLOSURE,
      triggerType: TriggerTypes.MANUAL,
      ruleDescription: neutralDescription,
      recommendedStaffAction: 'Please attend kiosk to provide confidential patient assistance.',
      evidences: [
        {
          sourceType: 'SENSITIVE_DISCLOSURE',
          sourceId: `disclosure-${Date.now()}`,
          factKey: 'sensitive_disclosure_triggered',
          factValueSnippet: 'Neutral assistance requested',
        },
      ],
    });

    SSEBroadcaster.broadcastAlert('alert:raised', alert);

    logger.info('Neutral sensitive disclosure alert raised for floor staff', {
      alertId: alert.id,
      visitId,
      kioskLocation: location,
      tier: SeverityTiers.SENSITIVE_DISCLOSURE,
    });

    return {
      alert,
      supportiveMessage: 'A trained staff member has been notified and will assist you in private. You are in a safe, confidential environment.',
      helplineDetails: 'National Support Helpline: 112 / Patient Care Advocacy: Ext. 4004',
    };
  }

  /**
   * MODULE 3B Section 5: Staff flag "patient unwell or unable"
   * Stops intake and routes straight to staff through Module 6 manual-alert path.
   */
  public static async flagPatientUnwellOrUnable(
    visitId: string,
    kioskDeviceId?: string | null,
    reason?: string
  ): Promise<RedFlagAlertDTO> {
    const location = (await RedFlagsRepository.getKioskLocation(kioskDeviceId)) || 'Device Kiosk';

    const alert = await RedFlagsRepository.createAlert({
      visitId,
      kioskDeviceId,
      kioskLocation: location,
      severityTier: SeverityTiers.MANUAL,
      triggerType: TriggerTypes.MANUAL,
      ruleDescription: `Patient unwell or unable to continue intake at ${location}. Direct clinical assistance needed.`,
      recommendedStaffAction: 'Attend to kiosk immediately and escort patient to clinical assessment area.',
      evidences: [
        {
          sourceType: 'PATIENT_UNWELL_FLAG',
          sourceId: `unwell-${Date.now()}`,
          factKey: 'patient_unwell_or_unable',
          factValueSnippet: reason || 'Patient flagged unwell/unable',
        },
      ],
    });

    SSEBroadcaster.broadcastAlert('alert:raised', alert);

    logger.info('Patient unwell/unable flag raised, intake halted', {
      alertId: alert.id,
      visitId,
      reason,
    });

    return alert;
  }

  public static async getKioskAlertStatus(visitId: string) {
    const openAlert = await RedFlagsRepository.findOpenAlertForVisit(visitId);
    if (!openAlert) {
      return {
        hasActiveAlert: false,
        messageType: null,
      };
    }

    // Zero clinical detail leaked!
    const isImmediate = openAlert.severityTier === SeverityTiers.IMMEDIATE || openAlert.severityTier === SeverityTiers.URGENT || openAlert.severityTier === SeverityTiers.MANUAL;

    return {
      hasActiveAlert: true,
      messageType: isImmediate ? 'IMMEDIATE' : 'STAFF_CHECK',
    };
  }

  // ============================================================================
  // STAFF ALERT QUEUE MANAGEMENT
  // ============================================================================

  public static async listAlerts(filters?: {
    status?: string;
    severityTier?: string;
    visitId?: string;
  }): Promise<RedFlagAlertDTO[]> {
    return RedFlagsRepository.listAlerts(filters);
  }

  public static async getAlertById(id: string): Promise<RedFlagAlertDTO> {
    const alert = await RedFlagsRepository.getAlertById(id);
    if (!alert) {
      throw new NotFoundError(`Triage alert not found with ID: ${id}`);
    }
    return alert;
  }

  public static async acknowledgeAlert(
    id: string,
    actorId?: string,
    actorRole?: string,
    note?: string
  ): Promise<RedFlagAlertDTO> {
    const alert = await this.getAlertById(id);
    AlertLifecycle.validateTransition(alert.status, AlertStatuses.ACKNOWLEDGED);

    const updated = await RedFlagsRepository.updateAlertStatus(
      id,
      AlertStatuses.ACKNOWLEDGED,
      actorId,
      actorRole,
      note ? { resolutionNote: note } : undefined
    );

    if (!updated) throw new NotFoundError('Alert not found during acknowledgement');

    SSEBroadcaster.broadcastAlert('alert:acknowledged', updated);
    logger.info('Triage alert acknowledged by staff', { alertId: id, actorId });
    return updated;
  }

  public static async startAssessment(
    id: string,
    actorId?: string,
    actorRole?: string,
    note?: string
  ): Promise<RedFlagAlertDTO> {
    const alert = await this.getAlertById(id);
    AlertLifecycle.validateTransition(alert.status, AlertStatuses.IN_ASSESSMENT);

    const updated = await RedFlagsRepository.updateAlertStatus(
      id,
      AlertStatuses.IN_ASSESSMENT,
      actorId,
      actorRole,
      note ? { resolutionNote: note } : undefined
    );

    if (!updated) throw new NotFoundError('Alert not found');

    SSEBroadcaster.broadcastAlert('alert:updated', updated);
    logger.info('Triage alert moved to IN_ASSESSMENT', { alertId: id, actorId });
    return updated;
  }

  public static async resolveAlert(
    id: string,
    actorId: string | undefined,
    actorRole: string | undefined,
    resolutionType: ControlledResolutionType,
    resolutionNote?: string
  ): Promise<RedFlagAlertDTO> {
    const alert = await this.getAlertById(id);
    AlertLifecycle.validateTransition(alert.status, AlertStatuses.RESOLVED);
    AlertLifecycle.validateResolution(resolutionType);

    const updated = await RedFlagsRepository.updateAlertStatus(
      id,
      AlertStatuses.RESOLVED,
      actorId,
      actorRole,
      { resolutionType, resolutionNote }
    );

    if (!updated) throw new NotFoundError('Alert not found');

    SSEBroadcaster.broadcastAlert('alert:resolved', updated);
    logger.info('Triage alert RESOLVED', { alertId: id, resolutionType });
    return updated;
  }

  public static async escalateAlert(
    id: string,
    actorId?: string,
    actorRole?: string,
    reason?: string
  ): Promise<RedFlagAlertDTO> {
    const alert = await this.getAlertById(id);
    AlertLifecycle.validateTransition(alert.status, AlertStatuses.ESCALATED);

    const updated = await RedFlagsRepository.updateAlertStatus(
      id,
      AlertStatuses.ESCALATED,
      actorId,
      actorRole,
      reason ? { resolutionNote: reason } : undefined
    );

    if (!updated) throw new NotFoundError('Alert not found');

    SSEBroadcaster.broadcastAlert('alert:escalated', updated);
    logger.info('Triage alert ESCALATED', { alertId: id, level: updated.escalationLevel });
    return updated;
  }

  public static async dismissAlert(
    id: string,
    actorId: string | undefined,
    actorRole: string | undefined,
    dismissalReason: ControlledDismissalReason,
    note?: string
  ): Promise<RedFlagAlertDTO> {
    const alert = await this.getAlertById(id);
    AlertLifecycle.validateTransition(alert.status, AlertStatuses.DISMISSED);
    AlertLifecycle.validateDismissal(dismissalReason);

    const updated = await RedFlagsRepository.updateAlertStatus(
      id,
      AlertStatuses.DISMISSED,
      actorId,
      actorRole,
      { dismissalReason, resolutionNote: note }
    );

    if (!updated) throw new NotFoundError('Alert not found');

    SSEBroadcaster.broadcastAlert('alert:dismissed', updated);
    logger.info('Triage alert DISMISSED as false positive', { alertId: id, dismissalReason });
    return updated;
  }

  // ============================================================================
  // ADMIN & CLINICAL REVIEW OF RULES
  // ============================================================================

  public static async listRules(): Promise<RedFlagRuleDTO[]> {
    return RedFlagsRepository.listRules();
  }

  public static async getRuleById(id: string): Promise<RedFlagRuleDTO> {
    const rule = await RedFlagsRepository.getRuleById(id);
    if (!rule) {
      throw new NotFoundError(`Red-flag rule not found with ID: ${id}`);
    }
    return rule;
  }

  public static async createRule(
    data: {
      ruleCode: string;
      name: string;
      description: string;
      severityTier: SeverityTier;
      conditionTree: any;
      testCases?: any;
      raiseOnIndeterminate: boolean;
      recommendedStaffAction: string;
      isIllustrative?: boolean;
    },
    authorId?: string
  ): Promise<RedFlagRuleDTO> {
    const existing = await RedFlagsRepository.getRuleByCode(data.ruleCode);
    if (existing) {
      throw new ValidationError(`A rule with code '${data.ruleCode}' already exists.`);
    }

    const rule = await RedFlagsRepository.createRule({
      ...data,
      createdBy: authorId,
    });

    logger.info('Red-flag rule authored in DRAFT state', {
      ruleId: rule.id,
      ruleCode: rule.ruleCode,
      authorId,
    });

    return rule;
  }

  public static async updateRule(
    id: string,
    updates: Partial<RedFlagRuleDTO>
  ): Promise<RedFlagRuleDTO> {
    const rule = await this.getRuleById(id);
    if (rule.status === RuleStatuses.ACTIVE) {
      throw new ValidationError('Active rules cannot be edited in place. Create a new version instead.');
    }

    const updated = await RedFlagsRepository.updateRule(id, updates);
    if (!updated) throw new NotFoundError('Rule not found during update');
    return updated;
  }

  public static async runRuleTests(id: string) {
    const rule = await this.getRuleById(id);
    return RuleTestRunner.runTests(rule, rule.testCases || []);
  }

  public static async submitRuleForReview(id: string, actorId?: string): Promise<RedFlagRuleDTO> {
    const rule = await this.getRuleById(id);
    if (rule.status !== RuleStatuses.DRAFT) {
      throw new ValidationError(`Only DRAFT rules can be submitted for review. Current status: ${rule.status}`);
    }

    // Gating check: Must pass test cases
    const testResults = RuleTestRunner.runTests(rule, rule.testCases || []);
    if (!testResults.passed) {
      throw new AppError(
        `Cannot submit rule for review: ${testResults.failedTests} test case(s) failed.`,
        400,
        ErrorCode.RULE_TESTS_FAILED
      );
    }

    const updated = await RedFlagsRepository.updateRule(id, {
      status: RuleStatuses.CLINICAL_REVIEW,
      updatedBy: actorId,
    });

    logger.info('Red-flag rule submitted for clinical review', { ruleId: id, actorId });
    return updated!;
  }

  public static async approveRule(
    id: string,
    reviewerId: string,
    reviewerRole: string
  ): Promise<RedFlagRuleDTO> {
    const rule = await this.getRuleById(id);
    if (rule.status !== RuleStatuses.CLINICAL_REVIEW) {
      throw new ValidationError(`Only rules in CLINICAL_REVIEW can be approved. Current status: ${rule.status}`);
    }

    // Clinical reviewer role permission check
    if (reviewerRole !== 'DOCTOR' && reviewerRole !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Clinical sign-off requires DOCTOR or clinical reviewer role.');
    }

    // Separation of duties check
    if (rule.createdBy && rule.createdBy === reviewerId) {
      throw new ForbiddenError(
        'Separation of duties: The person who authored the rule cannot be the sole approver.'
      );
    }

    // Final test harness gate
    const testResults = RuleTestRunner.runTests(rule, rule.testCases || []);
    if (!testResults.passed) {
      throw new AppError(
        'Cannot approve rule: Automated test harness suite failed.',
        400,
        ErrorCode.RULE_TESTS_FAILED
      );
    }

    const updated = await RedFlagsRepository.updateRule(id, {
      status: RuleStatuses.ACTIVE,
      clinicallyReviewedBy: reviewerId,
      clinicallyReviewedAt: new Date().toISOString(),
      effectiveFrom: new Date().toISOString(),
    });

    logger.info('Red-flag rule ACTIVATED after clinical review approval', {
      ruleId: id,
      reviewerId,
      ruleCode: rule.ruleCode,
      version: rule.version,
    });

    return updated!;
  }

  public static async retireRule(id: string, actorId?: string): Promise<RedFlagRuleDTO> {
    await this.getRuleById(id);
    const updated = await RedFlagsRepository.updateRule(id, {
      status: RuleStatuses.RETIRED,
      updatedBy: actorId,
    });

    logger.info('Red-flag rule RETIRED', { ruleId: id, actorId });
    return updated!;
  }

  // ============================================================================
  // BACKGROUND ESCALATION SWEEPER
  // ============================================================================

  public static async sweepAndEscalateStaleAlerts(): Promise<number> {
    const openAlerts = await RedFlagsRepository.listAlerts({ status: AlertStatuses.RAISED });
    let escalatedCount = 0;

    for (const alert of openAlerts) {
      const shouldEscalate = EscalationService.shouldEscalate(
        alert.severityTier,
        alert.status,
        new Date(alert.raisedAt)
      );

      if (shouldEscalate) {
        await this.escalateAlert(alert.id, 'system-escalation-sweeper', 'SYSTEM', 'Unacknowledged SLA exceeded');
        escalatedCount++;
      }
    }

    return escalatedCount;
  }
}

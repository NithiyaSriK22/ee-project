import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { ThreeStateEvaluator } from '../src/modules/redflags/engine/three-state-evaluator.js';
import { FactExtractor } from '../src/modules/redflags/engine/fact-extractor.js';
import { RuleEvaluator } from '../src/modules/redflags/engine/rule-evaluator.js';
import { RuleTestRunner } from '../src/modules/redflags/engine/rule-test-runner.js';
import { AlertLifecycle } from '../src/modules/redflags/alerts/alert-lifecycle.js';
import { EscalationService } from '../src/modules/redflags/alerts/escalation-service.js';
import { RedFlagsService } from '../src/modules/redflags/redflags.service.js';
import { RedFlagsRepository } from '../src/modules/redflags/redflags.repository.js';
import { devFallbackRedflagsStore } from '../src/modules/redflags/dev-fallback-redflags-store.js';
import {
  kioskAlertsRouter,
  triageAlertsRouter,
  adminRedflagRulesRouter,
} from '../src/modules/redflags/redflags.routes.js';
import { globalErrorHandler } from '../src/middleware/error.middleware.js';
import { TokenUtil } from '../src/utils/token.util.js';
import {
  ThreeStateValues,
  RuleEvaluationOutcomes,
  SeverityTiers,
  TriggerTypes,
  AlertStatuses,
  RuleStatuses,
  FactStates,
} from '../src/modules/redflags/redflags.types.js';

describe('MODULE 6 — Red-Flag Detection & Emergency Triage Alerts', () => {
  beforeEach(() => {
    devFallbackRedflagsStore.clearAll();
  });

  // ============================================================================
  // 1. THREE-STATE TRUTH TABLE LOGIC & DETERMINISTIC OPERATORS (Section 11)
  // ============================================================================
  describe('1. Deterministic Three-State Rule Evaluator (Section 11)', () => {
    it('Should evaluate AND truth table with exact three-state logic', () => {
      // TRUE AND TRUE = TRUE
      expect(ThreeStateEvaluator.and([ThreeStateValues.TRUE, ThreeStateValues.TRUE])).toBe(ThreeStateValues.TRUE);
      // TRUE AND FALSE = FALSE
      expect(ThreeStateEvaluator.and([ThreeStateValues.TRUE, ThreeStateValues.FALSE])).toBe(ThreeStateValues.FALSE);
      // TRUE AND UNKNOWN = UNKNOWN
      expect(ThreeStateEvaluator.and([ThreeStateValues.TRUE, ThreeStateValues.UNKNOWN])).toBe(ThreeStateValues.UNKNOWN);
      // FALSE AND UNKNOWN = FALSE
      expect(ThreeStateEvaluator.and([ThreeStateValues.FALSE, ThreeStateValues.UNKNOWN])).toBe(ThreeStateValues.FALSE);
    });

    it('Should evaluate OR truth table with exact three-state logic', () => {
      // TRUE OR UNKNOWN = TRUE
      expect(ThreeStateEvaluator.or([ThreeStateValues.TRUE, ThreeStateValues.UNKNOWN])).toBe(ThreeStateValues.TRUE);
      // FALSE OR UNKNOWN = UNKNOWN
      expect(ThreeStateEvaluator.or([ThreeStateValues.FALSE, ThreeStateValues.UNKNOWN])).toBe(ThreeStateValues.UNKNOWN);
      // FALSE OR FALSE = FALSE
      expect(ThreeStateEvaluator.or([ThreeStateValues.FALSE, ThreeStateValues.FALSE])).toBe(ThreeStateValues.FALSE);
    });

    it('Should evaluate NOT truth table with exact three-state logic', () => {
      // NOT TRUE = FALSE
      expect(ThreeStateEvaluator.not(ThreeStateValues.TRUE)).toBe(ThreeStateValues.FALSE);
      // NOT FALSE = TRUE
      expect(ThreeStateEvaluator.not(ThreeStateValues.FALSE)).toBe(ThreeStateValues.TRUE);
      // NOT UNKNOWN = UNKNOWN
      expect(ThreeStateEvaluator.not(ThreeStateValues.UNKNOWN)).toBe(ThreeStateValues.UNKNOWN);
    });

    it('Should evaluate nested group conditions deterministically', () => {
      // Condition: chest_pain AND (breathing_difficulty OR sweating)
      const conditionTree = {
        operator: 'AND' as const,
        conditions: [
          { fact: 'chest_pain', operator: 'EQUALS' as const, value: true },
          {
            operator: 'OR' as const,
            conditions: [
              { fact: 'breathing_difficulty', operator: 'EQUALS' as const, value: true },
              { fact: 'sweating', operator: 'EQUALS' as const, value: true },
            ],
          },
        ],
      };

      const triggering = new Set<string>();
      const unknown = new Set<string>();

      // Case: chest_pain=true, breathing_difficulty=false, sweating=true -> should be TRUE
      const result1 = ThreeStateEvaluator.evaluateTree(
        conditionTree,
        {
          chest_pain: { factKey: 'chest_pain', state: 'KNOWN', value: true },
          breathing_difficulty: { factKey: 'breathing_difficulty', state: 'KNOWN', value: false },
          sweating: { factKey: 'sweating', state: 'KNOWN', value: true },
        },
        triggering,
        unknown
      );
      expect(result1).toBe(ThreeStateValues.TRUE);
      expect(triggering.has('chest_pain')).toBe(true);
      expect(triggering.has('sweating')).toBe(true);

      // Case: chest_pain=true, breathing_difficulty=UNKNOWN, sweating=false -> should be UNKNOWN
      const triggering2 = new Set<string>();
      const unknown2 = new Set<string>();
      const result2 = ThreeStateEvaluator.evaluateTree(
        conditionTree,
        {
          chest_pain: { factKey: 'chest_pain', state: 'KNOWN', value: true },
          breathing_difficulty: { factKey: 'breathing_difficulty', state: 'UNKNOWN', isCritical: true },
          sweating: { factKey: 'sweating', state: 'KNOWN', value: false },
        },
        triggering2,
        unknown2
      );
      expect(result2).toBe(ThreeStateValues.UNKNOWN);
      expect(unknown2.has('breathing_difficulty')).toBe(true);
    });

    it('Should evaluate numeric comparison operators and ranges correctly', () => {
      const triggering = new Set<string>();
      const unknown = new Set<string>();

      const facts = {
        systolic_bp: { factKey: 'systolic_bp', state: FactStates.KNOWN, value: 185 },
        oxygen_saturation: { factKey: 'oxygen_saturation', state: FactStates.KNOWN, value: 88 },
      };

      const highBp = ThreeStateEvaluator.evaluateLeaf(
        { fact: 'systolic_bp', operator: 'GREATER_THAN', value: 180 },
        facts,
        triggering,
        unknown
      );
      expect(highBp).toBe(ThreeStateValues.TRUE);

      const lowSpO2 = ThreeStateEvaluator.evaluateLeaf(
        { fact: 'oxygen_saturation', operator: 'LESS_THAN', value: 90 },
        facts,
        triggering,
        unknown
      );
      expect(lowSpO2).toBe(ThreeStateValues.TRUE);

      const normalSpO2 = ThreeStateEvaluator.evaluateLeaf(
        { fact: 'oxygen_saturation', operator: 'BETWEEN', value: 95, secondaryValue: 100 },
        facts,
        triggering,
        unknown
      );
      expect(normalSpO2).toBe(ThreeStateValues.FALSE);
    });
  });

  // ============================================================================
  // 2. SENSITIVITY BIAS FOR UNKNOWN FACTS (Section 8)
  // ============================================================================
  describe('2. Sensitivity Bias for Unknown Facts (Section 8)', () => {
    const testRule = {
      id: 'rule-test-sensitivity',
      ruleCode: 'RF-SENS-001',
      version: 1,
      name: 'Severe Dyspnea Screening',
      description: 'Acute respiratory distress',
      severityTier: SeverityTiers.IMMEDIATE,
      conditionTree: {
        operator: 'AND' as const,
        conditions: [
          { fact: 'chest_pain', operator: 'EQUALS' as const, value: true },
          { fact: 'breathing_difficulty', operator: 'EQUALS' as const, value: true },
        ],
      },
      raiseOnIndeterminate: true,
      recommendedStaffAction: 'Assess patient vital signs',
    };

    it('Should raise STAFF_CHECK alert when critical question is skipped or unasked', () => {
      const normalizedFacts = FactExtractor.extractNormalizedFacts(
        'visit-sens-01',
        [
          {
            id: 'ans-1',
            questionId: 'q-cp',
            questionCode: 'Q_CHEST_PAIN',
            promptText: 'Do you have chest pain?',
            answerValue: 'YES',
            isCritical: true,
            isSkipped: false,
          },
          {
            id: 'ans-2',
            questionId: 'q-bd',
            questionCode: 'Q_BREATHING_DIFFICULTY',
            promptText: 'Do you have difficulty breathing?',
            answerValue: null,
            isCritical: true,
            isSkipped: true, // SKIPPED!
          },
        ],
        []
      );

      const result = RuleEvaluator.evaluateRule(testRule, normalizedFacts);
      expect(result.outcome).toBe(RuleEvaluationOutcomes.INDETERMINATE);
      expect(result.shouldRaiseAlert).toBe(true);
      expect(result.alertSeverityTier).toBe(SeverityTiers.STAFF_CHECK);
      expect(result.triggerType).toBe(TriggerTypes.INDETERMINATE);
      expect(result.unknownCriticalFacts).toContain('breathing_difficulty');
    });

    it('Should treat "prefer not to answer" as UNKNOWN and produce a STAFF_CHECK alert', () => {
      const normalizedFacts = FactExtractor.extractNormalizedFacts(
        'visit-sens-02',
        [
          {
            id: 'ans-1',
            questionId: 'q-cp',
            questionCode: 'Q_CHEST_PAIN',
            promptText: 'Do you have chest pain?',
            answerValue: 'Prefer not to answer', // DECLINED!
            isCritical: true,
            isSkipped: false,
          },
        ],
        []
      );

      const result = RuleEvaluator.evaluateRule(testRule, normalizedFacts);
      expect(result.outcome).toBe(RuleEvaluationOutcomes.INDETERMINATE);
      expect(result.shouldRaiseAlert).toBe(true);
      expect(result.alertSeverityTier).toBe(SeverityTiers.STAFF_CHECK);
    });

    it('Should treat UNVERIFIED or UNREADABLE document fields as UNKNOWN', () => {
      const normalizedFacts = FactExtractor.extractNormalizedFacts(
        'visit-sens-03',
        [],
        [
          {
            id: 'field-doc-1',
            fieldType: 'lab_value',
            isCritical: true,
            result: 'UNREADABLE', // UNREADABLE DOCUMENT!
            matchedReferenceValue: '185/95',
          },
        ]
      );

      const fact = normalizedFacts.facts['systolic_bp'];
      expect(fact.state).toBe(FactStates.UNKNOWN);
    });
  });

  // ============================================================================
  // 3. ALERT LIFECYCLE & DEDUPLICATION (Section 15-18)
  // ============================================================================
  describe('3. Alert Lifecycle, Deduplication & Escalation (Sections 15-18)', () => {
    it('Should enforce strict valid lifecycle transitions and block invalid jumps', () => {
      // Valid transition: RAISED -> ACKNOWLEDGED
      expect(() =>
        AlertLifecycle.validateTransition(AlertStatuses.RAISED, AlertStatuses.ACKNOWLEDGED)
      ).not.toThrow();

      // Valid transition: ACKNOWLEDGED -> IN_ASSESSMENT
      expect(() =>
        AlertLifecycle.validateTransition(AlertStatuses.ACKNOWLEDGED, AlertStatuses.IN_ASSESSMENT)
      ).not.toThrow();

      // Valid transition: IN_ASSESSMENT -> RESOLVED
      expect(() =>
        AlertLifecycle.validateTransition(AlertStatuses.IN_ASSESSMENT, AlertStatuses.RESOLVED)
      ).not.toThrow();

      // INVALID transition: RAISED -> RESOLVED without acknowledgment
      expect(() =>
        AlertLifecycle.validateTransition(AlertStatuses.RAISED, AlertStatuses.RESOLVED)
      ).toThrow(/Cannot move alert from 'RAISED' to 'RESOLVED'/);
    });

    it('Should require a controlled dismissal reason when dismissing as false positive', () => {
      expect(() =>
        AlertLifecycle.validateDismissal('FALSE_POSITIVE_PATIENT_CORRECTION')
      ).not.toThrow();

      expect(() =>
        AlertLifecycle.validateDismissal('random_uncontrolled_reason')
      ).toThrow(/Controlled reason from catalog required/);
    });

    it('Should deduplicate alerts on repeated triggers rather than creating duplicate rows', async () => {
      const alert1 = await RedFlagsRepository.createAlert({
        visitId: 'visit-dedup-1',
        kioskLocation: 'Kiosk 1, OPD Block A',
        ruleId: 'rule-100',
        ruleCode: 'RF-DEDUP',
        ruleVersion: 1,
        severityTier: SeverityTiers.IMMEDIATE,
        triggerType: TriggerTypes.RULE_MATCH,
        evidences: [{ sourceType: 'INTERVIEW_ANSWER', sourceId: 'ans-1', factKey: 'chest_pain' }],
      });

      // Second trigger for same visit and rule
      const existingOpen = await RedFlagsRepository.findOpenAlertForVisitAndRule('visit-dedup-1', 'rule-100');
      expect(existingOpen).toBeDefined();
      expect(existingOpen!.id).toBe(alert1.id);

      // Add new evidence
      const updated = await RedFlagsRepository.addEvidenceToAlert(alert1.id, [
        { sourceType: 'INTERVIEW_ANSWER', sourceId: 'ans-2', factKey: 'breathing_difficulty' },
      ]);

      expect(updated!.evidences.length).toBe(2);
      expect(updated!.events.some((e) => e.eventType === 'ALERT_DEDUPLICATED')).toBe(true);

      const allAlerts = await RedFlagsRepository.listAlerts({ visitId: 'visit-dedup-1' });
      expect(allAlerts.length).toBe(1); // STILL 1 ALERT, NOT 2!
    });

    it('Should detect escalation when SLA expires for unacknowledged alerts', () => {
      const now = new Date();
      const fourMinutesAgo = new Date(now.getTime() - 4 * 60 * 1000);

      // IMMEDIATE has 3-minute SLA (180s)
      const shouldEscalate = EscalationService.shouldEscalate(
        SeverityTiers.IMMEDIATE,
        AlertStatuses.RAISED,
        fourMinutesAgo,
        {
          immediateTimeoutSeconds: 180,
          manualTimeoutSeconds: 120,
          urgentTimeoutSeconds: 600,
          staffCheckTimeoutSeconds: 1200,
        },
        now
      );

      expect(shouldEscalate).toBe(true);

      // If already ACKNOWLEDGED, must NOT escalate
      const acknowledged = EscalationService.shouldEscalate(
        SeverityTiers.IMMEDIATE,
        AlertStatuses.ACKNOWLEDGED,
        fourMinutesAgo,
        undefined,
        now
      );
      expect(acknowledged).toBe(false);
    });
  });

  // ============================================================================
  // 4. RULE GOVERNANCE & CLINICAL REVIEW GATING (Section 25-27)
  // ============================================================================
  describe('4. Rule Governance, Separation of Duties & Test Gating (Sections 25-27)', () => {
    it('Should block submitting rule for review if its test harness fails', async () => {
      const failingRule = await RedFlagsService.createRule(
        {
          ruleCode: 'RF-TEST-FAIL',
          name: 'Failing Test Rule',
          description: 'Rule with mismatched test case',
          severityTier: SeverityTiers.IMMEDIATE,
          conditionTree: {
            fact: 'chest_pain',
            operator: 'EQUALS',
            value: true,
          },
          raiseOnIndeterminate: true,
          recommendedStaffAction: 'Action text',
          testCases: [
            {
              name: 'Impossible expectation',
              facts: { chest_pain: { state: 'KNOWN', value: false } },
              expectedOutcome: 'TRIGGERED', // Expecting TRIGGERED when chest_pain is false!
            },
          ],
        },
        'author-user-1'
      );

      await expect(RedFlagsService.submitRuleForReview(failingRule.id, 'author-user-1')).rejects.toThrow(
        /Cannot submit rule for review: 1 test case\(s\) failed/
      );
    });

    it('Should enforce separation of duties: Author cannot approve their own rule', async () => {
      const rule = await RedFlagsService.createRule(
        {
          ruleCode: 'RF-SEP-DUTIES',
          name: 'Separation of Duties Rule',
          description: 'Rule testing approver restrictions',
          severityTier: SeverityTiers.URGENT,
          conditionTree: {
            fact: 'cough_blood',
            operator: 'EQUALS',
            value: true,
          },
          raiseOnIndeterminate: true,
          recommendedStaffAction: 'Action text',
          testCases: [
            {
              name: 'Cough blood present',
              facts: { cough_blood: { state: 'KNOWN', value: true } },
              expectedOutcome: 'TRIGGERED',
            },
          ],
        },
        'doctor-author-id'
      );

      // Submit for review
      await RedFlagsService.submitRuleForReview(rule.id, 'doctor-author-id');

      // Doctor author tries to approve their own rule -> FORBIDDEN!
      await expect(
        RedFlagsService.approveRule(rule.id, 'doctor-author-id', 'DOCTOR')
      ).rejects.toThrow(/Separation of duties: The person who authored the rule cannot be the sole approver/);

      // Different doctor approves -> SUCCESS!
      const approved = await RedFlagsService.approveRule(rule.id, 'doctor-reviewer-id', 'DOCTOR');
      expect(approved.status).toBe(RuleStatuses.ACTIVE);
      expect(approved.clinicallyReviewedBy).toBe('doctor-reviewer-id');
    });

    it('Should forbid non-clinician roles from approving rules', async () => {
      const rule = await RedFlagsService.createRule(
        {
          ruleCode: 'RF-ROLE-CHECK',
          name: 'Role Check Rule',
          description: 'Rule testing role checks',
          severityTier: SeverityTiers.URGENT,
          conditionTree: { fact: 'cough_blood', operator: 'EQUALS', value: true },
          raiseOnIndeterminate: true,
          recommendedStaffAction: 'Action text',
          testCases: [
            {
              name: 'Test 1',
              facts: { cough_blood: { state: 'KNOWN', value: true } },
              expectedOutcome: 'TRIGGERED',
            },
          ],
        },
        'author-1'
      );

      await RedFlagsService.submitRuleForReview(rule.id, 'author-1');

      // Staff attendant tries to approve -> FORBIDDEN!
      await expect(
        RedFlagsService.approveRule(rule.id, 'staff-attendant-1', 'STAFF_ATTENDANT')
      ).rejects.toThrow(/Clinical sign-off requires DOCTOR/);
    });
  });

  // ============================================================================
  // 5. SECTION 44 REQUIRED TEST JOURNEY (END-TO-END)
  // ============================================================================
  describe('5. Section 44 Required Test Journey: End-to-End Clinical Lifecycle', () => {
    it('Should execute Section 44 journey across authoring, patient intake, indeterminate fallback, manual help, and resolution', async () => {
      // ------------------------------------------------------------------------
      // Step 1: Admin authors an ILLUSTRATIVE rule (chest pain AND breathing difficulty)
      // ------------------------------------------------------------------------
      const draftRule = await RedFlagsService.createRule(
        {
          ruleCode: 'RF-JOURNEY-001',
          name: '[ILLUSTRATIVE] Acute Coronary Screening',
          description: 'Flags acute co-occurrence of chest pain and dyspnea',
          severityTier: SeverityTiers.IMMEDIATE,
          conditionTree: {
            operator: 'AND',
            conditions: [
              { fact: 'chest_pain', operator: 'EQUALS', value: true },
              { fact: 'breathing_difficulty', operator: 'EQUALS', value: true },
            ],
          },
          raiseOnIndeterminate: true,
          recommendedStaffAction: 'Immediate triage nurse evaluation & ECG referral',
          isIllustrative: true,
          testCases: [
            {
              name: 'Both positive',
              facts: {
                chest_pain: { state: 'KNOWN', value: true },
                breathing_difficulty: { state: 'KNOWN', value: true },
              },
              expectedOutcome: 'TRIGGERED',
            },
            {
              name: 'One unknown',
              facts: {
                chest_pain: { state: 'KNOWN', value: true },
                breathing_difficulty: { state: 'UNKNOWN' },
              },
              expectedOutcome: 'INDETERMINATE',
            },
          ],
        },
        'admin-author-user'
      );

      expect(draftRule.status).toBe(RuleStatuses.DRAFT);

      // Verify draft rules NEVER evaluate for live patients
      const preActiveRules = await RedFlagsRepository.getActiveRules();
      expect(preActiveRules.some((r) => r.ruleCode === 'RF-JOURNEY-001')).toBe(false);

      // ------------------------------------------------------------------------
      // Step 2 & 3: Rule tests pass -> submitted -> Clinician approves -> rule ACTIVE (v1)
      // ------------------------------------------------------------------------
      const submitted = await RedFlagsService.submitRuleForReview(draftRule.id, 'admin-author-user');
      expect(submitted.status).toBe(RuleStatuses.CLINICAL_REVIEW);

      const approvedRule = await RedFlagsService.approveRule(
        draftRule.id,
        'dr.ramesh.clinical.reviewer',
        'DOCTOR'
      );
      expect(approvedRule.status).toBe(RuleStatuses.ACTIVE);
      expect(approvedRule.version).toBe(1);

      // ------------------------------------------------------------------------
      // Step 4: Patient 1 at kiosk answers "Yes" to chest pain and "Yes" to breathing difficulty
      // ------------------------------------------------------------------------
      const patient1VisitId = 'visit-patient-journey-01';

      // Seed facts via dev fallback store for evaluation
      const p1Facts = FactExtractor.extractNormalizedFacts(
        patient1VisitId,
        [
          {
            id: 'p1-ans-cp',
            questionId: 'q-cp',
            questionCode: 'Q_CHEST_PAIN',
            promptText: 'Do you have chest pain?',
            answerValue: 'YES',
            isCritical: true,
          },
          {
            id: 'p1-ans-bd',
            questionId: 'q-bd',
            questionCode: 'Q_BREATHING_DIFFICULTY',
            promptText: 'Do you have difficulty breathing?',
            answerValue: 'YES',
            isCritical: true,
          },
        ],
        []
      );

      // Evaluate
      const p1EvalResults = RuleEvaluator.evaluateAll([approvedRule], p1Facts);
      expect(p1EvalResults[0].outcome).toBe(RuleEvaluationOutcomes.TRIGGERED);

      const p1Alert = await RedFlagsRepository.createAlert({
        visitId: patient1VisitId,
        kioskLocation: 'Kiosk 3, OPD Block A',
        ruleId: approvedRule.id,
        ruleCode: approvedRule.ruleCode,
        ruleVersion: approvedRule.version,
        severityTier: approvedRule.severityTier,
        triggerType: TriggerTypes.RULE_MATCH,
        recommendedStaffAction: approvedRule.recommendedStaffAction,
        evidences: p1EvalResults[0].evidenceItems,
      });

      expect(p1Alert.severityTier).toBe(SeverityTiers.IMMEDIATE);
      expect(p1Alert.status).toBe(AlertStatuses.RAISED);
      expect(p1Alert.kioskLocation).toBe('Kiosk 3, OPD Block A');

      // ------------------------------------------------------------------------
      // Step 5: Kiosk shows calm message (no diagnosis, no rule names)
      // ------------------------------------------------------------------------
      const kioskStatusP1 = await RedFlagsService.getKioskAlertStatus(patient1VisitId);
      expect(kioskStatusP1.hasActiveAlert).toBe(true);
      expect(kioskStatusP1.messageType).toBe('IMMEDIATE');
      // Verify clinical details are completely omitted from kiosk payload
      expect((kioskStatusP1 as any).ruleCode).toBeUndefined();
      expect((kioskStatusP1 as any).diagnosis).toBeUndefined();

      // ------------------------------------------------------------------------
      // Step 6: Staff queue displays alert -> acknowledges -> assesses -> resolves with note
      // ------------------------------------------------------------------------
      const staffAck = await RedFlagsService.acknowledgeAlert(
        p1Alert.id,
        'nurse-001',
        'STAFF_ATTENDANT',
        'Attending patient at Kiosk 3'
      );
      expect(staffAck.status).toBe(AlertStatuses.ACKNOWLEDGED);

      const staffAssess = await RedFlagsService.startAssessment(
        p1Alert.id,
        'dr-triage-002',
        'DOCTOR',
        'Examining ECG and SpO2'
      );
      expect(staffAssess.status).toBe(AlertStatuses.IN_ASSESSMENT);

      const staffResolved = await RedFlagsService.resolveAlert(
        p1Alert.id,
        'dr-triage-002',
        'DOCTOR',
        'CLINICAL_ASSESSMENT_COMPLETED',
        'Patient stabilized and transferred to Emergency Cardiology Unit'
      );
      expect(staffResolved.status).toBe(AlertStatuses.RESOLVED);
      expect(staffResolved.resolutionType).toBe('CLINICAL_ASSESSMENT_COMPLETED');

      // ------------------------------------------------------------------------
      // Step 7: Second Patient answers "Yes" to chest pain, skips breathing question
      // ------------------------------------------------------------------------
      const patient2VisitId = 'visit-patient-journey-02';
      const p2Facts = FactExtractor.extractNormalizedFacts(
        patient2VisitId,
        [
          {
            id: 'p2-ans-cp',
            questionId: 'q-cp',
            questionCode: 'Q_CHEST_PAIN',
            promptText: 'Do you have chest pain?',
            answerValue: 'YES',
            isCritical: true,
          },
          {
            id: 'p2-ans-bd',
            questionId: 'q-bd',
            questionCode: 'Q_BREATHING_DIFFICULTY',
            promptText: 'Do you have difficulty breathing?',
            answerValue: null,
            isCritical: true,
            isSkipped: true, // SKIPPED!
          },
        ],
        []
      );

      const p2EvalResults = RuleEvaluator.evaluateAll([approvedRule], p2Facts);
      expect(p2EvalResults[0].outcome).toBe(RuleEvaluationOutcomes.INDETERMINATE);
      expect(p2EvalResults[0].shouldRaiseAlert).toBe(true);
      expect(p2EvalResults[0].alertSeverityTier).toBe(SeverityTiers.STAFF_CHECK);

      const p2Alert = await RedFlagsRepository.createAlert({
        visitId: patient2VisitId,
        kioskLocation: 'Kiosk 1, OPD Block A',
        ruleId: approvedRule.id,
        ruleCode: approvedRule.ruleCode,
        ruleVersion: approvedRule.version,
        severityTier: SeverityTiers.STAFF_CHECK,
        triggerType: TriggerTypes.INDETERMINATE,
        recommendedStaffAction: 'Verify skipped breathing difficulty question with patient',
        evidences: p2EvalResults[0].evidenceItems,
      });

      expect(p2Alert.severityTier).toBe(SeverityTiers.STAFF_CHECK);
      expect(p2Alert.triggerType).toBe(TriggerTypes.INDETERMINATE);

      // ------------------------------------------------------------------------
      // Step 8: Third Patient presses "I need help" without finishing registration
      // ------------------------------------------------------------------------
      const patient3VisitId = 'unregistered-walkin-session';
      const manualAlert = await RedFlagsService.raiseManualHelpRequest(
        patient3VisitId,
        'kiosk-dev-001',
        'Feeling faint at registration desk'
      );

      expect(manualAlert.severityTier).toBe(SeverityTiers.MANUAL);
      expect(manualAlert.triggerType).toBe(TriggerTypes.MANUAL);
      expect(manualAlert.kioskLocation).toBeDefined();

      // ------------------------------------------------------------------------
      // Step 9: Alert left unacknowledged -> escalates after timeout
      // ------------------------------------------------------------------------
      const escalated = await RedFlagsService.escalateAlert(
        p2Alert.id,
        'system-sweeper',
        'SYSTEM',
        'Unacknowledged for > 20 minutes'
      );
      expect(escalated.status).toBe(AlertStatuses.ESCALATED);
      expect(escalated.escalationLevel).toBe(1);
    });
  });

  // ============================================================================
  // 6. SECURITY, ISOLATION & API ROLE-BASED ACCESS CONTROL (Section 33)
  // ============================================================================
  describe('6. Security, Isolation & Role-Based Access Control', () => {
    const app = express();
    app.use(express.json());

    app.use('/api/v1/kiosk', kioskAlertsRouter);
    app.use('/api/v1/triage/alerts', triageAlertsRouter);
    app.use('/api/v1/admin/redflag-rules', adminRedflagRulesRouter);
    app.use(globalErrorHandler);

    it('Should reject unauthenticated requests to staff triage queue', async () => {
      const res = await request(app).get('/api/v1/triage/alerts');
      expect(res.status).toBe(401);
    });

    it('Should allow authorized staff and doctors to access triage alerts queue', async () => {
      const doctorToken = TokenUtil.generateStaffAccessToken({
        sub: 'c0000000-0000-4000-a000-000000000002',
        email: 'dr.triage@hospital.org',
        role: 'DOCTOR',
        fullName: 'Dr. Triage Officer',
      });

      const res = await request(app)
        .get('/api/v1/triage/alerts')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('Should allow anonymous or session-scoped patient to trigger manual help request', async () => {
      const res = await request(app)
        .post('/api/v1/kiosk/help-request')
        .send({
          reason: 'Need physical assistance',
          kioskLocation: 'Kiosk 2, Main Entrance',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.alertId).toBeDefined();
    });

    it('Kiosk alert status endpoint must NEVER leak clinical reasoning or rule names', async () => {
      const kioskToken = TokenUtil.generateKioskSessionToken({
        sessionId: 'kiosk-session-leak-check',
        visitId: 'visit-leak-check-01',
        patientId: 'patient-leak-check-01',
        hospitalRegistrationNumber: 'HRN-998877',
      }).token;

      // Raise an alert for this visit
      await RedFlagsRepository.createAlert({
        visitId: 'visit-leak-check-01',
        kioskLocation: 'Kiosk 1',
        ruleCode: 'RF-CORONARY-SECRET',
        ruleDescription: 'Acute Myocardial Infarction',
        severityTier: SeverityTiers.IMMEDIATE,
        triggerType: TriggerTypes.RULE_MATCH,
        evidences: [],
      });

      const res = await request(app)
        .get('/api/v1/kiosk/alerts/status')
        .set('Authorization', `Bearer ${kioskToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.hasActiveAlert).toBe(true);
      expect(res.body.data.messageType).toBe('IMMEDIATE');
      // Strictly verify no leak
      expect(res.body.data.ruleCode).toBeUndefined();
      expect(res.body.data.ruleDescription).toBeUndefined();
      expect(res.body.data.diagnosis).toBeUndefined();
    });
  });
});

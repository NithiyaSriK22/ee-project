import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SeededPRNG } from '../src/modules/synthetic-demo/generator/prng.js';
import { SyntheticPatientGenerator } from '../src/modules/synthetic-demo/generator/synthetic-patient.generator.js';
import { PersonaScriptService } from '../src/modules/synthetic-demo/generator/persona-scripts.js';
import { SyntheticDocumentGenerator } from '../src/modules/synthetic-demo/generator/synthetic-documents.generator.js';
import { SyntheticAudioGenerator } from '../src/modules/synthetic-demo/generator/synthetic-audio.generator.js';
import { ProductionGuardService } from '../src/modules/synthetic-demo/guards/production-guard.service.js';
import { FixturePrivacyScanner } from '../src/modules/synthetic-demo/guards/fixture-privacy-scanner.js';
import { FaultInjectionService } from '../src/modules/synthetic-demo/simulation/fault-injection.service.js';
import { ScenarioDefinitionService } from '../src/modules/synthetic-demo/simulation/scenarios/scenario-definitions.js';
import { ScenarioRunner } from '../src/modules/synthetic-demo/simulation/scenarios/scenario-runner.js';
import { KioskFleetSimulator } from '../src/modules/synthetic-demo/simulation/kiosk-fleet-simulator.js';
import { AboutDemoService } from '../src/modules/synthetic-demo/demo/about-demo.registry.js';
import { DemoModeService } from '../src/modules/synthetic-demo/demo/demo-mode.service.js';
import { DemoResetService } from '../src/modules/synthetic-demo/demo/demo-reset.service.js';
import { ConsistencyAuditService } from '../src/modules/synthetic-demo/consistency-audit/consistency-audit.service.js';
import { FeatureFlagsService } from '../src/modules/deployment/feature-flags.service.js';
import { env } from '../src/config/env.config.js';

describe('MODULE 10A — SYNTHETIC DATA, SIMULATION, DEMO MODE & CONSISTENCY AUDIT', () => {
  beforeEach(() => {
    FaultInjectionService.resetAll();
  });

  afterEach(() => {
    FaultInjectionService.resetAll();
  });

  // ==========================================
  // 1. SYNTHETIC DATA GENERATOR & DETERMINISM
  // ==========================================
  describe('1. Synthetic Generator & Determinism', () => {
    it('Should deterministically produce identical patients when given the identical seed', () => {
      const patientA = SyntheticPatientGenerator.generatePatient(4040, 'normal_adult');
      const patientB = SyntheticPatientGenerator.generatePatient(4040, 'normal_adult');

      expect(patientA.id).toBe(patientB.id);
      expect(patientA.fullName).toBe(patientB.fullName);
      expect(patientA.hospitalRegistrationNumber).toBe(patientB.hospitalRegistrationNumber);
      expect(patientA.dateOfBirth).toBe(patientB.dateOfBirth);
      expect(patientA.contactNumber).toBe(patientB.contactNumber);
      expect(patientA.isSynthetic).toBe(true);
      expect(patientA.provenance).toBe('SYNTHETIC_GENERATOR');
      expect(patientA.hospitalRegistrationNumber.startsWith(SyntheticPatientGenerator.RESERVED_PREFIX)).toBe(true);
    });

    it('Should produce distinct patients with different seeds', () => {
      const patientA = SyntheticPatientGenerator.generatePatient(1001, 'normal_adult');
      const patientB = SyntheticPatientGenerator.generatePatient(9999, 'normal_adult');

      expect(patientA.id).not.toBe(patientB.id);
      expect(patientA.hospitalRegistrationNumber).not.toBe(patientB.hospitalRegistrationNumber);
    });

    it('Should generate cohort across personas with reserved registration prefixes', () => {
      const cohort = SyntheticPatientGenerator.generateCohort(8, 5000);
      expect(cohort.length).toBe(8);

      for (const item of cohort) {
        expect(item.patient.isSynthetic).toBe(true);
        expect(item.patient.hospitalRegistrationNumber.startsWith('SYN-HRN-')).toBe(true);
        expect(item.visit.isSynthetic).toBe(true);
        expect(item.visit.tokenNumber).toBeDefined();
      }
    });

    it('Should provide 8 distinct personas with valid clinical scripts', () => {
      const allPersonas = PersonaScriptService.getAllPersonas();
      expect(allPersonas.length).toBe(8);
      expect(allPersonas).toContain('normal_adult');
      expect(allPersonas).toContain('pediatric_minor');
      expect(allPersonas).toContain('companion_assisted');
      expect(allPersonas).toContain('surrogate_incapacitated');
      expect(allPersonas).toContain('sensitive_mental_health');
      expect(allPersonas).toContain('contradictory');

      const sensitiveScript = PersonaScriptService.getScript('sensitive_mental_health');
      expect(sensitiveScript.expectedSafetyFlags).toContain('MODULE_3B_SENSITIVE_TOPIC_FLAGGED');
      expect(sensitiveScript.answers.some((a) => a.sensitivityLevel === 'HIGHLY_SENSITIVE')).toBe(true);
    });
  });

  // ==========================================
  // 2. SYNTHETIC DOCUMENTS & GROUND TRUTH
  // ==========================================
  describe('2. Synthetic Documents & Ground Truth Pairing', () => {
    it('Should generate prescription document with paired ground-truth medications and SHA-256 checksum', () => {
      const doc = SyntheticDocumentGenerator.generatePrescription({ seed: 7100, isDegraded: false });

      expect(doc.id).toBeDefined();
      expect(doc.groundTruth.documentType).toBe('PRESCRIPTION');
      expect(doc.groundTruth.isSynthetic).toBe(true);
      expect(doc.groundTruth.medications?.length).toBeGreaterThan(0);
      expect(doc.checksumSha256).toBeDefined();
      expect(doc.renderedHtml).toContain('HOSPITAL RX SEAL');
      expect(doc.renderedHtml).toContain('SYNTHETIC FIXTURE');
    });

    it('Should generate lab report with abnormal reference range flags and paired ground truth', () => {
      const lab = SyntheticDocumentGenerator.generateLabReport({ seed: 7200, hasAbnormalValues: true });

      expect(lab.groundTruth.documentType).toBe('LAB_REPORT');
      expect(lab.groundTruth.labResults?.length).toBe(4);

      const hb = lab.groundTruth.labResults?.find((r) => r.testName.includes('Hemoglobin'));
      expect(hb?.flag).toBe('LOW');

      const glucose = lab.groundTruth.labResults?.find((r) => r.testName.includes('Glucose'));
      expect(glucose?.flag).toBe('HIGH');
    });

    it('Should generate synthetic audio utterance metadata with simulated noise overlays', () => {
      const audio = SyntheticAudioGenerator.generateUtterance({
        seed: 7300,
        text: 'Severe chest discomfort',
        noiseType: 'CLINIC_BABBLE',
      });

      expect(audio.utteranceId).toBeDefined();
      expect(audio.noiseType).toBe('CLINIC_BABBLE');
      expect(audio.snrDb).toBeLessThan(20);
      expect(audio.simulatedAsrConfidence).toBe(0.74);
    });
  });

  // ==========================================
  // 3. PRODUCTION GUARDS & PRIVACY SCANNER
  // ==========================================
  describe('3. Production Guards & Privacy Scanner', () => {
    it('Should block synthetic generation and demo mode if environment is production', () => {
      const originalEnv = env.NODE_ENV;
      try {
        (env as any).NODE_ENV = 'production';
        expect(() => ProductionGuardService.assertSyntheticPermitted()).toThrowError(
          /strictly prohibited in production/
        );
        expect(() => ProductionGuardService.assertDemoModePermitted()).toThrowError(
          /strictly prohibited in production/
        );
      } finally {
        (env as any).NODE_ENV = originalEnv;
      }
    });

    it('Should exclude synthetic records from production analytics cohorts', () => {
      const cohort = [
        { id: 'pat_real_1', hospitalRegistrationNumber: 'MK-2026-100201', isSynthetic: false },
        { id: 'syn_pat_2', hospitalRegistrationNumber: 'SYN-HRN-999123', isSynthetic: true },
        { id: 'pat_real_2', hospitalRegistrationNumber: 'MK-2026-100202' },
      ];

      const sanitized = ProductionGuardService.sanitizeAnalyticsCohort(cohort);
      expect(sanitized.length).toBe(2);
      expect(sanitized.every((s) => !s.hospitalRegistrationNumber.startsWith('SYN-'))).toBe(true);
    });

    it('Should detect planted realistic PII in privacy scanner and pass clean synthetic text', () => {
      const dirtyFixture = `
Patient record note:
Aadhaar UID: 4567 8901 2345
SSN: 987-65-4320
Visa Card: 4111111111111111
Hospital Reg: MK-2026-100999
      `;

      const dirtyResult = FixturePrivacyScanner.scanTextContent(dirtyFixture);
      expect(dirtyResult.isSafe).toBe(false);
      expect(dirtyResult.findings.some((f) => f.patternType === 'AADHAAR_LIKE')).toBe(true);
      expect(dirtyResult.findings.some((f) => f.patternType === 'SSN_LIKE')).toBe(true);
      expect(dirtyResult.findings.some((f) => f.patternType === 'CREDIT_CARD_LIKE')).toBe(true);
      expect(dirtyResult.findings.some((f) => f.patternType === 'UNFLAGGED_PRODUCTION_HRN')).toBe(true);

      const cleanFixture = `
Patient: Aarav Sharma (SYNTHETIC)
Registration: SYN-HRN-123456
Complaint: Mild cough for 2 days.
      `;

      const cleanResult = FixturePrivacyScanner.scanTextContent(cleanFixture);
      expect(cleanResult.isSafe).toBe(true);
      expect(cleanResult.findingsCount).toBe(0);
    });
  });

  // ==========================================
  // 4. SCENARIO LIBRARY & SIMULATION
  // ==========================================
  describe('4. Scenario Library & Headless Execution', () => {
    it('Should define all 12 named scenarios with expected outcomes', () => {
      const scenarios = ScenarioDefinitionService.getAllScenarios();
      expect(scenarios.length).toBe(12);

      const expectedIds = [
        'happy_path',
        'unreadable_allergy',
        'interview_document_conflict',
        'red_flag_emergency',
        'voice_failure_fallback',
        'offline_and_sync',
        'language_switch',
        'kiosk_reboot_recovery',
        'summary_failure_fallback',
        'two_doctors_concurrency',
        'amendment_versioning',
        'downtime_degradation',
      ];

      for (const id of expectedIds) {
        expect(scenarios.some((s) => s.id === id)).toBe(true);
      }
    });

    it('Should execute the happy path scenario headlessly and verify outcome', async () => {
      const result = await ScenarioRunner.runScenario('happy_path');
      expect(result.passed).toBe(true);
      expect(result.executedSteps).toBe(5);
      expect(result.outcomeVerified).toBe(true);
      expect(result.syntheticVisitId).toBeDefined();
    });

    it('Should execute virtual kiosk fleet simulation with latency metrics', async () => {
      const metrics = await KioskFleetSimulator.simulateFleet({
        kioskCount: 4,
        sessionsPerKiosk: 2,
        concurrencyLevel: 2,
        failureRatePct: 0,
        injectLatencyMs: 10,
      });

      expect(metrics.totalSessionsInitiated).toBe(8);
      expect(metrics.totalSessionsCompleted).toBe(8);
      expect(metrics.totalErrorsEncountered).toBe(0);
      expect(metrics.averageSessionDurationMs).toBeGreaterThanOrEqual(10);
      expect(metrics.syntheticOnlyEnforced).toBe(true);
    });

    it('Should inject simulated latency and errors when fault injection is active', async () => {
      // Temporarily enable fault injection flag
      FeatureFlagsService.updateFlag(
        'FAULT_INJECTION_ENABLED',
        true,
        { id: 'admin-1', role: 'ADMIN' },
        'Test fault injection'
      );

      FaultInjectionService.setRule({
        targetService: 'OCR',
        failureType: 'ERROR_500',
        failureRatePct: 100, // Always fail
        active: true,
      });

      await expect(FaultInjectionService.maybeInjectFault('OCR')).rejects.toThrowError(
        /Injected simulated 500 error from upstream partner: OCR/
      );

      // Disable again
      FeatureFlagsService.updateFlag(
        'FAULT_INJECTION_ENABLED',
        false,
        { id: 'admin-1', role: 'ADMIN' },
        'Disable fault injection'
      );
    });
  });

  // ==========================================
  // 5. DEMO MODE & HONEST LABELS
  // ==========================================
  describe('5. Demo Mode & Honest Component Disclosures', () => {
    it('Should provide persistent DEMONSTRATION banner and status', () => {
      const state = DemoModeService.getState();
      expect(state.banner).toBe('DEMONSTRATION — synthetic data');
      expect(state.isDemoMode).toBe(true);
    });

    it('Should provide honest About this Demo registry distinguishing REAL vs MOCKED vs CANNED components', () => {
      const about = AboutDemoService.getAboutDemoRegistry();
      expect(about.environment).toBe('DEMO');
      expect(about.bannerMessage).toBe('DEMONSTRATION — synthetic data');
      expect(about.components.length).toBeGreaterThanOrEqual(8);

      const realComponents = about.components.filter((c) => c.status === 'REAL');
      const mockedComponents = about.components.filter((c) => c.status === 'MOCKED');
      const cannedComponents = about.components.filter((c) => c.status === 'CANNED_SYNTHETIC');

      expect(realComponents.length).toBeGreaterThan(0);
      expect(mockedComponents.length).toBeGreaterThan(0);
      expect(cannedComponents.length).toBeGreaterThan(0);

      // Specifically check that doctor review, safety rules, and audit are marked REAL
      expect(realComponents.some((c) => c.componentName.includes('Doctor Review'))).toBe(true);
      expect(realComponents.some((c) => c.componentName.includes('Red-Flag'))).toBe(true);
      expect(realComponents.some((c) => c.componentName.includes('Audit'))).toBe(true);

      // Check that hardware peripherals and inbound EHR direct writes are marked MOCKED
      expect(mockedComponents.some((c) => c.componentName.includes('EHR Inbound'))).toBe(true);
    });

    it('Should execute demo sandbox reset to clear active sessions cleanly', async () => {
      const result = await DemoResetService.resetDemoSandbox();
      expect(result.success).toBe(true);
      expect(result.clearedComponents.length).toBeGreaterThan(0);
      expect(result.banner).toBe('DEMONSTRATION — synthetic data');
    });
  });

  // ==========================================
  // 6. CROSS-MODULE CONSISTENCY AUDIT
  // ==========================================
  describe('6. Cross-Module Consistency Audit', () => {
    it('Should execute 9-point consistency audit and generate structured report', async () => {
      const report = await ConsistencyAuditService.runFullAudit();

      expect(report.auditId).toBeDefined();
      expect(report.summaryCounts.totalChecks).toBeGreaterThanOrEqual(9);
      expect(report.summaryCounts.passed).toBeGreaterThan(0);
      expect(report.summaryCounts.criticalFailures).toBe(0);
      expect(report.overallScorePct).toBeGreaterThanOrEqual(85);
      expect(report.status).toBe('PASSED');

      // Check specific categories
      const categories = report.findings.map((f) => f.category);
      expect(categories).toContain('DICTIONARY_DRIFT');
      expect(categories).toContain('EVENT_CONTRACT');
      expect(categories).toContain('ENDPOINT_ROLE_MATRIX');
      expect(categories).toContain('PRIVACY_SCANNER');
      expect(categories).toContain('URL_ERROR_SAFETY');
      expect(categories).toContain('DATABASE_SCHEMA');
      expect(categories).toContain('API_ENVELOPE');
      expect(categories).toContain('ORPHAN_DATA');
      expect(categories).toContain('DEPENDENCY_CONFIG');
    });

    it('Should generate human-readable markdown consistency report', async () => {
      const report = await ConsistencyAuditService.runFullAudit();
      const markdown = ConsistencyAuditService.generateMarkdownReport(report);

      expect(markdown).toContain('# THUNAI Cross-Module Consistency & Safety Audit Report');
      expect(markdown).toContain('Overall Status:');
      expect(markdown).toContain('| Check ID | Category | Severity | Target Module | Status | Message |');
    });
  });
});

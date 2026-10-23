/**
 * MODULE 10A — SYNTHETIC DATA, SIMULATION, DEMO MODE & CROSS-MODULE CONSISTENCY AUDIT
 * Canonical Types and Contracts
 */

export type PersonaType =
  | 'normal_adult'
  | 'declines_intake'
  | 'skips_optional'
  | 'contradictory'
  | 'companion_assisted'
  | 'pediatric_minor'
  | 'surrogate_incapacitated'
  | 'sensitive_mental_health';

export interface SyntheticPatient {
  id: string;
  hospitalRegistrationNumber: string; // Reserved prefix: SYN-HRN-XXXXXX
  fullName: string;
  preferredLanguage: string;
  dateOfBirth: string;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  contactNumber: string;
  isSynthetic: true;
  provenance: 'SYNTHETIC_GENERATOR';
  seed: number;
  persona: PersonaType;
}

export interface SyntheticVisit {
  visitId: string;
  patientId: string;
  tokenNumber: string;
  departmentCode: string;
  departmentName: string;
  status: 'CHECKED_IN' | 'INTAKE_IN_PROGRESS' | 'READY_FOR_REVIEW' | 'COMPLETED';
  identityState: 'CONFIRMED' | 'PROVISIONAL';
  isSynthetic: true;
  createdAt: string;
}

export interface PersonaAnswer {
  questionId: string;
  questionText: string;
  category: 'CHIEF_COMPLAINT' | 'HISTORY' | 'MEDICATIONS' | 'ALLERGIES' | 'SENSITIVE';
  value: string | number | boolean | string[];
  skipped?: boolean;
  declined?: boolean;
  isContradictory?: boolean;
  sensitivityLevel?: 'NORMAL' | 'SENSITIVE' | 'HIGHLY_SENSITIVE';
}

export interface PersonaScript {
  persona: PersonaType;
  description: string;
  patientProfile: Partial<SyntheticPatient>;
  companion?: {
    name: string;
    relationship: string;
    isSurrogate: boolean;
  };
  answers: PersonaAnswer[];
  expectedTriageCategory: 'ROUTINE' | 'URGENT' | 'EMERGENT';
  expectedSafetyFlags: string[];
}

export interface DocumentGroundTruth {
  documentId: string;
  documentType: 'PRESCRIPTION' | 'LAB_REPORT';
  language: string;
  isSynthetic: true;
  patientName: string;
  doctorName?: string;
  hospitalName?: string;
  clinicalDate: string;
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    durationDays: number;
    rxNormOrSnomedCode?: string;
  }>;
  labResults?: Array<{
    testName: string;
    numericValue: number;
    unit: string;
    referenceRange: string;
    flag: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL';
  }>;
}

export interface SyntheticDocument {
  id: string;
  groundTruth: DocumentGroundTruth;
  renderedHtml: string;
  styleParams: {
    fontFamily: string;
    isHandwrittenLike: boolean;
    skewDeg: number;
    blurRadiusPx: number;
    hasHospitalStamp: boolean;
    noiseLevelPct: number;
  };
  checksumSha256: string;
}

export interface SyntheticAudioUtterance {
  utteranceId: string;
  language: string;
  text: string;
  snrDb: number;
  noiseType: 'CLEAN' | 'CLINIC_BABBLE' | 'AC_HUM' | 'COUGH_BURST';
  simulatedAsrConfidence: number;
  waveformDurationSec: number;
  syntheticTtsEngine: 'SIMULATED_NEURAL_TTS';
}

export interface FormularyItem {
  code: string;
  genericName: string;
  brandNames: string[];
  category: string;
  standardDosages: string[];
  contraindications: string[];
}

export interface ReferenceRangeItem {
  testCode: string;
  testName: string;
  category: string;
  unit: string;
  normalMin: number;
  normalMax: number;
  criticalMin?: number;
  criticalMax?: number;
}

// ==========================================
// SCENARIO DEFINITIONS & SIMULATION
// ==========================================

export type ScenarioId =
  | 'happy_path'
  | 'unreadable_allergy'
  | 'interview_document_conflict'
  | 'red_flag_emergency'
  | 'voice_failure_fallback'
  | 'offline_and_sync'
  | 'language_switch'
  | 'kiosk_reboot_recovery'
  | 'summary_failure_fallback'
  | 'two_doctors_concurrency'
  | 'amendment_versioning'
  | 'downtime_degradation';

export interface ScenarioStep {
  stepNumber: number;
  action: string;
  payload: Record<string, any>;
  expectedStatus: number | 'SUCCESS';
  expectedAssertion: string;
}

export interface ScenarioDefinition {
  id: ScenarioId;
  name: string;
  category: 'CLINICAL' | 'SAFETY' | 'RESILIENCE' | 'CONCURRENCY';
  description: string;
  persona: PersonaType;
  steps: ScenarioStep[];
  expectedOutcome: string;
}

export interface ScenarioExecutionResult {
  scenarioId: ScenarioId;
  scenarioName: string;
  passed: boolean;
  executedSteps: number;
  totalSteps: number;
  durationMs: number;
  stepDetails: Array<{
    step: number;
    action: string;
    passed: boolean;
    message: string;
  }>;
  syntheticVisitId?: string;
  outcomeVerified: boolean;
}

export interface FleetSimulationConfig {
  kioskCount: number;
  sessionsPerKiosk: number;
  concurrencyLevel: number;
  failureRatePct: number;
  injectLatencyMs: number;
}

export interface FleetSimulationMetrics {
  totalSessionsInitiated: number;
  totalSessionsCompleted: number;
  totalErrorsEncountered: number;
  averageSessionDurationMs: number;
  p95SessionDurationMs: number;
  activeConcurrentKiosks: number;
  syntheticOnlyEnforced: boolean;
}

export interface FaultInjectionRule {
  targetService: 'OCR' | 'SUMMARIZER' | 'VOICE_STT' | 'HOSPITAL_ADAPTER';
  failureType: 'LATENCY' | 'ERROR_500' | 'TIMEOUT';
  latencyMs?: number;
  failureRatePct: number; // 0 to 100
  active: boolean;
}

// ==========================================
// DEMO MODE & HONEST LABELS
// ==========================================

export type ImplementationStatus = 'REAL' | 'MOCKED' | 'CANNED_SYNTHETIC';

export interface ComponentDisclosure {
  componentName: string;
  module: string;
  status: ImplementationStatus;
  description: string;
  clinicalProductionReadiness: string;
}

export interface AboutDemoRegistry {
  environment: 'DEMO';
  bannerMessage: string;
  disclaimer: string;
  auditPassed: boolean;
  components: ComponentDisclosure[];
}

export interface DemoModeState {
  isDemoMode: boolean;
  banner: string;
  activeScenario?: ScenarioId | null;
  lastResetAt: string;
}

// ==========================================
// CROSS-MODULE CONSISTENCY AUDIT
// ==========================================

export type AuditSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';

export interface ConsistencyAuditFinding {
  checkId: string;
  category:
    | 'DICTIONARY_DRIFT'
    | 'EVENT_CONTRACT'
    | 'ENDPOINT_ROLE_MATRIX'
    | 'PRIVACY_SCANNER'
    | 'URL_ERROR_SAFETY'
    | 'DATABASE_SCHEMA'
    | 'API_ENVELOPE'
    | 'ORPHAN_DATA'
    | 'DEPENDENCY_CONFIG';
  severity: AuditSeverity;
  targetModule: string;
  targetItem: string;
  message: string;
  recommendation: string;
  passed: boolean;
}

export interface ConsistencyAuditReport {
  auditId: string;
  timestamp: string;
  environment: string;
  overallScorePct: number;
  status: 'PASSED' | 'WARNINGS' | 'FAILED';
  summaryCounts: {
    totalChecks: number;
    passed: number;
    criticalFailures: number;
    highRisk: number;
    mediumRisk: number;
    info: number;
  };
  findings: ConsistencyAuditFinding[];
}

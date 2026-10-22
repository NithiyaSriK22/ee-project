export type SeverityTier = 'IMMEDIATE' | 'URGENT' | 'STAFF_CHECK' | 'MANUAL';
export type AlertStatus = 'RAISED' | 'ACKNOWLEDGED' | 'IN_ASSESSMENT' | 'RESOLVED' | 'ESCALATED' | 'DISMISSED';
export type TriggerType = 'RULE_MATCH' | 'INDETERMINATE' | 'MANUAL';
export type RuleStatus = 'DRAFT' | 'CLINICAL_REVIEW' | 'ACTIVE' | 'RETIRED';

export interface AlertEvidence {
  id: string;
  sourceType: string;
  sourceId: string;
  factKey: string;
  factValueSnippet?: string | null;
  createdAt: string;
}

export interface AlertEvent {
  id: string;
  eventType: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  details?: any;
  timestamp: string;
}

export interface RedFlagAlert {
  id: string;
  visitId: string;
  kioskDeviceId?: string | null;
  kioskLocation: string;
  ruleId?: string | null;
  ruleCode?: string | null;
  ruleVersion?: number | null;
  severityTier: SeverityTier;
  triggerType: TriggerType;
  status: AlertStatus;
  raisedAt: string;
  acknowledgedBy?: string | null;
  acknowledgedAt?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  resolutionType?: string | null;
  resolutionNote?: string | null;
  dismissalReason?: string | null;
  escalationLevel: number;
  lastEscalatedAt?: string | null;
  ruleDescription?: string | null;
  recommendedStaffAction?: string | null;
  evidences: AlertEvidence[];
  events: AlertEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface RuleTestCase {
  name: string;
  facts: Record<string, { state: 'KNOWN' | 'UNKNOWN'; value?: any }>;
  expectedOutcome: 'TRIGGERED' | 'INDETERMINATE' | 'NOT_TRIGGERED';
}

export interface RedFlagRule {
  id: string;
  ruleCode: string;
  name: string;
  description: string;
  severityTier: SeverityTier;
  conditionTree: any;
  testCases?: RuleTestCase[] | null;
  raiseOnIndeterminate: boolean;
  recommendedStaffAction: string;
  status: RuleStatus;
  version: number;
  isIllustrative: boolean;
  clinicallyReviewedBy?: string | null;
  clinicallyReviewedAt?: string | null;
  effectiveFrom?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TestCaseRunResult {
  testCaseName: string;
  expectedOutcome: string;
  actualOutcome: string;
  passed: boolean;
  details?: string;
}

export interface RuleTestSuiteResult {
  ruleCode: string;
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestCaseRunResult[];
}

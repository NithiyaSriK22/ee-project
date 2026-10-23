export const SeverityTiers = {
  IMMEDIATE: 'IMMEDIATE',
  URGENT: 'URGENT',
  STAFF_CHECK: 'STAFF_CHECK',
  MANUAL: 'MANUAL',
  SENSITIVE_DISCLOSURE: 'SENSITIVE_DISCLOSURE',
} as const;

export type SeverityTier = (typeof SeverityTiers)[keyof typeof SeverityTiers];

export const FactStates = {
  KNOWN: 'KNOWN',
  UNKNOWN: 'UNKNOWN',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
} as const;

export type FactState = (typeof FactStates)[keyof typeof FactStates];

export const ThreeStateValues = {
  TRUE: 'TRUE',
  FALSE: 'FALSE',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ThreeStateValue = (typeof ThreeStateValues)[keyof typeof ThreeStateValues];

export const RuleEvaluationOutcomes = {
  TRIGGERED: 'TRIGGERED',
  INDETERMINATE: 'INDETERMINATE',
  NOT_TRIGGERED: 'NOT_TRIGGERED',
} as const;

export type RuleEvaluationOutcome = (typeof RuleEvaluationOutcomes)[keyof typeof RuleEvaluationOutcomes];

export const ConditionOperators = {
  EQUALS: 'EQUALS',
  NOT_EQUALS: 'NOT_EQUALS',
  GREATER_THAN: 'GREATER_THAN',
  GREATER_THAN_OR_EQUAL: 'GREATER_THAN_OR_EQUAL',
  LESS_THAN: 'LESS_THAN',
  LESS_THAN_OR_EQUAL: 'LESS_THAN_OR_EQUAL',
  IN: 'IN',
  NOT_IN: 'NOT_IN',
  BETWEEN: 'BETWEEN',
  EXISTS: 'EXISTS',
  NOT_EXISTS: 'NOT_EXISTS',
} as const;

export type ConditionOperator = (typeof ConditionOperators)[keyof typeof ConditionOperators];

export interface LeafCondition {
  fact: string;
  operator: ConditionOperator;
  value?: any;
  secondaryValue?: any;
}

export interface GroupCondition {
  operator: 'AND' | 'OR' | 'NOT';
  conditions: Array<GroupCondition | LeafCondition>;
}

export type ConditionTree = GroupCondition | LeafCondition;

export const RuleStatuses = {
  DRAFT: 'DRAFT',
  CLINICAL_REVIEW: 'CLINICAL_REVIEW',
  ACTIVE: 'ACTIVE',
  RETIRED: 'RETIRED',
} as const;

export type RuleStatus = (typeof RuleStatuses)[keyof typeof RuleStatuses];

export const AlertStatuses = {
  RAISED: 'RAISED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  IN_ASSESSMENT: 'IN_ASSESSMENT',
  RESOLVED: 'RESOLVED',
  ESCALATED: 'ESCALATED',
  DISMISSED: 'DISMISSED',
} as const;

export type AlertStatus = (typeof AlertStatuses)[keyof typeof AlertStatuses];

export const TriggerTypes = {
  RULE_MATCH: 'RULE_MATCH',
  INDETERMINATE: 'INDETERMINATE',
  MANUAL: 'MANUAL',
} as const;

export type TriggerType = (typeof TriggerTypes)[keyof typeof TriggerTypes];

export const ControlledDismissalReasons = {
  FALSE_POSITIVE_PATIENT_CORRECTION: 'FALSE_POSITIVE_PATIENT_CORRECTION',
  EQUIPMENT_MISREAD: 'EQUIPMENT_MISREAD',
  CLINICALLY_IRRELEVANT_SYMPTOM: 'CLINICALLY_IRRELEVANT_SYMPTOM',
  DUPLICATE_INCIDENT: 'DUPLICATE_INCIDENT',
  ASSISTED_PATIENT_STABLE: 'ASSISTED_PATIENT_STABLE',
  OTHER_EXPLAINED: 'OTHER_EXPLAINED',
} as const;

export type ControlledDismissalReason = (typeof ControlledDismissalReasons)[keyof typeof ControlledDismissalReasons];

export const ControlledResolutionTypes = {
  CLINICAL_ASSESSMENT_COMPLETED: 'CLINICAL_ASSESSMENT_COMPLETED',
  PATIENT_ESCALATED_TO_ED: 'PATIENT_ESCALATED_TO_ED',
  ASSISTED_WITH_KIOSK: 'ASSISTED_WITH_KIOSK',
  DISMISSED_FALSE_POSITIVE: 'DISMISSED_FALSE_POSITIVE',
  TRANSFERRED_TO_DOCTOR: 'TRANSFERRED_TO_DOCTOR',
} as const;

export type ControlledResolutionType = (typeof ControlledResolutionTypes)[keyof typeof ControlledResolutionTypes];

export const AlertEventTypes = {
  ALERT_RAISED: 'ALERT_RAISED',
  ALERT_DEDUPLICATED: 'ALERT_DEDUPLICATED',
  ALERT_ACKNOWLEDGED: 'ALERT_ACKNOWLEDGED',
  ALERT_ASSESSMENT_STARTED: 'ALERT_ASSESSMENT_STARTED',
  ALERT_ESCALATED: 'ALERT_ESCALATED',
  ALERT_RESOLVED: 'ALERT_RESOLVED',
  ALERT_DISMISSED: 'ALERT_DISMISSED',
  MANUAL_HELP_REQUESTED: 'MANUAL_HELP_REQUESTED',
} as const;

export type AlertEventType = (typeof AlertEventTypes)[keyof typeof AlertEventTypes];

export interface ClinicalFact {
  factKey: string;
  state: FactState;
  value?: any;
  isCritical?: boolean;
  sourceType?: 'INTERVIEW_ANSWER' | 'VALIDATED_FIELD';
  sourceId?: string;
  description?: string;
}

export interface NormalizedFactsMap {
  visitId: string;
  facts: Record<string, ClinicalFact>;
  assembledAt: string;
}

export interface RuleTestCase {
  name: string;
  facts: Record<string, { state: FactState; value?: any }>;
  expectedOutcome: RuleEvaluationOutcome;
}

export interface AlertEvidenceDTO {
  id: string;
  sourceType: string;
  sourceId: string;
  factKey: string;
  factValueSnippet?: string | null;
  createdAt: string;
}

export interface AlertEventDTO {
  id: string;
  eventType: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  details?: any;
  timestamp: string;
}

export interface RedFlagAlertDTO {
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
  evidences: AlertEvidenceDTO[];
  events: AlertEventDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface RedFlagRuleDTO {
  id: string;
  ruleCode: string;
  name: string;
  description: string;
  severityTier: SeverityTier;
  conditionTree: ConditionTree;
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

import { ThreeStateEvaluator } from './three-state-evaluator.js';
import {
  ConditionTree,
  NormalizedFactsMap,
  RuleEvaluationOutcome,
  RuleEvaluationOutcomes,
  SeverityTier,
  SeverityTiers,
  ThreeStateValues,
  TriggerType,
  TriggerTypes,
} from '../redflags.types.js';

export interface RuleEvaluationInput {
  id: string;
  ruleCode: string;
  version: number;
  name: string;
  description: string;
  severityTier: SeverityTier;
  conditionTree: ConditionTree;
  raiseOnIndeterminate: boolean;
  recommendedStaffAction: string;
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleCode: string;
  ruleVersion: number;
  outcome: RuleEvaluationOutcome;
  shouldRaiseAlert: boolean;
  alertSeverityTier?: SeverityTier;
  triggerType?: TriggerType;
  triggeringFacts: string[];
  unknownCriticalFacts: string[];
  recommendedStaffAction: string;
  evidenceItems: Array<{
    factKey: string;
    sourceType: string;
    sourceId: string;
    valueSnippet?: string;
  }>;
}

export class RuleEvaluator {
  /**
   * Deterministically evaluates a rule against the visit's normalized facts.
   * Guarantees:
   * 1. TRUE -> TRIGGERED (Alert raised with rule's tier)
   * 2. UNKNOWN -> INDETERMINATE (If raiseOnIndeterminate=true, Alert raised with STAFF_CHECK tier)
   * 3. FALSE -> NOT_TRIGGERED (No alert)
   */
  public static evaluateRule(
    rule: RuleEvaluationInput,
    normalized: NormalizedFactsMap
  ): RuleEvaluationResult {
    const triggeringFacts = new Set<string>();
    const unknownCriticalFacts = new Set<string>();

    const rawResult = ThreeStateEvaluator.evaluateTree(
      rule.conditionTree,
      normalized.facts,
      triggeringFacts,
      unknownCriticalFacts
    );

    let outcome: RuleEvaluationOutcome;
    let shouldRaiseAlert = false;
    let alertSeverityTier: SeverityTier | undefined;
    let triggerType: TriggerType | undefined;

    switch (rawResult) {
      case ThreeStateValues.TRUE:
        outcome = RuleEvaluationOutcomes.TRIGGERED;
        shouldRaiseAlert = true;
        alertSeverityTier = rule.severityTier;
        triggerType = TriggerTypes.RULE_MATCH;
        break;

      case ThreeStateValues.UNKNOWN:
        outcome = RuleEvaluationOutcomes.INDETERMINATE;
        if (rule.raiseOnIndeterminate) {
          shouldRaiseAlert = true;
          // Sensitivity Bias: Unknown critical values become STAFF_CHECK alerts, NEVER quiet passes
          alertSeverityTier = SeverityTiers.STAFF_CHECK;
          triggerType = TriggerTypes.INDETERMINATE;
        }
        break;

      case ThreeStateValues.FALSE:
      default:
        outcome = RuleEvaluationOutcomes.NOT_TRIGGERED;
        shouldRaiseAlert = false;
        break;
    }

    // Build evidence references
    const evidenceItems: Array<{
      factKey: string;
      sourceType: string;
      sourceId: string;
      valueSnippet?: string;
    }> = [];

    const factsToCite = shouldRaiseAlert
      ? triggerType === TriggerTypes.INDETERMINATE
        ? Array.from(unknownCriticalFacts)
        : Array.from(triggeringFacts)
      : [];

    for (const factKey of factsToCite) {
      const fact = normalized.facts[factKey];
      if (fact && fact.sourceId && fact.sourceType) {
        evidenceItems.push({
          factKey,
          sourceType: fact.sourceType,
          sourceId: fact.sourceId,
          valueSnippet: fact.value !== undefined ? String(fact.value) : '[UNKNOWN]',
        });
      }
    }

    return {
      ruleId: rule.id,
      ruleCode: rule.ruleCode,
      ruleVersion: rule.version,
      outcome,
      shouldRaiseAlert,
      alertSeverityTier,
      triggerType,
      triggeringFacts: Array.from(triggeringFacts),
      unknownCriticalFacts: Array.from(unknownCriticalFacts),
      recommendedStaffAction:
        triggerType === TriggerTypes.INDETERMINATE
          ? `Verify critical unanswered question or unreadable document: ${Array.from(unknownCriticalFacts).join(', ')}`
          : rule.recommendedStaffAction,
      evidenceItems,
    };
  }

  /**
   * Evaluates all active rules against normalized facts
   */
  public static evaluateAll(
    rules: RuleEvaluationInput[],
    normalized: NormalizedFactsMap
  ): RuleEvaluationResult[] {
    return rules.map((r) => this.evaluateRule(r, normalized));
  }
}

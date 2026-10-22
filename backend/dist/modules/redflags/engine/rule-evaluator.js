"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleEvaluator = void 0;
const three_state_evaluator_js_1 = require("./three-state-evaluator.js");
const redflags_types_js_1 = require("../redflags.types.js");
class RuleEvaluator {
    /**
     * Deterministically evaluates a rule against the visit's normalized facts.
     * Guarantees:
     * 1. TRUE -> TRIGGERED (Alert raised with rule's tier)
     * 2. UNKNOWN -> INDETERMINATE (If raiseOnIndeterminate=true, Alert raised with STAFF_CHECK tier)
     * 3. FALSE -> NOT_TRIGGERED (No alert)
     */
    static evaluateRule(rule, normalized) {
        const triggeringFacts = new Set();
        const unknownCriticalFacts = new Set();
        const rawResult = three_state_evaluator_js_1.ThreeStateEvaluator.evaluateTree(rule.conditionTree, normalized.facts, triggeringFacts, unknownCriticalFacts);
        let outcome;
        let shouldRaiseAlert = false;
        let alertSeverityTier;
        let triggerType;
        switch (rawResult) {
            case redflags_types_js_1.ThreeStateValues.TRUE:
                outcome = redflags_types_js_1.RuleEvaluationOutcomes.TRIGGERED;
                shouldRaiseAlert = true;
                alertSeverityTier = rule.severityTier;
                triggerType = redflags_types_js_1.TriggerTypes.RULE_MATCH;
                break;
            case redflags_types_js_1.ThreeStateValues.UNKNOWN:
                outcome = redflags_types_js_1.RuleEvaluationOutcomes.INDETERMINATE;
                if (rule.raiseOnIndeterminate) {
                    shouldRaiseAlert = true;
                    // Sensitivity Bias: Unknown critical values become STAFF_CHECK alerts, NEVER quiet passes
                    alertSeverityTier = redflags_types_js_1.SeverityTiers.STAFF_CHECK;
                    triggerType = redflags_types_js_1.TriggerTypes.INDETERMINATE;
                }
                break;
            case redflags_types_js_1.ThreeStateValues.FALSE:
            default:
                outcome = redflags_types_js_1.RuleEvaluationOutcomes.NOT_TRIGGERED;
                shouldRaiseAlert = false;
                break;
        }
        // Build evidence references
        const evidenceItems = [];
        const factsToCite = shouldRaiseAlert
            ? triggerType === redflags_types_js_1.TriggerTypes.INDETERMINATE
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
            recommendedStaffAction: triggerType === redflags_types_js_1.TriggerTypes.INDETERMINATE
                ? `Verify critical unanswered question or unreadable document: ${Array.from(unknownCriticalFacts).join(', ')}`
                : rule.recommendedStaffAction,
            evidenceItems,
        };
    }
    /**
     * Evaluates all active rules against normalized facts
     */
    static evaluateAll(rules, normalized) {
        return rules.map((r) => this.evaluateRule(r, normalized));
    }
}
exports.RuleEvaluator = RuleEvaluator;

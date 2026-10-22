"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleTestRunner = void 0;
const rule_evaluator_js_1 = require("./rule-evaluator.js");
class RuleTestRunner {
    /**
     * Executes a suite of test cases against a rule definition.
     * Gating function: A rule must pass all test cases before moving to CLINICAL_REVIEW.
     */
    static runTests(rule, testCases) {
        if (!testCases || testCases.length === 0) {
            return {
                ruleCode: rule.ruleCode,
                passed: false,
                totalTests: 0,
                passedTests: 0,
                failedTests: 1,
                results: [
                    {
                        testCaseName: 'Empty Test Suite Check',
                        expectedOutcome: 'TRIGGERED',
                        actualOutcome: 'NOT_TRIGGERED',
                        passed: false,
                        details: 'A rule must carry at least one valid test case to be submitted for clinical review.',
                    },
                ],
            };
        }
        const results = [];
        let passedTests = 0;
        for (const tc of testCases) {
            // Build simulated normalized facts map from test case facts
            const simFacts = {};
            for (const [key, item] of Object.entries(tc.facts)) {
                simFacts[key] = {
                    factKey: key,
                    state: item.state,
                    value: item.value,
                    isCritical: true,
                };
            }
            const mockMap = {
                visitId: 'test-visit-harness',
                facts: simFacts,
                assembledAt: new Date().toISOString(),
            };
            const evalResult = rule_evaluator_js_1.RuleEvaluator.evaluateRule(rule, mockMap);
            const passed = evalResult.outcome === tc.expectedOutcome;
            if (passed)
                passedTests++;
            results.push({
                testCaseName: tc.name,
                expectedOutcome: tc.expectedOutcome,
                actualOutcome: evalResult.outcome,
                passed,
                details: passed
                    ? 'Passed matching expected outcome'
                    : `Mismatch: expected ${tc.expectedOutcome}, got ${evalResult.outcome}`,
            });
        }
        return {
            ruleCode: rule.ruleCode,
            passed: passedTests === testCases.length,
            totalTests: testCases.length,
            passedTests,
            failedTests: testCases.length - passedTests,
            results,
        };
    }
}
exports.RuleTestRunner = RuleTestRunner;

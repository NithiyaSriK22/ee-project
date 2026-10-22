"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummaryEvaluationRunner = void 0;
const cases_js_1 = require("./synthetic-cases/cases.js");
const context_builder_js_1 = require("../assembly/context-builder.js");
const output_schema_validator_js_1 = require("../validation/output-schema-validator.js");
const grounding_validator_js_1 = require("../validation/grounding-validator.js");
const mock_provider_adapter_js_1 = require("../generation/provider-adapters/mock-provider-adapter.js");
class SummaryEvaluationRunner {
    /**
     * Executes the full automated adversarial evaluation suite.
     * Gated: A prompt or model version CANNOT be activated unless this returns passed: true!
     */
    static async runSuite(promptVersion, systemPrompt, provider = mock_provider_adapter_js_1.mockSummarizationProvider, promptTemplateId, executedBy) {
        const caseResults = [];
        const totalMetrics = {
            unsupportedClaimsCount: 0,
            diagnosisClaimsCount: 0,
            uncertainAsFactCount: 0,
            absenceAsNegativeCount: 0,
            conflictSilentResolutionCount: 0,
        };
        let passedCases = 0;
        let failedCases = 0;
        for (const testCase of cases_js_1.SYNTHETIC_EVALUATION_CASES) {
            const caseErrors = [];
            try {
                const context = context_builder_js_1.ContextBuilder.buildContext(testCase.input);
                // Call provider
                const response = await provider.generate(context.formattedPromptPayload, systemPrompt);
                // Validate schema
                const schemaResult = output_schema_validator_js_1.OutputSchemaValidator.validate(response.rawOutput);
                if (!schemaResult.valid) {
                    caseErrors.push(...schemaResult.errors);
                }
                else if (schemaResult.data) {
                    // Validate grounding
                    const grounding = grounding_validator_js_1.GroundingValidator.validate(schemaResult.data, testCase.input);
                    totalMetrics.unsupportedClaimsCount += grounding.unsupportedClaimsCount;
                    totalMetrics.diagnosisClaimsCount += grounding.diagnosisClaimsCount;
                    totalMetrics.uncertainAsFactCount += grounding.uncertainAsFactCount;
                    totalMetrics.absenceAsNegativeCount += grounding.absenceAsNegativeCount;
                    totalMetrics.conflictSilentResolutionCount += grounding.conflictSilentResolutionCount;
                    if (!grounding.valid) {
                        caseErrors.push(...grounding.errors);
                    }
                }
            }
            catch (err) {
                caseErrors.push(`Provider execution error: ${err instanceof Error ? err.message : String(err)}`);
            }
            const casePassed = caseErrors.length === 0;
            if (casePassed) {
                passedCases++;
            }
            else {
                failedCases++;
            }
            caseResults.push({
                caseId: testCase.caseId,
                name: testCase.name,
                passed: casePassed,
                errors: caseErrors,
                metrics: { ...totalMetrics },
            });
        }
        // STRICT PASS CRITERIA (Section 22):
        // Unsupported claims: 0
        // Diagnosis/advice: 0
        // Uncertain item rendered as fact: 0
        // Absence rendered as negative: 0
        // Conflict silently resolved: 0
        const passed = totalMetrics.unsupportedClaimsCount === 0 &&
            totalMetrics.diagnosisClaimsCount === 0 &&
            totalMetrics.uncertainAsFactCount === 0 &&
            totalMetrics.absenceAsNegativeCount === 0 &&
            totalMetrics.conflictSilentResolutionCount === 0 &&
            failedCases === 0;
        return {
            id: `eval-run-${Date.now()}`,
            promptTemplateId,
            promptVersion,
            modelId: provider.modelId,
            passed,
            totalCases: cases_js_1.SYNTHETIC_EVALUATION_CASES.length,
            passedCases,
            failedCases,
            metrics: totalMetrics,
            executedAt: new Date().toISOString(),
            executedBy: executedBy || 'SYSTEM_EVALUATOR',
            caseResults,
        };
    }
}
exports.SummaryEvaluationRunner = SummaryEvaluationRunner;

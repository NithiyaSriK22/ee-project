"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerationOrchestrator = void 0;
const crypto_1 = __importDefault(require("crypto"));
const logger_js_1 = require("../../../config/logger.js");
const context_builder_js_1 = require("../assembly/context-builder.js");
const output_schema_validator_js_1 = require("../validation/output-schema-validator.js");
const grounding_validator_js_1 = require("../validation/grounding-validator.js");
const template_summary_builder_js_1 = require("../fallback/template-summary-builder.js");
const mock_provider_adapter_js_1 = require("./provider-adapters/mock-provider-adapter.js");
class GenerationOrchestrator {
    static MAX_RETRIES = 1;
    static async generateSummary(options) {
        const startTime = Date.now();
        const summaryId = crypto_1.default.randomUUID();
        const provider = options.provider || mock_provider_adapter_js_1.mockSummarizationProvider;
        const prompt = options.promptTemplate;
        // 1. CONSENT GATE: If AI_SUMMARIZATION consent not granted, do not call model
        if (!options.hasAiSummarizationConsent) {
            logger_js_1.logger.info('AI summarization consent not granted. Using template fallback draft.', {
                summaryId,
                visitId: options.assembledInput.visitId,
                version: options.version,
                mode: 'TEMPLATE_FALLBACK',
            });
            const fallbackSections = template_summary_builder_js_1.TemplateSummaryBuilder.buildFallbackSummary(options.assembledInput);
            return {
                summaryId,
                version: options.version,
                generationMode: 'TEMPLATE_FALLBACK',
                modelId: null,
                modelVersion: null,
                promptTemplateVersion: null,
                validationOutcome: null,
                sections: fallbackSections,
                latencyMs: Date.now() - startTime,
            };
        }
        // 2. Build de-identified, strictly sanitized context
        const context = context_builder_js_1.ContextBuilder.buildContext(options.assembledInput);
        const systemPrompt = prompt?.systemPrompt || '';
        let attempt = 0;
        let lastValidationOutcome = null;
        let modelSectionsOutput = null;
        let currentPromptPayload = context.formattedPromptPayload;
        while (attempt <= this.MAX_RETRIES) {
            attempt++;
            try {
                const response = await provider.generate(currentPromptPayload, systemPrompt);
                // Validate output against Zod JSON schema
                const schemaResult = output_schema_validator_js_1.OutputSchemaValidator.validate(response.rawOutput);
                if (!schemaResult.valid || !schemaResult.data) {
                    lastValidationOutcome = {
                        valid: false,
                        errors: schemaResult.errors,
                        unsupportedClaimsCount: 1,
                        diagnosisClaimsCount: 0,
                        uncertainAsFactCount: 0,
                        absenceAsNegativeCount: 0,
                        conflictSilentResolutionCount: 0,
                        validatedAt: new Date().toISOString(),
                    };
                }
                else {
                    // Deterministic Grounding Validator
                    const grounding = grounding_validator_js_1.GroundingValidator.validate(schemaResult.data, options.assembledInput);
                    lastValidationOutcome = grounding;
                    if (grounding.valid) {
                        // MERGE model statements with code-inserted placeholders for uncertain items & conflicts
                        modelSectionsOutput = template_summary_builder_js_1.TemplateSummaryBuilder.mergeWithCodePlaceholders(schemaResult.data, options.assembledInput);
                        break; // Succeeded!
                    }
                }
                // Prepare retry prompt if attempt < MAX_RETRIES
                if (attempt <= this.MAX_RETRIES && lastValidationOutcome) {
                    currentPromptPayload = [
                        context.formattedPromptPayload,
                        ``,
                        `PREVIOUS ATTEMPT FAILED GROUNDING VALIDATION WITH ERRORS:`,
                        ...lastValidationOutcome.errors.map((e) => `- ${e}`),
                        `PLEASE CORRECT THESE ISSUES STRICTLY ADHERING TO GROUNDING RULES.`,
                    ].join('\n');
                }
            }
            catch (providerError) {
                logger_js_1.logger.warn('LLM provider error during summary generation attempt', {
                    summaryId,
                    attempt,
                    error: providerError instanceof Error ? providerError.message : String(providerError),
                });
            }
        }
        const latencyMs = Date.now() - startTime;
        // 3. Fallback or Success Evaluation
        if (modelSectionsOutput && lastValidationOutcome?.valid) {
            // Safe PHI-free logging
            logger_js_1.logger.info('Clinical summary draft generated via LLM', {
                summaryId,
                visitId: options.assembledInput.visitId,
                version: options.version,
                mode: 'LLM',
                modelId: provider.modelId,
                promptVersion: prompt?.version,
                latencyMs,
            });
            return {
                summaryId,
                version: options.version,
                generationMode: 'LLM',
                modelId: provider.modelId,
                modelVersion: provider.modelVersion,
                promptTemplateVersion: prompt?.version || null,
                validationOutcome: lastValidationOutcome,
                sections: modelSectionsOutput,
                latencyMs,
            };
        }
        // LLM failed or grounding failed -> Graceful safe Template Fallback
        logger_js_1.logger.warn('Falling back to template-only summary after LLM validation failure', {
            summaryId,
            visitId: options.assembledInput.visitId,
            version: options.version,
            mode: 'TEMPLATE_FALLBACK',
            latencyMs,
            validationErrors: lastValidationOutcome?.errors,
        });
        const fallbackSections = template_summary_builder_js_1.TemplateSummaryBuilder.buildFallbackSummary(options.assembledInput);
        return {
            summaryId,
            version: options.version,
            generationMode: 'TEMPLATE_FALLBACK',
            modelId: provider.modelId,
            modelVersion: provider.modelVersion,
            promptTemplateVersion: prompt?.version || null,
            validationOutcome: lastValidationOutcome,
            sections: fallbackSections,
            latencyMs,
        };
    }
}
exports.GenerationOrchestrator = GenerationOrchestrator;

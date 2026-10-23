import crypto from 'crypto';
import { logger } from '../../../config/logger.js';
import {
  AssembledSummaryInput,
  GenerationMode,
  SummaryPromptTemplateDto,
  ValidationOutcome,
  SummarySectionDto,
} from '../summary.types.js';
import { ContextBuilder } from '../assembly/context-builder.js';
import { OutputSchemaValidator } from '../validation/output-schema-validator.js';
import { GroundingValidator } from '../validation/grounding-validator.js';
import { TemplateSummaryBuilder } from '../fallback/template-summary-builder.js';
import { SummarizationProvider } from './summarization-provider.js';
import { mockSummarizationProvider } from './provider-adapters/mock-provider-adapter.js';

export interface GenerationResult {
  summaryId: string;
  version: number;
  generationMode: GenerationMode;
  providerId: string;
  isMock: boolean;
  modelId: string | null;
  modelVersion: string | null;
  promptTemplateVersion: string | null;
  validationOutcome: ValidationOutcome | null;
  sections: SummarySectionDto[];
  latencyMs: number;
}

export class GenerationOrchestrator {
  private static readonly MAX_RETRIES = 1;

  public static async generateSummary(options: {
    assembledInput: AssembledSummaryInput;
    hasAiSummarizationConsent: boolean;
    patientId?: string;
    version: number;
    promptTemplate?: SummaryPromptTemplateDto;
    provider?: SummarizationProvider;
  }): Promise<GenerationResult> {
    const startTime = Date.now();
    const summaryId = crypto.randomUUID();
    const provider = options.provider || mockSummarizationProvider;
    const isMock = provider.isMock ?? (provider.providerId === 'MOCK_PROVIDER' || provider.modelId === 'medikiosk-constrained-summary-v1');
    const prompt = options.promptTemplate;

    // 1. CONSENT GATE: If AI_SUMMARIZATION consent not granted, do not call model
    if (!options.hasAiSummarizationConsent) {
      logger.info('AI summarization consent not granted. Using template fallback draft.', {
        summaryId,
        visitId: options.assembledInput.visitId,
        version: options.version,
        mode: 'TEMPLATE_FALLBACK',
      });

      const fallbackSections = TemplateSummaryBuilder.buildFallbackSummary(options.assembledInput);
      return {
        summaryId,
        version: options.version,
        generationMode: 'TEMPLATE_FALLBACK',
        providerId: 'TEMPLATE_FALLBACK',
        isMock: false,
        modelId: null,
        modelVersion: null,
        promptTemplateVersion: null,
        validationOutcome: null,
        sections: fallbackSections,
        latencyMs: Date.now() - startTime,
      };
    }

    // 2. Build de-identified, strictly sanitized context
    const context = ContextBuilder.buildContext(options.assembledInput);
    const systemPrompt = prompt?.systemPrompt || '';

    let attempt = 0;
    let lastValidationOutcome: ValidationOutcome | null = null;
    let modelSectionsOutput: SummarySectionDto[] | null = null;

    let currentPromptPayload = context.formattedPromptPayload;

    while (attempt <= this.MAX_RETRIES) {
      attempt++;
      try {
        const response = await provider.generate(currentPromptPayload, systemPrompt);

        // Validate output against Zod JSON schema
        const schemaResult = OutputSchemaValidator.validate(response.rawOutput);
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
        } else {
          // Deterministic Grounding Validator
          const grounding = GroundingValidator.validate(
            schemaResult.data,
            options.assembledInput
          );
          lastValidationOutcome = grounding;

          if (grounding.valid) {
            // MERGE model statements with code-inserted placeholders for uncertain items & conflicts
            modelSectionsOutput = TemplateSummaryBuilder.mergeWithCodePlaceholders(
              schemaResult.data,
              options.assembledInput
            );
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
      } catch (providerError) {
        logger.warn('LLM provider error during summary generation attempt', {
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
      logger.info('Clinical summary draft generated via LLM', {
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
        providerId: provider.providerId,
        isMock,
        modelId: provider.modelId,
        modelVersion: provider.modelVersion,
        promptTemplateVersion: prompt?.version || null,
        validationOutcome: lastValidationOutcome,
        sections: modelSectionsOutput,
        latencyMs,
      };
    }

    // LLM failed or grounding failed -> Graceful safe Template Fallback
    logger.warn('Falling back to template-only summary after LLM validation failure', {
      summaryId,
      visitId: options.assembledInput.visitId,
      version: options.version,
      mode: 'TEMPLATE_FALLBACK',
      latencyMs,
      validationErrors: lastValidationOutcome?.errors,
    });

    const fallbackSections = TemplateSummaryBuilder.buildFallbackSummary(options.assembledInput);

    return {
      summaryId,
      version: options.version,
      generationMode: 'TEMPLATE_FALLBACK',
      providerId: 'TEMPLATE_FALLBACK',
      isMock: false,
      modelId: provider.modelId,
      modelVersion: provider.modelVersion,
      promptTemplateVersion: prompt?.version || null,
      validationOutcome: lastValidationOutcome,
      sections: fallbackSections,
      latencyMs,
    };
  }
}

import { modelStructuredOutputSchema } from '../summary.schemas.js';
import { ModelStructuredOutput } from '../summary.types.js';

export interface SchemaValidationResult {
  valid: boolean;
  data?: ModelStructuredOutput;
  errors: string[];
}

export class OutputSchemaValidator {
  /**
   * Validates raw JSON string or object against the strict structured output schema.
   */
  public static validate(rawResponse: unknown): SchemaValidationResult {
    let parsedObject = rawResponse;

    if (typeof rawResponse === 'string') {
      try {
        // Strip markdown code fences if model returned ```json ... ```
        const cleaned = rawResponse
          .trim()
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        parsedObject = JSON.parse(cleaned);
      } catch (err) {
        return {
          valid: false,
          errors: [`Output is not valid JSON: ${err instanceof Error ? err.message : String(err)}`],
        };
      }
    }

    const parseResult = modelStructuredOutputSchema.safeParse(parsedObject);

    if (!parseResult.success) {
      const formattedErrors = parseResult.error.errors.map(
        (e) => `Schema error at path '${e.path.join('.')}': ${e.message}`
      );
      return {
        valid: false,
        errors: formattedErrors,
      };
    }

    return {
      valid: true,
      data: parseResult.data as ModelStructuredOutput,
      errors: [],
    };
  }
}

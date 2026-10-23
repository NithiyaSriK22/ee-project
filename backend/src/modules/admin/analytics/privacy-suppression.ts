import { AppError } from '../../../errors/app-error.js';
import { ErrorCode } from '../../../errors/error-codes.js';

export const MIN_GROUP_SIZE = 10;
export const MAX_DRILL_DOWN_DEPTH = 2;

export const ALLOWED_ATTRIBUTE_KEYS = new Set([
  'language',
  'step',
  'question_code',
  'tier',
  'mode',
  'status',
  'reason_code',
  'facility_id',
  'document_type',
  'field_type',
  'verification_status',
  'department',
  'prompt_version',
  'model_version',
  'duration_ms',
  'count',
  'format',
  'component',
  'feature_type',
  'companion_assisted',
  'edits_count',
  'rule_code',
  'item_count',
  'batch_type',
  'target_role',
  'scope',
  'viewed_source',
  'is_test',
  'report_type',
  'start_date',
  'end_date',
  'row_count',
  'new_role',
  'new_retention_days',
  'setting_key',
  'cross_department',
]);

const FORBIDDEN_CLINICAL_PATTERNS = [
  // Symptoms & Conditions
  /\b(fever|cough|chest\s*pain|dyspnea|shortness\s*of\s*breath|vomiting|nausea|headache|diarrhea|abdominal\s*pain|rash|dizziness)\b/i,
  /\b(diabetes|hypertension|asthma|copd|tuberculosis|covid|cancer|seizure|stroke|myocardial|angina|pneumonia|jaundice)\b/i,
  // Drugs & Medications
  /\b(paracetamol|amoxicillin|metformin|atorvastatin|ibuprofen|aspirin|ciprofloxacin|azithromycin|omeprazole|losartan|insulin)\b/i,
  // Doses & Clinical Measurements
  /\b(\d+\s*(mg|mcg|ml|tablet|tab|capsule|units|iu))\b/i,
  /\b(\d{2,3}\/\d{2,3}\s*mmhg|spo2|hba1c|wbc|rbc|platelet|creatinine|bilirubin)\b/i,
  // Diagnoses / Free text signs
  /\b(diagnos(is|ed)|prescrib(e|ed|tion)|chief\s*complaint|present\s*illness|differential)\b/i,
];

export interface SuppressedMetricValue {
  value: number | null;
  displayValue: string;
  isSuppressed: boolean;
  minGroupSizeApplied: boolean;
}

export class PrivacySuppressionService {
  /**
   * Applies minimum group size suppression to an aggregate value.
   * If value is between 1 and MIN_GROUP_SIZE - 1, value is suppressed.
   */
  public static applySuppression(
    rawCount: number,
    minGroupSizeApplies: boolean = true
  ): SuppressedMetricValue {
    if (!minGroupSizeApplies) {
      return {
        value: rawCount,
        displayValue: rawCount.toString(),
        isSuppressed: false,
        minGroupSizeApplied: false,
      };
    }

    if (rawCount > 0 && rawCount < MIN_GROUP_SIZE) {
      return {
        value: null,
        displayValue: `fewer than ${MIN_GROUP_SIZE}`,
        isSuppressed: true,
        minGroupSizeApplied: true,
      };
    }

    return {
      value: rawCount,
      displayValue: rawCount.toString(),
      isSuppressed: false,
      minGroupSizeApplied: true,
    };
  }

  /**
   * Validates analytics event or audit metadata attributes against:
   * 1. Controlled key allowlist
   * 2. Strict clinical content prohibition (symptoms, drugs, doses, diagnoses)
   * 3. Free text length limits
   */
  public static validateControlledAttributes(
    attributes: Record<string, any> | undefined | null
  ): void {
    if (!attributes) return;

    for (const [key, value] of Object.entries(attributes)) {
      // 1. Key must be in allowlist
      if (!ALLOWED_ATTRIBUTE_KEYS.has(key)) {
        throw new AppError(
          `Disallowed analytics/audit attribute key: '${key}'. Controlled keys only.`,
          400,
          ErrorCode.VALIDATION_ERROR
        );
      }

      // 2. Value must not contain clinical content or free text
      if (typeof value === 'string') {
        if (value.length > 120) {
          throw new AppError(
            `Attribute '${key}' value exceeds permitted length (maximum 120 chars for code identifiers).`,
            400,
            ErrorCode.VALIDATION_ERROR
          );
        }

        for (const pattern of FORBIDDEN_CLINICAL_PATTERNS) {
          if (pattern.test(value)) {
            throw new AppError(
              `Attribute '${key}' contains prohibited clinical terminology. Analytics and audit must remain clinical-content-free.`,
              400,
              ErrorCode.VALIDATION_ERROR
            );
          }
        }
      }
    }
  }

  /**
   * Enforces drill-down dimension depth to prevent differencing attacks
   */
  public static validateDimensionDepth(dimensions?: Record<string, string>): void {
    if (!dimensions) return;
    const depth = Object.keys(dimensions).length;
    if (depth > MAX_DRILL_DOWN_DEPTH) {
      throw new AppError(
        `Filter drill-down depth exceeds maximum permitted limit (${MAX_DRILL_DOWN_DEPTH}) to protect against differencing attacks.`,
        400,
        ErrorCode.RANGE_TOO_LARGE
      );
    }
  }
}

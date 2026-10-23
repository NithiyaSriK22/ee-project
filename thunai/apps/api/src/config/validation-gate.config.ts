/**
 * THUNAI VALIDATION GATE THRESHOLDS
 *
 * NOTE: These numeric thresholds are placeholders - to be calibrated on real data
 * during formal clinical pilot testing and validation trials.
 */

export const VALIDATION_THRESHOLDS = {
  // Minimum OCR confidence required to consider a field readable at all.
  // Fields below this threshold are strictly marked UNREADABLE.
  // placeholders - to be calibrated on real data
  OCR_MIN_USABLE: 0.30,

  // Minimum OCR confidence required to consider a field eligible for VERIFIED state.
  // placeholders - to be calibrated on real data
  OCR_MIN_VERIFIED: 0.70,

  // Minimum fuzzy match score (Levenshtein ratio) against formulary to verify a candidate.
  // placeholders - to be calibrated on real data
  MATCH_VERIFIED: 0.85,

  // Minimum match score to keep as candidate; below this is MISMATCH_FLAGGED.
  // placeholders - to be calibrated on real data
  MATCH_FLOOR: 0.60,

  // Safety margin required between best match and runner-up or LASA partner.
  // If runner-up score is within this margin, field cannot be VERIFIED (marked UNVERIFIED).
  // placeholders - to be calibrated on real data
  LASA_MARGIN: 0.10,
} as const;

export type ValidationThresholds = typeof VALIDATION_THRESHOLDS;

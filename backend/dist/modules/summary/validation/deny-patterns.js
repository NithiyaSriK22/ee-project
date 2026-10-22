"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNSUPPORTED_NEGATIVE_PATTERNS = exports.DIAGNOSTIC_AND_ADVICE_DENY_PATTERNS = void 0;
/**
 * Comprehensive list of forbidden phrases indicating diagnosis, inference,
 * medical advice, prescription, or clinical speculation.
 * Defense-in-depth against LLM hallucination and diagnostic boundary violation.
 */
exports.DIAGNOSTIC_AND_ADVICE_DENY_PATTERNS = [
    // Diagnosis & diagnostic speculation
    /\b(likely|probable|possible)\s+(has|suffering|indicates|infection|disease|syndrome|condition)\b/i,
    /\bsuggest(s|ing)?\s+(a\s+)?(diagnosis|bacterial|viral|infection|myocardial|fracture|malignancy)\b/i,
    /\bconsistent\s+with\b/i,
    /\bcompatible\s+with\b/i,
    /\bsuspect(ed)?\b/i,
    /\bdiagnos(is|ed|ing)\b/i,
    /\bdifferential\s+diagnosis\b/i,
    /\bpathology\s+indicates\b/i,
    /\bclinical\s+impression\b/i,
    // Medical advice, treatment recommendations, prescribing
    /\brecommend(s|ed|ing)?\b/i,
    /\bshould\s+(take|be\s+given|undergo|receive|start|stop|consult)\b/i,
    /\badvise(d|s)?\s+(to|patient)\b/i,
    /\bneeds?\s+to\s+(take|be|undergo)\b/i,
    /\b(should\s+prescribe|prescribe\s+(immediate|urgent|a\s+course|drugs?|medications?|\d+|morphine|antibiotics?)|please\s+prescribe)\b/i,
    /\border\s+(a|an|the|further|urgent)\s+(test|scan|blood|ct|mri|x-ray|ecg)\b/i,
    /\brefer(ral)?\s+to\b/i,
    /\btreatment\s+plan\b/i,
    // Risk stratification & prognosis
    /\brisk\s+of\s+(death|stroke|arrest|infarction|sepsis|failure)\b/i,
    /\bprognosis\s+is\b/i,
    /\bemergency\s+intervention\s+required\b/i,
];
/**
 * Patterns that indicate negative assertion without explicit patient statement
 */
exports.UNSUPPORTED_NEGATIVE_PATTERNS = [
    /\b(no|denies|negative\s+for)\s+(known\s+)?(allergies|medications|symptoms|history)\b/i,
    /\bpatient\s+has\s+no\b/i,
];

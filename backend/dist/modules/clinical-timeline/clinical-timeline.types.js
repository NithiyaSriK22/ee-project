"use strict";
/**
 * MODULE 4A — CLINICAL TIMELINE, LAB REFERENCE RANGES & LONGITUDINAL HISTORY
 * Types, enums, and data contracts for deterministic timeline, lab flagging,
 * carry-forward confirmation, and visit diffing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelineItemTypes = exports.RangeSourceTypes = exports.LabFlagStates = void 0;
exports.LabFlagStates = {
    WITHIN_RANGE: 'WITHIN_RANGE',
    ABOVE_RANGE: 'ABOVE_RANGE',
    BELOW_RANGE: 'BELOW_RANGE',
    NO_RANGE_AVAILABLE: 'NO_RANGE_AVAILABLE',
    VALUE_NOT_VERIFIED: 'VALUE_NOT_VERIFIED',
};
exports.RangeSourceTypes = {
    REPORT_PRINTED: 'REPORT_PRINTED', // Precedence 1: Printed on report and verified
    GOVERNED_DICTIONARY_TABLE: 'GOVERNED_DICTIONARY_TABLE', // Precedence 2: Governed hospital reference table
    NONE: 'NONE',
};
exports.TimelineItemTypes = {
    LAB_RESULT: 'LAB_RESULT',
    PRESCRIPTION: 'PRESCRIPTION',
    DISCHARGE_SUMMARY: 'DISCHARGE_SUMMARY',
    PRIOR_VISIT_RECORD: 'PRIOR_VISIT_RECORD',
    CLINICAL_INTAKE_ANSWER: 'CLINICAL_INTAKE_ANSWER',
};

"use strict";
/**
 * MODULE 3B — SPECIAL POPULATIONS, SENSITIVE TOPICS & INTERVIEW PRIVACY
 * Types, contracts, and safety enums for minor/guardian intake, surrogate assistance,
 * public kiosk audio routing, non-inferential gating, and doctor-only scoping.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SurrogateInabilityReasons = exports.SurrogateRelationships = exports.GuardianRelationships = exports.AnsweredVia = exports.SpecialPopulationModes = exports.SexApplicability = exports.VisibilityScopes = exports.SensitivityLevels = void 0;
const interview_types_js_1 = require("../../types/interview.types.js");
Object.defineProperty(exports, "SensitivityLevels", { enumerable: true, get: function () { return interview_types_js_1.SensitivityLevels; } });
Object.defineProperty(exports, "VisibilityScopes", { enumerable: true, get: function () { return interview_types_js_1.VisibilityScopes; } });
Object.defineProperty(exports, "SexApplicability", { enumerable: true, get: function () { return interview_types_js_1.SexApplicability; } });
Object.defineProperty(exports, "SpecialPopulationModes", { enumerable: true, get: function () { return interview_types_js_1.SpecialPopulationModes; } });
Object.defineProperty(exports, "AnsweredVia", { enumerable: true, get: function () { return interview_types_js_1.AnsweredVia; } });
// ==============================================================================
// 1. GUARDIAN & MINOR CONTRACTS
// ==============================================================================
exports.GuardianRelationships = {
    PARENT: 'PARENT',
    LEGAL_GUARDIAN: 'LEGAL_GUARDIAN',
    AUTHORIZED_CAREGIVER: 'AUTHORIZED_CAREGIVER',
    OTHER: 'OTHER',
};
// ==============================================================================
// 2. SURROGATE MODE CONTRACTS
// ==============================================================================
exports.SurrogateRelationships = {
    SPOUSE: 'SPOUSE',
    ADULT_CHILD: 'ADULT_CHILD',
    PARENT: 'PARENT',
    SIBLING: 'SIBLING',
    CAREGIVER: 'CAREGIVER',
    HOSPITAL_ATTENDANT: 'HOSPITAL_ATTENDANT',
    OTHER: 'OTHER',
};
exports.SurrogateInabilityReasons = {
    SEVERELY_UNWELL: 'SEVERELY_UNWELL',
    COGNITIVE_IMPAIRMENT: 'COGNITIVE_IMPAIRMENT',
    PHYSICAL_LIMITATION: 'PHYSICAL_LIMITATION',
    LANGUAGE_BARRIER: 'LANGUAGE_BARRIER',
    OTHER: 'OTHER',
};

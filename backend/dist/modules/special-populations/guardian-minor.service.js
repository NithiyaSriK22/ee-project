"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardianMinorService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const special_populations_types_js_1 = require("./special-populations.types.js");
const app_error_js_1 = require("../../errors/app-error.js");
const logger_js_1 = require("../../config/logger.js");
class GuardianMinorService {
    // Configurable Age of Majority (Hospital policy / jurisdictional setting, default: 18)
    static ageOfMajorityYears = 18;
    // In-memory persistent registry per visit (backed by memory/store)
    static guardianRegistry = new Map();
    /**
     * Set or customize the hospital age of majority threshold
     */
    static setAgeOfMajority(age) {
        if (age <= 0 || age > 25) {
            throw new app_error_js_1.ValidationError('Age of majority must be between 1 and 25 years');
        }
        this.ageOfMajorityYears = age;
        logger_js_1.logger.info('[GUARDIAN_POLICY_CONFIGURED]', { ageOfMajorityYears: age });
    }
    static getAgeOfMajority() {
        return this.ageOfMajorityYears;
    }
    /**
     * Calculates exact chronological age in completed whole years from date of birth
     */
    static calculateAgeYears(dob, referenceDate = new Date()) {
        const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
        if (isNaN(birthDate.getTime())) {
            throw new app_error_js_1.ValidationError('Invalid patient date of birth provided');
        }
        let years = referenceDate.getFullYear() - birthDate.getFullYear();
        const monthDiff = referenceDate.getMonth() - birthDate.getMonth();
        const dayDiff = referenceDate.getDate() - birthDate.getDate();
        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
            years--;
        }
        return Math.max(0, years);
    }
    /**
     * Evaluates whether a patient requires guardian intervention under hospital age of majority rules
     */
    static isMinor(dob, referenceDate = new Date()) {
        if (!dob)
            return false;
        const age = this.calculateAgeYears(dob, referenceDate);
        return age < this.ageOfMajorityYears;
    }
    /**
     * Registers and verifies a guardian for a minor patient intake visit
     */
    static registerGuardian(payload, patientDob) {
        if (!payload.visitId || !payload.patientId) {
            throw new app_error_js_1.ValidationError('visitId and patientId are required for guardian registration');
        }
        if (!payload.guardianName || payload.guardianName.trim().length < 2) {
            throw new app_error_js_1.ValidationError('Valid guardian legal name is required');
        }
        const validRelationships = Object.values(special_populations_types_js_1.GuardianRelationships);
        if (!validRelationships.includes(payload.guardianRelationship)) {
            throw new app_error_js_1.ValidationError(`Invalid guardian relationship. Permitted values: ${validRelationships.join(', ')}`);
        }
        if (!payload.guardianConsentRecorded) {
            throw new app_error_js_1.ForbiddenError('Parental or legal guardian affirmative consent must be recorded before proceeding with pediatric intake');
        }
        const minorAge = patientDob ? this.calculateAgeYears(patientDob) : 0;
        const record = {
            id: crypto_1.default.randomUUID(),
            visitId: payload.visitId,
            patientId: payload.patientId,
            guardianName: payload.guardianName.trim(),
            guardianRelationship: payload.guardianRelationship,
            guardianPhone: payload.guardianPhone?.trim(),
            guardianConsentRecorded: true,
            minorAge,
            registeredAt: new Date(),
        };
        this.guardianRegistry.set(payload.visitId, record);
        logger_js_1.logger.info('[GUARDIAN_REGISTERED]', {
            visitId: payload.visitId,
            patientId: payload.patientId,
            relationship: payload.guardianRelationship,
            minorAge,
        });
        return { ...record };
    }
    /**
     * Retrieves the active guardian record for a visit if present
     */
    static getGuardianForVisit(visitId) {
        const record = this.guardianRegistry.get(visitId);
        return record ? { ...record } : null;
    }
    /**
     * Generates auditable clinical provenance label for answers given by a guardian
     */
    static formatProvenanceLabel(record) {
        return `Recorded by Guardian: ${record.guardianName} (${record.guardianRelationship})`;
    }
    /**
     * Evaluates age gating for questions
     */
    static evaluateAgeGating(ageYears, question) {
        if (question.ageMin !== undefined && ageYears < question.ageMin) {
            return {
                shouldAsk: false,
                exclusionReason: 'AGE_BELOW_MIN',
                details: `Patient age (${ageYears} yrs) is below question minimum threshold (${question.ageMin} yrs)`,
            };
        }
        if (question.ageMax !== undefined && ageYears > question.ageMax) {
            return {
                shouldAsk: false,
                exclusionReason: 'AGE_ABOVE_MAX',
                details: `Patient age (${ageYears} yrs) exceeds question maximum threshold (${question.ageMax} yrs)`,
            };
        }
        return { shouldAsk: true };
    }
    /**
     * Test/admin helper: clear store
     */
    static clearStore() {
        this.guardianRegistry.clear();
        this.ageOfMajorityYears = 18;
    }
}
exports.GuardianMinorService = GuardianMinorService;

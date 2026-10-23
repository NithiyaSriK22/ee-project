"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewPolicyService = exports.DEFAULT_REVIEW_POLICY = void 0;
exports.DEFAULT_REVIEW_POLICY = {
    version: 'POLICY-v1.0.0',
    name: 'Standard Hospital OPD Clinical Review Policy',
    isActive: true,
    gateOnCriticalUnverifiedDocumentFields: true,
    gateOnCriticalUnreadableDocumentFields: true,
    gateOnCriticalMismatchDocumentFields: true,
    gateOnCriticalDeclinedAnswers: true,
    gateOnConflictMarkers: true,
    gateOnUnacknowledgedOpenAlerts: true,
    attestationVersion: 'ATTEST-v1.0.0',
    attestationText: 'I, the treating physician, confirm that I have reviewed the clinical case details, verified sources, resolved outstanding critical flags, and approved this record as accurate for clinical documentation.',
};
class ReviewPolicyService {
    static activePolicy = { ...exports.DEFAULT_REVIEW_POLICY };
    static getActivePolicy() {
        return { ...this.activePolicy };
    }
    static setActivePolicy(policy) {
        this.activePolicy = { ...policy };
    }
    static getAttestationText() {
        return {
            version: this.activePolicy.attestationVersion,
            text: this.activePolicy.attestationText,
        };
    }
}
exports.ReviewPolicyService = ReviewPolicyService;

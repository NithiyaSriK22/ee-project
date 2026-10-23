"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientCopyService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const feature_flags_service_js_1 = require("../../deployment/feature-flags.service.js");
const env_config_js_1 = require("../../../config/env.config.js");
class PatientCopyService {
    static LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL for signed patient link
    static SIGNING_SECRET = env_config_js_1.env.JWT_SECRET || 'PATIENT-COPY-SECURE-HMAC-SECRET-2026';
    /**
     * Assembles an accessible, plain-language patient copy purely via deterministic code templates.
     * STRICT BOUNDARIES:
     * - ZERO LLM is called. Pure code assembly.
     * - Feature-flagged off by default (PATIENT_COPY_ENABLED).
     * - Sensitive items excluded by default (Module 3B visibility).
     * - Generates expiring HMAC-SHA256 signed links.
     * - Explicit consent verification enforced.
     */
    static generatePatientCopy(params) {
        const isEnabled = feature_flags_service_js_1.FeatureFlagsService.isFlagEnabled('PATIENT_COPY_ENABLED');
        if (!isEnabled) {
            throw new Error('Patient copy generation is currently disabled by hospital policy (PATIENT_COPY_ENABLED).');
        }
        if (!params.patientConsentVerified) {
            throw new Error('Patient consent for post-consultation summary generation is required.');
        }
        const { record, patientToken } = params;
        const generatedAt = new Date().toISOString();
        // 1. Filter out sensitive items (Module 3B)
        const safeStatements = record.statements.filter((s) => {
            const sec = s.section.toLowerCase();
            const txt = s.text.toLowerCase();
            return (!sec.includes('sensitive') &&
                !sec.includes('mental_health') &&
                !sec.includes('substance') &&
                !sec.includes('sexual') &&
                !txt.includes('confidential'));
        });
        // 2. Deterministic, plain-language translation of clinical sections into patient-friendly headings
        const patientFriendlySections = {
            CHIEF_COMPLAINT: 'Reason for Your Visit',
            HISTORY_OF_PRESENT_ILLNESS: 'What You Shared with Your Doctor',
            PAST_MEDICAL_HISTORY: 'Your Medical Background',
            MEDICATIONS: 'Medications Discussed with Your Doctor',
            ALLERGIES: 'Known Allergies on Record',
            LIFESTYLE: 'Daily Habits & Health Habits',
            CLINICAL_IMPRESSION_PLAN: 'Next Steps & Doctor Instructions',
        };
        const sectionBlocks = {};
        for (const stmt of safeStatements) {
            const key = stmt.section.toUpperCase();
            if (!sectionBlocks[key]) {
                sectionBlocks[key] = [];
            }
            sectionBlocks[key].push(stmt.text);
        }
        const docName = record.confirmedByDoctorName || 'Your Treating Doctor';
        const formattedDate = new Date(record.confirmedAt).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        // 3. Assemble plain-language narrative
        const lines = [
            '========================================================================',
            'YOUR CLINICAL VISIT SUMMARY (PATIENT COPY)',
            '========================================================================',
            `Thank you for visiting today. This summary was reviewed and confirmed by Dr. ${docName} on ${formattedDate}.`,
            `Token Number: ${patientToken}`,
            '------------------------------------------------------------------------',
            '',
        ];
        for (const [secKey, friendlyName] of Object.entries(patientFriendlySections)) {
            if (sectionBlocks[secKey] && sectionBlocks[secKey].length > 0) {
                lines.push(`## ${friendlyName}`);
                for (const item of sectionBlocks[secKey]) {
                    lines.push(` • ${item}`);
                }
                lines.push('');
            }
        }
        lines.push('------------------------------------------------------------------------');
        lines.push('IMPORTANT NOTICE FOR PATIENTS:');
        lines.push('This copy is for your personal health records. Please follow all prescription directions given directly by your doctor or hospital pharmacy. If your symptoms worsen or you experience acute distress, please seek immediate emergency care.');
        lines.push('========================================================================');
        const plainLanguageText = lines.join('\n');
        // 4. Generate Expiring Signed Link
        const expiresAtMs = Date.now() + this.LINK_TTL_MS;
        const expiresAt = new Date(expiresAtMs).toISOString();
        const claims = {
            recordId: record.id,
            version: record.version,
            visitId: record.visitId,
            patientId: params.patientId,
            expiresAtMs,
            consentVerified: true,
        };
        const token = this.generateSignedToken(claims);
        const baseUrl = params.baseUrl || 'https://kiosk.hospital.org';
        const signedDownloadUrl = `${baseUrl}/api/v1/patient-copy/download/${token}`;
        return {
            recordId: record.id,
            version: record.version,
            plainLanguageText,
            generatedAt,
            sensitiveItemsExcluded: true,
            expiresAt,
            signedDownloadUrl,
        };
    }
    /**
     * Generates HMAC-SHA256 signature for short-lived patient link.
     */
    static generateSignedToken(claims) {
        const payloadBase64 = Buffer.from(JSON.stringify(claims)).toString('base64url');
        const signature = crypto_1.default
            .createHmac('sha256', this.SIGNING_SECRET)
            .update(payloadBase64)
            .digest('base64url');
        return `${payloadBase64}.${signature}`;
    }
    /**
     * Verifies expiring signed patient copy link.
     */
    static verifySignedToken(token) {
        const parts = token.split('.');
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
            throw new Error('Invalid signed patient link format.');
        }
        const payloadBase64 = parts[0];
        const signature = parts[1];
        const expectedSig = crypto_1.default
            .createHmac('sha256', this.SIGNING_SECRET)
            .update(payloadBase64)
            .digest('base64url');
        if (signature !== expectedSig) {
            throw new Error('Cryptographic signature verification failed. Link is invalid or tampered.');
        }
        const claims = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf-8'));
        if (Date.now() > claims.expiresAtMs) {
            throw new Error('Patient copy download link has expired. Please request a new link.');
        }
        return claims;
    }
}
exports.PatientCopyService = PatientCopyService;

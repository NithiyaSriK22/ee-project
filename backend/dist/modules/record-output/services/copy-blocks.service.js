"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopyBlocksService = void 0;
class CopyBlocksService {
    /**
     * Formats confirmed clinical records into structured plain-text copy blocks
     * engineered for direct pasting into hospital EHR / HIS text fields.
     */
    static generateCopyBlocks(record, provenance) {
        // 1. Group confirmed statements by section
        const sectionMap = {};
        for (const stmt of record.statements) {
            const sectionKey = stmt.section.toUpperCase();
            if (!sectionMap[sectionKey]) {
                sectionMap[sectionKey] = [];
            }
            sectionMap[sectionKey].push(stmt.text);
        }
        // 2. Format individual section blocks
        const sections = {};
        for (const [sec, items] of Object.entries(sectionMap)) {
            sections[sec] = items.join('\n');
        }
        // 3. Build provenance header banner
        const bannerLines = [
            '========================================================================',
            `CLINICAL CASE SUMMARY — ${provenance.amendmentStatus} (v${provenance.version})`,
            provenance.reviewConfirmationStatement,
            `Attestation: ${provenance.attestationText || 'Reviewed and confirmed under hospital clinical review policy.'}`,
        ];
        if (provenance.isProvisionalIdentity) {
            bannerLines.push(`⚠️ WARNING: ${provenance.provisionalIdentityNotice}`);
            bannerLines.push(`Patient Token: ${provenance.patientToken} (Registration Number Withheld Pending Identity Reconciliation)`);
        }
        else {
            bannerLines.push(`Patient Token: ${provenance.patientToken} | Hospital Reg No: ${provenance.hospitalRegistrationNumber || 'N/A'}`);
        }
        if (provenance.amendmentStatus === 'AMENDED') {
            bannerLines.push(`Supersedes Record: ${provenance.supersedesRecordId || 'N/A'}`);
            bannerLines.push(`Amendment Reason: ${provenance.amendmentReason || 'Clinical record update'}`);
        }
        bannerLines.push(`Origin Summary: ${provenance.originSummary.aiConfirmedUnchanged} AI Unchanged, ` +
            `${provenance.originSummary.doctorEdited} Doctor-Edited, ` +
            `${provenance.originSummary.doctorAdded} Doctor-Added, ` +
            `${provenance.originSummary.toClarify} To Clarify`);
        if (provenance.toClarifyItems.length > 0) {
            bannerLines.push('------------------------------------------------------------------------');
            bannerLines.push('ITEMS TO CLARIFY:');
            for (const item of provenance.toClarifyItems) {
                bannerLines.push(` • ${item}`);
            }
        }
        bannerLines.push('========================================================================\n');
        const header = bannerLines.join('\n');
        // 4. Assemble the full copy-paste block
        const fullTextParts = [header];
        const standardSectionOrder = [
            'CHIEF_COMPLAINT',
            'HISTORY_OF_PRESENT_ILLNESS',
            'PAST_MEDICAL_HISTORY',
            'MEDICATIONS',
            'ALLERGIES',
            'FAMILY_HISTORY',
            'LIFESTYLE',
            'PHYSICAL_EXAMINATION',
            'CLINICAL_IMPRESSION_PLAN',
        ];
        // Append standard sections in order
        for (const sec of standardSectionOrder) {
            if (sections[sec]) {
                fullTextParts.push(`[${sec.replace(/_/g, ' ')}]`);
                fullTextParts.push(sections[sec]);
                fullTextParts.push('');
            }
        }
        // Append any custom sections not in standard order
        for (const [sec, text] of Object.entries(sections)) {
            if (!standardSectionOrder.includes(sec)) {
                fullTextParts.push(`[${sec.replace(/_/g, ' ')}]`);
                fullTextParts.push(text);
                fullTextParts.push('');
            }
        }
        return {
            header,
            sections,
            fullText: fullTextParts.join('\n').trim(),
            generatedAt: new Date().toISOString(),
            recordId: record.id,
            version: record.version,
        };
    }
}
exports.CopyBlocksService = CopyBlocksService;

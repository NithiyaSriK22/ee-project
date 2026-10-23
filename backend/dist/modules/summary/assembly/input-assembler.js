"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputAssembler = void 0;
const crypto_1 = __importDefault(require("crypto"));
const summary_types_js_1 = require("../summary.types.js");
const item_key_map_js_1 = require("./item-key-map.js");
const conflict_detector_js_1 = require("./conflict-detector.js");
class InputAssembler {
    /**
     * Deterministically combines Module 3 and Module 4 data into normalized SummaryInputItems.
     * Same stored data in -> same input and input_hash out.
     */
    static assemble(options) {
        const items = [];
        const formularyVersionRefsSet = new Set();
        let itemSeq = 1;
        // 1. Process Module 3 Interview Answers
        if (options.interviewData && Array.isArray(options.interviewData.answers)) {
            // Sort deterministically by questionId / answeredAt
            const sortedAnswers = [...options.interviewData.answers].sort((a, b) => a.questionId.localeCompare(b.questionId));
            for (const ans of sortedAnswers) {
                // MODULE 3B PRIVACY ENFORCEMENT: Exclude sensitive/doctor-only items from AI summarizer input
                const ansAny = ans;
                if (ansAny.aiSummarizationAllowed === false ||
                    ansAny.visibilityScope === 'DOCTOR_ONLY' ||
                    ansAny.sensitivityLevel === 'HIGHLY_SENSITIVE' ||
                    ansAny.isDeferredToDoctor === true) {
                    continue;
                }
                const itemId = `itm_int_${String(itemSeq++).padStart(3, '0')}`;
                const section = item_key_map_js_1.INTERVIEW_SECTION_TO_SUMMARY_SECTION[ans.section] || summary_types_js_1.SummarySections.CHIEF_COMPLAINT;
                const { status, formattedValue, rawStr } = this.normalizeInterviewAnswer(ans);
                const itemKey = (0, item_key_map_js_1.deriveSemanticItemKey)('INTERVIEW', ans.section, rawStr);
                items.push({
                    itemId,
                    section,
                    label: ans.promptText || ans.section,
                    value: formattedValue,
                    sourceType: 'INTERVIEW',
                    sourceRef: `interview_q_${ans.questionId}`,
                    status,
                    isCritical: Boolean(ans.isCritical),
                    rawText: rawStr,
                    itemKey,
                    metadata: {
                        questionId: ans.questionId,
                        questionType: ans.questionType,
                        answeredVia: ans.answeredVia,
                        languageUsed: ans.languageUsed,
                    },
                });
            }
        }
        // 2. Process Module 4 Validated Document Fields
        if (Array.isArray(options.documentsData)) {
            const sortedDocs = [...options.documentsData].sort((a, b) => a.documentId.localeCompare(b.documentId));
            for (const doc of sortedDocs) {
                const sortedFields = [...(doc.validatedFields || [])].sort((a, b) => a.id.localeCompare(b.id));
                for (const field of sortedFields) {
                    const itemId = `itm_doc_${String(itemSeq++).padStart(3, '0')}`;
                    const section = item_key_map_js_1.DOCUMENT_FIELD_TO_SUMMARY_SECTION[field.fieldType] ||
                        summary_types_js_1.SummarySections.PRIOR_INVESTIGATIONS;
                    if (field.formularyVersion) {
                        formularyVersionRefsSet.add(field.formularyVersion);
                    }
                    const status = this.normalizeDocumentFieldStatus(field.result);
                    const rawStr = field.rawText || field.matchedReferenceValue || '';
                    const value = field.matchedReferenceValue || field.rawText || '';
                    const itemKey = (0, item_key_map_js_1.deriveSemanticItemKey)('DOCUMENT', field.fieldType, value || rawStr);
                    items.push({
                        itemId,
                        section,
                        label: `${doc.documentType}: ${field.fieldType}`,
                        value,
                        sourceType: 'DOCUMENT',
                        sourceRef: `doc_${doc.documentId}_field_${field.id}`,
                        status,
                        isCritical: Boolean(field.isCritical),
                        rawText: rawStr,
                        itemKey,
                        metadata: {
                            documentId: doc.documentId,
                            documentType: doc.documentType,
                            fieldId: field.id,
                            evalState: field.evalState,
                            ocrConfidence: field.ocrConfidence,
                            formularyVersion: field.formularyVersion,
                        },
                    });
                }
            }
        }
        // Sort items by itemId for consistent canonical ordering
        items.sort((a, b) => a.itemId.localeCompare(b.itemId));
        // Detect conflicts deterministically
        const conflicts = conflict_detector_js_1.ConflictDetector.detectConflicts(items);
        // Compute deterministic SHA-256 hash of input items
        const inputHash = this.computeInputHash(items, conflicts);
        return {
            visitId: options.visitId,
            patientAge: options.patient?.age ?? undefined,
            patientGender: options.patient?.gender ?? undefined,
            preferredLanguage: options.patient?.preferredLanguage ?? 'en',
            inputHash,
            items,
            conflicts,
            formularyVersionRefs: Array.from(formularyVersionRefsSet),
            assembledAt: new Date().toISOString(),
        };
    }
    static normalizeInterviewAnswer(ans) {
        if (ans.isSkipped) {
            return { status: 'SKIPPED', formattedValue: '', rawStr: '' };
        }
        const val = ans.answerValue;
        if (val === undefined || val === null || val === '') {
            return { status: 'NOT_ANSWERED', formattedValue: '', rawStr: '' };
        }
        let rawStr = '';
        if (typeof val === 'string') {
            rawStr = val.trim();
        }
        else if (typeof val === 'object') {
            rawStr = JSON.stringify(val);
        }
        else {
            rawStr = String(val);
        }
        const lower = rawStr.toLowerCase();
        if (lower === 'declined' ||
            lower === 'prefer not to answer' ||
            lower === 'prefernotsay' ||
            (typeof val === 'object' && val?.declined === true)) {
            return { status: 'DECLINED', formattedValue: '', rawStr };
        }
        return {
            status: 'ANSWERED',
            formattedValue: rawStr,
            rawStr,
        };
    }
    static normalizeDocumentFieldStatus(result) {
        const upper = (result || '').toUpperCase();
        switch (upper) {
            case 'VERIFIED':
                return 'VERIFIED';
            case 'UNREADABLE':
                return 'UNREADABLE';
            case 'MISMATCH_FLAGGED':
                return 'MISMATCH_FLAGGED';
            case 'UNVERIFIED':
            default:
                return 'UNVERIFIED';
        }
    }
    static computeInputHash(items, conflicts) {
        const canonicalPayload = JSON.stringify({
            items: items.map((i) => ({
                id: i.itemId,
                sec: i.section,
                lbl: i.label,
                val: i.value,
                st: i.status,
                crit: i.isCritical,
                src: i.sourceRef,
            })),
            conflictsCount: conflicts.length,
        });
        return crypto_1.default.createHash('sha256').update(canonicalPayload).digest('hex');
    }
}
exports.InputAssembler = InputAssembler;

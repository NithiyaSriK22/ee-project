"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MustResolveEvaluator = void 0;
const crypto_1 = __importDefault(require("crypto"));
const doctor_review_types_js_1 = require("../doctor-review.types.js");
class MustResolveEvaluator {
    /**
     * Deterministic SHA-256 hash calculation for tracking source item changes.
     */
    static computeSourceHash(val) {
        const str = typeof val === 'string' ? val : JSON.stringify(val ?? '');
        return crypto_1.default.createHash('sha256').update(str).digest('hex').substring(0, 16);
    }
    /**
     * Pure deterministic evaluator: Workspace Inputs + Policy -> Must-Resolve Set & Passive Flags
     */
    static evaluate(inputs, existingResolutions, policy) {
        const mustResolveItems = [];
        const passiveFlags = [];
        // Map resolutions by itemRef for quick lookup
        const resolutionMap = new Map();
        for (const res of existingResolutions) {
            resolutionMap.set(res.itemRef, res);
        }
        // 1. Evaluate Validated Document Fields (Module 4)
        if (inputs.documentFields) {
            for (const field of inputs.documentFields) {
                const itemRef = `doc-field:${field.id}`;
                const sourceHash = this.computeSourceHash(`${field.fieldType}:${field.rawText || ''}:${field.matchedReferenceValue || ''}:${field.result}`);
                const isUncertain = ['UNVERIFIED', 'UNREADABLE', 'MISMATCH_FLAGGED'].includes(field.result);
                if (field.isCritical && isUncertain) {
                    const resolution = resolutionMap.get(itemRef);
                    // Check if resolved and if source hash matches (hash mismatch means source changed mid-review)
                    const isResolved = !!(resolution && (!resolution.sourceHash || resolution.sourceHash === sourceHash));
                    mustResolveItems.push({
                        itemRef,
                        itemType: doctor_review_types_js_1.MustResolveItemTypes.DOCUMENT_FIELD,
                        title: `Critical Document Field: ${field.fieldType}`,
                        description: `Field outcome is ${field.result}${field.explanation ? `: ${field.explanation}` : ''}`,
                        sourceType: 'DOCUMENT',
                        sourceRef: field.documentId || field.id,
                        sourceSnippetRef: field.sourceSnippetRef || null,
                        rawExtractedValue: field.rawText || null,
                        matchedReferenceValue: field.matchedReferenceValue || null,
                        ocrConfidence: field.ocrConfidence || null,
                        verificationState: field.result,
                        sourceHash,
                        isResolved,
                        resolution: isResolved ? resolution : null,
                    });
                }
                else if (!field.isCritical && isUncertain) {
                    // Passive Flag: non-critical uncertain items NEVER gate confirmation
                    passiveFlags.push({
                        itemRef,
                        title: `Non-critical ${field.fieldType} (${field.result})`,
                        description: field.explanation || `Status is ${field.result}`,
                        sourceType: 'DOCUMENT',
                        sourceRef: field.id,
                        verificationState: field.result,
                    });
                }
            }
        }
        // 2. Evaluate Guided Interview Answers (Module 3)
        if (inputs.interviewAnswers) {
            for (const answer of inputs.interviewAnswers) {
                const itemRef = `interview-ans:${answer.id}`;
                const val = answer.answerValue;
                const isDeclinedOrUnanswered = answer.isSkipped ||
                    val === null ||
                    val === undefined ||
                    val === '' ||
                    (typeof val === 'object' && val?.declined === true) ||
                    (typeof val === 'string' && (val.toLowerCase() === 'declined' || val.toLowerCase() === 'not answered'));
                const sourceHash = this.computeSourceHash(`${answer.promptText}:${JSON.stringify(val)}`);
                if (answer.isCritical && isDeclinedOrUnanswered) {
                    const resolution = resolutionMap.get(itemRef);
                    const isResolved = !!(resolution && (!resolution.sourceHash || resolution.sourceHash === sourceHash));
                    mustResolveItems.push({
                        itemRef,
                        itemType: doctor_review_types_js_1.MustResolveItemTypes.INTERVIEW_ANSWER,
                        title: `Critical Interview Question: ${answer.promptText}`,
                        description: answer.isSkipped
                            ? 'Patient skipped this critical question during intake.'
                            : 'Question was left unanswered or explicitly declined.',
                        sourceType: 'INTERVIEW',
                        sourceRef: answer.id,
                        rawExtractedValue: val ? JSON.stringify(val) : 'NOT_ANSWERED',
                        verificationState: answer.isSkipped ? 'SKIPPED' : 'DECLINED',
                        sourceHash,
                        isResolved,
                        resolution: isResolved ? resolution : null,
                    });
                }
                else if (!answer.isCritical && isDeclinedOrUnanswered) {
                    passiveFlags.push({
                        itemRef,
                        title: `Unanswered non-critical question`,
                        description: answer.promptText,
                        sourceType: 'INTERVIEW',
                        sourceRef: answer.id,
                        verificationState: 'SKIPPED',
                    });
                }
            }
        }
        // 3. Evaluate Conflict Markers (Module 5)
        // Check conflicts array from summary assembler OR scan statements for conflict markers
        const conflictList = inputs.conflicts || [];
        for (const conflict of conflictList) {
            const itemRef = `conflict:${conflict.itemKey}`;
            const sourceHash = this.computeSourceHash(conflict.conflictMessage || conflict.itemKey);
            const resolution = resolutionMap.get(itemRef);
            const isResolved = !!(resolution && (!resolution.sourceHash || resolution.sourceHash === sourceHash));
            mustResolveItems.push({
                itemRef,
                itemType: doctor_review_types_js_1.MustResolveItemTypes.CONFLICT_MARKER,
                title: `Clinical Conflict: ${conflict.itemKey.replace(/_/g, ' ')}`,
                description: conflict.conflictMessage || 'Conflict detected between interview and medical document.',
                sourceType: 'SUMMARY_CONFLICT',
                sourceRef: conflict.itemKey,
                rawExtractedValue: conflict.conflictMessage || null,
                verificationState: 'CONFLICT',
                sourceHash,
                isResolved,
                resolution: isResolved ? resolution : null,
            });
        }
        // Also scan summary statements for explicit conflict markers
        if (inputs.summaryStatements) {
            for (let i = 0; i < inputs.summaryStatements.length; i++) {
                const stmt = inputs.summaryStatements[i];
                if (!stmt || !stmt.text)
                    continue;
                if (stmt.text.includes('⚠ Conflict:') ||
                    stmt.text.includes('[CONFLICT:') ||
                    stmt.text.includes('Conflict: interview and document differ')) {
                    const itemRef = stmt.id ? `stmt-conflict:${stmt.id}` : `stmt-conflict:${i}`;
                    // Don't duplicate if already added by key
                    if (!mustResolveItems.some((m) => m.itemRef === itemRef)) {
                        const sourceHash = this.computeSourceHash(stmt.text);
                        const resolution = resolutionMap.get(itemRef);
                        const isResolved = !!(resolution && (!resolution.sourceHash || resolution.sourceHash === sourceHash));
                        mustResolveItems.push({
                            itemRef,
                            itemType: doctor_review_types_js_1.MustResolveItemTypes.CONFLICT_MARKER,
                            title: `Discrepancy Marker in Summary Section: ${stmt.section || 'General'}`,
                            description: stmt.text,
                            sourceType: 'SUMMARY_CONFLICT',
                            sourceRef: stmt.id || `statement-${i}`,
                            rawExtractedValue: stmt.text,
                            verificationState: 'CONFLICT',
                            sourceHash,
                            isResolved,
                            resolution: isResolved ? resolution : null,
                        });
                    }
                }
            }
        }
        // 4. Evaluate Open Emergency Alerts (Module 6)
        if (inputs.alerts && policy.gateOnUnacknowledgedOpenAlerts) {
            for (const alert of inputs.alerts) {
                // Gating tiers: IMMEDIATE, URGENT, STAFF_CHECK
                const isGatingTier = ['IMMEDIATE', 'URGENT', 'STAFF_CHECK'].includes(alert.severityTier);
                const isUnacknowledged = alert.status === 'RAISED';
                if (isGatingTier && isUnacknowledged) {
                    const itemRef = `alert:${alert.id}`;
                    const sourceHash = this.computeSourceHash(`${alert.id}:${alert.status}:${alert.severityTier}`);
                    const resolution = resolutionMap.get(itemRef);
                    // If staff or doctor acknowledged alert, or resolution recorded
                    const isResolved = alert.status !== 'RAISED' || !!resolution;
                    mustResolveItems.push({
                        itemRef,
                        itemType: doctor_review_types_js_1.MustResolveItemTypes.ALERT,
                        title: `${alert.severityTier} Triage Alert (${alert.ruleCode || 'Clinical Rule'})`,
                        description: `Open triage alert at ${alert.kioskLocation || 'Kiosk'} has not been acknowledged.`,
                        sourceType: 'ALERT',
                        sourceRef: alert.id,
                        verificationState: alert.status,
                        sourceHash,
                        isResolved,
                        resolution: isResolved ? resolution : null,
                    });
                }
            }
        }
        const unresolvedCount = mustResolveItems.filter((item) => !item.isResolved).length;
        return {
            mustResolveItems,
            unresolvedCount,
            passiveFlags,
        };
    }
}
exports.MustResolveEvaluator = MustResolveEvaluator;

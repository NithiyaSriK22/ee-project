"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateSummaryBuilder = void 0;
const summary_types_js_1 = require("../summary.types.js");
class TemplateSummaryBuilder {
    static ALL_SECTIONS = [
        summary_types_js_1.SummarySections.CHIEF_COMPLAINT,
        summary_types_js_1.SummarySections.HISTORY_OF_PRESENT_ILLNESS,
        summary_types_js_1.SummarySections.PAST_MEDICAL_HISTORY,
        summary_types_js_1.SummarySections.MEDICATIONS_AND_ALLERGIES,
        summary_types_js_1.SummarySections.FAMILY_AND_PERSONAL_HISTORY,
        summary_types_js_1.SummarySections.REVIEW_OF_SYSTEMS,
        summary_types_js_1.SummarySections.PRIOR_INVESTIGATIONS,
    ];
    /**
     * Builds a safe, deterministic, template-only clinical summary.
     * Zero LLM calls, zero prose generation, 100% grounded in code.
     */
    static buildFallbackSummary(assembledInput) {
        const sectionsDto = [];
        const itemsBySection = this.groupItemsBySection(assembledInput.items);
        let secOrder = 1;
        for (const section of this.ALL_SECTIONS) {
            const sectionItems = itemsBySection.get(section) || [];
            const statements = [];
            let stmtOrder = 1;
            // 1. Process items in this section
            if (sectionItems.length > 0) {
                for (const item of sectionItems) {
                    const stmt = this.formatItemStatement(item, stmtOrder++);
                    statements.push(stmt);
                }
            }
            // 2. Insert any conflict warnings for this section
            const sectionConflicts = assembledInput.conflicts.filter((c) => c.section === section);
            for (const conflict of sectionConflicts) {
                statements.push({
                    text: conflict.conflictMessage,
                    origin: 'CODE_TEMPLATE',
                    order: stmtOrder++,
                    sources: [
                        ...(conflict.interviewItem
                            ? [
                                {
                                    sourceType: conflict.interviewItem.sourceType,
                                    sourceRef: conflict.interviewItem.sourceRef,
                                    sourceItemId: conflict.interviewItem.itemId,
                                },
                            ]
                            : []),
                        ...(conflict.documentItem
                            ? [
                                {
                                    sourceType: conflict.documentItem.sourceType,
                                    sourceRef: conflict.documentItem.sourceRef,
                                    sourceItemId: conflict.documentItem.itemId,
                                },
                            ]
                            : []),
                    ],
                });
            }
            // 3. If section is empty, insert deterministic empty placeholder
            if (statements.length === 0) {
                statements.push({
                    text: '[No information collected]',
                    origin: 'CODE_TEMPLATE',
                    order: 1,
                    sources: [],
                });
            }
            sectionsDto.push({
                section,
                order: secOrder++,
                statements,
            });
        }
        return sectionsDto;
    }
    /**
     * Merges model-phrased statements with code-inserted placeholders for withheld/uncertain items,
     * conflicts, and empty sections.
     */
    static mergeWithCodePlaceholders(modelOutput, assembledInput) {
        const sectionsDto = [];
        const modelSectionsMap = new Map();
        for (const sec of modelOutput.sections) {
            modelSectionsMap.set(sec.section, sec);
        }
        const itemsMap = new Map();
        for (const item of assembledInput.items) {
            itemsMap.set(item.itemId, item);
        }
        const withheldItemsBySection = this.groupItemsBySection(assembledInput.items.filter((i) => ['UNVERIFIED', 'UNREADABLE', 'MISMATCH_FLAGGED', 'DECLINED', 'NOT_ANSWERED', 'SKIPPED'].includes(i.status)));
        let secOrder = 1;
        for (const section of this.ALL_SECTIONS) {
            const modelSec = modelSectionsMap.get(section);
            const statements = [];
            let stmtOrder = 1;
            // Add model statements
            if (modelSec && Array.isArray(modelSec.statements)) {
                for (const mStmt of modelSec.statements) {
                    // Check if statement is a patient verbatim quote
                    const isPatientQuote = mStmt.source_item_ids.some((id) => {
                        const item = itemsMap.get(id);
                        return item?.sourceType === 'INTERVIEW' && item?.rawText && item.rawText.length > 25;
                    });
                    statements.push({
                        text: mStmt.text,
                        origin: isPatientQuote ? 'PATIENT_QUOTE' : 'MODEL',
                        order: stmtOrder++,
                        sources: mStmt.source_item_ids.map((id) => {
                            const item = itemsMap.get(id);
                            return {
                                sourceType: item?.sourceType || 'SYSTEM',
                                sourceRef: item?.sourceRef || id,
                                sourceItemId: id,
                            };
                        }),
                    });
                }
            }
            // Add code-inserted placeholders for withheld / uncertain items in this section
            const withheld = withheldItemsBySection.get(section) || [];
            for (const item of withheld) {
                statements.push(this.formatItemStatement(item, stmtOrder++));
            }
            // Add conflict markers for this section
            const sectionConflicts = assembledInput.conflicts.filter((c) => c.section === section);
            for (const conflict of sectionConflicts) {
                statements.push({
                    text: conflict.conflictMessage,
                    origin: 'CODE_TEMPLATE',
                    order: stmtOrder++,
                    sources: [
                        ...(conflict.interviewItem
                            ? [
                                {
                                    sourceType: conflict.interviewItem.sourceType,
                                    sourceRef: conflict.interviewItem.sourceRef,
                                    sourceItemId: conflict.interviewItem.itemId,
                                },
                            ]
                            : []),
                        ...(conflict.documentItem
                            ? [
                                {
                                    sourceType: conflict.documentItem.sourceType,
                                    sourceRef: conflict.documentItem.sourceRef,
                                    sourceItemId: conflict.documentItem.itemId,
                                },
                            ]
                            : []),
                    ],
                });
            }
            // If section is completely empty, insert standard placeholder
            if (statements.length === 0) {
                statements.push({
                    text: '[No information collected]',
                    origin: 'CODE_TEMPLATE',
                    order: 1,
                    sources: [],
                });
            }
            sectionsDto.push({
                section,
                order: secOrder++,
                statements,
            });
        }
        return sectionsDto;
    }
    static formatItemStatement(item, order) {
        let text = '';
        let origin = 'CODE_TEMPLATE';
        switch (item.status) {
            case 'UNREADABLE':
                text = `[Illegible in original document — verify manually]`;
                break;
            case 'MISMATCH_FLAGGED':
                text = item.rawText
                    ? `[Document text read as '${item.rawText}', did not match any known reference — verify against original]`
                    : `[Document text flagged for verification mismatch — verify manually]`;
                break;
            case 'UNVERIFIED':
                text = `[Unverified document field: ${item.label} — verify against original]`;
                break;
            case 'DECLINED':
                text = `[Patient declined to answer: ${item.label}]`;
                break;
            case 'NOT_ANSWERED':
                text = `[Not answered: ${item.label}]`;
                break;
            case 'SKIPPED':
                text = `[Question skipped: ${item.label}]`;
                break;
            case 'VERIFIED':
            case 'ANSWERED':
            default:
                if (item.sourceType === 'INTERVIEW' && item.value) {
                    text = `${item.label}: "${item.value}"`;
                    origin = 'PATIENT_QUOTE';
                }
                else {
                    text = `${item.label}: ${item.value || '[No value]'}`;
                }
                break;
        }
        return {
            text,
            origin,
            order,
            sources: [
                {
                    sourceType: item.sourceType,
                    sourceRef: item.sourceRef,
                    sourceItemId: item.itemId,
                },
            ],
        };
    }
    static groupItemsBySection(items) {
        const map = new Map();
        for (const item of items) {
            const list = map.get(item.section) || [];
            list.push(item);
            map.set(item.section, list);
        }
        return map;
    }
}
exports.TemplateSummaryBuilder = TemplateSummaryBuilder;

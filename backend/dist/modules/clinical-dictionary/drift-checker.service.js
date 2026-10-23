"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriftCheckerService = void 0;
const dictionary_store_js_1 = require("./dictionary-store.js");
const dictionary_types_js_1 = require("./dictionary.types.js");
const seed_templates_js_1 = require("../interview/seed-templates.js");
const illustrative_rules_js_1 = require("../redflags/seed/illustrative-rules.js");
const documents_types_js_1 = require("../documents/documents.types.js");
const summary_types_js_1 = require("../summary/summary.types.js");
const logger_js_1 = require("../../config/logger.js");
class DriftCheckerService {
    /**
     * Scans all production modules, seeds, and fixtures for terminology drift against the active dictionary
     */
    static scanAllModules() {
        const violations = [];
        let scannedCount = 0;
        // 1. Scan Interview Questions & Option Codes
        for (const q of seed_templates_js_1.DEFAULT_GENERAL_OPD_QUESTIONS) {
            scannedCount++;
            const entry = dictionary_store_js_1.DictionaryStore.getEntry(q.questionCode);
            if (!entry) {
                violations.push({
                    module: 'Module 3 (Interview)',
                    code: q.questionCode,
                    category: 'QUESTIONS',
                    reason: 'UNKNOWN_CODE',
                    detail: `Question code "${q.questionCode}" is not registered in Clinical Data Dictionary.`,
                });
            }
            else if (entry.status !== dictionary_types_js_1.TerminologyStatuses.ACTIVE) {
                violations.push({
                    module: 'Module 3 (Interview)',
                    code: q.questionCode,
                    category: 'QUESTIONS',
                    reason: 'NON_ACTIVE_CODE',
                    detail: `Question code "${q.questionCode}" is in status "${entry.status}" (must be ACTIVE).`,
                });
            }
            // Check linked fact key if present
            const qEntry = entry;
            if (qEntry?.linkedFactKey) {
                scannedCount++;
                const factEntry = dictionary_store_js_1.DictionaryStore.getEntry(qEntry.linkedFactKey);
                if (!factEntry) {
                    violations.push({
                        module: 'Module 3 (Interview)',
                        code: qEntry.linkedFactKey,
                        category: 'FACT_KEYS',
                        reason: 'UNKNOWN_CODE',
                        detail: `Linked fact key "${qEntry.linkedFactKey}" in question "${q.questionCode}" does not exist in dictionary.`,
                    });
                }
            }
            // Check answer options
            if (q.answerOptions) {
                for (const opt of q.answerOptions) {
                    scannedCount++;
                    const optCode = typeof opt === 'string' ? opt : opt.code;
                    const optEntry = dictionary_store_js_1.DictionaryStore.getEntry(optCode);
                    if (!optEntry) {
                        violations.push({
                            module: 'Module 3 (Interview)',
                            code: optCode,
                            category: 'OPTION_CODES',
                            reason: 'UNKNOWN_CODE',
                            detail: `Option code "${optCode}" for question "${q.questionCode}" is not in dictionary.`,
                        });
                    }
                }
            }
        }
        // 2. Scan Red-Flag Rules and Fact Keys
        for (const rule of illustrative_rules_js_1.ILLUSTRATIVE_SEED_RULES) {
            const inspectConditions = (conds) => {
                for (const cond of conds) {
                    if (cond.fact) {
                        scannedCount++;
                        const fact = dictionary_store_js_1.DictionaryStore.getEntry(cond.fact);
                        if (!fact) {
                            violations.push({
                                module: 'Module 6 (Red-Flags)',
                                code: cond.fact,
                                category: 'FACT_KEYS',
                                reason: 'UNKNOWN_CODE',
                                detail: `Fact key "${cond.fact}" in rule "${rule.ruleCode}" is not in dictionary.`,
                            });
                        }
                        else if (fact.status !== dictionary_types_js_1.TerminologyStatuses.ACTIVE) {
                            violations.push({
                                module: 'Module 6 (Red-Flags)',
                                code: cond.fact,
                                category: 'FACT_KEYS',
                                reason: 'NON_ACTIVE_CODE',
                                detail: `Fact key "${cond.fact}" in rule "${rule.ruleCode}" is in status "${fact.status}".`,
                            });
                        }
                    }
                    if (cond.conditions) {
                        inspectConditions(cond.conditions);
                    }
                }
            };
            if (rule.conditionTree?.conditions) {
                inspectConditions(rule.conditionTree.conditions);
            }
        }
        // 3. Scan Document Field Types
        for (const field of Object.values(documents_types_js_1.FieldTypes)) {
            scannedCount++;
            const fieldEntry = dictionary_store_js_1.DictionaryStore.getEntry(field);
            if (!fieldEntry) {
                violations.push({
                    module: 'Module 4 (Documents)',
                    code: field,
                    category: 'DOCUMENT_FIELD_TYPES',
                    reason: 'UNKNOWN_CODE',
                    detail: `Field type "${field}" is not registered in Clinical Data Dictionary.`,
                });
            }
            else if (fieldEntry.status !== dictionary_types_js_1.TerminologyStatuses.ACTIVE) {
                violations.push({
                    module: 'Module 4 (Documents)',
                    code: field,
                    category: 'DOCUMENT_FIELD_TYPES',
                    reason: 'NON_ACTIVE_CODE',
                    detail: `Field type "${field}" is in status "${fieldEntry.status}".`,
                });
            }
        }
        // 4. Scan Summary Sections
        for (const sec of Object.values(summary_types_js_1.SummarySections)) {
            scannedCount++;
            const secEntry = dictionary_store_js_1.DictionaryStore.getEntry(sec);
            // If section is one of the seed sections, check active status
            if (secEntry && secEntry.status !== dictionary_types_js_1.TerminologyStatuses.ACTIVE) {
                violations.push({
                    module: 'Module 5 (Summary)',
                    code: sec,
                    category: 'SECTIONS',
                    reason: 'NON_ACTIVE_CODE',
                    detail: `Summary section "${sec}" is in status "${secEntry.status}".`,
                });
            }
        }
        const isClean = violations.length === 0;
        if (!isClean) {
            logger_js_1.logger.error('[TERMINOLOGY_DRIFT_DETECTED]', {
                totalViolations: violations.length,
                violations: violations.slice(0, 5),
            });
        }
        else {
            logger_js_1.logger.info('[TERMINOLOGY_DRIFT_SCAN_PASSED]', { scannedCount });
        }
        return {
            isClean,
            timestamp: new Date(),
            scannedCount,
            violations,
        };
    }
    static assertNoDrift() {
        const result = this.scanAllModules();
        if (!result.isClean) {
            throw new Error(`Terminology drift check failed with ${result.violations.length} violations: ${JSON.stringify(result.violations, null, 2)}`);
        }
    }
}
exports.DriftCheckerService = DriftCheckerService;

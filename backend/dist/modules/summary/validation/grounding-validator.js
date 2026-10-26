"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroundingValidator = void 0;
const deny_patterns_js_1 = require("./deny-patterns.js");
const context_builder_js_1 = require("../assembly/context-builder.js");
class GroundingValidator {
    /**
     * Deterministic Grounding Validator:
     * Pure function of (modelOutput, assembledInput) -> ValidationOutcome
     * Makes ZERO external calls and enforces mathematical factual grounding.
     */
    static validate(output, input) {
        const errors = [];
        let unsupportedClaimsCount = 0;
        let diagnosisClaimsCount = 0;
        let uncertainAsFactCount = 0;
        let absenceAsNegativeCount = 0;
        let conflictSilentResolutionCount = 0;
        // Index all input items by itemId
        const inputItemMap = new Map();
        for (const item of input.items) {
            inputItemMap.set(item.itemId, item);
        }
        // Map conflicts by section
        const conflictSections = new Set(input.conflicts.map((c) => c.section));
        const allCitedItemIds = new Set();
        for (const section of output.sections) {
            for (const stmt of section.statements) {
                const text = stmt.text || '';
                const citedIds = stmt.source_item_ids || [];
                // Check 1: Citation existence
                if (citedIds.length === 0) {
                    errors.push(`Statement missing source_item_ids: "${text}"`);
                    unsupportedClaimsCount++;
                    continue;
                }
                const citedItems = [];
                for (const cid of citedIds) {
                    allCitedItemIds.add(cid);
                    const item = inputItemMap.get(cid);
                    if (!item) {
                        errors.push(`Cited source item '${cid}' does not exist in assembled input (cross-patient or invalid reference)`);
                        unsupportedClaimsCount++;
                    }
                    else {
                        citedItems.push(item);
                    }
                }
                // Check 2: Citations must not point to withheld / uncertain items
                for (const item of citedItems) {
                    if (context_builder_js_1.ContextBuilder.WITHHELD_STATUSES.has(item.status)) {
                        errors.push(`Model statement cited uncertain/withheld item '${item.itemId}' (${item.status}). Uncertain items must be code-inserted only: "${text}"`);
                        uncertainAsFactCount++;
                    }
                }
                // Check 3: Deny-patterns for diagnosis, medical advice, and treatment
                for (const pattern of deny_patterns_js_1.DIAGNOSTIC_AND_ADVICE_DENY_PATTERNS) {
                    if (pattern.test(text)) {
                        errors.push(`Statement contains forbidden diagnostic or advice language (${pattern.source}): "${text}"`);
                        diagnosisClaimsCount++;
                        break;
                    }
                }
                // Check 3B: Prompt injection language in generated statement
                for (const pattern of deny_patterns_js_1.PROMPT_INJECTION_DENY_PATTERNS) {
                    if (pattern.test(text)) {
                        errors.push(`Statement contains forbidden prompt-injection or instruction-override language: "${text}"`);
                        unsupportedClaimsCount++;
                        break;
                    }
                }
                // Check 4: Absence as negative check
                for (const negPattern of deny_patterns_js_1.UNSUPPORTED_NEGATIVE_PATTERNS) {
                    if (negPattern.test(text)) {
                        const explicitlySupported = citedItems.some((item) => this.hasExplicitNegativeToken(item.value || item.rawText || ''));
                        if (!explicitlySupported) {
                            errors.push(`Absence converted to negative without explicit patient/document statement: "${text}"`);
                            absenceAsNegativeCount++;
                            break;
                        }
                    }
                }
                // Check 5: Token / Number / Dosage grounding validation
                const statementTokens = this.extractFactualTokens(text);
                const aggregatedSourceText = citedItems
                    .map((i) => `${i.value || ''} ${i.rawText || ''} ${i.label || ''}`)
                    .join(' ')
                    .toLowerCase();
                for (const token of statementTokens) {
                    const normalizedToken = token.toLowerCase();
                    if (!aggregatedSourceText.includes(normalizedToken)) {
                        errors.push(`Ungrounded factual token '${token}' in statement "${text}" not found in cited items: [${citedIds.join(', ')}]`);
                        unsupportedClaimsCount++;
                    }
                }
                // Check 5B: Strict medication-dosage pairing validation
                // Prevents cross-pairing (e.g. Medicine A 500mg and Medicine B 850mg combined into Medicine A 850mg)
                const medDosePairs = this.extractMedicationDosePairs(text);
                for (const pair of medDosePairs) {
                    const matchingItems = citedItems.filter((i) => {
                        const itemText = `${i.value || ''} ${i.rawText || ''} ${i.label || ''}`.toLowerCase();
                        return itemText.includes(pair.medication.toLowerCase());
                    });
                    if (matchingItems.length > 0) {
                        const hasMatchingDosage = matchingItems.some((i) => {
                            const itemText = `${i.value || ''} ${i.rawText || ''} ${i.label || ''}`.toLowerCase();
                            return itemText.includes(pair.dosage.toLowerCase());
                        });
                        if (!hasMatchingDosage) {
                            errors.push(`Incorrect medication-dose pairing: '${pair.medication}' paired with '${pair.dosage}' in statement "${text}", but source records for '${pair.medication}' do not contain this dosage.`);
                            unsupportedClaimsCount++;
                        }
                    }
                }
                // Check 6: Conflict resolution check
                if (conflictSections.has(section.section)) {
                    const activeConflict = input.conflicts.find((c) => c.section === section.section);
                    if (activeConflict) {
                        const conflictResolutionPatterns = [
                            /\b(resolved|disregard|override|ignore\s+(document|interview)|confirmed\s+no\b)/i,
                            /\bno\s+conflict\b/i,
                        ];
                        for (const pattern of conflictResolutionPatterns) {
                            if (pattern.test(text)) {
                                errors.push(`Conflict on '${activeConflict.itemKey}' was unilaterally resolved in statement "${text}"`);
                                conflictSilentResolutionCount++;
                                break;
                            }
                        }
                    }
                }
            }
        }
        // Check 7: Completeness check for verified critical medications
        const verifiedMedItems = input.items.filter((i) => (i.section === 'MEDICATIONS_AND_ALLERGIES' || i.metadata?.fieldType === 'drug_name') &&
            (i.status === 'VERIFIED' || i.status === 'ANSWERED') &&
            i.value &&
            i.value.trim().length > 0);
        const allStatementText = output.sections
            .flatMap((s) => s.statements)
            .map((st) => st.text.toLowerCase())
            .join(' ');
        for (const medItem of verifiedMedItems) {
            const medName = (medItem.value || medItem.label || '').split(/\s+/)[0]?.toLowerCase();
            const isCited = allCitedItemIds.has(medItem.itemId);
            const isMentioned = medName && medName.length > 3 && allStatementText.includes(medName);
            if (!isCited && !isMentioned) {
                errors.push(`Completeness check: verified medication '${medItem.label}' (${medItem.value}) was omitted from the summary.`);
                unsupportedClaimsCount++;
            }
        }
        const valid = errors.length === 0 &&
            unsupportedClaimsCount === 0 &&
            diagnosisClaimsCount === 0 &&
            uncertainAsFactCount === 0 &&
            absenceAsNegativeCount === 0 &&
            conflictSilentResolutionCount === 0;
        return {
            valid,
            errors,
            unsupportedClaimsCount,
            diagnosisClaimsCount,
            uncertainAsFactCount,
            absenceAsNegativeCount,
            conflictSilentResolutionCount,
            validatedAt: new Date().toISOString(),
        };
    }
    /**
     * Extracts numbers, dosages, units, and clinical metrics from text
     */
    static extractFactualTokens(text) {
        const tokens = [];
        // Match numbers with units (e.g. 500mg, 650mg, 10ml, 120/80)
        const doseAndUnitRegex = /\b\d+(?:\.\d+)?(?:\s*(?:mg|mcg|g|ml|tablets?|capsules?|drops?|pills?))?\b/gi;
        let match;
        while ((match = doseAndUnitRegex.exec(text)) !== null) {
            const val = match[0].trim();
            // Only check meaningful numbers (skip standalone 1, a, the)
            if (val.length > 0 && /\d/.test(val)) {
                tokens.push(val);
            }
        }
        // Match dosage schedules (e.g. 1-0-1, 1-1-1, 0-0-1, 1-0-0)
        const scheduleRegex = /\b\d-\d-\d\b/g;
        while ((match = scheduleRegex.exec(text)) !== null) {
            tokens.push(match[0].trim());
        }
        // Match dates (e.g. 2026-05-10, 10/05/2026)
        const dateRegex = /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g;
        while ((match = dateRegex.exec(text)) !== null) {
            tokens.push(match[0].trim());
        }
        return Array.from(new Set(tokens));
    }
    /**
     * Extracts pairs of [MedicationName, Dosage] to prevent cross-pairing
     */
    static extractMedicationDosePairs(text) {
        const pairs = [];
        const medDoseRegex = /\b([A-Za-z]{3,20})\s+(?:takes\s+|prescribed\s+|at\s+)?(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml))\b/gi;
        let match;
        while ((match = medDoseRegex.exec(text)) !== null) {
            const med = match[1]?.trim();
            const dose = match[2]?.trim();
            if (med && dose && !/^(tablets?|capsules?|drops?|pills?|patient|grade|stage|type|day|days|for|every|dose|total|about|with)$/i.test(med)) {
                pairs.push({ medication: med, dosage: dose });
            }
        }
        return pairs;
    }
    static hasExplicitNegativeToken(text) {
        const lower = text.toLowerCase().trim();
        // Prompt injection text is untrusted data and can NEVER be treated as an explicit clinical negative
        if (deny_patterns_js_1.PROMPT_INJECTION_DENY_PATTERNS.some((p) => p.test(lower))) {
            return false;
        }
        const clean = lower.replace(/[^a-z0-9 ]/g, ' ').trim();
        const exactNegatives = [
            'none',
            'nil',
            'no',
            'denies',
            'never',
            'nka',
            'nkda',
            'no allergies',
            'no known allergies',
            'no known drug allergies',
            'denies allergies',
            'denies drug allergies',
            'no active medications',
            'not applicable',
            'na',
        ];
        if (exactNegatives.includes(clean)) {
            return true;
        }
        // Match explicit negative statements without injection keywords
        if (/\b(no\s+known\s+(drug\s+)?allergies|no\s+allergies|denies\s+(any\s+)?(drug\s+)?allergies|nka|nkda)\b/i.test(lower) &&
            !/\b(state\s+that|ignore|instruction|override|say\s+that)\b/i.test(lower)) {
            return true;
        }
        return false;
    }
}
exports.GroundingValidator = GroundingValidator;

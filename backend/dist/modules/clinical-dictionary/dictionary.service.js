"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClinicalDictionaryService = void 0;
const dictionary_store_js_1 = require("./dictionary-store.js");
const dictionary_types_js_1 = require("./dictionary.types.js");
const logger_js_1 = require("../../config/logger.js");
class ClinicalDictionaryService {
    static getVersion() {
        return dictionary_store_js_1.DictionaryStore.getVersion();
    }
    // ---------------------------------------------------------------------------
    // Read-Only Cached Module Endpoints
    // ---------------------------------------------------------------------------
    static getSections() {
        return {
            version: dictionary_store_js_1.DictionaryStore.getVersion(),
            data: dictionary_store_js_1.DictionaryStore.getEntriesByCategory(dictionary_types_js_1.DictionaryCategories.SECTIONS, dictionary_types_js_1.TerminologyStatuses.ACTIVE),
        };
    }
    static getQuestions() {
        return {
            version: dictionary_store_js_1.DictionaryStore.getVersion(),
            data: dictionary_store_js_1.DictionaryStore.getEntriesByCategory(dictionary_types_js_1.DictionaryCategories.QUESTIONS, dictionary_types_js_1.TerminologyStatuses.ACTIVE),
        };
    }
    static getOptionCodes(questionCode) {
        let options = dictionary_store_js_1.DictionaryStore.getEntriesByCategory(dictionary_types_js_1.DictionaryCategories.OPTION_CODES, dictionary_types_js_1.TerminologyStatuses.ACTIVE);
        if (questionCode) {
            options = options.filter((o) => o.questionCode === questionCode);
        }
        return {
            version: dictionary_store_js_1.DictionaryStore.getVersion(),
            data: options,
        };
    }
    static getFactKeys() {
        return {
            version: dictionary_store_js_1.DictionaryStore.getVersion(),
            data: dictionary_store_js_1.DictionaryStore.getEntriesByCategory(dictionary_types_js_1.DictionaryCategories.FACT_KEYS, dictionary_types_js_1.TerminologyStatuses.ACTIVE),
        };
    }
    static getSummaryKeys() {
        return {
            version: dictionary_store_js_1.DictionaryStore.getVersion(),
            data: dictionary_store_js_1.DictionaryStore.getEntriesByCategory(dictionary_types_js_1.DictionaryCategories.SUMMARY_KEYS, dictionary_types_js_1.TerminologyStatuses.ACTIVE),
        };
    }
    static getDocumentFieldTypes() {
        return {
            version: dictionary_store_js_1.DictionaryStore.getVersion(),
            data: dictionary_store_js_1.DictionaryStore.getEntriesByCategory(dictionary_types_js_1.DictionaryCategories.DOCUMENT_FIELD_TYPES, dictionary_types_js_1.TerminologyStatuses.ACTIVE),
        };
    }
    static getUnits() {
        return {
            version: dictionary_store_js_1.DictionaryStore.getVersion(),
            data: dictionary_store_js_1.DictionaryStore.getEntriesByCategory(dictionary_types_js_1.DictionaryCategories.UNITS_AND_CONVERSIONS, dictionary_types_js_1.TerminologyStatuses.ACTIVE),
        };
    }
    static getPatterns() {
        return {
            version: dictionary_store_js_1.DictionaryStore.getVersion(),
            data: dictionary_store_js_1.DictionaryStore.getEntriesByCategory(dictionary_types_js_1.DictionaryCategories.DATE_DOSAGE_PATTERNS, dictionary_types_js_1.TerminologyStatuses.ACTIVE),
        };
    }
    static getAbbreviations() {
        return {
            version: dictionary_store_js_1.DictionaryStore.getVersion(),
            data: dictionary_store_js_1.DictionaryStore.getEntriesByCategory(dictionary_types_js_1.DictionaryCategories.PRESCRIPTION_ABBREVIATIONS, dictionary_types_js_1.TerminologyStatuses.ACTIVE),
        };
    }
    static getDrugs() {
        return {
            version: dictionary_store_js_1.DictionaryStore.getVersion(),
            data: dictionary_store_js_1.DictionaryStore.getEntriesByCategory(dictionary_types_js_1.DictionaryCategories.DRUGS, dictionary_types_js_1.TerminologyStatuses.ACTIVE),
        };
    }
    static getLabTests() {
        return {
            version: dictionary_store_js_1.DictionaryStore.getVersion(),
            data: dictionary_store_js_1.DictionaryStore.getEntriesByCategory(dictionary_types_js_1.DictionaryCategories.LAB_TESTS, dictionary_types_js_1.TerminologyStatuses.ACTIVE),
        };
    }
    static getReferenceRanges(labTestCode) {
        let ranges = dictionary_store_js_1.DictionaryStore.getEntriesByCategory(dictionary_types_js_1.DictionaryCategories.REFERENCE_RANGES, dictionary_types_js_1.TerminologyStatuses.ACTIVE);
        if (labTestCode) {
            ranges = ranges.filter((r) => r.labTestCode === labTestCode);
        }
        return {
            version: dictionary_store_js_1.DictionaryStore.getVersion(),
            data: ranges,
        };
    }
    // ---------------------------------------------------------------------------
    // Safety-Critical Terminology: Ambiguous Abbreviations
    // ---------------------------------------------------------------------------
    static resolveAbbreviation(abbrText, clinicalContext) {
        const normalized = abbrText.trim().toUpperCase();
        const allAbbrs = dictionary_store_js_1.DictionaryStore.getEntriesByCategory(dictionary_types_js_1.DictionaryCategories.PRESCRIPTION_ABBREVIATIONS, dictionary_types_js_1.TerminologyStatuses.ACTIVE);
        const match = allAbbrs.find((a) => a.abbreviation.toUpperCase() === normalized || a.code.toUpperCase() === normalized);
        if (!match) {
            return {
                resolved: false,
                state: 'UNVERIFIED',
                expandedMeaning: null,
                isAmbiguous: false,
                reason: `Unrecognized prescription abbreviation "${abbrText}".`,
            };
        }
        if (match.isAmbiguous) {
            // Must resolve to UNVERIFIED unless approved clinical context matches
            if (clinicalContext &&
                match.allowedContexts &&
                match.allowedContexts.includes(clinicalContext.toUpperCase())) {
                logger_js_1.logger.info('[AMBIGUOUS_ABBREVIATION_RESOLVED_BY_CONTEXT]', {
                    abbreviation: match.abbreviation,
                    context: clinicalContext,
                });
                return {
                    resolved: true,
                    state: 'VERIFIED',
                    expandedMeaning: match.expandedMeaning,
                    isAmbiguous: true,
                };
            }
            logger_js_1.logger.warn('[AMBIGUOUS_ABBREVIATION_UNVERIFIED]', {
                abbreviation: match.abbreviation,
                notes: match.ambiguityNotes,
            });
            return {
                resolved: false,
                state: 'UNVERIFIED',
                expandedMeaning: null,
                isAmbiguous: true,
                reason: `Ambiguous abbreviation "${match.abbreviation}" resolves to UNVERIFIED: ${match.ambiguityNotes}`,
            };
        }
        return {
            resolved: true,
            state: 'VERIFIED',
            expandedMeaning: match.expandedMeaning,
            isAmbiguous: false,
        };
    }
    // ---------------------------------------------------------------------------
    // Safety-Critical Terminology: Approved Analyte-Specific Unit Conversions
    // ---------------------------------------------------------------------------
    static convertUnit(value, fromUnit, toUnit, analyte) {
        if (fromUnit.trim().toLowerCase() === toUnit.trim().toLowerCase()) {
            return { success: true, convertedValue: value, factor: 1.0 };
        }
        const allUnits = dictionary_store_js_1.DictionaryStore.getEntriesByCategory(dictionary_types_js_1.DictionaryCategories.UNITS_AND_CONVERSIONS, dictionary_types_js_1.TerminologyStatuses.ACTIVE);
        const fromEntry = allUnits.find((u) => u.symbol.toLowerCase() === fromUnit.trim().toLowerCase() ||
            u.code.toLowerCase() === fromUnit.trim().toLowerCase());
        if (!fromEntry) {
            return {
                success: false,
                error: 'unit not convertible',
                detail: `Unit "${fromUnit}" is not registered in the clinical dictionary.`,
            };
        }
        const normalizedAnalyte = analyte.trim().toUpperCase();
        const rule = fromEntry.conversions.find((c) => c.toUnit.toLowerCase() === toUnit.trim().toLowerCase() &&
            c.analyte.toUpperCase() === normalizedAnalyte);
        if (!rule) {
            return {
                success: false,
                error: 'unit not convertible',
                detail: `Unit conversion from ${fromUnit} to ${toUnit} for analyte "${analyte}" is not clinically approved.`,
            };
        }
        const converted = Math.round(value * rule.conversionFactor * 10000) / 10000;
        return {
            success: true,
            convertedValue: converted,
            factor: rule.conversionFactor,
            detail: `Converted using rule: ${rule.formulaDescription} (Approval ref: ${rule.clinicalApprovalRef})`,
        };
    }
    // ---------------------------------------------------------------------------
    // Safety-Critical Terminology: LASA (Look-Alike / Sound-Alike) Pair Guard
    // ---------------------------------------------------------------------------
    static evaluateLasaMatchSafety(topMatchDrugCode, topMatchScore, runnerUpDrugCode, runnerUpScore, marginThreshold = 0.10) {
        let drugEntry = dictionary_store_js_1.DictionaryStore.getEntry(topMatchDrugCode);
        if (!drugEntry) {
            const allDrugs = dictionary_store_js_1.DictionaryStore.getEntriesByCategory(dictionary_types_js_1.DictionaryCategories.DRUGS, dictionary_types_js_1.TerminologyStatuses.ACTIVE);
            const normalizedTop = topMatchDrugCode.toLowerCase().trim();
            drugEntry =
                allDrugs.find((d) => d.genericName.toLowerCase() === normalizedTop ||
                    d.name.toLowerCase() === normalizedTop ||
                    d.brandNames.some((b) => b.toLowerCase() === normalizedTop)) || null;
        }
        if (!drugEntry) {
            return {
                isSafe: true,
                state: 'VERIFIED',
                lasaRisk: false,
                detail: 'Drug not found in dictionary or has no LASA partner registered.',
            };
        }
        if (!runnerUpDrugCode || runnerUpScore === null) {
            return {
                isSafe: true,
                state: 'VERIFIED',
                lasaRisk: false,
                detail: 'No runner-up candidate present.',
            };
        }
        // Check if runner-up is registered as a LASA partner
        const normalizedRunner = runnerUpDrugCode.toLowerCase().trim();
        const lasaPartner = drugEntry.lasaPartners?.find((p) => p.partnerDrugCode.toLowerCase() === normalizedRunner ||
            p.partnerDrugName.toLowerCase() === normalizedRunner);
        if (lasaPartner) {
            const scoreDifference = Math.abs(topMatchScore - runnerUpScore);
            if (scoreDifference <= marginThreshold) {
                logger_js_1.logger.warn('[LASA_NEAR_TIE_DETECTED]', {
                    topDrug: drugEntry.name,
                    partner: lasaPartner.partnerDrugName,
                    topScore: topMatchScore,
                    runnerUpScore,
                    margin: scoreDifference,
                });
                return {
                    isSafe: false,
                    state: 'UNVERIFIED',
                    lasaRisk: true,
                    partnerDrugName: lasaPartner.partnerDrugName,
                    detail: `LASA Safety Violation: Candidate match "${drugEntry.name}" has runner-up "${lasaPartner.partnerDrugName}" which is a registered Look-Alike / Sound-Alike partner within uncertainty margin (${Math.round(scoreDifference * 100)}% <= ${Math.round(marginThreshold * 100)}%). Silent selection blocked.`,
                };
            }
        }
        return {
            isSafe: true,
            state: 'VERIFIED',
            lasaRisk: false,
            detail: 'LASA safety check passed.',
        };
    }
    // ---------------------------------------------------------------------------
    // Governance Workflow Operations
    // ---------------------------------------------------------------------------
    static createDraft(entry, authorId) {
        return dictionary_store_js_1.DictionaryStore.createDraftEntry(entry, authorId);
    }
    static submitForReview(code, reviewerId) {
        return dictionary_store_js_1.DictionaryStore.submitForReview(code, reviewerId);
    }
    static activate(code, approverId) {
        return dictionary_store_js_1.DictionaryStore.activateEntry(code, approverId);
    }
    static retire(code, reason, retiredById) {
        return dictionary_store_js_1.DictionaryStore.retireEntry(code, reason, retiredById);
    }
    static getImpactAnalysis(code) {
        return dictionary_store_js_1.DictionaryStore.analyzeRetirementImpact(code);
    }
    static runDryRunImport(sourceDataset, candidateEntries) {
        return dictionary_store_js_1.DictionaryStore.executeImportDryRun(sourceDataset, candidateEntries);
    }
}
exports.ClinicalDictionaryService = ClinicalDictionaryService;

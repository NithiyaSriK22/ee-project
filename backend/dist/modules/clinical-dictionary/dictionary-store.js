"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DictionaryStore = void 0;
const crypto_1 = __importDefault(require("crypto"));
const dictionary_types_js_1 = require("./dictionary.types.js");
const seed_dictionary_js_1 = require("./seed-dictionary.js");
const logger_js_1 = require("../../config/logger.js");
const app_error_js_1 = require("../../errors/app-error.js");
class DictionaryStore {
    static version = seed_dictionary_js_1.DICTIONARY_VERSION;
    static entries = new Map();
    static retiredCodes = new Map();
    static {
        this.seedStore();
    }
    static seedStore() {
        this.entries.clear();
        this.retiredCodes.clear();
        const allSeeds = [
            ...seed_dictionary_js_1.SEED_SECTIONS,
            ...seed_dictionary_js_1.SEED_QUESTIONS,
            ...seed_dictionary_js_1.SEED_OPTION_CODES,
            ...seed_dictionary_js_1.SEED_FACT_KEYS,
            ...seed_dictionary_js_1.SEED_SUMMARY_KEYS,
            ...seed_dictionary_js_1.SEED_FIELD_TYPES,
            ...seed_dictionary_js_1.SEED_UNITS,
            ...seed_dictionary_js_1.SEED_PATTERNS,
            ...seed_dictionary_js_1.SEED_ABBREVIATIONS,
            ...seed_dictionary_js_1.SEED_DRUGS,
            ...seed_dictionary_js_1.SEED_LAB_TESTS,
            ...seed_dictionary_js_1.SEED_REFERENCE_RANGES,
        ];
        for (const seed of allSeeds) {
            this.entries.set(seed.code, { ...seed });
        }
        logger_js_1.logger.info('[DICTIONARY_STORE_SEEDED]', {
            version: this.version,
            totalEntries: this.entries.size,
        });
    }
    static getVersion() {
        return this.version;
    }
    static setVersion(newVersion) {
        this.version = newVersion;
    }
    static getEntry(code) {
        const entry = this.entries.get(code);
        return entry ? { ...entry } : null;
    }
    static getEntriesByCategory(category, statusFilter) {
        const list = [];
        for (const entry of this.entries.values()) {
            if (entry.category === category) {
                if (!statusFilter || entry.status === statusFilter) {
                    list.push({ ...entry });
                }
            }
        }
        return list;
    }
    static getAllEntries() {
        return Array.from(this.entries.values()).map((e) => ({ ...e }));
    }
    static computeLockHash(code, description) {
        return crypto_1.default.createHash('sha256').update(`${code}:${description}:LOCKED`).digest('hex').substring(0, 16);
    }
    // ---------------------------------------------------------------------------
    // Governance Workflow: DRAFT -> REVIEW -> ACTIVE -> RETIRED
    // ---------------------------------------------------------------------------
    static createDraftEntry(entry, authorId) {
        if (this.retiredCodes.has(entry.code)) {
            throw new app_error_js_1.ConflictError(`Terminology governance rule violation: Retired code "${entry.code}" cannot be reused. Create a new code.`);
        }
        if (this.entries.has(entry.code)) {
            throw new app_error_js_1.ConflictError(`Dictionary entry with code "${entry.code}" already exists.`);
        }
        const lockHash = this.computeLockHash(entry.code, entry.description);
        const newEntry = {
            ...entry,
            status: dictionary_types_js_1.TerminologyStatuses.DRAFT,
            meaningLockHash: lockHash,
            createdBy: authorId,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.entries.set(entry.code, newEntry);
        logger_js_1.logger.info('[DICTIONARY_DRAFT_CREATED]', { code: entry.code, authorId });
        return { ...newEntry };
    }
    static submitForReview(code, reviewerId) {
        const entry = this.entries.get(code);
        if (!entry) {
            throw new app_error_js_1.ValidationError(`Dictionary code "${code}" not found.`);
        }
        if (entry.status !== dictionary_types_js_1.TerminologyStatuses.DRAFT) {
            throw new app_error_js_1.ConflictError(`Only DRAFT entries can be submitted for review. Current status: ${entry.status}`);
        }
        entry.status = dictionary_types_js_1.TerminologyStatuses.REVIEW;
        entry.reviewedBy = reviewerId;
        entry.updatedAt = new Date();
        logger_js_1.logger.info('[DICTIONARY_SUBMITTED_FOR_REVIEW]', { code, reviewerId });
        return { ...entry };
    }
    static activateEntry(code, approverId) {
        const entry = this.entries.get(code);
        if (!entry) {
            throw new app_error_js_1.ValidationError(`Dictionary code "${code}" not found.`);
        }
        if (entry.status === dictionary_types_js_1.TerminologyStatuses.ACTIVE) {
            return { ...entry };
        }
        if (entry.status !== dictionary_types_js_1.TerminologyStatuses.REVIEW && entry.status !== dictionary_types_js_1.TerminologyStatuses.DRAFT) {
            throw new app_error_js_1.ConflictError(`Cannot activate entry in status: ${entry.status}`);
        }
        // 4-eyes principle: Author cannot be the sole approver
        if (entry.createdBy === approverId) {
            throw new app_error_js_1.ForbiddenError(`Governance safety violation: Entry author "${approverId}" cannot be the sole activation approver (dual control required).`);
        }
        entry.status = dictionary_types_js_1.TerminologyStatuses.ACTIVE;
        entry.activatedBy = approverId;
        entry.updatedAt = new Date();
        logger_js_1.logger.warn('[CRITICAL_AUDIT_TERMINOLOGY_ACTIVATION]', {
            code: entry.code,
            category: entry.category,
            activatedBy: approverId,
            meaningLockHash: entry.meaningLockHash,
            version: this.version,
        });
        return { ...entry };
    }
    // Meaning-Lock Enforcement: Prevent semantic drift
    static updateEntryMeaning(code, newDescription, _actorId) {
        const entry = this.entries.get(code);
        if (!entry) {
            throw new app_error_js_1.ValidationError(`Dictionary code "${code}" not found.`);
        }
        const expectedHash = this.computeLockHash(code, newDescription);
        if (entry.status === dictionary_types_js_1.TerminologyStatuses.ACTIVE && entry.meaningLockHash !== expectedHash) {
            throw new app_error_js_1.ForbiddenError(`Meaning-lock enforcement: Code "${code}" has a locked clinical meaning. Semantic modifications are forbidden. Create a new versioned code instead.`);
        }
        entry.description = newDescription;
        entry.updatedAt = new Date();
        return { ...entry };
    }
    // ---------------------------------------------------------------------------
    // Impact Analysis & Retirement Rules
    // ---------------------------------------------------------------------------
    static analyzeRetirementImpact(code) {
        const entry = this.entries.get(code);
        if (!entry) {
            throw new app_error_js_1.ValidationError(`Dictionary code "${code}" not found.`);
        }
        const activeReferences = {
            interviewTemplates: [],
            redflagRules: [],
            summaryPrompts: [],
            translations: [],
        };
        // Scan for dependencies
        // 1. Check if questions link to this fact key or section
        for (const e of this.entries.values()) {
            if (e.category === 'QUESTIONS') {
                const q = e;
                if (q.sectionCode === code || q.linkedFactKey === code) {
                    activeReferences.interviewTemplates.push(`Question: ${q.code}`);
                }
            }
            if (e.category === 'SUMMARY_KEYS') {
                const s = e;
                if (s.sectionCode === code) {
                    activeReferences.summaryPrompts.push(`SummaryKey: ${s.code}`);
                }
            }
            if (e.category === 'OPTION_CODES') {
                const o = e;
                if (o.questionCode === code) {
                    activeReferences.interviewTemplates.push(`OptionCode: ${o.code}`);
                }
            }
            if (e.category === 'REFERENCE_RANGES') {
                const r = e;
                if (r.labTestCode === code) {
                    activeReferences.redflagRules.push(`ReferenceRange: ${r.code}`);
                }
            }
            if (e.category === 'DRUGS') {
                const d = e;
                for (const p of d.lasaPartners || []) {
                    if (p.partnerDrugCode === code) {
                        activeReferences.redflagRules.push(`LASA Partner in Drug: ${d.code}`);
                    }
                }
            }
        }
        const totalActiveRefs = activeReferences.interviewTemplates.length +
            activeReferences.redflagRules.length +
            activeReferences.summaryPrompts.length +
            activeReferences.translations.length;
        const warnings = [];
        if (totalActiveRefs > 0) {
            warnings.push(`Code "${code}" is actively referenced by ${totalActiveRefs} operational entities and CANNOT be retired.`);
        }
        return {
            code,
            canRetire: totalActiveRefs === 0,
            activeReferences,
            warnings,
        };
    }
    static retireEntry(code, reason, retiredById) {
        const entry = this.entries.get(code);
        if (!entry) {
            throw new app_error_js_1.ValidationError(`Dictionary code "${code}" not found.`);
        }
        const impact = this.analyzeRetirementImpact(code);
        if (!impact.canRetire) {
            throw new app_error_js_1.ConflictError(`Retirement blocked: Code "${code}" is in use by active components. Impact list: ${impact.warnings.join(' ')}`);
        }
        entry.status = dictionary_types_js_1.TerminologyStatuses.RETIRED;
        entry.retiredAt = new Date();
        entry.retirementReason = reason;
        entry.updatedAt = new Date();
        this.retiredCodes.set(code, { retiredAt: entry.retiredAt, reason });
        logger_js_1.logger.warn('[CRITICAL_AUDIT_TERMINOLOGY_RETIRED]', {
            code,
            reason,
            retiredById,
            version: this.version,
        });
        return { ...entry };
    }
    // ---------------------------------------------------------------------------
    // Bulk Import Dry-Run Validation Tooling
    // ---------------------------------------------------------------------------
    static executeImportDryRun(sourceDataset, candidateEntries) {
        const report = {
            timestamp: new Date(),
            sourceDataset,
            totalEntries: candidateEntries.length,
            validCount: 0,
            duplicateCodes: [],
            meaningLockViolations: [],
            unknownUnitReferences: [],
            orphanedCodeReferences: [],
            lasaPairConflicts: [],
            canCommitAsDraft: true,
        };
        const seenCodesInBatch = new Set();
        for (const item of candidateEntries) {
            // 1. Duplicate check in batch
            if (seenCodesInBatch.has(item.code)) {
                report.duplicateCodes.push(`Duplicate code in import batch: ${item.code}`);
            }
            seenCodesInBatch.add(item.code);
            // 2. Retired code check
            if (this.retiredCodes.has(item.code)) {
                report.meaningLockViolations.push(`Code ${item.code} is previously RETIRED and cannot be re-imported or re-assigned.`);
            }
            // 3. Existing active meaning-lock check
            const existing = this.entries.get(item.code);
            if (existing && existing.status === dictionary_types_js_1.TerminologyStatuses.ACTIVE) {
                const itemHash = this.computeLockHash(item.code, item.description);
                if (existing.meaningLockHash !== itemHash) {
                    report.meaningLockViolations.push(`Code ${item.code} conflicts with existing active meaning lock (semantic drift detected).`);
                }
            }
            // 4. Orphan checks
            if (item.category === 'OPTION_CODES') {
                const opt = item;
                if (!this.entries.has(opt.questionCode) && !seenCodesInBatch.has(opt.questionCode)) {
                    report.orphanedCodeReferences.push(`OptionCode ${opt.code} references unknown QuestionCode "${opt.questionCode}".`);
                }
            }
            if (item.category === 'REFERENCE_RANGES') {
                const ref = item;
                if (!this.entries.has(ref.labTestCode) && !seenCodesInBatch.has(ref.labTestCode)) {
                    report.orphanedCodeReferences.push(`ReferenceRange ${ref.code} references unknown LabTest "${ref.labTestCode}".`);
                }
            }
            // 5. Unit check
            if (item.category === 'LAB_TESTS') {
                const lab = item;
                if (!this.entries.has(lab.standardUnit) && !seenCodesInBatch.has(lab.standardUnit)) {
                    report.unknownUnitReferences.push(`LabTest ${lab.code} uses unregistered standard unit "${lab.standardUnit}".`);
                }
            }
        }
        const hasErrors = report.duplicateCodes.length > 0 ||
            report.meaningLockViolations.length > 0 ||
            report.orphanedCodeReferences.length > 0;
        report.canCommitAsDraft = !hasErrors;
        report.validCount = hasErrors ? 0 : candidateEntries.length;
        return report;
    }
}
exports.DictionaryStore = DictionaryStore;

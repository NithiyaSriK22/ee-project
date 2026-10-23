import crypto from 'crypto';
import {
  BaseDictionaryEntry,
  DictionaryCategory,
  TerminologyStatus,
  TerminologyStatuses,
  ImpactAnalysisResult,
  BulkImportDryRunReport,
} from './dictionary.types.js';
import {
  DICTIONARY_VERSION,
  SEED_SECTIONS,
  SEED_QUESTIONS,
  SEED_OPTION_CODES,
  SEED_FACT_KEYS,
  SEED_SUMMARY_KEYS,
  SEED_FIELD_TYPES,
  SEED_UNITS,
  SEED_PATTERNS,
  SEED_ABBREVIATIONS,
  SEED_DRUGS,
  SEED_LAB_TESTS,
  SEED_REFERENCE_RANGES,
} from './seed-dictionary.js';
import { logger } from '../../config/logger.js';
import { ValidationError, ConflictError, ForbiddenError } from '../../errors/app-error.js';

export class DictionaryStore {
  private static version: string = DICTIONARY_VERSION;
  private static entries: Map<string, BaseDictionaryEntry> = new Map();
  private static retiredCodes: Map<string, { retiredAt: Date; reason: string }> = new Map();

  static {
    this.seedStore();
  }

  public static seedStore(): void {
    this.entries.clear();
    this.retiredCodes.clear();

    const allSeeds: BaseDictionaryEntry[] = [
      ...SEED_SECTIONS,
      ...SEED_QUESTIONS,
      ...SEED_OPTION_CODES,
      ...SEED_FACT_KEYS,
      ...SEED_SUMMARY_KEYS,
      ...SEED_FIELD_TYPES,
      ...SEED_UNITS,
      ...SEED_PATTERNS,
      ...SEED_ABBREVIATIONS,
      ...SEED_DRUGS,
      ...SEED_LAB_TESTS,
      ...SEED_REFERENCE_RANGES,
    ];

    for (const seed of allSeeds) {
      this.entries.set(seed.code, { ...seed });
    }

    logger.info('[DICTIONARY_STORE_SEEDED]', {
      version: this.version,
      totalEntries: this.entries.size,
    });
  }

  public static getVersion(): string {
    return this.version;
  }

  public static setVersion(newVersion: string): void {
    this.version = newVersion;
  }

  public static getEntry<T extends BaseDictionaryEntry>(code: string): T | null {
    const entry = this.entries.get(code);
    return entry ? ({ ...entry } as T) : null;
  }

  public static getEntriesByCategory<T extends BaseDictionaryEntry>(
    category: DictionaryCategory,
    statusFilter?: TerminologyStatus
  ): T[] {
    const list: T[] = [];
    for (const entry of this.entries.values()) {
      if (entry.category === category) {
        if (!statusFilter || entry.status === statusFilter) {
          list.push({ ...entry } as T);
        }
      }
    }
    return list;
  }

  public static getAllEntries(): BaseDictionaryEntry[] {
    return Array.from(this.entries.values()).map((e) => ({ ...e }));
  }

  public static computeLockHash(code: string, description: string): string {
    return crypto.createHash('sha256').update(`${code}:${description}:LOCKED`).digest('hex').substring(0, 16);
  }

  // ---------------------------------------------------------------------------
  // Governance Workflow: DRAFT -> REVIEW -> ACTIVE -> RETIRED
  // ---------------------------------------------------------------------------

  public static createDraftEntry(
    entry: Omit<BaseDictionaryEntry, 'status' | 'meaningLockHash' | 'createdAt' | 'updatedAt'>,
    authorId: string
  ): BaseDictionaryEntry {
    if (this.retiredCodes.has(entry.code)) {
      throw new ConflictError(
        `Terminology governance rule violation: Retired code "${entry.code}" cannot be reused. Create a new code.`
      );
    }

    if (this.entries.has(entry.code)) {
      throw new ConflictError(`Dictionary entry with code "${entry.code}" already exists.`);
    }

    const lockHash = this.computeLockHash(entry.code, entry.description);
    const newEntry: BaseDictionaryEntry = {
      ...entry,
      status: TerminologyStatuses.DRAFT,
      meaningLockHash: lockHash,
      createdBy: authorId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.entries.set(entry.code, newEntry);
    logger.info('[DICTIONARY_DRAFT_CREATED]', { code: entry.code, authorId });
    return { ...newEntry };
  }

  public static submitForReview(code: string, reviewerId: string): BaseDictionaryEntry {
    const entry = this.entries.get(code);
    if (!entry) {
      throw new ValidationError(`Dictionary code "${code}" not found.`);
    }

    if (entry.status !== TerminologyStatuses.DRAFT) {
      throw new ConflictError(`Only DRAFT entries can be submitted for review. Current status: ${entry.status}`);
    }

    entry.status = TerminologyStatuses.REVIEW;
    entry.reviewedBy = reviewerId;
    entry.updatedAt = new Date();

    logger.info('[DICTIONARY_SUBMITTED_FOR_REVIEW]', { code, reviewerId });
    return { ...entry };
  }

  public static activateEntry(code: string, approverId: string): BaseDictionaryEntry {
    const entry = this.entries.get(code);
    if (!entry) {
      throw new ValidationError(`Dictionary code "${code}" not found.`);
    }

    if (entry.status === TerminologyStatuses.ACTIVE) {
      return { ...entry };
    }

    if (entry.status !== TerminologyStatuses.REVIEW && entry.status !== TerminologyStatuses.DRAFT) {
      throw new ConflictError(`Cannot activate entry in status: ${entry.status}`);
    }

    // 4-eyes principle: Author cannot be the sole approver
    if (entry.createdBy === approverId) {
      throw new ForbiddenError(
        `Governance safety violation: Entry author "${approverId}" cannot be the sole activation approver (dual control required).`
      );
    }

    entry.status = TerminologyStatuses.ACTIVE;
    entry.activatedBy = approverId;
    entry.updatedAt = new Date();

    logger.warn('[CRITICAL_AUDIT_TERMINOLOGY_ACTIVATION]', {
      code: entry.code,
      category: entry.category,
      activatedBy: approverId,
      meaningLockHash: entry.meaningLockHash,
      version: this.version,
    });

    return { ...entry };
  }

  // Meaning-Lock Enforcement: Prevent semantic drift
  public static updateEntryMeaning(
    code: string,
    newDescription: string,
    _actorId: string
  ): BaseDictionaryEntry {
    const entry = this.entries.get(code);
    if (!entry) {
      throw new ValidationError(`Dictionary code "${code}" not found.`);
    }

    const expectedHash = this.computeLockHash(code, newDescription);
    if (entry.status === TerminologyStatuses.ACTIVE && entry.meaningLockHash !== expectedHash) {
      throw new ForbiddenError(
        `Meaning-lock enforcement: Code "${code}" has a locked clinical meaning. Semantic modifications are forbidden. Create a new versioned code instead.`
      );
    }

    entry.description = newDescription;
    entry.updatedAt = new Date();
    return { ...entry };
  }

  // ---------------------------------------------------------------------------
  // Impact Analysis & Retirement Rules
  // ---------------------------------------------------------------------------

  public static analyzeRetirementImpact(code: string): ImpactAnalysisResult {
    const entry = this.entries.get(code);
    if (!entry) {
      throw new ValidationError(`Dictionary code "${code}" not found.`);
    }

    const activeReferences = {
      interviewTemplates: [] as string[],
      redflagRules: [] as string[],
      summaryPrompts: [] as string[],
      translations: [] as string[],
    };

    // Scan for dependencies
    // 1. Check if questions link to this fact key or section
    for (const e of this.entries.values()) {
      if (e.category === 'QUESTIONS') {
        const q = e as any;
        if (q.sectionCode === code || q.linkedFactKey === code) {
          activeReferences.interviewTemplates.push(`Question: ${q.code}`);
        }
      }
      if (e.category === 'SUMMARY_KEYS') {
        const s = e as any;
        if (s.sectionCode === code) {
          activeReferences.summaryPrompts.push(`SummaryKey: ${s.code}`);
        }
      }
      if (e.category === 'OPTION_CODES') {
        const o = e as any;
        if (o.questionCode === code) {
          activeReferences.interviewTemplates.push(`OptionCode: ${o.code}`);
        }
      }
      if (e.category === 'REFERENCE_RANGES') {
        const r = e as any;
        if (r.labTestCode === code) {
          activeReferences.redflagRules.push(`ReferenceRange: ${r.code}`);
        }
      }
      if (e.category === 'DRUGS') {
        const d = e as any;
        for (const p of d.lasaPartners || []) {
          if (p.partnerDrugCode === code) {
            activeReferences.redflagRules.push(`LASA Partner in Drug: ${d.code}`);
          }
        }
      }
    }

    const totalActiveRefs =
      activeReferences.interviewTemplates.length +
      activeReferences.redflagRules.length +
      activeReferences.summaryPrompts.length +
      activeReferences.translations.length;

    const warnings: string[] = [];
    if (totalActiveRefs > 0) {
      warnings.push(
        `Code "${code}" is actively referenced by ${totalActiveRefs} operational entities and CANNOT be retired.`
      );
    }

    return {
      code,
      canRetire: totalActiveRefs === 0,
      activeReferences,
      warnings,
    };
  }

  public static retireEntry(code: string, reason: string, retiredById: string): BaseDictionaryEntry {
    const entry = this.entries.get(code);
    if (!entry) {
      throw new ValidationError(`Dictionary code "${code}" not found.`);
    }

    const impact = this.analyzeRetirementImpact(code);
    if (!impact.canRetire) {
      throw new ConflictError(
        `Retirement blocked: Code "${code}" is in use by active components. Impact list: ${impact.warnings.join(' ')}`
      );
    }

    entry.status = TerminologyStatuses.RETIRED;
    entry.retiredAt = new Date();
    entry.retirementReason = reason;
    entry.updatedAt = new Date();

    this.retiredCodes.set(code, { retiredAt: entry.retiredAt, reason });

    logger.warn('[CRITICAL_AUDIT_TERMINOLOGY_RETIRED]', {
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

  public static executeImportDryRun(
    sourceDataset: string,
    candidateEntries: BaseDictionaryEntry[]
  ): BulkImportDryRunReport {
    const report: BulkImportDryRunReport = {
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

    const seenCodesInBatch = new Set<string>();

    for (const item of candidateEntries) {
      // 1. Duplicate check in batch
      if (seenCodesInBatch.has(item.code)) {
        report.duplicateCodes.push(`Duplicate code in import batch: ${item.code}`);
      }
      seenCodesInBatch.add(item.code);

      // 2. Retired code check
      if (this.retiredCodes.has(item.code)) {
        report.meaningLockViolations.push(
          `Code ${item.code} is previously RETIRED and cannot be re-imported or re-assigned.`
        );
      }

      // 3. Existing active meaning-lock check
      const existing = this.entries.get(item.code);
      if (existing && existing.status === TerminologyStatuses.ACTIVE) {
        const itemHash = this.computeLockHash(item.code, item.description);
        if (existing.meaningLockHash !== itemHash) {
          report.meaningLockViolations.push(
            `Code ${item.code} conflicts with existing active meaning lock (semantic drift detected).`
          );
        }
      }

      // 4. Orphan checks
      if (item.category === 'OPTION_CODES') {
        const opt = item as any;
        if (!this.entries.has(opt.questionCode) && !seenCodesInBatch.has(opt.questionCode)) {
          report.orphanedCodeReferences.push(
            `OptionCode ${opt.code} references unknown QuestionCode "${opt.questionCode}".`
          );
        }
      }

      if (item.category === 'REFERENCE_RANGES') {
        const ref = item as any;
        if (!this.entries.has(ref.labTestCode) && !seenCodesInBatch.has(ref.labTestCode)) {
          report.orphanedCodeReferences.push(
            `ReferenceRange ${ref.code} references unknown LabTest "${ref.labTestCode}".`
          );
        }
      }

      // 5. Unit check
      if (item.category === 'LAB_TESTS') {
        const lab = item as any;
        if (!this.entries.has(lab.standardUnit) && !seenCodesInBatch.has(lab.standardUnit)) {
          report.unknownUnitReferences.push(
            `LabTest ${lab.code} uses unregistered standard unit "${lab.standardUnit}".`
          );
        }
      }
    }

    const hasErrors =
      report.duplicateCodes.length > 0 ||
      report.meaningLockViolations.length > 0 ||
      report.orphanedCodeReferences.length > 0;

    report.canCommitAsDraft = !hasErrors;
    report.validCount = hasErrors ? 0 : candidateEntries.length;

    return report;
  }
}

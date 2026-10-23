import {
  DictionaryStore,
} from './dictionary-store.js';
import {
  DictionaryCategories,
  TerminologyStatuses,
  SectionEntry,
  QuestionCodeEntry,
  OptionCodeEntry,
  FactKeyEntry,
  SummaryKeyEntry,
  DocumentFieldTypeEntry,
  UnitEntry,
  DateDosagePatternEntry,
  PrescriptionAbbreviationEntry,
  DrugDictionaryEntry,
  LabTestEntry,
  ReferenceRangeEntry,
  ImpactAnalysisResult,
  BulkImportDryRunReport,
  BaseDictionaryEntry,
} from './dictionary.types.js';
import { logger } from '../../config/logger.js';

export class ClinicalDictionaryService {
  public static getVersion(): string {
    return DictionaryStore.getVersion();
  }

  // ---------------------------------------------------------------------------
  // Read-Only Cached Module Endpoints
  // ---------------------------------------------------------------------------

  public static getSections(): { version: string; data: SectionEntry[] } {
    return {
      version: DictionaryStore.getVersion(),
      data: DictionaryStore.getEntriesByCategory<SectionEntry>(
        DictionaryCategories.SECTIONS,
        TerminologyStatuses.ACTIVE
      ),
    };
  }

  public static getQuestions(): { version: string; data: QuestionCodeEntry[] } {
    return {
      version: DictionaryStore.getVersion(),
      data: DictionaryStore.getEntriesByCategory<QuestionCodeEntry>(
        DictionaryCategories.QUESTIONS,
        TerminologyStatuses.ACTIVE
      ),
    };
  }

  public static getOptionCodes(questionCode?: string): { version: string; data: OptionCodeEntry[] } {
    let options = DictionaryStore.getEntriesByCategory<OptionCodeEntry>(
      DictionaryCategories.OPTION_CODES,
      TerminologyStatuses.ACTIVE
    );
    if (questionCode) {
      options = options.filter((o) => o.questionCode === questionCode);
    }
    return {
      version: DictionaryStore.getVersion(),
      data: options,
    };
  }

  public static getFactKeys(): { version: string; data: FactKeyEntry[] } {
    return {
      version: DictionaryStore.getVersion(),
      data: DictionaryStore.getEntriesByCategory<FactKeyEntry>(
        DictionaryCategories.FACT_KEYS,
        TerminologyStatuses.ACTIVE
      ),
    };
  }

  public static getSummaryKeys(): { version: string; data: SummaryKeyEntry[] } {
    return {
      version: DictionaryStore.getVersion(),
      data: DictionaryStore.getEntriesByCategory<SummaryKeyEntry>(
        DictionaryCategories.SUMMARY_KEYS,
        TerminologyStatuses.ACTIVE
      ),
    };
  }

  public static getDocumentFieldTypes(): { version: string; data: DocumentFieldTypeEntry[] } {
    return {
      version: DictionaryStore.getVersion(),
      data: DictionaryStore.getEntriesByCategory<DocumentFieldTypeEntry>(
        DictionaryCategories.DOCUMENT_FIELD_TYPES,
        TerminologyStatuses.ACTIVE
      ),
    };
  }

  public static getUnits(): { version: string; data: UnitEntry[] } {
    return {
      version: DictionaryStore.getVersion(),
      data: DictionaryStore.getEntriesByCategory<UnitEntry>(
        DictionaryCategories.UNITS_AND_CONVERSIONS,
        TerminologyStatuses.ACTIVE
      ),
    };
  }

  public static getPatterns(): { version: string; data: DateDosagePatternEntry[] } {
    return {
      version: DictionaryStore.getVersion(),
      data: DictionaryStore.getEntriesByCategory<DateDosagePatternEntry>(
        DictionaryCategories.DATE_DOSAGE_PATTERNS,
        TerminologyStatuses.ACTIVE
      ),
    };
  }

  public static getAbbreviations(): { version: string; data: PrescriptionAbbreviationEntry[] } {
    return {
      version: DictionaryStore.getVersion(),
      data: DictionaryStore.getEntriesByCategory<PrescriptionAbbreviationEntry>(
        DictionaryCategories.PRESCRIPTION_ABBREVIATIONS,
        TerminologyStatuses.ACTIVE
      ),
    };
  }

  public static getDrugs(): { version: string; data: DrugDictionaryEntry[] } {
    return {
      version: DictionaryStore.getVersion(),
      data: DictionaryStore.getEntriesByCategory<DrugDictionaryEntry>(
        DictionaryCategories.DRUGS,
        TerminologyStatuses.ACTIVE
      ),
    };
  }

  public static getLabTests(): { version: string; data: LabTestEntry[] } {
    return {
      version: DictionaryStore.getVersion(),
      data: DictionaryStore.getEntriesByCategory<LabTestEntry>(
        DictionaryCategories.LAB_TESTS,
        TerminologyStatuses.ACTIVE
      ),
    };
  }

  public static getReferenceRanges(labTestCode?: string): {
    version: string;
    data: ReferenceRangeEntry[];
  } {
    let ranges = DictionaryStore.getEntriesByCategory<ReferenceRangeEntry>(
      DictionaryCategories.REFERENCE_RANGES,
      TerminologyStatuses.ACTIVE
    );
    if (labTestCode) {
      ranges = ranges.filter((r) => r.labTestCode === labTestCode);
    }
    return {
      version: DictionaryStore.getVersion(),
      data: ranges,
    };
  }

  // ---------------------------------------------------------------------------
  // Safety-Critical Terminology: Ambiguous Abbreviations
  // ---------------------------------------------------------------------------

  public static resolveAbbreviation(
    abbrText: string,
    clinicalContext?: string
  ): {
    resolved: boolean;
    state: 'VERIFIED' | 'UNVERIFIED';
    expandedMeaning: string | null;
    isAmbiguous: boolean;
    reason?: string;
  } {
    const normalized = abbrText.trim().toUpperCase();
    const allAbbrs = DictionaryStore.getEntriesByCategory<PrescriptionAbbreviationEntry>(
      DictionaryCategories.PRESCRIPTION_ABBREVIATIONS,
      TerminologyStatuses.ACTIVE
    );

    const match = allAbbrs.find(
      (a) => a.abbreviation.toUpperCase() === normalized || a.code.toUpperCase() === normalized
    );

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
      if (
        clinicalContext &&
        match.allowedContexts &&
        match.allowedContexts.includes(clinicalContext.toUpperCase())
      ) {
        logger.info('[AMBIGUOUS_ABBREVIATION_RESOLVED_BY_CONTEXT]', {
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

      logger.warn('[AMBIGUOUS_ABBREVIATION_UNVERIFIED]', {
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

  public static convertUnit(
    value: number,
    fromUnit: string,
    toUnit: string,
    analyte: string
  ): {
    success: boolean;
    convertedValue?: number;
    factor?: number;
    error?: string;
    detail?: string;
  } {
    if (fromUnit.trim().toLowerCase() === toUnit.trim().toLowerCase()) {
      return { success: true, convertedValue: value, factor: 1.0 };
    }

    const allUnits = DictionaryStore.getEntriesByCategory<UnitEntry>(
      DictionaryCategories.UNITS_AND_CONVERSIONS,
      TerminologyStatuses.ACTIVE
    );

    const fromEntry = allUnits.find(
      (u) =>
        u.symbol.toLowerCase() === fromUnit.trim().toLowerCase() ||
        u.code.toLowerCase() === fromUnit.trim().toLowerCase()
    );

    if (!fromEntry) {
      return {
        success: false,
        error: 'unit not convertible',
        detail: `Unit "${fromUnit}" is not registered in the clinical dictionary.`,
      };
    }

    const normalizedAnalyte = analyte.trim().toUpperCase();
    const rule = fromEntry.conversions.find(
      (c) =>
        c.toUnit.toLowerCase() === toUnit.trim().toLowerCase() &&
        c.analyte.toUpperCase() === normalizedAnalyte
    );

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

  public static evaluateLasaMatchSafety(
    topMatchDrugCode: string,
    topMatchScore: number,
    runnerUpDrugCode: string | null,
    runnerUpScore: number | null,
    marginThreshold: number = 0.10
  ): {
    isSafe: boolean;
    state: 'VERIFIED' | 'UNVERIFIED' | 'MISMATCH_FLAGGED';
    lasaRisk: boolean;
    partnerDrugName?: string;
    detail: string;
  } {
    let drugEntry = DictionaryStore.getEntry<DrugDictionaryEntry>(topMatchDrugCode);
    if (!drugEntry) {
      const allDrugs = DictionaryStore.getEntriesByCategory<DrugDictionaryEntry>(
        DictionaryCategories.DRUGS,
        TerminologyStatuses.ACTIVE
      );
      const normalizedTop = topMatchDrugCode.toLowerCase().trim();
      drugEntry =
        allDrugs.find(
          (d) =>
            d.genericName.toLowerCase() === normalizedTop ||
            d.name.toLowerCase() === normalizedTop ||
            d.brandNames.some((b) => b.toLowerCase() === normalizedTop)
        ) || null;
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
    const lasaPartner = drugEntry.lasaPartners?.find(
      (p) =>
        p.partnerDrugCode.toLowerCase() === normalizedRunner ||
        p.partnerDrugName.toLowerCase() === normalizedRunner
    );

    if (lasaPartner) {
      const scoreDifference = Math.abs(topMatchScore - runnerUpScore);
      if (scoreDifference <= marginThreshold) {
        logger.warn('[LASA_NEAR_TIE_DETECTED]', {
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

  public static createDraft(
    entry: Omit<BaseDictionaryEntry, 'status' | 'meaningLockHash' | 'createdAt' | 'updatedAt'>,
    authorId: string
  ): BaseDictionaryEntry {
    return DictionaryStore.createDraftEntry(entry, authorId);
  }

  public static submitForReview(code: string, reviewerId: string): BaseDictionaryEntry {
    return DictionaryStore.submitForReview(code, reviewerId);
  }

  public static activate(code: string, approverId: string): BaseDictionaryEntry {
    return DictionaryStore.activateEntry(code, approverId);
  }

  public static retire(code: string, reason: string, retiredById: string): BaseDictionaryEntry {
    return DictionaryStore.retireEntry(code, reason, retiredById);
  }

  public static getImpactAnalysis(code: string): ImpactAnalysisResult {
    return DictionaryStore.analyzeRetirementImpact(code);
  }

  public static runDryRunImport(
    sourceDataset: string,
    candidateEntries: BaseDictionaryEntry[]
  ): BulkImportDryRunReport {
    return DictionaryStore.executeImportDryRun(sourceDataset, candidateEntries);
  }
}
